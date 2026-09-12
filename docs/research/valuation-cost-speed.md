# Valuation — cheaper, faster, no worse: a live-tested spike

Researched 2026-09-12. `docs/research/pricing.md` §7.6 listed cost levers for `/api/valuate`
and marked most of them ⚠️ (estimate) or 🔴 (investigate) rather than ✅ (measured). This doc
measures the ones that could be measured cheaply: **20 live calls against the real prompt
in `src/lib/valuation/asking-price.ts`**, across 5 configurations, 2 items, 2 platforms, plus
web research on the one lever that can't be tested with an API call (an eBay-specific data
source). Total spend: **$5.96** (harness estimate; see §1).

**Confidence key** (same as the sibling docs):
✅ measured this session ·
🟡 primary source via snippet only ·
⚠️ estimate / directional ·
🔴 anecdotal / unverified.

The short version: **the two changes already planned in `pricing.md` (`max_uses:1`, and
sticking with Sonnet) both look wrong under test** — `max_uses:1` doesn't save what it
promises and breaks quality, while Haiku 4.5 came out *ahead* of Sonnet on cost, speed,
and comparable-finding in this sample. Neither is a large enough sample to ship on
alone — see §11 — but both are cheap to verify further and change the shape of what to
build next more than anything else on the list.

---

## 1. Method

**Built:** a standalone harness (not part of the app; lives in a scratchpad, not this
repo) that reconstructs `buildValuationPrompt` and `priceBandSchema` faithfully from the
real source, and calls the Anthropic Messages API directly with the project's own key,
for every combination of:

- **5 configurations** — see §9 for the full matrix (model, web-search tool version,
  `max_uses`, `effort`).
- **2 items** — a common one (Carhartt Detroit jacket, M, Good, Brown — the existing test
  fixture in `asking-price.test.ts`) and a niche one (Barbour Bedale wax jacket, size 40,
  Fair, Olive) chosen to stress low-confidence handling.
- **2 platforms** — eBay UK and Vinted UK (the priciest and a mid-cost platform per
  `pricing.md` §2).

20 calls at concurrency 5 (matching how `valuate()` already fans out — see §3).
✅ measured. Every number in §4–§7 is from `results.json` (20 rows), not estimated.

**What this is not:** a statistically powered test. Each configuration has **N=4** (one
run per item×platform pair). Treat every percentage below as a directional signal worth
verifying at 5–10× the sample size before it drives a production change — not as a
settled result. It is, however, real model output against the real prompt and the real
web, which is more than the ⚠️ estimates in `pricing.md` had.

**Excluded from this run:** Vinted's GB↔AU corridor search (would double Vinted's call
count for a question this spike wasn't asking — see §3 for why the corridor doesn't
change the parallelism story). Comparable URLs were validated by the same regex
`coerceBand` already uses in production (does the URL match the platform's real
item-page pattern) — **not** fetched for liveness. Vinted forbids scraping (ADR-0005),
so this spike didn't try to open the URLs it got back; it can only report that they are
correctly *shaped*, not that they still resolve.

**Fetched directly (✅) for §8:** eBay Developers Program Browse API overview page (403,
could not read — see below), search-result snippets citing the same page and its
`item_summary/search` reference, and a GitHub-hosted API client's field docs for
`ItemSummary`. **Failed:** `developer.ebay.com/api-docs/buy/browse/overview.html`
returned 403 to the fetch tool — the same failure mode `pricing.md` §1 hit on other eBay
developer pages. Vinted developer-access search (🟡, snippets only, no primary fetch).

---

## 2. What the inputs are

`askingPriceProvider.band(item, platform, market)` builds one Anthropic Messages request
per platform (and, when Vinted has a corridor market, one more — see §3):

- **`ValuationItem`** — `brand`, `clothing_type`, `size`, `condition`, `colour_primary`,
  optionally `material` and others: the same object `analyse` already produced, JSON-dumped
  straight into the prompt.
- **`MarketPresence`** — the platform's site in this market: `webUrl` (what to search),
  `searchDomains` (fed to `allowed_domains`), `itemUrl` (the regex a returned comparable's
  URL must match to survive `coerceBand`), `itemUrlExample`, and an optional `corridor`.
