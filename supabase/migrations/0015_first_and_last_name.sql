-- What the seller told bower to call them, collected once at the
-- "introduce yourself" onboarding page. Two columns because the People
-- dashboard wants a full name to tell accounts apart, but the app only ever
-- greets with the first. Nullable: accounts created before this shipped, and
-- anyone who signs up before finishing onboarding, have neither yet.
alter table public.profiles
  add column first_name text,
  add column last_name text;

comment on column public.profiles.first_name is
  'What the seller told bower to call them, collected once at "introduce yourself" onboarding. Used in-app greetings.';
comment on column public.profiles.last_name is
  'Collected alongside first_name at "introduce yourself"; shown in the owner''s dashboard, never in the app itself.';

-- The client may write these, same as the platform choices.
grant update (first_name, last_name) on public.profiles to authenticated;
