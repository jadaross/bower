# ADR-0010: A free tier of 5 and 2, and bower Plus at £4.99

**Status:** Accepted · 12 September 2026
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

## Decision

### Free — 5 listings and 2 market checks a month

- **5 listings** a month (the read). One evening of a clear-out, which is the
  moment a seller hits the wall.
- **2 market checks** a month, each across every Enabled Platform. Monthly, not
  once ever: a returning free user should see the differentiator again.
- Chips and platform switching stay free, **and the app says so** — users meter
  themselves anxiously and stop exploring when they think a switch costs.
- The meters already exist (`reads_limit`, `searches_limit`, migration 0011).
  These are the numbers from the first App Store build. Never take an
  allowance away from people who have it.

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
- **No top-up at launch.** Add **10 market checks for £3.49**, subscribers only,
  once the dashboard shows burst sellers. At 19p a check the pack nets 52p; at
  £2.99 it nets 18p, which is too thin unless Depop also moves to Haiku.
- No weekly plan, no free trial of Plus, no ads, no commission. The study and the
  competitor research each rule these out independently.

The paywall copy sells **the price and the two-second read**, never "AI
descriptions" — sellers do not value those and buyers distrust them.

### Plus ships in 1.0

bower does not go to the App Store until Plus is in the build. A free launch
with a paywall to follow means either cutting an allowance later or carrying
every install as pure cost with nowhere to send the people who hit the wall;
the competitor research says billing surprises are what kill ratings, so the
purchase flow gets one launch and one review. TestFlight keeps the 10-and-3
meters until then.

## Unit costs

GBP at 1.35. Listing and today's check are measured in Langfuse (2026-09-11);
the "after" checks are the spike's per-platform averages (2026-09-12).

| Call | Cost |
|---|---|
| Listing (Sonnet 5, up to 5 photos) | 2p |
| Chip or platform switch (Haiku 4.5) | 0.2p |
| Market check, 3 platforms, **today** (Sonnet everywhere) | **46p** |
| Market check, 3 platforms, **after v2** (Haiku on eBay and Vinted, Sonnet on Depop) | **19p** |
| Market check, 3 platforms, all Haiku (if the Depop baseline allows it) | 9p |

A free user at the ceiling costs 48p a month after v2; an average active free
user (say 3 listings and 1 check) about 25p, and a lingering one about 15p.

## Margins per Plus subscriber

Net of Apple at £4.99: **£3.46** in the Small Business Program, £2.85 at the
standard 30%. (£4.99 ÷ 1.2 VAT, less 2% UK DST, less commission.)

| Plus user | Cost after v2 | Margin (SBP) | Cost today | Margin today |
|---|---|---|---|---|
| Typical — 20 listings, 6 checks | £1.54 | **£1.92** | £3.16 | £0.30 |
| At the ceiling — 40 listings, 10 checks | £2.70 | £0.76 | £5.40 | **−£1.94** |

Every cell in the "today" columns is why market check v2 ships first.

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
months at 14% monthly churn; a lingering free user about the same):

| Per install, lifetime | Depop on Sonnet (19p check) | All Haiku (9p check) |
|---|---|---|
| Revenue net of the subscriber's own usage (2% × £1.92 × 7) | 27p | 36p |
| Free tier: month one (30% × 25p) + lingering (10% × 15p × 7) | 18p | 10p |
| **Net per install** | **10p** | **26p** |
| Installs a month to cover £22 fixed | ~220 | ~85 |
| Installs a month to cover £41 fixed | ~410 | ~160 |
| Subscribers that many installs holds at steady state | ~30 / ~58 | ~12 / ~23 |

A cohort of 100 installs is £5 down after month one and pays itself back in
month four. **The free tier costs more than serving the subscribers does**,
which makes it the second dial after the model choice: 2 free checks a month
is generous by design, and the 90-day review should look at it with real numbers.

## Year one

A month-by-month model (2% conversion, 14% monthly churn, Plus from launch,
Supabase Pro from month 2, Apple paying five weeks after month end, £12 for a
domain). "Cash" is what has actually left or reached the bank by month 12;
"earned" counts what Apple still owes.

| Scenario | Installs, year | Subscribers at m12 | Earned, year | Cash at m12 | Apple still owes |
|---|---|---|---|---|---|
| Quiet — 100 a month, no marketing | 1,200 | 12 | −£420 | −£520 | £80 |
| Works — 200 a month, +20% a month | 7,900 | 104 | −£430 | −£1,100 | £660 |
| Wishful — 300 a month, +35%, France in | 30,600 | 448 | −£930 | −£3,640 | £2,700 |
| Same three, all-Haiku check | | | −£290 / **+£280** / **+£1,500** | −£390 / −£390 / −£1,210 | |

Read it this way. **Year one costs you money in every scenario**, somewhere
between £400 and £1,000 of your own cash on the cost basis this ADR assumes,
because growth is paid for up front through the free tier and Apple pays late.
What you buy with it is the run-rate you exit the year with: the "Works" case
ends at 103 subscribers and would net about £150 a month the moment growth
levelled off; "Wishful" ends at 447 and about £420. Nothing here pays a salary
in year one. The number that moves the whole table is the cost of a market
check, not the price of Plus.

