-- Seller notes: the handful of things about the seller, not the garment, that
-- a listing may say. "From a smoke-free home", "pet-free", "posted within a
-- day", "happy to bundle". Buyers value them when true and punish them when
-- false (docs/research/what-sells-terminology.md §2.6), and the model cannot
-- see any of them in a photo. So they are opt-in, per user, and the prompts
-- may only write the ones switched on here.
--
-- A fixed vocabulary rather than free text: each note has one agreed phrasing
-- per platform in src/lib/seller-notes.ts, and free text would be a second
-- place to write a listing.

alter table public.profiles
  add column seller_notes text[] not null default '{}';

comment on column public.profiles.seller_notes is
  'Opt-in facts about the seller a listing may state: smoke_free, pet_free, posts_next_day, bundles. Empty means the listing says nothing about the seller.';

alter table public.profiles
  add constraint seller_notes_known
    check (seller_notes <@ array['smoke_free', 'pet_free', 'posts_next_day', 'bundles']::text[]);

-- The client may write it, same as the platform choices. Still no write to the meter.
grant update (seller_notes) on public.profiles to authenticated;
