-- Plus's listing ceiling comes down from 150 to 100 a month (Jada, 28 Sep
-- 2026): 100 listings cost about £2, so even a subscriber who writes every
-- one of them keeps bower in profit, with or without the Small Business
-- Program (ADR-0010). Market checks stay at 50. Only the number changes;
-- the function is otherwise exactly migration 0019's.

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
      v_limit := greatest(p.reads_limit, 100); v_shown := null;
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
