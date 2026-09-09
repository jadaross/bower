-- Item history — a text-only record of what each user has run, so they can see
-- their past items and the values. NO images: photos are still read and
-- discarded (ARCHITECTURE "No image storage" holds for images); this stores
-- only the Neutral Listing text and any Valuation result.
--
-- Correlated to one item's journey by `session_id` — the same id the client
-- sends as `x-bower-session` and that groups the item's Langfuse traces. analyse
-- inserts the row; valuate updates the same row by session_id.

create table public.item_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  -- The item's journey id (x-bower-session). Not unique on its own — scoped
  -- to the user — so valuate updates this user's row for this session.
  session_id text,

  -- The Neutral Listing essentials. Text only.
  brand text not null,
  clothing_type text not null,
  title text not null,
  colour_primary text,
  size text,
  condition text not null,
  price_min numeric,
  price_max numeric,
  preferred_platform public.platform,

  -- Filled in when a real price search runs: per-platform bands + recommendation.
  valuation jsonb
);

comment on table public.item_history is
  'Text-only per-user item history. No photos. Cascades on account deletion.';

create index item_history_user_created
  on public.item_history (user_id, created_at desc);
create index item_history_user_session
  on public.item_history (user_id, session_id);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.item_history enable row level security;
alter table public.item_history force row level security;

create policy item_history_select_own on public.item_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy item_history_insert_own on public.item_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy item_history_update_own on public.item_history
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Grants ────────────────────────────────────────────────────────────────
-- Unlike profiles (where the meter columns are off-limits), the user owns their
-- whole history row, so they may read, insert and update it — all gated by the
-- own-row policies above.
revoke all on public.item_history from anon, authenticated;
grant select, insert, update on public.item_history to authenticated;
