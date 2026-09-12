# Pricing — a free tier and a paid tier that makes a profit

Researched 2026-09-11. This is the pricing study for the paywall (ADR-0007 said
"metered from day one, payment model deliberately undecided"; this is the deciding).
It takes the unit economics measured in Langfuse on 2026-09-11 as fact, prices the
competition from their own pages, pulls the consumer-subscription benchmarks from
RevenueCat and Adapty, works Apple's cut through a UK example, and ends with one
concrete recommendation in §7.

**Confidence key** (same as the sibling docs):
✅ platform-owned or primary source fetched ·
🟡 primary source via snippet only ·
⚠️ secondary source, directional ·
🔴 anecdotal / unverified.

The short version: **a search costs 25× a read, so the read can be free and the
search cannot.** Every number below is downstream of that.

---

## 1. Method

**Fetched directly (✅):** pricing pages for Vendoo, List Perfectly, Crosslist, Nifty,
OneShop, Snappy, Vinting.app; UK App Store listings (in-app purchase lists) for AI
Listing Assistant, VintSnap, PreLoved AI, List My Closet, Future Reference; Apple's
subscription page, Small Business Program page, App Review Guidelines §3.1, and the
App Store Connect price-points page; RevenueCat *State of Subscription Apps* 2025 and
2026; Adapty *State of In-App Subscriptions* 2026; Anthropic's pricing page; Vercel's
Hobby-plan page; Supabase pricing; Claude consumer pricing; Vinted Pro.

**Snippet only (🟡):** Depop's zero-fee announcement, Vinted's Buyer Protection page,
eBay's Magical Listing announcements, SellHound's support page, Apple's 2020 UK
Digital Services Tax notice, PreLoved AI's per-plan item counts.

**Failed:** `flyp.com/pricing` and `openai.com/chatgpt/pricing` (403); Lista and
Vendoo on the App Store (429 rate-limited); Depop fees help page (403); Reddit
(`old.reddit.com` refused by the fetch tool, as the sibling doc predicted — the Chrome
extension route in `what-sells-terminology.md` §1 was not used this session, so §6
leans on revealed pricing rather than stated willingness to pay, and says so). ReeLister
does not appear to exist under that name.

---

## 2. Unit economics

Measured in Langfuse 2026-09-11 (treated as fact). GBP at 1.35.

| Call | Model | Cost | £ |
|---|---|---|---|
| Read ("Price it", photos → listing + guess) | Sonnet 5 | **$0.025** (+$0.005 per extra photo) | 2p |
| Search ("Get a real price"), all three platforms | Sonnet 5 + web search | **$0.62** (eBay $0.27, Vinted $0.19, Depop $0.16; each incl. $0.02 search fees) | 46p |
| Search, one platform | same | **~$0.19** | 14p |
| Switch platform or tap a chip | Haiku 4.5 | $0.003 | ~0 |

Token rates confirm the shape: Sonnet 5 is $2/$10 per MTok, Haiku 4.5 $1/$5, and web
search is $10 per 1,000 searches on top of the tokens the results occupy. ✅
[Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing). The
`max_uses: 2` in `src/lib/valuation/asking-price.ts` means each platform runs up to two
searches, so the $0.02 fee line is two searches; the other $0.15–0.25 per platform is the
result tokens Sonnet reads. One margin note: Sonnet 5's $2/$10 was introductory pricing
due to rise to $3/$15 on 1 September 2026; Anthropic's page now says the increase
"will not occur". ✅ (same page). A future 50% rise would move a one-platform search
to roughly $0.28.

