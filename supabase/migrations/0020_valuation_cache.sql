-- The comparables cache, shared by every server instance (#80, roadmap:
-- market check v2, step 4). src/lib/valuation/cache.ts keeps a band here for
-- seven days under its item key (market | platform | brand | type | size |
-- condition), so a repeat of the same item costs nothing and gets the same
-- answer. A band with no comparables is never written.
--
-- Rows are item descriptions and public asking prices: nothing about who
-- asked. Expired rows are ignored on read and overwritten on the next
-- write of the same key; there is no sweep, since a row is a few KB.

create table public.valuation_cache (
  key text primary key,
  band jsonb not null,
  stored_at timestamptz not null default now()
);

comment on table public.valuation_cache is
  'Price Bands by item key, for seven days. Shared across instances. Service role only.';

alter table public.valuation_cache enable row level security;
revoke all on public.valuation_cache from anon, authenticated;
