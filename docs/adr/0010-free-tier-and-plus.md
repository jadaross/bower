# ADR-0010: A free tier of 5 and 1, a 99p listing pack, and bower Plus at £4.99

**Status:** Accepted · 12 September 2026 · amended 23 September 2026 (one free
market check a month, not two; a pack of 10 listings for £0.99 from launch; the
market check on Haiku 4.5 everywhere, 9p; the model rerun on that basis)
**Decides:** the "payment model deliberately undecided" in ADR-0007, using
`docs/research/pricing.md` (the study) and `docs/research/valuation-cost-speed.md`
(the spike that changed its cost basis).

## Context

The pricing study measured a market check at 46p and a listing at 2p, and priced
a subscription on the assumption that a cheaper search (`max_uses: 1`) would land
first. The spike then showed that lever cuts comparables by 78% and saves a
quarter, not half — while Haiku 4.5 on eBay and Vinted is 7.5× cheaper and faster
than Sonnet with more valid comparables. So the numbers below assume **the market
check v2 in `docs/roadmap.md` ships before the paywall.** Without it, Plus loses
money on a heavy user (see §Margins), and that is the whole reason the roadmap
puts it first.

On 23 September the market check moved to **Haiku 4.5 on every platform,
Depop included**, without waiting for the Sonnet-on-Depop baseline. The spike
found Haiku weak on Depop (0.7 comparables a call, every band "low"
confidence), and that is accepted: a Depop band will often be a wide,
honestly-labelled estimate, and the check costs 9p instead of 19p. Every table
below is on the 9p basis, from `scripts/pricing-model.mjs`.

## Decision

### Free — 5 listings and 1 market check a month

- **5 listings** a month (the read). One evening of a clear-out, which is the
  moment a seller hits the wall — and where the listing pack below meets them.
- **1 market check** a month, across every Enabled Platform. Monthly, not
  once ever: a returning free user should see the differentiator again. It
  was 2 until the pack came in; the pack sells listings only, so every free
  check is pure cost, and one a month still shows it off. It cuts a free
  user at the ceiling from 28p to 19p a month on the Haiku check.
- Chips and platform switching stay free, **and the app says so** — users meter
  themselves anxiously and stop exploring when they think a switch costs.
- The meters already exist (`reads_limit`, `searches_limit`, migration 0011).
  These are the numbers from the first App Store build. Never take an
  allowance away from people who have it.

### The listing pack — 10 listings for £0.99

- One **consumable** in-app purchase, on sale from 1.0 to anyone not on Plus.
  It is for the seller who runs out mid clear-out and will never subscribe —
  most of them, if the "light usage" profile below is right.
- **Listings only.** Market checks are what Plus sells; a pack of them would
  undercut it.
- Bought listings **do not expire** and are spent only after the month's free
  five, so the monthly reset never takes back something paid for. They go
  with the account if it is deleted, and the terms say so.
- **£0.99**, not £1: the price point sellers recognise from every other app.
- Nets **49p** a pack in the Small Business Program (£0.99 ÷ 1.2 VAT, less 2%
  DST, less 15% = 69p, less 20p of listings); 37p at the standard 30%.
- It sits *below* Plus, not beside it. Four packs (40 listings, £3.96) cost
  less than a month of Plus but buy no checks, and the paywall shows both with
  that as the line between them. A pack bought by someone who would otherwise
  have subscribed costs about £1.43 against a typical Plus month; one bought by
  someone who never would is 49p found. If the dashboard shows people buying
  three or more packs a month, that is the cue to point them at Plus, not to
  raise the pack.

### bower Plus — £4.99 a month

- **Unlimited listings** (fair-use ceiling of 150 a month in the terms; a
  per-minute rate limit in `withAuth`). Every competitor says "50 listings";
  "unlimited" beside that is the pitch, and a listing costs 2p.
- **10 market checks** a month, each across every Enabled Platform. The check
  stays multi-platform: a Price Band per marketplace is the thing no competitor
  does (`competitors.md` §6.5), and narrowing the default to one platform to save
  pennies would throw it away.
- Unlimited chips and switching.
- **No annual plan at launch.** Add it at **£34.99** after 90 days of usage data
  (the cluster is £29.99–£34.99; annual nets £2.02 a month and loses money on a
  user at the ceiling, so it waits until the dashboard says how common that is).
- **No market-check top-up at launch** (the listing pack above is a different
  thing). Add **10 market checks for £3.49**, subscribers only,
  once the dashboard shows burst sellers. At 9p a check the pack nets £1.52
  (£1.18 at £2.99), so the price is no longer forced; £3.49 stays because it
  is the category's number, not because the margin needs it.
