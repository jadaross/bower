-- Two meters instead of one. A read (a generation) costs 2p to serve; a deep
-- research (the live price search) costs about 46p. One shared credit could not
-- carry a price, so each kind now has its own count and its own limit:
-- 10 generations and 3 deep researches a month. Null limit means no limit.
--
-- The period is still shared: both meters roll over together on the 1st.

alter table public.profiles
  rename column allowance_used to reads_used;
alter table public.profiles
  rename column allowance_limit to reads_limit;

alter table public.profiles
  add column searches_used integer not null default 0,
  add column searches_limit integer default 3;

alter table public.profiles
  add constraint searches_used_non_negative check (searches_used >= 0);

comment on column public.profiles.reads_used is
  'Generations spent this period. Server-side only.';
comment on column public.profiles.reads_limit is
  'Generations a month. Null means no limit.';
comment on column public.profiles.searches_used is
  'Deep researches spent this period. Server-side only.';
comment on column public.profiles.searches_limit is
  'Deep researches a month. Null means no limit.';

-- The owner's account is exempt from both.
update public.profiles p
   set searches_limit = null
  from auth.users u
 where u.id = p.id and u.email = 'jada-ross@hotmail.com';

-- ── Spend ─────────────────────────────────────────────────────────────────
drop function if exists public.spend_allowance(uuid);
drop function if exists public.refund_allowance(uuid);

create function public.spend_allowance(p_user_id uuid, p_kind text)
returns table (
  allowed boolean,
  allowance_used integer,
  allowance_limit integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period timestamptz := date_trunc('month', now());
  v_used integer;
  v_limit integer;
  v_start timestamptz;
begin
  if p_kind not in ('read', 'search') then
    raise exception 'unknown allowance kind: %', p_kind;
  end if;

  -- One statement per kind, so the row lock is held for microseconds. The
  -- period rolls over here rather than on a schedule; a lapsed period resets
  -- BOTH counters, since they share it.
  if p_kind = 'read' then
    update public.profiles p
       set reads_used = case when p.allowance_period_start < v_period then 1 else p.reads_used + 1 end,
           searches_used = case when p.allowance_period_start < v_period then 0 else p.searches_used end,
           allowance_period_start = greatest(p.allowance_period_start, v_period)
     where p.id = p_user_id
       and (p.allowance_period_start < v_period
            or p.reads_limit is null
            or p.reads_used < p.reads_limit)
    returning p.reads_used, p.reads_limit, p.allowance_period_start
         into v_used, v_limit, v_start;
  else
    update public.profiles p
       set searches_used = case when p.allowance_period_start < v_period then 1 else p.searches_used + 1 end,
           reads_used = case when p.allowance_period_start < v_period then 0 else p.reads_used end,
           allowance_period_start = greatest(p.allowance_period_start, v_period)
     where p.id = p_user_id
       and (p.allowance_period_start < v_period
            or p.searches_limit is null
            or p.searches_used < p.searches_limit)
    returning p.searches_used, p.searches_limit, p.allowance_period_start
         into v_used, v_limit, v_start;
  end if;

  if found then
    return query select true, v_used, v_limit, v_start + interval '1 month';
    return;
  end if;

  -- Nothing was spent: exhausted, or no such profile. Tell those apart.
  if p_kind = 'read' then
    select p.reads_used, p.reads_limit, p.allowance_period_start
      into v_used, v_limit, v_start from public.profiles p where p.id = p_user_id;
  else
    select p.searches_used, p.searches_limit, p.allowance_period_start
      into v_used, v_limit, v_start from public.profiles p where p.id = p_user_id;
  end if;

  if not found then
    return;
  end if;

  return query select false, v_used, v_limit, v_start + interval '1 month';
end;
$$;

comment on function public.spend_allowance(uuid, text) is
  'Spends one generation (''read'') or one deep research (''search'') if any '
  'remains, rolling the period over first when it has lapsed. Service role only.';

-- ── Refund ────────────────────────────────────────────────────────────────
create function public.refund_allowance(p_user_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'read' then
    update public.profiles p
       set reads_used = greatest(p.reads_used - 1, 0)
     where p.id = p_user_id
       and p.allowance_period_start = date_trunc('month', now());
  elsif p_kind = 'search' then
    update public.profiles p
       set searches_used = greatest(p.searches_used - 1, 0)
     where p.id = p_user_id
       and p.allowance_period_start = date_trunc('month', now());
  else
    raise exception 'unknown allowance kind: %', p_kind;
  end if;
end;
$$;

comment on function public.refund_allowance(uuid, text) is
  'Hands back a unit reserved for work that then failed. Service role only.';

-- ── Grants ────────────────────────────────────────────────────────────────
revoke execute on function public.spend_allowance(uuid, text) from public, anon, authenticated;
revoke execute on function public.refund_allowance(uuid, text) from public, anon, authenticated;
grant execute on function public.spend_allowance(uuid, text) to service_role;
grant execute on function public.refund_allowance(uuid, text) to service_role;
