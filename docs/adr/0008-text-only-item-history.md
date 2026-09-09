# bower stores a text-only item history

A future reader will ask why, after ADR-0001/0003 deliberately made bower keep
nothing, it now has an `item_history` table — and why the app and privacy page
used to promise "no history". Because the product wanted a payoff the
zero-storage stance couldn't give: the user seeing what they have run and the
prices they got, over time. We added a **text-only** history and drew a hard
line at images.

## What is stored, and what is not

`item_history` (migration 0006) holds, per user, the Neutral Listing essentials
(brand, type, title, colour, size, condition, the guess range, preferred
platform) and — once a search runs — the Valuation (per-platform bands +
recommendation). It is correlated to one item's journey by the
`x-bower-session` id, the same id that groups the item's Langfuse traces.

**No photos.** Images are still read once and discarded; they are never
persisted and never sent to Langfuse. This is the line that keeps the privacy
cost proportionate: text about a second-hand jacket is low-sensitivity; a
photograph of someone's home, face, or a tag bearing their name is not.

## Consequences

- **The privacy surface grew, and had to be told the truth.** The `/privacy`
  page and the Settings copy were rewritten (they said "keeps no history"), and
  the App Store privacy labels must declare stored User Content — #43.
- **Deletion is free and total.** `user_id references auth.users(id) on delete
  cascade`, so `DELETE /api/profile` wipes the history with the account; there
  is no second deletion path to maintain.
- **RLS owns the boundary.** Rows are read/written as the caller
  (`userClient`), never the service role — a user can only ever touch their own
  history, the same guarantee `profiles` has.
- **Writes are best-effort.** A history failure never breaks analyse or
  valuate; the user's work matters more than the record of it.
