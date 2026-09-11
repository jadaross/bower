-- The Allowance is 10 credits a month, spent on reads or searches alike. Forty
-- was the figure before the cost of a search was measured: a search is 25
-- times a read, and forty of them would be $25 a user.
--
-- A null limit means no limit. The owner's account has one, so the app can
-- be exercised without a meter in the way.

alter table public.profiles
  alter column allowance_limit drop not null,
  alter column allowance_limit set default 10;

update public.profiles set allowance_limit = 10 where allowance_limit = 40;

-- The one account that is exempt: the owner's, matched by email so the id
-- never has to be written down here.
update public.profiles p
   set allowance_limit = null
  from auth.users u
 where u.id = p.id and u.email = 'jada-ross@hotmail.com';

comment on column public.profiles.allowance_limit is
  'Credits per month, spent on reads or searches alike. Null means unlimited.';

-- spend_allowance treats a null limit as no limit. Body otherwise as in 0003.
create or replace function public.spend_allowance(p_user_id uuid)
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
  update public.profiles p
     set allowance_used =
           case when p.allowance_period_start < v_period then 1
                else p.allowance_used + 1 end,
         allowance_period_start = greatest(p.allowance_period_start, v_period)
   where p.id = p_user_id
     and (p.allowance_period_start < v_period
          or p.allowance_limit is null
          or p.allowance_used < p.allowance_limit)
  returning p.allowance_used, p.allowance_limit, p.allowance_period_start
       into v_used, v_limit, v_start;

  if found then
    return query select true, v_used, v_limit, v_start + interval '1 month';
    return;
  end if;

  select p.allowance_used, p.allowance_limit, p.allowance_period_start
    into v_used, v_limit, v_start
    from public.profiles p
   where p.id = p_user_id;

  if not found then
    return;
  end if;

  return query select false, v_used, v_limit, v_start + interval '1 month';
end;
$$;
