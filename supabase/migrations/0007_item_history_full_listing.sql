-- Keep the whole Neutral Listing on each history row, so the detail view can
-- show the item exactly as it was first seen — title, description, hashtags and
-- the platform's form fields — and copy each field again. The individual
-- columns stay for the cheap list query; this is the full record for the detail.
alter table public.item_history
  add column listing jsonb;

comment on column public.item_history.listing is
  'The full Neutral Listing (analyse output): title, description, hashtags, fields, etc.';
