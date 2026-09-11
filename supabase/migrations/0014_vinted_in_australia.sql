-- Vinted launched in Australia on 1 July 2026 (vinted.com.au). The constraint
-- in 0013 assumed it had not; every platform bower knows now operates in
-- both markets, so the set and the market can no longer disagree.
alter table public.profiles
  drop constraint platforms_available_in_market;
