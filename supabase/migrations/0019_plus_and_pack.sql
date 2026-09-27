-- bower Plus and the listing pack (ADR-0010).
--
-- Plus is a date, not a set of limits: while `plus_expires_at` is in the
-- future the meter reads listings and market checks as unlimited, behind
-- fair-use ceilings of 150 and 50 a month. When it lapses nothing has to be
-- written back; the free numbers in `reads_limit` / `searches_limit` were
-- never touched. The owner's nulls stay nulls either way.
--
-- The pack is a balance: 10 listings a purchase, spent only once the month's
-- free listings are gone, never reset and never expiring.
--
-- Every App Store transaction is kept in `purchases`, keyed by Apple's
-- transaction id so a replayed or re-notified transaction is a no-op.

-- ── The two new profile columns ───────────────────────────────────────────
alter table public.profiles
  add column pack_listings integer not null default 0 check (pack_listings >= 0),
  add column plus_expires_at timestamptz;

comment on column public.profiles.pack_listings is
  'Bought listings left. Spent after the month''s free listings. Server-side only.';
comment on column public.profiles.plus_expires_at is
  'When bower Plus lapses. Plus is on while this is in the future. Server-side only.';

-- ── The ledger ────────────────────────────────────────────────────────────
create table public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id text not null unique,
  original_transaction_id text not null,
  product_id text not null,
  kind text not null check (kind in ('plus', 'pack')),
  environment text not null,
  purchased_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  signed_transaction text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchases_user_id on public.purchases (user_id);
create index purchases_original_transaction_id on public.purchases (original_transaction_id);

comment on table public.purchases is
  'Every App Store transaction, verified server-side. Service role only.';

alter table public.purchases enable row level security;
revoke all on public.purchases from anon, authenticated;

-- ── The meter, now with Plus and the pack ─────────────────────────────────
drop function if exists public.spend_allowance(uuid, text);
drop function if exists public.refund_allowance(uuid, text);

