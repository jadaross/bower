-- A read can start from a pasted product page as well as (or instead of)
-- photos. Keep the page's URL on the item, so History can show where the
-- listing came from and the dashboard can count link reads.

alter table public.item_history
  add column source_url text;

comment on column public.item_history.source_url is
  'The product page the seller pasted for this read, if any. Null for a photo-only read.';
