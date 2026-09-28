-- LAUNCH DAY ONLY (#76, ADR-0010). Apply with the build that goes to App
-- Review, never before: it cuts TestFlight testers from 10 listings and
-- 3 market checks to the launch free tier.
--
-- On the day, copy this into supabase/migrations/ as the next numbered
-- migration and apply it. It lives here, outside migrations, so nothing
-- applies it early.
--
-- The free tier becomes 5 listings and 1 market check a month, for new
-- accounts and every free account now. The owner's unlimited account (null
-- limits) is untouched, and so is anyone on Plus, whose numbers come from
-- plus_expires_at, not these columns. Used counts are left as they are, so
-- someone already past 5 this month simply has none left until the 1st.

alter table public.profiles
  alter column reads_limit set default 5,
  alter column searches_limit set default 1;

update public.profiles
   set reads_limit = 5,
       searches_limit = 1
 where reads_limit is not null
   and searches_limit is not null;
