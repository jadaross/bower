# ADR-0009: A Market on the profile, starting with Australia

**Status:** Accepted · 11 September 2026

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