- No weekly plan, no free trial of Plus, no ads, no commission. The study and the
  competitor research each rule these out independently.

The paywall copy sells **the price and the two-second read**, never "AI
descriptions" — sellers do not value those and buyers distrust them.

### Plus ships in 1.0

bower does not go to the App Store until Plus is in the build. A free launch
with a paywall to follow means either cutting an allowance later or carrying
every install as pure cost with nowhere to send the people who hit the wall;
the competitor research says billing surprises are what kill ratings, so the
purchase flow gets one launch and one review. The listing pack goes through
that same review, in the same build. TestFlight keeps the 10-and-3 meters until
then.

## Unit costs

GBP at 1.35. Listing and the Sonnet check are measured in Langfuse
(2026-09-11); the Haiku checks are the spike's per-platform averages
(2026-09-12).

| Call | Cost |
|---|---|
| Listing (Sonnet 5, up to 5 photos) | 2p |
| Chip or platform switch (Haiku 4.5) | 0.2p |
| Market check, 3 platforms, Sonnet everywhere (until 23 September) | 46p |
| Market check, 3 platforms, Haiku on eBay and Vinted, Sonnet on Depop (the v2 plan) | 19p |
| **Market check, 3 platforms, Haiku everywhere (now)** | **9p** |

A free user at the ceiling costs 19p a month (5 listings, 1 check); an average
active free user (3 listings and 1 check) about 15p, and a lingering one about
8p. A pack's 10 listings cost 20p.

## Margins per Plus subscriber

Net of Apple at £4.99: **£3.46** in the Small Business Program, £2.85 at the
standard 30%. (£4.99 ÷ 1.2 VAT, less 2% UK DST, less commission.)

| Plus user | Cost, all Haiku | Margin (SBP) | Cost, Sonnet check | Margin, Sonnet check |
|---|---|---|---|---|
| Typical — 20 listings, 6 checks | 94p | **£2.52** | £3.16 | £0.30 |
| At the ceiling — 40 listings, 10 checks | £1.70 | **£1.76** | £5.40 | −£1.94 |

The right-hand columns are why the check had to move before the paywall.

## What it costs to run

Monthly, GBP at 1.35. ✅ from the provider's page, ⚠️ recalled, check before relying.

| Item | Now | Live, minimum | Live, comfortable | Notes |
|---|---|---|---|---|
| Apple Developer Program | £6.60 | £6.60 | £6.60 | £79 a year, already paid ✅ |
| Vercel | £0 (Hobby) | **£14.80** (Pro) | £14.80 | Hobby is non-commercial by policy ✅; the project is on Hobby today under "Jada's projects" |
| Supabase | £0 (Free) | £0 | **£18.50** (Pro) | Free pauses after a week idle and has no backups ✅; go Pro once there are paying users whose history you would have to restore |
| Langfuse Cloud | £0 (Hobby) | £0 | £0 | Hobby covers tens of thousands of traces a month ⚠️; Core is ~£21.50 when it does not |
| Domain | £0 | ~£1 | ~£1 | None today; the API is on a `.vercel.app` URL. Wanted for the support address and a privacy URL that reads as yours |
| Support email | £0 | £0 | £0 | Gmail, or iCloud+ custom domain at 99p |
| Anthropic API | usage | usage | usage | The only cost that scales; see the tables above |
| **Fixed total** | **£7** | **£22** | **£41** | plus ~£21.50 if Langfuse Core is ever needed → £62 |

One-off and optional: a UK trademark search and filing (~£170, one class),
RevenueCat (free under $2,500 a month tracked revenue; the App Store Server API
does the same job for nothing).

Not costs but paperwork before the first sale: enrol in Apple's **Small Business
Program** (15% instead of 30%, the difference between £3.46 and £2.85 on every
month), the **Paid Apps agreement** with bank and tax forms (W-8BEN), and
registering as a sole trader for self-assessment. Apple is the merchant of record
in the UK and remits the VAT.

## Break-even

Assumptions, all from the study: install → paid 2% (freemium median 2.1%,
shopping 1.3%); 30% of installs use the free tier in month one, 10% keep using
it; monthly-plan retention ~17% at a year, so a subscriber lasts about six months.

The right unit is **an install**, because the free tier is paid for per install
and the subscribers arrive per install. Over its life (a subscriber lasts ~7
months at 14% monthly churn; a lingering free user about the same). The pack
line assumes 3% of installs buy 1.5 packs — a guess until the dashboard has one:

| Per install, lifetime, all Haiku | |
|---|---|
| Revenue net of the subscriber's own usage (2% × £2.52 × 7) | 35p |
| Listing packs (3% × 1.5 × 49p) | 2p |
| Free tier: month one (30% × 15p) + lingering (10% × 8p × 7) | 10p |
| **Net per install** | **27p** |
| Installs a month to cover £22 fixed | ~80 |
| Installs a month to cover £41 fixed | ~150 |
| Subscribers that many installs holds at steady state | ~12 / ~22 |

A cohort of 100 installs roughly pays its way from its first month in what it
earns (30 free users cost £4.50, 2 subscribers net £5); in cash it waits five
weeks for Apple. **The
free tier still costs a third of what the subscribers bring in**, even at 9p a
check. Cutting it from 2 checks a month to 1 changes the ceiling (28p to 19p)
but not the model's averages, which already had free users under one check a
month; it is a bound on the worst case, not a saving in the typical one.

## Year one

A month-by-month model (`scripts/pricing-model.mjs`: 2% conversion, 14% monthly
churn, Plus from launch, Supabase Pro from month 2, Apple paying five weeks after
month end, £12 for a domain, heavy usage). "Cash" is what has actually left or
reached the bank by month 12; "earned" counts what Apple still owes. The pack
column adds 3% of installs buying 1.5 packs.

| Scenario | Installs, year | Subscribers at m12 | Earned, year | …with the pack | Cash at m12 | …with the pack | Apple still owes |
|---|---|---|---|---|---|---|---|
| Quiet — 100 a month, no marketing | 1,200 | 12 | −£320 | −£290 | −£400 | −£380 | £80 |
| Works — 200 a month, +20% a month | 7,900 | 103 | **+£250** | **+£420** | −£400 | −£320 | £650 |
| Wishful — 300 a month, +35%, France in | 30,600 | 447 | **+£1,700** | **+£2,370** | −£990 | −£760 | £2,700 |
| *Works on the 19p check, 2 free checks (12 September)* | | | *−£400* | | *−£1,060* | | |

Read it this way. On the Haiku check, **year one earns in every scenario that
grows**; only the flat, unmarketed Quiet case loses, by about £300. **Cash is
still negative at month 12 in all three**, by £300–£1,000, because growth is
paid for up front and Apple pays late; the "Works" case turns cash-positive in
year two. The exit run-rate is what the year buys: "Works" leaves at about
£110–£150 a month, "Wishful" at £570–£750. Nothing here pays a salary. The move
to Haiku is worth about £650 a year in "Works" on its own; the pack adds
£50–£400 more, depending entirely on how many people buy it.

### Levers, in the "Works" scenario (200 installs a month growing 20%)

Same model, one change at a time from row A. "Earned" is the year; "m12" is the
monthly run-rate at the end of it. Usage "heavy" is 20 listings and 6 checks a
month for a subscriber; "light" is two runs a month (2 listings, 2 checks), with
free users at half that, which is probably closer to a real wardrobe-clearer.