### Levers, in the "Works" scenario (200 installs a month growing 20%)

Same model, one change at a time. "Earned" is the year; "m12" is the monthly
run-rate at the end of it. Usage "heavy" is 20 listings and 6 checks a month
for a subscriber; "light" is two runs a month (2 listings, 2 checks), with free
users at half that, which is probably closer to a real wardrobe-clearer.

| | Check | Free tier | Price | Conv. | Fixed | Usage | Earned | m12 |
|---|---|---|---|---|---|---|---|---|
| A · this ADR as written | 19p | 5L + 2C/mo | £4.99 | 2% | £41 | heavy | −£440 | −£22 |
| B · all-Haiku | **9p** | 5L + 2C/mo | £4.99 | 2% | £41 | heavy | **+£220** | +£109 |
| E · B, one free check ever | 9p | 5L + 1C ever | £4.99 | 2% | £41 | heavy | +£330 | +£132 |
| F · B at £5.99 | 9p | 5L + 2C/mo | **£5.99** | 2% | £41 | heavy | +£570 | +£181 |
| H · B at 3% conversion | 9p | 5L + 2C/mo | £4.99 | **3%** | £41 | heavy | +£850 | +£239 |
| K · no Haiku on Depop, but £5.99 and one free check ever | 19p | 5L + 1C ever | £5.99 | 2% | £41 | heavy | +£140 | +£97 |
| M · this ADR, light usage | 19p | 5L + 2C/mo | £4.99 | 2% | £41 | **light** | +£310 | +£131 |
| N · all-Haiku, light usage | 9p | 5L + 2C/mo | £4.99 | 2% | £41 | light | **+£720** | +£211 |
| P · N at £5.99 | 9p | 5L + 2C/mo | £5.99 | 2% | £41 | light | +£1,070 | +£283 |
| J · everything: 9p, 1C ever, £5.99, 3%, Supabase Free | 9p | 5L + 1C ever | £5.99 | 3% | £22 | heavy | +£1,690 | +£388 |

What the table says, in order of leverage: the **check cost** (A→B, +£660),
then **conversion** (+£630 a point), then **price** (+£350 for £1), then
**fixed costs** (+£210 for staying on Supabase Free), and last the **free tier**
(+£110 for one check ever instead of two a month — not worth the meaner
product). In the Quiet scenario (100 installs a month, no marketing) no
combination is profitable except J, barely: **marketing is not optional.**

Two more honest readings. Paid acquisition cannot work at 10–26p an install
against a £1–3 cost per install; growth has to be organic (TikTok, the seller
subreddits, France). And the UK storefront for this category tops out at ~40
ratings today; "Wishful" is a multi-market number by construction.

## Standing mode: never a negative month

Decided 12 September 2026: bower is not being marketed. It goes on the App
Store and sits there, and **the monthly run-rate must not go negative** once
the first couple of months are past. That rules the design more than the
growth tables above do.

With no marketing, usage cost is not the risk: every user's cost is bounded by
their meter (a free user at most 28p a month at 9p a check, a light subscriber
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
about £2 in free-tier usage:

| | £4.99 | £5.99 |
|---|---|---|
| Net per light subscriber a month | £3.24 | £3.94 |
| Subscribers to cover Vercel and the free users (£17) | **6** | **5** |
| Subscribers to cover Apple's fee as well (£23.40) | 8 | 6 |

Holding 6 subscribers at 2% conversion and 14% churn needs about 40 installs a
month arriving on their own. That is plausible for a UK App Store listing in
this category but not certain, so the fallback is decided now rather than
later: **if after six months there are fewer than 5 subscribers, move the five
API routes off Vercel** to a host whose free tier permits commercial use
(Supabase Edge Functions or Cloudflare Workers; the routes are plain
TypeScript on the Anthropic SDK and port cleanly), leaving the dashboard on
Vercel Hobby. Fixed cost is then £0 and a negative month is impossible by
construction. The annual plan and the £5.99 price both move the bar down and
should be in from launch in this mode.

Cash, not profit: Apple pays out once the balance passes its minimum (about
$150 ⚠️), so at 6 subscribers the money arrives every few months, not monthly.

## Consequences

- `docs/roadmap.md` puts market check v2 first, then Plus, then the App Store
  with both in the build.
- The meter needs an entitlement writer: App Store Server Notifications v2 (or
  RevenueCat) setting `reads_limit = null` and `searches_limit = 10` on the
  profile, server-side, never from the client — the same rule as Enabled
  Platforms. The schema needs nothing.
- Vercel moves to Pro on launch day, not before.
- `docs/research/pricing.md` §7 stands as the study; where it and this ADR
  differ (annual price and timing, the pack, monthly free checks, the
  multi-platform check), this ADR wins.
- Revisit at 90 days with the dashboard's checks-per-user distribution: the
  annual plan, the pack, the 10-check cap and the 5-listing free cap all hang
  on it.
