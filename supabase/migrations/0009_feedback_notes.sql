-- Typed feedback. Thumbs and copy signals already go to Langfuse as scores;
-- this is the sentence a tester writes when something was wrong or odd, kept
-- where the app's owner can read it. Text only, like everything else stored.
--
-- Context columns say where it was written from: the screen, the item's
-- journey id (x-bower-session), the platform being shown and the trace of
-- the listing on screen, so a note can be lined up with the exact output it
-- is about.

create table public.feedback_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  message text not null,
  screen text,
  session_id text,
  platform public.platform,
  trace_id text,

  constraint feedback_notes_message_length
    check (char_length(message) between 1 and 2000)
);

comment on table public.feedback_notes is
  'Typed feedback from users, with where it was written from. Cascades on account deletion.';

create index feedback_notes_created
  on public.feedback_notes (created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.feedback_notes enable row level security;
alter table public.feedback_notes force row level security;

create policy feedback_notes_insert_own on public.feedback_notes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy feedback_notes_select_own on public.feedback_notes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── Grants ────────────────────────────────────────────────────────────────
-- A user writes and may read their own notes; nobody edits or deletes them
-- from the app. Reading everyone's is the service role's job.
revoke all on public.feedback_notes from anon, authenticated;
grant select, insert on public.feedback_notes to authenticated;
