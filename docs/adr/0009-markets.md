# ADR-0009: A Market on the profile, starting with Australia

**Status:** Accepted · 11 September 2026 · amended 24 September 2026 (the
United States, and the listing's English follows the Market)

## Context

bower was built for one country. Pounds were in the valuation prompt and the
recommendation copy, `vinted.co.uk` and `ebay.co.uk` were the search domains,
the web search was told the user was in Great Britain, and the app wrote `£`
in front of every number. That was correct for every user until the first
Australian tester signed up — and then it was confidently wrong for them:
British prices, from British sites.

## Decision

A **Market** (`GB` | `AU`) lives on the profile beside the Enabled Platforms,
and the server reads it from there for the same reason it reads the
platforms from there: a client that could name its own market could have an
item priced against the wrong country's listings.

The Market decides four things and nothing else:

1. **Currency** — of the estimate, the Price Bands, the Comparables and the
   Recommendation. Stored on history rows too, so an item read in dollars
   is not shown in pounds later.
2. **Where the market check looks** — the search's `user_location.country`
   and the allowed domains, per platform per market
   (`src/platforms/*/metadata.ts` → `markets`).
3. **Fees** — per platform per market, for the display-only net figure.
4. **Which platforms exist** — all three, in both markets, today (Vinted
   launched in Australia on 1 July 2026 at `vinted.com.au`). The seam is
   kept: a move to a market drops any Enabled Platform that does not operate
   there and moves the preference, in one statement. (Migration 0013 first
   shipped with a constraint that assumed Vinted was not in Australia; 0014
   drops it.)

The listing prompts do **not** change with the Market. British English suits
Australian listings, and only the currency sign in the voice rules follows
the market.

**How a market is detected:** the device's Region setting (`Locale.current.region`)
is the first guess on the where-you-sell page, confirmed there, and editable
in Profile. Accounts made before markets existed are moved once, silently,
from `GB` to `AU` when they next open the app on an Australian device; after
that the choice in Profile stands. The server never infers it from an IP.

## Consequences

- Australia can be switched on in App Store availability once a build with
  this lands (it is UK-only at launch; see #55).
- Ireland is the next market and is mostly a data entry: `EUR`, `vinted.ie`,
  `ebay.ie`, and the fee table.
- Every platform bower knows is fee-free for a private seller in both
  markets today (eBay UK since Oct 2024, Depop AU since Jul 2026), so the
  net figure equals the asking price. The plumbing stays for the day one of
  them charges again; the recommendation never ranked on fees anyway
  (ADR-0004).

## Amendment — the United States (24 September 2026)

The third Market is **`US`**: USD, `vinted.com`, `depop.com`, `ebay.com`, searched
from the US (#64). Two things this ADR said no longer hold.

**The listing prompts change with the Market.** "British English suits
Australian listings" was true, and it is why Australia needed nothing. It is not
true of the United States, where "jumper", "trainers", "postage", "UK 10" and
"colour" read as foreign and buyers filter by US sizes. So a Market now carries
its English (`british` | `american`), and one rule in `markets.ts`
(`languageRule`) sets the spelling, the terms, the currency sign, the size system
and the unit for measurements, for format, analyse and refine alike. The platform
specs take the Market too, for the form's own labels (eBay US and Vinted US say
"Color"; eBay US says "New with defects"), and so do the seller notes ("Ships
within 1 business day") and the measurements chip (inches). The UK and Australian
prompts are byte-for-byte what they were.

**A platform charges a private seller.** eBay US takes 13.6% + $0.40 an order on
clothing, and Depop US leaves the seller its payment processing (3.3% + $0.45), so
the fee table grew a fixed part (`feeFixed`) and the net figure is below the
asking price for the first time. It is still display-only; the recommendation
still does not rank on it (ADR-0004).

Vinted US has no corridor: US sellers sell only to US buyers.

**A region bower does not cover no longer becomes the UK.** The device's region
is still the first guess, but where it is not a Market the where-you-sell page
preselects nothing, says bower does not cover that country yet, and waits for a
pick. Falling back to GB gave a Canadian British prices in pounds, which is the
failure this ADR was written to prevent.
