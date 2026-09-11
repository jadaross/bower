-- Clear history. The user owns their rows, so they may delete them, gated by
-- the same own-row test as the other policies in 0006.

create policy item_history_delete_own on public.item_history
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant delete on public.item_history to authenticated;
