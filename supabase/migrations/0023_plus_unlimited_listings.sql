-- Plus listings are truly unlimited (Jada, 28 Sep 2026). "Unlimited" with a
-- hard stop behind it is what the ASA, the ACCC and the FTC have each ruled
-- misleading, so a person writing listings on Plus is never stopped. What is
-- limited is pace: 60 listings in an hour, one a minute, which no one taking
-- photos reaches but a script would. Going over is refused as `rate_limited`
-- (a 429 in the API, "try again in a few minutes" in the app), never as a
-- used-up allowance. A listing costs about 2p, so there is no monthly cost
-- to cap.
--
-- Market checks on Plus are named, not unlimited: 50 a month, and the meter
-- shows it.

alter table public.profiles
  add column plus_hour_start timestamptz,
  add column plus_hour_count integer not null default 0;

comment on column public.profiles.plus_hour_count is
  'Plus listings since plus_hour_start. Past 60 in an hour, a listing waits. Server-side only.';

create or replace function public.spend_allowance(p_user_id uuid, p_kind text)
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
  v_shown integer;   -- what the client is told
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

  if p_kind = 'read' and v_plus and p.reads_limit is not null then
    -- Plus: no monthly ceiling, only a pace no person reaches.
    if p.plus_hour_start is null or p.plus_hour_start <= now() - interval '1 hour' then
      p.plus_hour_start := now();
      p.plus_hour_count := 0;
    end if;
    if p.plus_hour_count >= 60 then
      v_source := 'rate_limited';
    else
      v_source := 'plus';
      p.reads_used := p.reads_used + 1;
      p.plus_hour_count := p.plus_hour_count + 1;
    end if;
    v_used := p.reads_used;
    v_shown := null;
  elsif p_kind = 'read' then
    v_used := p.reads_used;
    v_limit := p.reads_limit;
    v_shown := p.reads_limit;
    if v_limit is null or v_used < v_limit then
      v_source := 'monthly';
      p.reads_used := v_used + 1;
    elsif p.pack_listings > 0 then
      v_source := 'pack';
      p.pack_listings := p.pack_listings - 1;
    end if;
    v_used := p.reads_used;
  else
    v_used := p.searches_used;
    if p.searches_limit is null then
      v_limit := null;
    elsif v_plus then
      v_limit := greatest(p.searches_limit, 50);
    else
      v_limit := p.searches_limit;
    end if;
    v_shown := v_limit;

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
         allowance_period_start = p.allowance_period_start,
         plus_hour_start = p.plus_hour_start,
         plus_hour_count = p.plus_hour_count
   where id = p_user_id;

  return query select v_source is not null and v_source <> 'rate_limited', v_used, v_shown,
                      p.allowance_period_start + interval '1 month', v_source;
end;
$$;
