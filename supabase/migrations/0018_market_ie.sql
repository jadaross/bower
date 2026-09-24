-- Ireland is the fourth market: EUR, vinted.ie, depop.com and ebay.ie,
-- written in British English like the UK (ADR-0009). Every platform bower
-- knows operates there, so nothing constrains the set.

alter type public.market add value 'IE';

comment on column public.profiles.market is
  'Where the seller sells: GB, IE, AU or US. Sets the currency, the sites the market check searches, the English the listing is written in, and which platforms exist.';
