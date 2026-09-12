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
  Launch **1.0 free at these numbers**, so 1.1 only ever adds. Never take an
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

A month-by-month model (2% conversion, 14% monthly churn, Plus from month 2,
Supabase Pro from month 3, Apple paying five weeks after month end, £12 for a
domain). "Cash" is what has actually left or reached the bank by month 12;
"earned" counts what Apple still owes.

| Scenario | Installs, year | Subscribers at m12 | Earned, year | Cash at m12 | Apple still owes |
|---|---|---|---|---|---|
| Quiet — 100 a month, no marketing | 1,200 | 12 | −£430 | −£520 | £80 |
| Works — 200 a month, +20% a month | 7,900 | 103 | −£460 | −£1,120 | £650 |
| Wishful — 300 a month, +35%, France in | 30,600 | 447 | −£980 | −£3,680 | £2,690 |
| Same three, all-Haiku check | | | −£300 / **+£240** / **+£1,430** | −£400 / −£430 / −£1,280 | |

Read it this way. **Year one costs you money in every scenario**, somewhere
between £400 and £1,000 of your own cash on the cost basis this ADR assumes,
because growth is paid for up front through the free tier and Apple pays late.
What you buy with it is the run-rate you exit the year with: the "Works" case
ends at 103 subscribers and would net about £150 a month the moment growth
levelled off; "Wishful" ends at 447 and about £420. Nothing here pays a salary
in year one. The number that moves the whole table is the cost of a market
check, not the price of Plus.

Two more honest readings. Paid acquisition cannot work at 10–26p an install
against a £1–3 cost per install; growth has to be organic (TikTok, the seller
subreddits, France). And the UK storefront for this category tops out at ~40
ratings today; "Wishful" is a multi-market number by construction.

## Consequences

- `docs/roadmap.md` puts market check v2 before the App Store, and Plus in 1.1.
- The meter needs an entitlement writer: App Store Server Notifications v2 (or
  RevenueCat) setting `reads_limit = null` and `searches_limit = 10` on the
  profile, server-side, never from the client — the same rule as Enabled
  Platforms. The schema needs nothing.
- Vercel moves to Pro on the day Plus goes live, not before.
- `docs/research/pricing.md` §7 stands as the study; where it and this ADR
  differ (annual price and timing, the pack, monthly free checks, the
  multi-platform check), this ADR wins.
- Revisit at 90 days with the dashboard's checks-per-user distribution: the
  annual plan, the pack, the 10-check cap and the 5-listing free cap all hang
  on it.