- **Two model knobs, not one:** `output_config.effort` (`"low"` in production) and the web
  search tool's `max_uses` (`2` in production). `pricing.md` lever 1 proposed changing the
  second; §5 below measures what actually happens when you do.
- **The model** (`MODELS.valuation`, `claude-sonnet-5` today) and **the web-search tool
  version** (`web_search_20260209`, hardcoded in `webSearchTool()`) are both constants, not
  read from anything — changing either is a one-line code change, which is what made this
  spike cheap to run.

Output is constrained by `priceBandSchema` via `output_config.format` (`jsonSchemaFormat`),
so every response is guaranteed-parseable JSON — the model cannot wrap it in prose or omit
a field, which is also why the harness could parse all 20 responses with a plain
`JSON.parse` and no salvage logic.

---

## 3. Can we run things in parallel? Yes — already shipped, and close to the theoretical limit

Two levels of parallelism already exist in the current code, not proposed here:

- **`src/lib/valuation/index.ts`** — `valuate()` fans out over every Enabled Platform with
  `Promise.allSettled`, one search each, concurrently. A partial result (some platforms
  succeed, one fails) is still returned; only an all-fail is an error.
- **`src/lib/valuation/asking-price.ts`** — `askingPriceProvider.band()` additionally runs
  the home-market search and the corridor-market search (Vinted GB+AU only, today)
  concurrently with `Promise.allSettled`, then `mergeBands` folds them.

So a seller with all three platforms enabled already issues 3–4 concurrent Anthropic
calls per "Check the market" tap, not 3–4 sequential ones. This spike's own harness
demonstrates the ceiling that buys: **20 calls at concurrency 5 took about 14 minutes of
wall clock, versus a summed 47.6 minutes if run one at a time** (✅ measured — `results.json`,
`sum(ms)` vs. observed run time) — a ~3.4× speedup, bounded by the single slowest call in
the batch (729s, under `effort: medium`, §6) rather than by anything about parallelism
itself. **The lever left on the table is not "add more parallelism" — there's nothing
left to parallelize inside one platform's search (the `pause_turn` resume loop is
inherently sequential, each resume needs the previous response) — it's cutting *each*
call's latency**, which is what §4–§7 are about.

---

## 4. Are smaller models "just as good"? Tested — Haiku 4.5 came out ahead, not just cheaper

| | Sonnet 5 (prod baseline) | Haiku 4.5 |
|---|---|---|
| Web search tool | `web_search_20260209` | `web_search_20250305` (older — Haiku can't use the newer one) |
| avg cost | **$0.32** | **$0.043** (7.5× cheaper) |
| avg latency | **103s** | **13.7s** (7.5× faster) |
| avg comparables returned | 2.25 | **3.75** |
| avg comparables with a valid platform URL | 1.75 | **3.25** |
| confidence distribution (n=4) | low×3, medium×1 | medium×3, low×1 |

✅ measured, N=4 each. On every axis this spike measured — cost, latency, and how many
genuine-looking comparables came back — Haiku 4.5 won, not just tied. That directly
contradicts the assumption written into `src/lib/llm/client.ts`'s comment ("Valuation
stays on Sonnet 5 rather than Haiku: it has to judge whether a search result is genuinely
comparable... that judgement IS the product"). That assumption was never tested against
this exact task before; it now has one small test against it.

**Why this is a signal, not a verdict:**
- N=4. A run this size can flip on one unlucky item. Before touching `MODELS.valuation`,
  re-run at 20–30 items across all three platforms (roughly $1–2 at Haiku's measured
  rate) and read the actual comparable URLs and reasoning text for plausibility, not just
  the counts.
- Haiku is stuck on `web_search_20250305`, which Anthropic's docs describe as coarser (no
  dynamic result filtering) than the newer tool versions Sonnet/Opus can use. It didn't
  show up as a problem in this sample — Haiku's returned listing titles and URLs were
  correctly shaped and plausible (spot-checked, not live-fetched, per §1) — but a bigger
  sample matters more here than for the other levers, precisely because the tool itself
  is a known-weaker version.
