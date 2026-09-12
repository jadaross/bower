# Valuation — cheaper, faster, no worse: a live-tested spike

Researched 2026-09-12. `docs/research/pricing.md` §7.6 listed cost levers for `/api/valuate`
and marked most of them ⚠️ (estimate) or 🔴 (investigate) rather than ✅ (measured). This doc
measures the ones that could be measured cheaply: **50 live calls** against the real prompt
in `src/lib/valuation/asking-price.ts`, in two passes — a first pass comparing 5
configurations head-to-head (N=4 each, §4), and a second, bigger pass (§5) re-testing the
one result from the first pass that looked most surprising (Haiku 4.5) at N=30 across all
three platforms — plus web research on the one lever that can't be tested with an API call
(an eBay-specific data source, §8). Total spend: **$7.13** (harness estimate; see §1).

**Confidence key** (same as the sibling docs):
✅ measured this session ·
🟡 primary source via snippet only ·
⚠️ estimate / directional ·
🔴 anecdotal / unverified.

The short version: **the two changes already planned in `pricing.md` (`max_uses:1`, and
sticking with Sonnet) both look wrong under test** — `max_uses:1` doesn't save what it
promises and breaks quality, while Haiku 4.5 is cheaper and faster than Sonnet by a wide
margin and *at least as good* at finding real comparables on two of the three platforms.
But the bigger run in §5 also found a genuine weak spot the first pass missed entirely:
**Haiku struggles specifically on Depop**, and a small fraction of its responses (~7%)
fabricate a placeholder URL instead of a real one when it can't find one — caught cleanly
by production's own validation, but worth knowing about. Read §5 before acting on §4 alone.

---

## 1. Method

**Built:** a standalone harness (not part of the app; lives in a scratchpad, not this
repo) that reconstructs `buildValuationPrompt` and `priceBandSchema` faithfully from the
real source, and calls the Anthropic Messages API directly with the project's own key.

**Pass 1 (§4), 20 calls:**
- **5 configurations** — see §10 for the full matrix (model, web-search tool version,
  `max_uses`, `effort`).
- **2 items** — a common one (Carhartt Detroit jacket, M, Good, Brown — the existing test
  fixture in `asking-price.test.ts`) and a niche one (Barbour Bedale wax jacket, size 40,
  Fair, Olive) chosen to stress low-confidence handling.
- **2 platforms** — eBay UK and Vinted UK (the priciest and a mid-cost platform per
  `pricing.md` §2). Depop was not in this pass — see why that mattered in §5.

**Pass 2 (§5), 30 calls, Haiku only:**
- **10 items** spanning common staples (Nike joggers, Levi's 501s, a Zara dress), mid-tier
  brands (Patagonia, Ralph Lauren, the Carhartt/Barbour pair from pass 1), and harder
  designer/vintage cases (Burberry trench, Yohji Yamamoto coat, Adidas Originals track
  jacket) at a spread of conditions (New with tags → Fair).
- **All 3 platforms** — eBay, Vinted, **and Depop**, added specifically because pass 1
  never touched it.

Both passes ran at concurrency 5 (matching how `valuate()` already fans out — see §3).
✅ measured. Every number in §4–§7 is from the harness's own output, not estimated.

**What this is not:** a statistically powered test. Pass 1 has N=4 per configuration; pass
2 has N=10 per platform for Haiku specifically. Treat every percentage below as a strong
directional signal, not a settled result — but it is real model output against the real
prompt and the real web, which is more than the ⚠️ estimates in `pricing.md` had, and pass
2 is 7.5× the sample of pass 1 on the one question that mattered most.

**Excluded from both passes:** Vinted's GB↔AU corridor search (would double Vinted's call
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
  second; §6 below measures what actually happens when you do.
- **The model** (`MODELS.valuation`, `claude-sonnet-5` today) and **the web-search tool
  version** (`web_search_20260209`, hardcoded in `webSearchTool()`) are both constants, not
  read from anything — changing either is a one-line code change, which is what made this
  spike cheap to run.

Output is constrained by `priceBandSchema` via `output_config.format` (`jsonSchemaFormat`),
so every response is guaranteed-parseable JSON — the model cannot wrap it in prose or omit
a field, which is also why the harness could parse all 50 responses with a plain
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
calls per "Check the market" tap, not 3–4 sequential ones. Pass 1's own harness
demonstrates the ceiling that buys: **20 calls at concurrency 5 took about 14 minutes of
wall clock, versus a summed 47.6 minutes if run one at a time** (✅ measured — `sum(ms)`
vs. observed run time) — a ~3.4× speedup, bounded by the single slowest call in the batch
(729s, under `effort: medium`, §7) rather than by anything about parallelism itself.
**The lever left on the table is not "add more parallelism" — there's nothing left to
parallelize inside one platform's search (the `pause_turn` resume loop is inherently
sequential, each resume needs the previous response) — it's cutting *each* call's
latency**, which is what §4–§7 are about.

