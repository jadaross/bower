-- The Market: where the seller sells. Which country's editions of the
-- platforms, in which currency. Lives beside enabled_platforms because the
-- same two things read it — the Valuation and the listing prompts — and
-- because a client that could name its own market could have an item priced
-- against the wrong country's listings. See src/lib/markets.ts.
--
-- Australia is the second market. Vinted does not operate there, so a
-- profile in AU may not have Vinted enabled; setMarket() drops it in the same
-- statement that moves the market, and the constraint refuses any drift.

create type public.market as enum ('GB', 'AU');

alter table public.profiles
  add column market public.market not null default 'GB';

comment on column public.profiles.market is
  'Where the seller sells: GB or AU. Sets the currency, the sites the market check searches, and which platforms exist.';

alter table public.profiles
  add constraint platforms_available_in_market
    check (market <> 'AU' or not ('vinted' = any (enabled_platforms)));

-- The client may write it, same as the platform choices. Still no write to the meter.
grant update (market) on public.profiles to authenticated;

-- History rows keep the currency their estimate was made in, so an item read
-- in Australia is not shown in pounds later.
alter table public.item_history
  add column currency text not null default 'GBP';

comment on column public.item_history.currency is
  'ISO 4217 for price_min/price_max: the Market''s currency when the item was read.';