**Fixed costs.** ~$0 today, but not once money changes hands: the Vercel Hobby plan
"restricts users to non-commercial, personal use only" ✅
[Vercel — Hobby plan](https://vercel.com/docs/plans/hobby), so the paywall obliges a
Pro seat at $20/month. Supabase Free (50,000 MAU, 500 MB, pauses after a week of
inactivity) is enough for a long while; Pro is "from $25/month" ✅
[Supabase pricing](https://supabase.com/pricing). Apple Developer Program £79/year.
Call it **£22/month** fixed at launch (£40 with Supabase Pro).

### 2.1 Cost to serve one user per month

Reads + searches, at today's cost (all three platforms) and with the search confined to
the Preferred Platform (§5, lever 2).

| Profile | Reads | Searches | Today (3 platforms) | Preferred only |
|---|---|---|---|---|
| Taster | 3 | 1 | $0.70 · £0.51 | $0.27 · £0.20 |
| Light | 10 | 3 | $2.11 · £1.56 | $0.82 · £0.61 |
| Typical seller | 20 | 8 | $5.46 · £4.04 | $2.02 · £1.50 |
| Prices everything | 20 | 20 | $12.90 · £9.56 | $4.30 · £3.19 |
| Heavy | 50 | 30 | $19.85 · £14.70 | $6.95 · £5.15 |
| Power | 100 | 100 | $64.50 · £47.78 | $21.50 · £15.93 |

Two things fall out. First, **reads are noise**: even 100 of them is £1.85. Second,
**no consumer price covers unmetered three-platform searches** — the "prices
everything" seller costs £9.56 against a £4.99 sticker that nets £3.46 (§5). The meter
must count searches, and the default search must be one platform.

The current meter (10 credits, a read or a search each costs one) makes 10 credits worth
anywhere from 25p to £4.60. It cannot be priced. It has to be split.

---

## 3. What the comparable apps charge

### 3.1 Direct comparables — AI listing apps for Vinted/Depop/eBay UK

These are the apps a UK seller finds when they search the App Store, and the cluster
bower will be judged against.

| App | Free | Paid | Metering | Source |
|---|---|---|---|---|
| **PreLoved AI: Vinted Listings** (4.5★, 22) | 1 listing/month, no card | Basic £4.99/mo (£29.99/yr); Standard £12.99/mo (£99.99/yr); "special offer" £2.99 / £6.99 first month | Listings per month — Basic 50, Standard 250 🟡 | ✅ [App Store GB](https://apps.apple.com/gb/app/preloved-ai-vinted-listings/id6749449859) |
| **Vinting.app** (web) | 10 lifetime listings | Pro £4.99/mo — 50 listings + "real-time market pricing"; Max £9.99/mo — 250 | Listings per month, subscription only, no packs | ✅ [vinting.app](https://vinting.app/) |
| **Snappy** (web) | 3 listings, no card | £3.49/mo — 50 credits; £29.99/yr — 600 credits; packs £3.99/50, £5.99/100, £9.99/250, "never expire" | 1 credit = 1 listing incl. UK price suggestion (4–8p) | ✅ [snappylisting.co.uk](https://www.snappylisting.co.uk/) |
| **VintSnap** (4.6★, 11) | First listing free; earn credits by watching ads | Packs only: 20/£2.49, 35/£4.99, 50/£6.99, 120/£12.99 (11–12p per credit) | Credits, no subscription — "you only pay when you list" | ✅ [App Store GB](https://apps.apple.com/gb/app/vintsnap-sell-on-vinted-fast/id6761385561) |
| **AI Listing Assistant** (3.7★, 3) | 1 listing per day | £2.99/week, £5.99/week, £34.99/year; 3-day trial | Weekly subscription | ✅ [App Store GB](https://apps.apple.com/gb/app/ai-listing-assistant/id6762225350) |
| **List My Closet** (no ratings yet) | Free download | Pro £7.99/mo, £49.99/yr; packs 5/£1.99, 10/£3.99, 25/£6.99 | Both | ✅ [App Store GB](https://apps.apple.com/gb/app/list-my-closet/id6758005659) |
| **Future Reference: Resale AI** (US only) | Free | 10% of each sale | Commission | ✅ [App Store](https://apps.apple.com/gb/app/future-reference/id6739167071) |

The cluster: **£3.49–£4.99 a month for ~50 listings, £29.99–£34.99 a year, credits at
4–12p each, free tier of 1–10 listings.** Nobody in it prices a live search separately;
Vinting's "real-time market pricing" is bundled into 50 listings for £4.99, which means
it is not paying $0.19 a look (see §8 Q4).

### 3.2 US crosslisters (the price ceiling for "serious" resellers)

| App | Free | Paid (USD/mo) | Metering | Source |
|---|---|---|---|---|
| Vendoo | 5 items/month, 14-day card trial | Starter $14.99 (annual $12.49), Growth $29.99, Pro $59.99 — all unlimited items; older ladder ($8.99/25 items … $149.99/4,000) still shown | New items per month, then background removals | ✅ [vendoo.co/pricing](https://www.vendoo.co/pricing) |
| List Perfectly | none | Simple $29, Business $49, Pro $69, Pro Plus $99+ | Unlimited listings; **AI listings metered** 25/50/200/1,000 per month | ✅ [listperfectly.com/pricing](https://listperfectly.com/pricing/) |
| Crosslist | 20 listings or 3 days | Bronze $29.99 (200 new listings/mo), Silver $34.99 (500), Gold $39.99 (1,000), Diamond $44.99 (unlimited); AI credits +$4.99/mo | New listings per month | ✅ [crosslist.com/pricing](https://crosslist.com/pricing) |
| Nifty | 7-day trial | Crosslisting Plus $39.99 (500 "smart credits"), Pro $59.99 (1,000); bundles $69.99–$89.99; annual ~10% off | Active items + AI credits | ✅ [nifty.ai/pricing](https://nifty.ai/pricing) |
| OneShop | — | $45 single plan | flat | ✅ [tools.oneshop.com/pricing](https://tools.oneshop.com/pricing) |
| Flyp | 100-day trial | $9 flat, no AI | flat | ⚠️ [crosslist.com blog](https://crosslist.com/blog/flyp-cost) (site 403) |
| PosherVA / Closet Assistant | 14-day / 7-day | $25 / $7.99–$24.99 | flat | ⚠️ [nifty.ai](https://nifty.ai/post/posher-va-cost), [vendoo blog](https://blog.vendoo.co/poshmark-bots-what-you-need-to-know-about-using-bots) |
| SellHound | 7 listings | $2.50 per listing, packs down to $2.00; price lookup ("Fetch") free | Per listing | 🟡 [support.sellhound.com](https://support.sellhound.com/knowledge/how-much-does-it-cost-to-use-the-sellhound-posting-app) |

Pattern: the US tools charge $15–$60 and meter **AI generations** separately from
listings (List Perfectly, Crosslist, Nifty all do), which is the same discovery bower
made — the LLM call is the cost, the listing is not.

### 3.3 The platforms' own tools and the free substitutes

- **Vinted**: 0% seller fees; the buyer pays Buyer Protection. Vinted Pro "is entirely
  free". ✅ [vinted.co.uk/pro](https://www.vinted.co.uk/pro), 🟡
  [Buyer Protection fee](https://www.vinted.co.uk/help/342-buyer-protection-fee-on-vinted).
- **Depop**: 10% selling fee removed for UK listings from 20 March 2024; 2.9% + £0.30
  processing remains; Depop ships free AI listing from one photo. 🟡
  [Depop newsroom — zero selling fees](https://news.depop.com/company-news/evolving-our-fee-structure-with-zero-selling-fees-on-depop/),
  [Depop — AI listing from one photo](https://news.depop.com/company-news/depop-launches-ai-powered-listing-from-one-photo/).
- **eBay**: Magical Listing (photo → title, specifics, description) is free, in the UK
  app. 🟡 [eBay innovation](https://innovation.ebayinc.com/stories/ebay-reduces-the-time-to-list-on-mobile-with-new-simplified-selling-tool-now-featuring-magical-listing-ai-technology/).
- **ChatGPT**: free tier takes photos; Go about £4.99+VAT; Plus £16+VAT. ⚠️
  [profee.com](https://www.profee.com/articles/chatgpt-pricing-and-subscription-options-in-the-uk) (openai.com 403).
- **Claude**: free tier; Pro $20/mo ($17 annual). ✅ [claude.com/pricing](https://claude.com/pricing).

So a seller's mental price for "write my listing" is **zero**, three times over. What
none of the free tools do is tell them a **price grounded in what the platform is
asking today**, per platform, in one tap. That is the paid thing.

---

## 4. Consumer AI-app pricing norms and conversion benchmarks

All from RevenueCat 2026 unless marked (115,000 apps). ✅
[State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/),
✅ [2025 edition](https://www.revenuecat.com/state-of-subscription-apps-2025/).

**Price points.** Median monthly $8–$10 (North America $9.99); median annual $34.80;
median weekly $5–$5.90 (Western Europe $7.03). "$5 weekly, $10 monthly, $30 yearly"
are the sticky points 🟡. Adapty 2026 (16,000 apps): UK weekly median $8.72, the
highest reported; European prices +18% YoY; "a median annual plan costs just 3× the
price of a monthly plan"; weekly plans are now 55.6% of all revenue. ✅
[Adapty 2026](https://adapty.io/state-of-in-app-subscriptions-report/). Adapty 2025
global medians: $7.48/week, $12.99/month, $38.42/year ⚠️
[Airbridge summary](https://www.airbridge.io/en/blog/subscription-app-pricing-by-category-2026-benchmark).

**Conversion (install → paid, day 35).** Hard paywall 10.7% median vs freemium 2.1% —
"5× better". Shopping category 1.3%; Western Europe 2.0%; low-priced apps 1.4%,
mid 2.0%, high 2.8%. Download-to-trial median 6.2% (2025); Utilities 6.5% (2026).

**Trials.** Trial-to-paid: ≤4 days 25.5%, 5–9 days 37.4%, 17–32 days 42.5%. Day-0
cancellations: 55.4% on 3-day trials, 39.8% on 7-day. 46.5% of apps now use ≤4-day
trials.

**Retention and LTV.** Year-1 retention (2025): annual 44.1%, monthly 17.0%, **weekly
3.4%**. Year-1 realised LTV per payer: high-priced $62.19, mid $28.75, low $10.69 — the
price you charge matters more than the conversion you lose. Revenue per install, day 60:
freemium $0.27 (D14), overall $0.34.

**AI apps specifically.** 41% more revenue per payer than non-AI apps, but churn 30%
faster (12-month retention 21.1% vs 30.7%) and higher refund rates 🟡
[RevenueCat blog summary](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026).
The 2025 report's line: "AI alone won't drive success, differentiation does." Adapty:
AI apps convert install-to-paid at 3.71% vs 4.20% average, with 70% higher install LTV.

**Mixed models.** 35% of apps mix subscriptions with consumables or lifetime purchases
(2025). Apple explicitly allows a subscription to "include consumable credits" and to
sit "alongside à la carte offerings" ✅
[App Review Guidelines 3.1.2(a)](https://developer.apple.com/app-store/review/guidelines/).

What this says for bower: the sticky point is £4.99/$9.99-ish monthly and ~£30/yr;
freemium converts ~2% and hard paywalls ~10%; weekly plans print money and retain
nobody; and the one number to protect is LTV per payer, which argues for the higher of
two candidate prices, not the lower.

---

## 5. Apple's cut and UK VAT

- Standard auto-renewable subscriptions: 70% to the developer in the subscriber's first
  year, 85% after "one year of paid service" (free-trial days do not count). ✅
  [Apple — subscriptions](https://developer.apple.com/app-store/subscriptions/).
- Small Business Program: 15% commission on everything, "regardless of whether or not
  the subscription has accumulated one year", for developers under **$1M USD** in the
  prior and current calendar year; new developers qualify; must enrol as Account Holder
  and accept Schedule 2. ✅ [Small Business Program](https://developer.apple.com/app-store/small-business-program/).
  **Enrol before the first sale.**
- Prices: 800 price points; "the default pricing in the App Store Connect pricing tool
  is inclusive of applicable taxes that Apple collects and remits". ✅ (subscriptions
  page). In the UK Apple is the merchant, so the customer's £4.99 includes 20% VAT and
  Apple remits it; commission is charged on the ex-VAT amount. ✅ Apple; ⚠️ order of
  operations per [RevenueCat docs](https://www.revenuecat.com/docs/dashboard-and-metrics/taxes-and-commissions).
- UK Digital Services Tax: in 2020 Apple said "developer proceeds will be adjusted in
  the United Kingdom" for the 2% DST, with proceeds "calculated based on the
  tax-exclusive price". 🟡 [Apple developer news](https://developer.apple.com/news/?id=oyy56t2r).
  Whether Apple absorbs half is ⚠️; the worked example takes the full 2%.
- Consumables alongside subscriptions: allowed; "any credits … purchased via in-app
  purchase may not expire"; a subscription may "include consumable credits" and may
  offer "discounted consumable goods" to subscribers. ✅ [Guidelines 3.1.1, 3.1.2(a)](https://developer.apple.com/app-store/review/guidelines/).
- Free trials come from App Store Connect (introductory offer, one per subscription
  group); paid weeks count toward the year, trial weeks do not. ✅ (subscriptions page).

### 5.1 Worked example — what a UK sticker nets

| Sticker | ex-VAT (÷1.2) | after 2% DST | **SBP 15%** | Standard 30% |
|---|---|---|---|---|
| £4.99 / month | £4.16 | £4.08 | **£3.46** ($4.68) | £2.85 ($3.85) |
| £5.99 / month | £4.99 | £4.89 | **£4.16** | £3.42 |
| £7.99 / month | £6.66 | £6.53 | **£5.55** | £4.57 |
| £39.99 / year | £33.33 | £32.66 | **£27.76 (£2.31/mo)** | £22.86 (£1.91/mo) |
| £34.99 / year | £29.16 | £28.58 | **£24.29 (£2.02/mo)** | £20.00 (£1.67/mo) |
| £2.99 pack | £2.49 | £2.44 | **£2.08** | £1.71 |

**£4.99 nets £3.46**, which is 7.5 three-platform searches or 24 one-platform searches
and nothing else. That ratio is the design constraint for §7.

---

## 6. What resellers will pay

Stated willingness to pay could not be collected this session (Reddit unreachable by
fetch; see §1). What follows is revealed pricing plus the community evidence already
in this repo.

- **Sellers are anchored at zero.** Vinted takes nothing from sellers; Depop dropped its
  10% in 2024; both platforms and eBay hand out AI descriptions free (§3.3). Any price is
  a price *on top of* free.
- **What they already pay for is the search.** SellHound charges $2–2.50 per listing
  and gives the price lookup away; Vinting bundles "real-time market pricing" into its
  paid tier and keeps AI descriptions in the free one; Snappy's credit "includes UK price
  suggestion". Every comparable that has a pricing feature puts it behind the wall. 🟡/✅ §3.1.
- **The going rate is £3.49–£4.99 a month or ~10p a listing.** Six UK apps converge
  there without a market leader among them (the best-rated has 22 ratings). ✅ §3.1.
- **They resent paying for months they don't use.** The one recurring complaint found
  about Vendoo is being "charged the subscription rate even if the service isn't used
  every month". 🔴 [eBay community](https://community.ebay.com/t5/Selling/Does-using-Vendoo-to-list-have-a-negative-affect-on-sales/m-p/34932714).
  VintSnap's whole pitch is "no subscription ever … you only pay when you list". ✅.
  A clear-out seller lists in bursts; this argues for a credit pack next to the
  subscription (§7.5).
- **They do not value "AI descriptions" — they distrust them.** The sibling doc found
  80–1,200-upvote threads on every platform saying AI copy makes buyers *less* likely to
  buy, and Depop's own trainers say "refrain from utilizing the AI feature". 🔴
  [`what-sells-terminology.md`](what-sells-terminology.md) §2.5, §3.1, §4.3. So the
  paywall copy must sell **the price and the two-second read**, never "AI-written
  listings".
- **The seller's arithmetic.** 20 items a month at £15 is £300 gross; five minutes saved
  per item is 100 minutes; a price that is right rather than guessed is worth more than
  the time. £4.99 is 1.7% of that seller's gross. A one-off search credit at ~30p is
  2% of one £15 sale. Both are below the buyer-protection fee the buyer already pays on
  each item (~5% + 70p 🟡 §3.3), which is the fee everybody on the platform is used to
  seeing.

---

## 7. Recommendation

> **Decided 2026-09-12 in [ADR-0010](../adr/0010-free-tier-and-plus.md)**, on a
> cost basis the valuation spike changed (Haiku on eBay and Vinted, not
> `max_uses: 1`). Where this section and the ADR differ, the ADR wins.

**Prerequisite, not optional: pull cost levers 1 and 2 in §7.6 before the paywall
ships.** Search the Preferred Platform by default, one web search per platform. With
that done a search is ~$0.11–0.19; without it £4.99 does not work at any allowance
worth advertising.

### 7.1 Free tier — "3 reads a month, and your first real price"

- **3 reads per month**, resetting on the 1st. Cost ≤ $0.075 (6p).
- **1 search, once, ever**, on the Preferred Platform. Cost $0.19 (14p). It is the
  moment the product proves itself, and it is a one-time cost per account.
- Chips and platform switching free (they are).
- Worst case £0.20 in month one, then ≤ 6p a month for an active free user; the median
  free user does far less.

Why not a free trial of the paid tier: a 7-day trial with 15 searches is a £2.10 gift
to a user who converts 37% of the time (§4) — and the day-0 cancellation rate on short
trials is 40–55%. The free tier *is* the trial, and it is bounded. Why not a hard
paywall despite the 5× conversion: the read is the demo, it costs 2p, and the product's
differentiator (the title in two seconds) cannot be described on a paywall.

### 7.2 Paid tier — **bower Plus, £4.99 / month, £39.99 / year**

USD at 1.35: $6.74 / $53.99; Apple's auto-generated US tiers will land near $5.99 /
$49.99 because the UK sticker carries VAT and the US one does not.

Includes:
- **Unlimited reads.** They cost 2p. Say "unlimited" on the paywall — every competitor
  says "50 listings". Keep a fair-use ceiling of 150 reads a month in the terms and a
  per-minute rate limit in `withAuth`; nobody honest hits either.
- **15 search credits a month.** One credit = one platform's live search. The default
  "Get a real price" spends 1 (Preferred Platform). "Compare on all my platforms" is an
  explicit second tap that spends 1 per enabled platform (3 with all on). Credits do not
  roll over.
- Unlimited chips and switching.

The meter therefore becomes two counters, not one: `reads_used` (soft) and
`search_credits_used` (hard). `spend_allowance` gains a `p_kind` argument.

Annual is priced at 8× monthly (33% off, "4 months free"), the top of the local norm
(PreLoved 6×, Snappy 8.6×, List My Closet 6.3×), because the marginal cost is real and
annual buyers who max out every month would otherwise lose money (see 7.3). Do not go
lower than £34.99.

### 7.3 Margin per paying user

Net £3.46/month (SBP) or £2.85 (standard); annual £2.31/month net. Credit cost today
$0.19 (£0.14); after lever 1 est. $0.11 (£0.08) ⚠️.

| Usage | Reads | Credits | Cost today | Margin, monthly SBP | Margin, standard 30% | Margin, annual SBP |
|---|---|---|---|---|---|---|
| Typical (§2.1) | 20 | 8 | $2.02 · £1.50 | **£1.96 (57%)** | £1.35 (47%) | £0.81 (35%) |
| Compares everything | 20 | 15 | $3.35 · £2.48 | £0.98 (28%) | £0.37 (13%) | −£0.17 |
| At the ceiling | 40 | 15 | $3.85 · £2.85 | £0.61 (18%) | £0.00 | −£0.54 |
| At the ceiling, after lever 1 | 40 | 15 | $2.65 · £1.96 | **£1.50 (43%)** | £0.89 (31%) | £0.35 (15%) |

Reading: at £4.99 the plan is profitable for every user under the SBP rate once lever 1
is in, and profitable for typical users even at 30%. Annual is the SKU to watch —
enrol in the SBP before launch and ship lever 1, or hold annual back until three
months of usage data show where the cap actually bites.

At £5.99 (net £4.16) the same table adds £0.70 to every cell; RevenueCat's data says
higher-priced apps convert *and* retain better (§4). £4.99 is recommended because it is
the exact price two direct competitors charge for "50 listings" and bower's "unlimited"
next to it is the pitch. Test £5.99 after launch via a second subscription group price;
do not launch above it.

### 7.4 Break-even

Assumptions: freemium D35 conversion 2.1% (§4); 30% of installs use any of the free
tier in month one; a third of those stay active as free users; fixed £22/month (§2).

Per 1,000 installs in a month:
- Free cost: 300 × £0.20 = **£60** in month one (the one-time search), then
  100 × 6p = **£6/month**.
- Payers: 21, at £1.96 typical margin = **£41/month**, decaying with monthly retention
  (17% at 12 months means roughly a 6-month median life).

So each 1,000-install cohort is −£19 in its first month and about +£35/month after,
paying its own free users back in month two. Fixed costs need **12 concurrent payers**
(£22 ÷ £1.96); each cohort's lingering free users need 3 more (£6 ÷ £1.96); and a
*new* 1,000-install cohort's £60 month-one search bill needs 31 payers' margin in that
month. So: **~15 concurrent subscribers break even at rest; ~45 break even while
acquiring 1,000 installs a month** (add 9 for Supabase Pro). A general rule for this
cost structure: one payer's £1.96 margin carries ~30 active free users at 6p each, so
the free tier as specified never outruns the payers as long as the one-time search
stays one-time.

### 7.5 Credit packs — yes, one, for subscribers first

- **10 search credits for £2.99** (30p a credit; nets £2.08; cost £1.40 today, £0.80
  after lever 1; margin 33–62%). Non-expiring, as Apple requires.
- Offer it inside Plus when the 15 run out ("subscriptions may offer discounted
  consumable goods" ✅ 3.1.2). This covers the burst seller without touching the base
  price, and 35% of apps already mix the two (§4).
- Do **not** sell packs to free users at launch. A pack without unlimited reads is a
  confusing product (a search needs a read first), and a second path to paying halves
  the signal on the subscription. Revisit if the data shows a large "3 reads, 1 search,
  never subscribes" segment — that is VintSnap's customer, and a £2.99 "10 credits + 30
  days of reads" non-renewing product would serve them.

### 7.6 Cost levers, with estimated search cost

| Lever | Per-platform search | All three | Confidence | Verdict |
|---|---|---|---|---|
| Today (`max_uses: 2`, three platforms) | $0.19 | **$0.62** | ✅ measured | — |
| **2. Preferred Platform by default**, "compare all" as an explicit tap | $0.19 | $0.19 default | ✅ measured | **Ship.** It also matches the read, which already asks for the Preferred Platform only (ADR-0004) |
| **1. `max_uses: 1`** — halves the $0.02 fee and roughly halves the result tokens Sonnet reads | ~$0.10–0.12 | ~$0.35 | ⚠️ estimate; measure in Langfuse | **Ship**, then check comparables-per-band did not drop |
| 3. Haiku 4.5 for the search | ~$0.10 | ~$0.30 | ⚠️ | **No.** Haiku only has the older `web_search_20250305` (no dynamic filtering, so more raw result tokens), and `client.ts` is right that judging comparability *is* the product |
| 4. Cache the search per item for 7 days (re-search of the same item free) | — | — | — | Cheap to do; stops the "tap again" double spend |
| 5. Cheaper model for the read | $0.025 → ~$0.013 | — | ⚠️ | **No.** The read is 2p and the two-second title is the product |
| 6. Cap photos per read at 6 | −$0.005 per photo avoided | — | ✅ | Yes; the checklist already discourages more |
| 7. Asking prices from a platform API instead of web search (see §8 Q4) | eBay ~$0.03 | — | 🔴 | Investigate; would make eBay, the dearest platform, the cheapest |

With levers 1+2 the default search costs about 11¢ and "compare all" about 35¢; the
15-credit cap costs at most ~$1.65 a month. That is the state the prices above assume.

### 7.7 What to avoid

- **Weekly pricing.** £2.99–£5.99 a week is what the lowest-rated competitor does; 3.4%
  year-one retention and a dark-pattern reputation that is the opposite of "In the
  bower".
- **A free trial of Plus.** Unbounded search cost for a 37% conversion; the free tier is
  the trial.
- **One credit type for read and search.** The 25× ratio makes it unpriceable.
- **Unlimited searches, at any price**, or fanning out to all platforms by default.
- **Selling "AI descriptions".** The community distrusts them; sell the price and the
  speed.
- **Expiring credits** (Apple forbids) and **commission on sales** (bower cannot see
  them; Future Reference and OneShop can, and it still reads as a tax).
- **Launching on the Vercel Hobby plan** — it is non-commercial by policy.
- **Skipping the Small Business Program enrolment** — it is the difference between
  £3.46 and £2.85 on every month, for zero effort.

---

## 8. Open questions

1. **The usage distribution is unknown.** The 15-credit cap, the annual price and the
   fair-use ceiling all assume "typical = 20 reads, 8 credits". Instrument
   reads-per-user and credits-per-user from day one; revisit at 90 days.
2. **Does Apple halve the UK DST?** ⚠️ The example takes the full 2% (3–4p a month).
3. **Lever 1's real saving.** ~$0.11 is an estimate; the result tokens, not the fee, are
   the cost. Measure before relying on the "after lever 1" margins.
4. **How does Vinting price 50 live-priced listings for £4.99?** 🔴 If it reads eBay
   asking prices through the eBay Browse API (free, app-token only, no seller OAuth —
   ADR-0003 removed seller OAuth, not app credentials) the eBay band could cost cents,
   not 27. ADR-0005 rules out *sold* prices, not asking prices from an API. Worth a
   spike.
5. **Stated willingness to pay** is still unsampled. The Chrome-extension route in
   `what-sells-terminology.md` §1 reaches r/VintedUK; twenty threads on "would you pay
   for a listing app" would firm up §6.
6. **Sonnet 5 price risk.** The planned rise to $3/$15 was cancelled; if it returns,
   every cost cell above rises ~50% and the answer is lever 7, not a price rise.
7. **Non-subscriber packs** (7.5) — decide after the first cohort shows how many
   free users spend their one search and stop.

---

### Sources

Apple (✅ unless marked):
[Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/) ·
[Small Business Program](https://developer.apple.com/app-store/small-business-program/) ·
[App Review Guidelines §3.1](https://developer.apple.com/app-store/review/guidelines/) ·
[App Store Connect — set a price](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price) ·
🟡 [UK DST proceeds adjustment, 2020](https://developer.apple.com/news/?id=oyy56t2r) ·
⚠️ [RevenueCat — taxes and commissions](https://www.revenuecat.com/docs/dashboard-and-metrics/taxes-and-commissions)

Benchmarks (✅):
[RevenueCat — State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/) ·
[RevenueCat — 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/) ·
🟡 [RevenueCat blog — 2026 in 10 minutes](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026) ·
[Adapty — State of In-App Subscriptions 2026](https://adapty.io/state-of-in-app-subscriptions-report/) ·
⚠️ [Airbridge — pricing by category 2026](https://www.airbridge.io/en/blog/subscription-app-pricing-by-category-2026-benchmark)

Direct comparables (✅):
[PreLoved AI — App Store GB](https://apps.apple.com/gb/app/preloved-ai-vinted-listings/id6749449859) ·
[VintSnap — App Store GB](https://apps.apple.com/gb/app/vintsnap-sell-on-vinted-fast/id6761385561) ·
[AI Listing Assistant — App Store GB](https://apps.apple.com/gb/app/ai-listing-assistant/id6762225350) ·
[List My Closet — App Store GB](https://apps.apple.com/gb/app/list-my-closet/id6758005659) ·
[Future Reference — App Store](https://apps.apple.com/gb/app/future-reference/id6739167071) ·
[Vinting.app](https://vinting.app/) ·
[Snappy](https://www.snappylisting.co.uk/) ·
[Snappy vs Vinting](https://www.snappylisting.co.uk/vs/vinting-app.html)

Crosslisters:
✅ [Vendoo pricing](https://www.vendoo.co/pricing) ·
✅ [List Perfectly pricing](https://listperfectly.com/pricing/) ·
✅ [Crosslist pricing](https://crosslist.com/pricing) ·
✅ [Nifty pricing](https://nifty.ai/pricing) ·
✅ [OneShop pricing](https://tools.oneshop.com/pricing) ·
⚠️ [Crosslist blog — Flyp cost](https://crosslist.com/blog/flyp-cost) ·
⚠️ [Nifty — PosherVA cost](https://nifty.ai/post/posher-va-cost) ·
⚠️ [Vendoo blog — Poshmark bots](https://blog.vendoo.co/poshmark-bots-what-you-need-to-know-about-using-bots) ·
🟡 [SellHound support — pricing](https://support.sellhound.com/knowledge/how-much-does-it-cost-to-use-the-sellhound-posting-app) ·
🔴 [eBay community — Vendoo thread](https://community.ebay.com/t5/Selling/Does-using-Vendoo-to-list-have-a-negative-affect-on-sales/m-p/34932714)

Platforms and substitutes:
✅ [Vinted Pro](https://www.vinted.co.uk/pro) ·
🟡 [Vinted — Buyer Protection fee](https://www.vinted.co.uk/help/342-buyer-protection-fee-on-vinted) ·
🟡 [Depop — zero selling fees](https://news.depop.com/company-news/evolving-our-fee-structure-with-zero-selling-fees-on-depop/) ·
🟡 [Depop — AI listing from one photo](https://news.depop.com/company-news/depop-launches-ai-powered-listing-from-one-photo/) ·
🟡 [eBay — Magical Listing on mobile](https://innovation.ebayinc.com/stories/ebay-reduces-the-time-to-list-on-mobile-with-new-simplified-selling-tool-now-featuring-magical-listing-ai-technology/) ·
✅ [Claude pricing](https://claude.com/pricing) ·
⚠️ [ChatGPT UK pricing (Profee)](https://www.profee.com/articles/chatgpt-pricing-and-subscription-options-in-the-uk)

Costs (✅):
[Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) ·
[Vercel Hobby plan](https://vercel.com/docs/plans/hobby) ·
[Supabase pricing](https://supabase.com/pricing) ·
Langfuse measurements 2026-09-11 (owner's figures) ·
`src/lib/llm/client.ts`, `src/lib/valuation/asking-price.ts`, `supabase/migrations/0010_allowance_ten_and_unlimited.sql`
