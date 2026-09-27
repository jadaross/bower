# Price benchmark: the Haiku market check

27 September 2026 (#78). 16 items, four per market (UK, Ireland, US, Australia),
from resale staples (Barbour Beaufort, Nuptse, R.M. Williams) to high-street
basics (Zara, Primark, Old Navy, Kmart). Each run **twice per platform**
through the real provider (Haiku 4.5, live web search, cache bypassed): 96
calls, about £3. Raw results: `price-benchmark.json`. Rerun with
`npm run bench:prices` after any prompt or model change.

No hand-checked prices yet: the `known` column in `scripts/eval/prices.json`
is empty, because checking asking prices by hand on Vinted and Depop is a
person's job, and prices found by searching the web would be the same method
as the check itself. So this measures what can be measured without an answer
key.

## Results

| | Vinted | Depop | eBay |
|---|---|---|---|
| Two runs agree (band overlap, median) | 0.59 | 0.71 | 0.54 |
| Band width (÷ midpoint, median) | 0.59 | 0.65 | 0.66 |
| Comparables per band (mean) | 2.4 | 1.2 | 2.9 |
| Comparables with a real listing URL | 94% | 81% | 100% |
| Confidence labels | 13 medium, 19 low | 30 low | 15 medium, 17 low |
| Failed calls | 0 of 32 | 2 of 32 | 0 of 32 |
| Seconds per call (median) | 7.8 | 5.8 | 8.2 |
| Input tokens per call (median) | 43k | 13k | 39k |

## What it says

**Good:**
- Every band was in a believable range for the item. Nothing absurd: Barbour
  Beaufort £45 to £160, Levi's 501 £12 to £45, R.M. Williams A$110 to A$475,
  an Old Navy tee $2 to $18. (A judgement, not a hand check.)
- Fast and cheap, as ADR-0010 assumed: about ten seconds a check with the
  platforms in parallel, about 8 to 9p.
- The links are real. The placeholder-URL rule holds: 94 to 100% on Vinted and
  eBay.
- The confidence label is honest. Depop is always "low", and it should be.

**Not good enough:**
- **Two runs of the same item often disagree.** Median overlap is 0.54 to
  0.71; the worst cases don't overlap at all: Nuptse on eBay €50 to 115, then
  €100 to 220; Zimmermann on Depop A$180 to 280, then A$290 to 450. A seller
  who checks twice, or checks with a friend, sees two answers.
- **21 of 94 bands (22%) rest on no comparables at all.** ADR-0005 says a
  Price Band exists only with Comparables behind it; these are estimates
  wearing a band's clothes.

## Verdict

**Good enough to launch on, after one fix.** Before charging for it, a band
with no comparables must not be shown as a Price Band: say "no listings
found" for that platform (or show it clearly as an estimate). That is the
one thing that would be untrue on screen today.

**Strongly recommended with it:** the Supabase comparables cache (roadmap,
market check v2, step 4). A 7-day cache keyed on the item makes the same item
get the same answer, which fixes the disagreement from the seller's side, and
makes repeats free.

Both are #80. Once someone fills in `known` for a handful of items, rerun to
get "the band contains the fair price".
