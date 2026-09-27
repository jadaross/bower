-- A rejected read (not clothing, explicit, unsafe, refused, a link that
-- cannot be read) is refunded, because the seller got nothing. Unlimited,
-- that is free model time for anyone who loops rejections (#79, the red team
-- in docs/research/red-team-analyse.md). So the first ten a day are refunded
-- and the rest are not. A real failure (the model or the network going down)
-- still goes through refund_allowance, uncapped.

alter table public.profiles
  add column rejections_refunded integer not null default 0,
  add column rejections_day date not null default current_date;

comment on column public.profiles.rejections_refunded is
  'Rejected reads refunded on rejections_day. Capped at 10 a day. Server-side only.';

create function public.refund_rejection(p_user_id uuid, p_source text default 'monthly')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.profiles p
     set rejections_refunded = case when p.rejections_day < current_date then 1 else p.rejections_refunded + 1 end,
         rejections_day = current_date
   where p.id = p_user_id
     and (p.rejections_day < current_date or p.rejections_refunded < 10)
  returning p.rejections_refunded into v_count;

  if not found then
    return false;
  end if;

  perform public.refund_allowance(p_user_id, 'read', p_source);
  return true;
end;
$$;

comment on function public.refund_rejection(uuid, text) is
  'Refunds a rejected read unless ten have been refunded today. Returns whether it did. Service role only.';

revoke execute on function public.refund_rejection(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_rejection(uuid, text) to service_role;
