-- The United States is the third market: USD, vinted.com, depop.com and
-- ebay.com, and listings written in American English (ADR-0009, amended).
-- Every platform bower knows operates there, so nothing constrains the set.

alter type public.market add value 'US';

comment on column public.profiles.market is
  'Where the seller sells: GB, AU or US. Sets the currency, the sites the market check searches, the English the listing is written in, and which platforms exist.';