create function public.spend_allowance(p_user_id uuid, p_kind text)
returns table (
  allowed boolean,
  allowance_used integer,
  allowance_limit integer,
  resets_at timestamptz,
  source text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period timestamptz := date_trunc('month', now());
  p public.profiles%rowtype;
  v_plus boolean;
  v_used integer;
  v_limit integer;   -- what is enforced
  v_shown integer;   -- what the client is told (Plus reads as unlimited)
  v_source text;
begin
  if p_kind not in ('read', 'search') then
    raise exception 'unknown allowance kind: %', p_kind;
  end if;

  -- The row lock makes two racing requests queue here, so the second one
  -- sees what the first one spent.
  select * into p from public.profiles where id = p_user_id for update;
  if not found then
    return;
  end if;

  -- A lapsed period resets BOTH counters, since they share it.
  if p.allowance_period_start < v_period then
    p.reads_used := 0;
    p.searches_used := 0;
    p.allowance_period_start := v_period;
  end if;

  v_plus := p.plus_expires_at is not null and p.plus_expires_at > now();

  if p_kind = 'read' then
    v_used := p.reads_used;
    if p.reads_limit is null then
      v_limit := null; v_shown := null;
    elsif v_plus then
      v_limit := greatest(p.reads_limit, 150); v_shown := null;
    else
      v_limit := p.reads_limit; v_shown := p.reads_limit;
    end if;

    if v_limit is null or v_used < v_limit then
      v_source := case when v_plus then 'plus' else 'monthly' end;
      p.reads_used := v_used + 1;
    elsif p.pack_listings > 0 then
      v_source := 'pack';
      p.pack_listings := p.pack_listings - 1;
    end if;
    v_used := p.reads_used;
  else
    v_used := p.searches_used;
    if p.searches_limit is null then
      v_limit := null; v_shown := null;
    elsif v_plus then
      v_limit := greatest(p.searches_limit, 50); v_shown := null;
    else
      v_limit := p.searches_limit; v_shown := p.searches_limit;
    end if;

    if v_limit is null or v_used < v_limit then
      v_source := case when v_plus then 'plus' else 'monthly' end;
      p.searches_used := v_used + 1;
    end if;
    v_used := p.searches_used;
  end if;

  update public.profiles
     set reads_used = p.reads_used,
         searches_used = p.searches_used,
         pack_listings = p.pack_listings,
         allowance_period_start = p.allowance_period_start
   where id = p_user_id;

  -- A refusal names the ceiling that was hit, so the app stops offering it.
  return query select v_source is not null, v_used,
                      case when v_source is null then v_limit else v_shown end,
                      p.allowance_period_start + interval '1 month', v_source;
end;
$$;

comment on function public.spend_allowance(uuid, text) is
  'Spends one listing (''read'') or one market check (''search'') if any remains: '
  'the month''s first, then (listings only) the pack. Returns where it came from. '
  'Service role only.';

create function public.refund_allowance(p_user_id uuid, p_kind text, p_source text default 'monthly')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('read', 'search') then
    raise exception 'unknown allowance kind: %', p_kind;
  end if;

  if p_kind = 'read' and p_source = 'pack' then
    update public.profiles set pack_listings = pack_listings + 1 where id = p_user_id;
  elsif p_kind = 'read' then
    update public.profiles p
       set reads_used = greatest(p.reads_used - 1, 0)
     where p.id = p_user_id
       and p.allowance_period_start = date_trunc('month', now());
  else
    update public.profiles p
       set searches_used = greatest(p.searches_used - 1, 0)
     where p.id = p_user_id
       and p.allowance_period_start = date_trunc('month', now());
  end if;
end;
$$;

comment on function public.refund_allowance(uuid, text, text) is
  'Hands back a unit reserved for work that then failed, to the bucket it came '
  'from. Service role only.';

-- ── Recording a transaction ───────────────────────────────────────────────
-- Called with a transaction the server has already verified. Returns the
-- account it belongs to, or null when there is none (a renewal whose first
-- purchase was never recorded). A transaction stays with the account it was
-- first recorded against, whoever sends it later.
create function public.apply_transaction(
  p_user_id uuid,
  p_transaction_id text,
  p_original_transaction_id text,
  p_product_id text,
  p_kind text,
  p_environment text,
  p_purchased_at timestamptz,
  p_expires_at timestamptz,
  p_revoked_at timestamptz,
  p_signed text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_existing public.purchases%rowtype;
  v_seen boolean;
  v_rows integer;
begin
  if p_kind not in ('plus', 'pack') then
    raise exception 'unknown product kind: %', p_kind;
  end if;

  select * into v_existing from public.purchases where transaction_id = p_transaction_id for update;
  v_seen := found;

  if v_seen then
    v_user := v_existing.user_id;
  else
    -- A renewal carries the original transaction; the account is whoever
    -- bought that. Otherwise the caller named it.
    select user_id into v_user from public.purchases
     where original_transaction_id = p_original_transaction_id
     order by id limit 1;
    v_user := coalesce(v_user, p_user_id);
    if v_user is null then
      return null;
    end if;
    perform 1 from public.profiles where id = v_user for update;
    if not found then
      return null;
    end if;
  end if;

  if not v_seen then
    -- The app and Apple's notification can report the same new purchase at
    -- once. Whichever inserts second finds the row there and goes on as if it
    -- had seen it, instead of failing the unique constraint.
    insert into public.purchases
      (user_id, transaction_id, original_transaction_id, product_id, kind, environment,
       purchased_at, expires_at, revoked_at, signed_transaction)
    values
      (v_user, p_transaction_id, p_original_transaction_id, p_product_id, p_kind, p_environment,
       p_purchased_at, p_expires_at, p_revoked_at, p_signed)
    on conflict (transaction_id) do nothing;
    get diagnostics v_rows = row_count;

    if v_rows = 1 then
      if p_kind = 'pack' and p_revoked_at is null then
        update public.profiles set pack_listings = pack_listings + 10 where id = v_user;
      end if;
    else
      select * into v_existing from public.purchases where transaction_id = p_transaction_id for update;
      v_seen := true;
      v_user := v_existing.user_id;
    end if;
  end if;

  if v_seen then
    update public.purchases
       set expires_at = p_expires_at,
           revoked_at = coalesce(revoked_at, p_revoked_at),
           signed_transaction = p_signed,
           updated_at = now()
     where id = v_existing.id;

    -- A pack refunded after it was counted takes its listings back.
    if p_kind = 'pack' and v_existing.revoked_at is null and p_revoked_at is not null then
      update public.profiles set pack_listings = greatest(pack_listings - 10, 0) where id = v_user;
    end if;
  end if;

  if p_kind = 'plus' then
    update public.profiles
       set plus_expires_at = (
         select max(expires_at) from public.purchases
          where user_id = v_user and kind = 'plus' and revoked_at is null
       )
     where id = v_user;
  end if;

  return v_user;
end;
$$;

comment on function public.apply_transaction(uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, text) is
  'Records one verified App Store transaction and applies it to the meter. '
  'Idempotent on the transaction id. Service role only.';

-- ── Grants ────────────────────────────────────────────────────────────────
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default.
revoke execute on function public.spend_allowance(uuid, text) from public, anon, authenticated;
revoke execute on function public.refund_allowance(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.apply_transaction(uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, text) from public, anon, authenticated;
grant execute on function public.spend_allowance(uuid, text) to service_role;
grant execute on function public.refund_allowance(uuid, text, text) to service_role;
grant execute on function public.apply_transaction(uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, text) to service_role;