---

## 4. Pass 1 — are smaller models "just as good"? First look: Haiku 4.5 came out ahead

| | Sonnet 5 (prod baseline) | Haiku 4.5 |
|---|---|---|
| Web search tool | `web_search_20260209` | `web_search_20250305` (older — Haiku can't use the newer one) |
| avg cost | **$0.32** | **$0.043** (7.5× cheaper) |
| avg latency | **103s** | **13.7s** (7.5× faster) |
| avg comparables returned | 2.25 | **3.75** |
| avg comparables with a valid platform URL | 1.75 | **3.25** |
| confidence distribution (n=4) | low×3, medium×1 | medium×3, low×1 |

✅ measured, N=4 each, eBay + Vinted only (Depop wasn't in this pass). On every axis this
pass measured, Haiku 4.5 won, not just tied — directly contradicting the assumption
written into `src/lib/llm/client.ts`'s comment ("Valuation stays on Sonnet 5 rather than
Haiku: it has to judge whether a search result is genuinely comparable... that judgement
IS the product"). That assumption had never been tested against this exact task before
this session. **This pass's N=4 was too small and too narrow (2 of 3 platforms) to act
on — see §5 for what a bigger, wider pass found.**

---

## 5. Pass 2 — Haiku at N=30, all three platforms: the fuller picture

Requested after §4: re-run Haiku specifically, bigger and wider, before deciding anything.
10 items (see §1) × 3 platforms = 30 calls, Haiku 4.5 only. ✅ measured.

### 5.1 Headline numbers hold up

| | |
|---|---|
| Total spend, 30 calls | **$1.17** ($0.039/call avg) |
| avg latency | **11.1s** |
| avg valid comparables | 1.73 |
| calls with zero valid comparables | 10 of 30 (33%) |

Cost and latency are consistent with pass 1's per-call average ($0.043, 13.7s) — that part
of the first signal replicates cleanly at 7.5× the sample.

### 5.2 But it's platform-dependent, and pass 1 didn't cover the weak one

| Platform | avg valid comps | valid-of-raw rate | confidence (low/med/high, n=10) |
|---|---|---|---|
| eBay | 2.30 | 85% | 6 / 4 / 0 |
| Vinted | 2.20 | 69% | 4 / 5 / 1 |
| **Depop** | **0.70** | **100%** (of a much smaller raw count) | **10 / 0 / 0** |

✅ measured. eBay and Vinted both look strong at this bigger sample — comparable-finding
and confidence distribution both reasonable. **Depop is a real weak spot**: 7 of the 10
items returned **zero** comparables there, and every single Depop call came back "low"
confidence. Pass 1 never tested Depop (it only covered eBay + Vinted), so this is a
genuinely new finding, not a confirmation of the first pass — and it means **§4's
"Haiku won on every axis" verdict doesn't extend to all three platforms bower prices.**

This spike has no Sonnet-on-Depop baseline to compare against (pass 1 didn't test Depop
either), so it can't yet say whether Depop is hard *for Haiku* or hard *for any model on
this task* — Depop's own search/SEO surface may just be thinner than eBay's or Vinted's.
That comparison is the natural next step (§11).

### 5.3 A real, if contained, defect: fabricated placeholder URLs

2 of the 30 calls (~7%) — `carhartt_jacket` on Vinted, `patagonia_fleece` on eBay — came
back with **every** comparable in that response pointing at a placeholder instead of a
real URL (`https://www.vinted.co.uk/items/xxxx`, `https://www.ebay.co.uk/itm/unknown`),
despite specific, plausible-looking titles and prices (e.g. "Patagonia Better Sweater 1/4
Zip Fleece Mens M Navy Blue Pullover Outdoor — £24.34"). This violates the prompt's
explicit instruction ("Never invent a comparable... every comparable's url must open THAT
ONE LISTING") — it reads as the model having *found* something in its search results but
failing to extract a real listing ID, and filling the gap with a placeholder rather than
dropping the entry.

**The good news:** production's own `coerceBand` already neutralizes this. Its regex
match against `itemUrl` requires a numeric ID for eBay/Vinted, so `xxxx` and `unknown`
never validate — those comparables are silently dropped, and `comparables.length === 0`
already forces confidence down to `"low"` regardless of what the model claimed (one of
the two affected calls had self-reported "medium" confidence; production would have shown
it as "low" with no comparables, which is the honest state). **No user would see a broken
link from this** — but it does mean Haiku's own confidence label can't be trusted at face
value on days it hits this failure mode, and it happened in ~1 of every 15 calls in this
sample.

### 5.4 Price bands still look directionally sane

Spot-checking the 10-item spread (not scored numerically, read for plausibility): a Zara
midi dress landed at £14–£45 depending on platform, Levi's 501s at £25–£75, a Burberry
trench at £85–£550 (wide, but authentic Burberry trenches genuinely vary that much by
era/model — appropriately wide, not appropriately *confident*), and the Yohji Yamamoto
coat at £80–£500 with mostly "low" confidence — exactly the shape you'd want for a hard,
niche, designer item. Nothing here reads as nonsense; the harder items get wider bands and
lower confidence, which is the entire point of the confidence field.

### 5.5 What this changes about the pass-1 verdict

Haiku is not a uniform win. It looks like a genuine one for **eBay and Vinted**
specifically — cheaper, faster, and at least as good at finding real comparables at 2.5×
the sample size. For **Depop**, this spike found Haiku wanting, with no baseline yet to
say whether any model does better there. A blanket model swap is not supported by this
data; a **per-platform model choice** (Haiku for eBay/Vinted, keep investigating Depop) is
what the evidence actually points to.

---

## 6. Lever 1 (`max_uses: 1`) — tested, and it doesn't do what `pricing.md` assumed

`pricing.md` §7.6 estimated `max_uses: 1` at "~$0.10–0.12 per platform... roughly halves
the fee and the result tokens Sonnet reads," marked ⚠️ estimate. Measured (pass 1, N=4):

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
quality trade-off attached; if a general cost cut is wanted, §4–§5's Haiku result is
larger and, on eBay/Vinted at least, doesn't cost quality either.

---

## 7. `effort: medium` — tested, confirms the existing choice to stay at `low`

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

## 8. The newer web-search tool (`web_search_20260318`) — no win found

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

## 9. Other ways to find a price

### 9.1 eBay Browse API — the biggest untested lever, eBay-specific

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

### 9.2 Vinted / Depop — unchanged since ADR-0005, re-checked this session

No public API for either, still. Vinted has a Pro-only "Vinted Pro Integrations" API
(`pro-docs.svc.vinted.com`) restricted to approved Pro *sellers* — not usable for a
buyer-side pricing lookup, and not what ADR-0005 was evaluating. Depop has no public API.
Both continue to prohibit scraping in their terms; third-party scraping services (Apify,
Bright Data, and similar) exist and were the exact path ADR-0005 already rejected. 🟡
Nothing found this session changes that ADR's conclusion — which also means §5.2's Depop
weak spot has no API-based workaround waiting in the wings; it's a model/prompt problem
to solve, not a data-source one.

### 9.3 Considered, not investigated further (low expected value for bower)

- **StockX / GOAT APIs** — real transaction-adjacent pricing, but scoped to sneakers and
  hype streetwear, a small slice of bower's general-clothing catalogue.
- **Google Shopping / Content API** — indexes retail catalogues, not the peer-to-peer
  resale listings on Vinted/Depop/eBay that bower's comparables need to be.
- **A 7-day search cache** (`pricing.md` lever 4) — not re-tested here; orthogonal to
  every model/tool choice above and still worth doing regardless of what else ships from
  this doc.

---

## 10. Full results

Pass 1 — 20 calls, N=4 (one per item × platform) per configuration, eBay + Vinted only:

| Config | Model | Search tool | `max_uses` | `effort` | avg cost | avg latency | avg comps (valid) | confidence (low/med/high) |
|---|---|---|---|---|---|---|---|---|
| **Baseline (prod today)** | Sonnet 5 | `20260209` | 2 | low | $0.32 | 103s | 1.75 | 3 / 1 / 0 |
| Lever 1 | Sonnet 5 | `20260209` | 1 | low | $0.24 | 75s | 0.5 | 4 / 0 / 0 |
| Haiku | Haiku 4.5 | `20250305` | 2 | (n/a) | $0.043 | 13.7s | 3.25 | 1 / 3 / 0 |
| Newer tool | Sonnet 5 | `20260318` | 2 | low | $0.33 | 191s | 3.0 | 3 / 1 / 0 |
| Effort medium | Sonnet 5 | `20260209` | 2 | medium | $0.53 | 330s | 2.75 | 2 / 2 / 0 |

Pass 2 — 30 calls, Haiku only, N=10 per platform, 10 items:

| Platform | avg cost | avg latency | avg comps (valid) | valid-of-raw | confidence (low/med/high) |
|---|---|---|---|---|---|
| eBay | $0.050 | 11.5s | 2.30 | 85% | 6 / 4 / 0 |
| Vinted | $0.043 | 13.6s | 2.20 | 69% | 4 / 5 / 1 |
| Depop | $0.024 | 8.1s | **0.70** | 100%* | **10 / 0 / 0** |

*Depop's "100% valid" is of a much smaller raw count (0.7 avg found at all) — a high
validity rate on almost nothing found is not the same as eBay/Vinted's rate on a real yield.

Raw per-call data for both passes (cost, latency, band, confidence, search count, token
usage, and every actual comparable title/URL returned) is preserved in the session's
scratchpad as `valuate-bench.mjs`/`valuate-bench-results.json` (pass 1) and
`valuate-bench-2.mjs`/`valuate-bench-results-haiku2.json` (pass 2) — available on request;
not committed to the repo since these are one-off spike scripts, not part of the app.

---

## 11. Recommendation, ordered by expected value

1. **Consider Haiku 4.5 for eBay and Vinted specifically**, not as a blanket swap. At
   N=10–14 per platform it's cheaper, faster, and at least as good at finding real,
   correctly-shaped comparables on these two — the biggest win on the list. **Do not**
   extend it to Depop on this evidence (§5.2); that platform needs its own comparison
   (Haiku vs. Sonnet vs. something else) before any change.
2. **Before shipping any Haiku change**, get a Sonnet-on-Depop baseline at the same N, to
   learn whether Depop is hard for Haiku or hard for everything (§5.2, §11.1 below), and
   have a human (Jada) read a sample of Haiku's reasoning-sentence copy for tone, since
   that's user-facing text this spike didn't score (§4).
3. **Spike the eBay Browse API** for eBay specifically (§9.1). Likely the single cheapest
   and fastest option of everything here, since it removes the LLM call from the search
   step entirely — at the cost of a small new integration and a product decision about
   whether a model still needs to judge the returned rows for comparability.
4. **Do not ship `max_uses: 1`** as `pricing.md` lever 1 proposed — it saved 25%, not the
   estimated ~50%, and cut comparable-finding by 78%.
5. **Leave `effort` at `low`.** `medium` is not a viable middle ground: 65% costlier, up
   to 7× slower (one call took 12 minutes), no reliably better output.
6. **Stay on `web_search_20260209`.** The newer `20260318` tool showed no quality or cost
   benefit and was markedly slower in this sample.
7. **Parallelism is already fully exploited** in `valuate()` and `askingPriceProvider`
   (§3) — nothing to change here; the ceiling is per-call latency, which is what 4–6
   above address.

---

## 12. Open questions for a bigger run

1. **A Sonnet-on-Depop baseline.** Neither pass tested Sonnet on Depop, so §5.2's finding
   (Haiku struggles there) can't yet be attributed to Haiku specifically vs. Depop being
   hard to search for any model. This is the single most decision-relevant gap left.
2. **The placeholder-URL failure mode (§5.3)**, at ~7% of Haiku calls in pass 2 — worth
   checking whether it also occurs on Sonnet (pass 1's small sample didn't show it, but
   N=4 is too small to rule it out) and whether a prompt tweak (explicitly forbidding a
   placeholder rather than just requiring a valid URL) reduces its rate.
3. **Reasoning-text quality.** Comparable *counts* and confidence were scored across both
   passes; the one-sentence reasoning shown to users was spot-checked for plausibility but
   not scored. Worth a human read-through (Jada) across Sonnet vs. Haiku samples before any
   model swap ships.
4. **Does the eBay Browse API need a judgment pass?** If raw keyword/category/condition
   filtering returns noisy matches, something (a small model call, or hand-written rules
   on brand/size/condition) still needs to filter for genuine comparability — which
   determines whether adopting it removes the LLM call for eBay entirely or just replaces
   the search step within it. Not answered by this session's research.
5. **Confirm eBay's actual `ItemSummary` schema** against a real sandbox call — §9.1's
   field list is 🟡 (third-party docs and search snippets; the primary eBay page 403'd).
6. **The Vinted AU corridor path** was excluded from both passes (§1) and has not been
   tested under any configuration change here.

---

### Sources

✅ measured this session: 50 live Anthropic API calls (20 in pass 1, 30 in pass 2) against
`src/lib/valuation/asking-price.ts`'s real prompt and `priceBandSchema`, using the
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