- The **reasoning sentence is user-facing copy** ("Similar Carhartt Detroit jackets... are
  listed at £65–£95"). This spike didn't score prose quality, only structure. Sample
  reasoning sentences from both models read comparably well, but a human pass before
  shipping is worth the five minutes.

---

## 5. Lever 1 (`max_uses: 1`) — tested, and it doesn't do what `pricing.md` assumed

`pricing.md` §7.6 estimated `max_uses: 1` at "~$0.10–0.12 per platform... roughly halves
the fee and the result tokens Sonnet reads," marked ⚠️ estimate. Measured:

| | Baseline (`max_uses: 2`) | `max_uses: 1` |
|---|---|---|
| avg cost | $0.32 | **$0.24** (25% cheaper, not ~50%) |
| avg latency | 103s | 75s |
| avg comparables (valid URL) | 1.75 | **0.5** |
| runs with zero comparables | 1 of 4 | **3 of 4** |
| total web searches actually issued (see below) | 2 every time | **1, 1, 7, 8** |

✅ measured, N=4. Three of four `max_uses:1` runs returned **no comparables at all** and
"low" confidence on an unattributed band. This is a much bigger quality hit than the ADR
anticipated ("Ship, then check comparables-per-band did not drop" — it dropped by 78%).

**Why:** `max_uses` caps searches per *API turn*, not per item. `searchSite()` already has
a resume loop for `pause_turn` (up to `MAX_RESUMES = 3`), built for a different reason
(the API handing back control mid-search) — but it also means a model that wants more
than `max_uses` searches doesn't just stop early: it pauses, gets resumed with a *fresh*
`max_uses` budget, and searches again, up to 4 total turns. Two of the four `max_uses:1`
runs in this sample did exactly that — 7 and 8 total searches, more than the `max_uses:2`
baseline ever used — while still failing to synthesize a comparable list, as if losing
track of earlier findings across the resumed turns. Cost falls less than hoped because
the tokens are still spent across more round trips; quality falls sharply because the
final synthesis appears to suffer from being split across turns.

**Recommendation: do not ship `max_uses: 1` as specified.** If eBay's search cost
specifically needs to come down, §8.1 (the eBay Browse API) is a cleaner lever with no
quality trade-off attached; if a general cost cut is wanted, §4's Haiku result is larger
and, on this evidence, doesn't cost quality either.

---

## 6. `effort: medium` — tested, confirms the existing choice to stay at `low`

| | `effort: low` (prod) | `effort: medium` |
|---|---|---|
| avg cost | $0.32 | **$0.53** (65% more) |
| avg latency | 103s | **330s** (one run: 729s = 12.1 minutes) |
| avg comparables (valid URL) | 1.75 | 2.75 |
| confidence | low×3, medium×1 | low×2, medium×2 |

✅ measured, N=4. A little better on comparables and confidence, but at 65% more cost and
up to 7× the latency, with one call taking over 12 minutes — worse than the `effort:high`
number the code comment already warned about (~8 minutes). This is the same failure shape
already documented in `asking-price.ts`, now measured at the "medium" setting too: there
is no safe middle ground between `low` and the rest. **No change — `low` stays correct.**

---

## 7. The newer web-search tool (`web_search_20260318`) — no win found

Production hardcodes `web_search_20260209`. A newer `web_search_20260318` tool exists in
the installed SDK (`@anthropic-ai/sdk@0.120.0`) and was tested as a drop-in swap, same
model and settings otherwise:

| | `web_search_20260209` (prod) | `web_search_20260318` |
|---|---|---|
| avg cost | $0.32 | $0.33 (flat) |
| avg latency | 103s | **191s** (85% slower) |
| avg comparables returned (raw) | 2.25 | 4.0 |
| avg comparables with valid URL | 1.75 (78% of raw) | 3.0 (75% of raw) |
| confidence | low×3, medium×1 | low×3, medium×1 (unchanged) |

✅ measured, N=4. Raw comparable count went up, but the *proportion* that were genuinely
usable (valid platform URL) didn't improve, confidence didn't improve, and latency got
markedly worse. **No action — stay on `20260209`** until Anthropic's own changelog gives
a reason to revisit (there was no fetchable changelog entry explaining what changed
between the two dates as of this session).

---

## 8. Other ways to find a price

### 8.1 eBay Browse API — the biggest untested lever, eBay-specific

- **Auth:** application-only (client-credentials grant, an app token) — **no seller OAuth
  needed.** ADR-0003 removed *seller* OAuth and publishing, not app-level API credentials,
  so this doesn't reopen that decision. ⚠️ (the primary overview page 403'd to the fetch
  tool; corroborated by two independent search-result summaries and a third-party client's
  field docs — see §1).
