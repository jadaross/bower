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

- A Plus subscriber is worth **£1.92** a month after their own usage.
- At 2% conversion each subscriber arrives with ~5 lingering free users, ~75p a
  month. Call a subscriber **£1.17 net**.
- A cohort of 100 installs costs ~£7.50 in its first month (the free tier) and
  brings 2 subscribers; it pays for itself in month two.

| Fixed costs | Subscribers to break even | Installs to get there (2%) | Installs a month to stay there |
|---|---|---|---|
| £22 (minimum) | **~20** | ~1,000 | ~175 |
| £41 (with Supabase Pro) | ~35 | ~1,750 | ~300 |
| £62 (with Langfuse Core) | ~53 | ~2,650 | ~450 |

And what the same arithmetic says at scale, after fixed costs of £41:

| Subscribers | Net a month |
|---|---|
| 20 | −£18 |
| 100 | £76 |
| 500 | £544 |
| 1,000 | £1,129 |

Two honest readings of that table. The business is the Anthropic bill: cost,
not price, is the lever, which is why the eBay Browse API and the Depop model
question stay on the roadmap. And the UK storefront for this category tops out
at ~40 ratings today; the competitor research says France and the US are where
the installs are. A thousand subscribers is a multi-market number.

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