| | Change from A | Subscribers | Earned | m12 |
|---|---|---|---|---|
| *was* | *19p check, 2 free checks, no pack (12 September's row A)* | 103 | *−£400* | *−£20* |
| A | All Haiku (9p), 1 free check, £4.99, 2%, £41 fixed, heavy, no pack | 103 | +£250 | +£110 |
| P1 | Pack bought by 1% of installs | 103 | +£300 | +£120 |
| P3 | Pack bought by 3% of installs | 103 | +£420 | +£150 |
| P5 | Pack bought by 5%, 2 packs each | 103 | +£630 | +£190 |
| C25 | P3, but a quarter of would-be subscribers buy a pack a month instead | 77 | +£170 | +£90 |
| C50 | P3, but half of them do | 51 | −£90 | +£40 |
| L | P3, light usage | 103 | +£930 | +£250 |
| F | P3 at £5.99 | 103 | +£770 | +£220 |
| H | P3 at 3% conversion | 154 | +£1,050 | +£280 |
| S | P3 on Supabase Free, no domain (£22 fixed) | 103 | +£640 | +£160 |

What the table says, in order of leverage now the check is cheap:
**conversion** (+£630 a point), **usage** (light users are worth +£510 over
heavy), **fixed costs** and **price** (+£220 and +£350), and then the pack.

The pack is the only lever with a downside. It is worth +£50 to +£380 from
people who would never subscribe, and it costs about £1 a month for every
would-be subscriber who buys a pack a month instead. **The two cancel at
roughly one would-be subscriber in six taking the pack instead** (C25 is already
below A). So the paywall has to put Plus first and the pack second, and the
90-day review watches pack-buyers-per-month against Plus conversion before
anything else.

In the Quiet scenario (100 installs a month, no marketing) no single lever makes
year one positive, though several together do: **marketing is still not
optional** for the growth tables. Paid acquisition cannot work at ~27p an
install against a £1–3 cost per install, so growth has to be organic (TikTok,
the seller subreddits, France). The UK storefront for this category tops out at
~40 ratings today; "Wishful" is a multi-market number by construction.

## Standing mode: never a negative month

Decided 12 September 2026: bower is not being marketed. It goes on the App
Store and sits there, and **the monthly run-rate must not go negative** once
the first couple of months are past. That rules the design more than the
growth tables above do.

With no marketing, usage cost is not the risk: every user's cost is bounded by
their meter (a free user at most 19p a month at 9p a check, a light subscriber
about 22p against £3.46 in). The risk is a fixed bill with too few subscribers
to cover it. So:

| Cost | Standing mode | Why |
|---|---|---|
| Apple Developer Program | £79 a year, sunk | Paid whether or not bower earns |
| Vercel Pro | **£14.80 a month — the one bill** | Hobby is non-commercial; Plus makes the API commercial |
| Supabase | Free | Text-only history; accept no backups. A weekly cron ping from Vercel stops the project pausing when nobody is using it |
| Langfuse | Hobby, free | Well within the free allowance at this volume |
| Domain | none | The `.vercel.app` URL and a Gmail support address are enough |
| Anthropic | usage, **with a monthly spend limit set in the console** | The hard ceiling on the only bill that scales. Start it at £30 |

Break-even in standing mode, light usage, ~30 organic installs a month costing
about £1 in free-tier usage at 9p a check:

| | £4.99 | £5.99 |
|---|---|---|
| Net per light subscriber a month | £3.24 | £3.94 |
| Subscribers to cover Vercel and the free users (£16) | **5** | **4** |
| Subscribers to cover Apple's fee as well (£22.40) | 7 | 6 |

Holding 5 subscribers at 2% conversion and 14% churn needs about 35 installs a
month arriving on their own; clearing Apple's fee as well needs about 55
(`scripts/pricing-model.mjs`, run to month 36). That is plausible for a UK App
Store listing in this category but not certain.

Packs count towards the same bar: about seven packs a month (49p each) are
worth one light subscriber at £4.99, so the Vercel bill alone is some 30 packs
a month with no subscribers at all. At 30–55 installs a month the pack adds
about £1 a month. It helps the run-rate but does not make standing mode on its
own; Plus is still what carries the fixed cost.

**The worst case is bounded, not a bleed.** With zero subscribers the month
costs Vercel's £14.80 plus whatever free users spend under the Anthropic cap:
about £15–£20 a month, £180–£240 a year, and it cannot grow past that without
subscribers arriving, because every free user is metered and the Anthropic
limit is a hard stop. Each subscriber takes £3–£4 off it; six zero it. Vercel
Pro is accepted as the cost of leaving the app up. If the balance still
bothers after six months, the escape is to move the five API routes to a host
whose free tier permits commercial use (Supabase Edge Functions or Cloudflare
Workers; plain TypeScript on the Anthropic SDK, a port not a rewrite), which
takes the fixed cost to £0. The annual plan and the £5.99 price both move the
bar down and should be in from launch in this mode.

Cash, not profit: Apple pays out once the balance passes its minimum (about
$150 ⚠️), so at 6 subscribers the money arrives every few months, not monthly.

## Consequences

- `docs/roadmap.md` puts market check v2 first, then Plus, then the App Store
  with both in the build.
- The meter needs an entitlement writer: App Store Server Notifications v2 (or
  RevenueCat) setting `reads_limit = null` and `searches_limit = 10` on the
  profile, server-side, never from the client — the same rule as Enabled
  Platforms. Plus needs nothing new in the schema.
- The pack does. It needs a balance of bought listings that the monthly reset
  leaves alone, spent after the free ones (and refunded to whichever pool a
  rejected read came out of), plus a ledger of Apple transaction IDs so a
  purchase is credited exactly once. The server verifies the signed StoreKit 2
  transaction before crediting it, and a `REFUND` notification takes back
  whatever is left of it. `/api/profile`'s `allowance` gains the bought balance
  and `Wire.swift` follows.
- Vercel moves to Pro on launch day, not before.
- `docs/research/pricing.md` §7 stands as the study; where it and this ADR
  differ (annual price and timing, the packs, monthly free checks, the
  multi-platform check), this ADR wins.
- Revisit at 90 days with the dashboard's checks-per-user distribution: the
  annual plan, the market-check pack, the 10-check cap and the 5-listing free
  cap all hang on it. Add packs per buyer per month and pack-then-Plus
  conversions, which say whether the listing pack feeds Plus or replaces it.