- **Cost:** free; ~5,000 calls/day on the free tier, higher available on request, no
  per-call fee. ⚠️
- **What it returns:** `item_summary/search` takes `q` (keyword), `category_ids`, and a
  `filter` param (price range, condition, buying option), scoped to a market via the
  `X-EBAY-C-MARKETPLACE-ID` header (`EBAY_GB`). Results are `ItemSummary` objects that
  (per the eBay-hosted client docs found) include price, condition, and an item URL. 🟡
  (field-level detail is from a third-party client's docs and search snippets, not a
  primary fetch of eBay's own reference page — reasonable to trust for a spike, worth
  confirming against eBay's actual schema before writing code against it).
- **Why this is allowed:** ADR-0005 rules out *sold*-price sources, not asking-price ones.
  This is live listings — the same category of data Claude's web search already reads for
  eBay, just from eBay's own index instead of a general search engine.
- **What it would change:** for eBay specifically, this could remove the web-search step
  (and its $0.01/search fee and result-token cost) entirely, replacing it with a near-free
  HTTP call — cheaper than any model-choice lever above, because there's no LLM call in
  the search step at all. Not built or tested this session (needs a developer account and
  app credentials); the open design question is §11's third bullet — does a raw keyword
  match need a judgment pass (a model, or hand-written filtering rules) to be trusted as
  "genuinely comparable," or does eBay's own filtering do enough of that job.

### 8.2 Vinted / Depop — unchanged since ADR-0005, re-checked this session

No public API for either, still. Vinted has a Pro-only "Vinted Pro Integrations" API
(`pro-docs.svc.vinted.com`) restricted to approved Pro *sellers* — not usable for a
buyer-side pricing lookup, and not what ADR-0005 was evaluating. Depop has no public API.
Both continue to prohibit scraping in their terms; third-party scraping services (Apify,
Bright Data, and similar) exist and were the exact path ADR-0005 already rejected. 🟡
Nothing found this session changes that ADR's conclusion.

### 8.3 Considered, not investigated further (low expected value for bower)

- **StockX / GOAT APIs** — real transaction-adjacent pricing, but scoped to sneakers and
  hype streetwear, a small slice of bower's general-clothing catalogue.
- **Google Shopping / Content API** — indexes retail catalogues, not the peer-to-peer
  resale listings on Vinted/Depop/eBay that bower's comparables need to be.
- **A 7-day search cache** (`pricing.md` lever 4) — not re-tested here; orthogonal to
  every model/tool choice above and still worth doing regardless of what else ships from
  this doc.

---

## 9. Full results

All 20 calls, at N=4 (one per item × platform) per configuration.

| Config | Model | Search tool | `max_uses` | `effort` | avg cost | avg latency | avg comps (valid) | confidence (low/med/high) |
|---|---|---|---|---|---|---|---|---|
| **Baseline (prod today)** | Sonnet 5 | `20260209` | 2 | low | $0.32 | 103s | 1.75 | 3 / 1 / 0 |
| Lever 1 | Sonnet 5 | `20260209` | 1 | low | $0.24 | 75s | 0.5 | 4 / 0 / 0 |
| Haiku | Haiku 4.5 | `20250305` | 2 | (n/a) | **$0.043** | **13.7s** | **3.25** | 1 / 3 / 0 |
| Newer tool | Sonnet 5 | `20260318` | 2 | low | $0.33 | 191s | 3.0 | 3 / 1 / 0 |
| Effort medium | Sonnet 5 | `20260209` | 2 | medium | $0.53 | 330s | 2.75 | 2 / 2 / 0 |

Raw per-call data (cost, latency, band, confidence, search count, token usage, and the
actual comparable titles/URLs returned) is preserved in the session's scratchpad as
`valuate-bench.mjs` (the harness) and `valuate-bench-results.json` (all 20 rows) —
available on request; not committed to the repo since it's a one-off spike script, not
part of the app.

---

## 10. Recommendation, ordered by expected value

1. **Re-test Haiku 4.5 at N=20–30** across all three platforms and a wider variety of
   items before deciding anything. If it holds up, it's a ~7× cost and latency cut with
   *better* measured comparable-finding in this sample — bigger than every other lever
   combined — and `client.ts`'s comment should change from an assumption to a re-measured
   conclusion, one way or the other.
2. **Spike the eBay Browse API** for eBay specifically (§8.1). Likely the single cheapest
   and fastest option of everything here, since it removes the LLM call from the search
   step entirely — at the cost of a small new integration and a product decision about
   whether a model still needs to judge the returned rows for comparability.
3. **Do not ship `max_uses: 1`** as `pricing.md` lever 1 proposed — it saved 25%, not the
   estimated ~50%, and cut comparable-finding by 78%.
4. **Leave `effort` at `low`.** `medium` is not a viable middle ground: 65% costlier, up
   to 7× slower (one call took 12 minutes), no reliably better output.
5. **Stay on `web_search_20260209`.** The newer `20260318` tool showed no quality or cost
   benefit and was markedly slower in this sample.
6. **Parallelism is already fully exploited** in `valuate()` and `askingPriceProvider`
   (§3) — nothing to change here; the ceiling is per-call latency, which is what 1–5 above
   address.

---

## 11. Open questions for a bigger run

1. **Sample size.** Everything measured here is N=4 per configuration. Before touching
   production, re-run at N=20–30, across a wider spread of brands/categories/conditions
   and all three platforms (including the Vinted AU corridor path, excluded from this
   spike — see §1).
2. **Reasoning-text quality.** Comparable *counts* were scored here; the one-sentence
   reasoning shown to users was not. Worth a human read-through (Jada) across Sonnet vs.
   Haiku samples before any model swap ships.
3. **Does the eBay Browse API need a judgment pass?** If raw keyword/category/condition
   filtering returns noisy matches, something (a small model call, or hand-written rules
   on brand/size/condition) still needs to filter for genuine comparability — which
   determines whether adopting it removes the LLM call for eBay entirely or just replaces
   the search step within it. Not answered by this session's research.
4. **Confirm eBay's actual `ItemSummary` schema** against a real sandbox call — §8.1's
   field list is 🟡 (third-party docs and search snippets; the primary eBay page 403'd).

---

### Sources

✅ measured this session: `results.json` (20 live Anthropic API calls against
`src/lib/valuation/asking-price.ts`'s real prompt and `priceBandSchema`), using the
project's own `ANTHROPIC_API_KEY`.

eBay (⚠️/🟡 — primary page 403'd, corroborated by search snippets and a third-party client's docs):
[Browse API overview](https://developer.ebay.com/api-docs/buy/browse/overview.html) (403) ·
[item_summary/search reference](https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search) ·
[ItemSummaryApi client docs (GitHub)](https://github.com/numerogeek/ebay-browse-api/blob/master/docs/Api/ItemSummaryApi.md) ·
`docs/adr/0003-ebay-oauth-and-publishing-removed.md` (confirms only *seller* OAuth was removed)

Vinted (🟡 snippets, no primary fetch):
[Vinted Pro Integrations docs](https://pro-docs.svc.vinted.com/) ·
search summaries citing scraping-tool vendors (ScrapeBadger, Lobstr, Redrip) as the only
third-party route, consistent with `docs/adr/0005-asking-price-valuation.md`

Repo:
`src/lib/valuation/asking-price.ts`, `src/lib/valuation/index.ts`, `src/lib/llm/client.ts`,
`docs/research/pricing.md` §2, §7.6, §8, `docs/adr/0005-asking-price-valuation.md`
