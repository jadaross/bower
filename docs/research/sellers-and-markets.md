# Sellers and markets: who sells on Vinted and Depop, how often, and where bower should open next

Researched 2026-09-24. This covers who sells on the two platforms bower is built
for, how often each kind of seller lists (to test the free tier of 5 listings a
month in ADR-0010), and which countries to open next. It builds on
`competitors.md` (who else is in the App Store and where), `pricing.md` (what
sellers will pay) and ADR-0009 (what a Market is).

**Confidence key** (same as the sibling docs):
✅ platform-owned or primary source fetched ·
🟡 primary source via snippet only ·
⚠️ secondary source, directional ·
🔴 anecdotal / unverified.

The short version:

1. **The typical seller sells about one item a month.** Neither platform
   publishes a per-seller figure, but Depop's does fall out of Etsy's filings:
   $1.07bn of sales across 3.2m active sellers is about **$336 a seller a
   year**, so roughly 10 sales. The average is pulled up by the shops, so the
   median seller sells less than that. Most people never hit a cap of 5 in an
   ordinary month. They hit it **in a burst**, during a clear-out, and that is
   who the 99p pack is for.
2. **Sellers who list more than 5 a month every month exist, and they are a
   minority.** They are two groups: the steady side-hustler (15–25 listings a
   month, and the best fit for Plus) and the professional reseller (50+ live
   listings, 400,000+ Vinted Pro accounts in Europe). Professional resellers
   want bulk listing and crosslisting, and bower deliberately does neither.
3. **Vinted and Depop are used differently.** Vinted is cheap, practical and
   mainstream: women aged 25–45, children's clothes, brand + type + size +
   colour searches, about £14 an order. Depop is young (87% of buyers are under
   34), about aesthetic and vintage, and more expensive per item, with sellers
   who run small shops. The same listing needs a different voice on each. bower
   already writes one, and its market check is weakest on Depop.
4. **Open the United States next, after Ireland.** 74% of Depop's sales are to
   US buyers. Vinted launched there in January 2026 and outdownloaded Depop by
   April. iPhones are ~60% of phones there, and the category's only breakout app
   (SellRaze, 39,298 ratings) is American. It needs an American listing voice
   and a US fee table, where eBay is not free. France is the prize after that,
   but it is a Vinted-only market with a third of phones on iOS, and it needs
   the listing written in French.
5. **Opening in more countries should mean adding more Markets, not just
   ticking more boxes in App Store Connect.** A seller in a country bower has no
   Market for gets British prices from British sites, which is the confidently
   wrong result ADR-0009 was written to stop. Adding an English-speaking Market
   is cheap, so open in each English-speaking country and give it a Market.

---

## 1. Method

- The platforms' own numbers: Vinted's 2025 results and impact report, Depop
  from Etsy's 2025 10-K (Depop was a segment until eBay bought it), eBay's close
  of the acquisition, and Depop's and Vinted's newsrooms.
- Market data: Consumer Edge card data on Vinted UK, Appfigures download
  estimates for the US, Statista's GMV-by-country breakdown (2023, snippet
  only), and the published iOS shares by country.
- Seller-level behaviour. **No platform publishes listings per seller.** The
  per-seller figures here are either worked out from the totals (and marked as
  worked out) or taken from reseller-tool blogs (🔴, because they sell to the
  segment they describe). This is the weakest part of the report and §8 says
  how to replace it with bower's own data.
- Reddit and seller forums were not read this session. `pricing.md` §1 found
  them unreachable by fetch.

---

## 2. The two platforms at a glance

| | **Vinted** | **Depop** |
|---|---|---|
| Owner | Independent (Lithuania); share sale mooted at ~€8bn ⚠️ | **eBay, since 30 July 2026** ($1.4bn) ✅ |
| Sales, 2025 | **€10.8bn GMV**, +47% ✅ | **$1.07bn GMS**, +36% ✅ |
| Revenue, 2025 | €1.1bn, +38%; €62m profit ✅ | n/d (Etsy segment) |
| Members | 100m+ registered (2025); ~17–18m in the UK ⚠️ | 56.3m registered ✅; **3.2m active sellers, 7.0m active buyers** ✅ |
| Countries | 26, European, plus the **US (Jan 2026)** and **Australia (1 Jul 2026)** ✅ | Sells in 150+; the real markets are **US, UK, Australia**, then Italy ⚠️ |
| Where the sales are | France ~33%, UK ~16%, Germany ~11% of GMV (2023) 🟡 | **74% from US buyers**, 26% everyone else ✅ |
| Seller fee | **None, anywhere**; the buyer pays protection (5% + fixed) ✅ | None in **UK, US, AU** (AU since 22 July 2026); **10% elsewhere** ✅ |
| Category | Women's and kids' clothes are the core; spreading to sport, collectables, homeware ✅ | **93% apparel** ✅ |
| Buyers | 25–34 largest; older groups tripled; women ~3× men in the UK ⚠️ | **87% under 34** ✅; ~65% women ⚠️ |
| Buyer habit (UK) | **~18 orders a year at ~£14** ⚠️ | ~3 orders a year at a higher price, and falling ⚠️ |
| Sellers who also buy | 81% say they would not resell without Vinted ✅ | **59% of sellers bought something too** ✅ |

Two things have changed since the earlier research files were written:

- **eBay now owns Depop.** eBay says it will "preserve Depop's brand, community
  and product experience" ✅. If eBay starts to share listings, sold data or
  fees between the two, the Depop Price Band could get easier to build (eBay's
  Browse API is rung 6 of the roadmap) or the two could start to price alike.
  Watch it. Nothing changes today.
- **Vinted is in the US and Australia.** Vinted's US push started in New York
  in January 2026 with a brand budget in the tens of millions. It had 2.6m US
  downloads between January and April (up ~800% on the year) and **passed
  Depop in April (1.2m against 1.1m)**, while Poshmark fell 28% ✅ (Appfigures
  estimates). In Australia it launched on 1 July, and within three weeks Depop
  dropped its 10% seller fee there ✅.

---

## 3. Who sells: four kinds of seller

The platforms don't publish these segments. The shape below is consistent with
everything that *is* published, and the numbers of listings are the best
available and marked as such.

### 3.1 The clear-out seller: most sellers, and the free tier

- **What they do:** clear a wardrobe, their children's outgrown clothes or a
  drawer. They list 10–30 things over one or two evenings, then nothing for
  weeks. About **15–20 items a year** 🔴.
- **Why:** 52% of Vinted sellers mostly list so the clothes don't go to waste,
  and 42% to get money back on unworn clothes ✅. Neither reason is a business.
- **Evidence for scale:** Depop's $336 a seller a year (§1) comes to **about 10
  sales a year at $30–35 an item**. That item price is worked out, not
  published; Consumer Edge says only that Depop's is higher than Vinted's £14.
  Because the shops pull the average up, the median is lower. On Vinted UK,
  sell-through for casual sellers runs at about 50% 🔴, so 10 sales means about
  20 listings.
- **What they need from bower:** a price they believe (they have no feel for
  what a used Zara coat is worth) and not having to write 20 descriptions. They
  hit the free 5 **in the first evening of a clear-out**.
- **Will they pay?** Rarely monthly. `pricing.md` §6 found them resenting
  subscriptions for months they don't use, and VintSnap's whole pitch is "no
  subscription ever". **The 99p pack of 10 is the right product for them**,
  sold at the moment they hit the wall mid clear-out. ADR-0010 has already
  decided this; this research supports it.

### 3.2 The side-hustler: fewer people, and the one Plus is for

- **What they do:** list steadily, **15–25 items a month** 🔴. They sell their
  own clothes and the family's, and sometimes a charity-shop find or two.
  €160–330 a month gross 🔴.
- **Who:** on Vinted, very often a **parent selling children's clothes**, which
  Vinted calls its fastest-growing segment in 2025 because children grow out
  of everything ⚠️. On Depop, a student or someone in their twenties who has
  started sourcing a little.
- **What they need:** speed, a steady voice across 20 listings, the right price
  on the one or two items a month that are worth something, and seller notes
  written once. **They hit 5 listings in the first week, every month.**
- **Will they pay?** This is the £4.99 Plus buyer. For someone grossing £300 a
  month, £4.99 is 1.7% of it (`pricing.md` §6). They are also the likeliest to
  **buy three or more packs a month**, which ADR-0010 already treats as the cue
  to point them at Plus.
- **How many:** unknown, and the most important number in this file.
  Reseller-tool blogs say ~12% of "regular" Vinted sellers make over €1,000 a
  month 🔴 and ~15% of Depop sellers over $2,000 🔴. Both are probably high,
  because the sources sell to exactly these people. A defensible working figure
  is **5–10% of active sellers listing more than 5 a month most months**.

### 3.3 The professional reseller: the most listings, and the weakest fit

- **What they do:** source stock (car boots, wholesale bales, charity shops)
  and keep **50+ live listings with 40–60 sales a month** 🔴. Vinted says
  **400,000+ European sellers have gone Pro** ✅, which is the only hard number
  for this group. UK (HMRC) and EU (DAC7) tax reporting starts at **30 sales or
  £1,700 / €2,000 a year** ✅. That is the line where the platforms themselves
  stop treating someone as casual.
- **Who:** on Depop, the vintage and streetwear shops, the "micro-brands" with
  a curated look ⚠️. On Vinted, more and more people moving from eBay to Vinted
  Pro ⚠️.
- **What they need:** **bulk and crosslisting.** They photograph 30 items in a
  session and want them live on three platforms, which is what Vendoo and
  Crosslist sell ($20–50 a month, `competitors.md` §4). bower won't post
  (ADR-0003) and does one item at a time. Most of them already know their
  prices, because pricing is their trade.
- **Will they pay?** Yes, but for a tool bower is not. The ones who do come
  will sit at the Plus fair-use ceiling of 150 listings and use all 10 checks.
  That is the **£1.76 margin case** in ADR-0010, positive but thin. Welcome
  them, and don't design for them.

### 3.4 The Depop curator: a special case

A Depop seller with a handful of **unusual pieces** (vintage, archive, Y2K,
band tees) is where pricing is hardest and matters most: these items have no
retail price to anchor to. This is the person who would get the most from a
market check. It is also where bower's check is weakest: on Haiku, Depop came
back with **0.7 comparables a call and every band marked "low"**
(`valuation-cost-speed.md`, accepted in ADR-0010). Until the Depop band gets
better, don't sell Plus to this seller on the price.

### 3.5 What this means for the cap of 5

- **5 a month is under the *average* seller's need in a normal month** and well
  under it in a clear-out month. That is what a free tier should do, since it
  has to show the product. It should not carry a seller on its own.
- The people who will **pay** are, in order: the clear-out seller at the moment
  of a burst (pack), the side-hustler every month (Plus), and a few pros (Plus
  at the ceiling).
- **There is no evidence for going lower than 5.** Listings cost 2p. A
  clear-out that stops at 3 sees less of the product, and is less likely to buy
  a pack, than one that stops at 5. Keep 5.
- **The number to watch after launch is how bursty people are.** If most free
  users spend all 5 listings in a single day, the pack is doing its job. If
  they spread them across the month, they are side-hustlers who haven't met
  Plus yet.

---

## 4. How Vinted and Depop are used differently

| | **Vinted** | **Depop** |
|---|---|---|
| What sells | Mainstream brands (Zara, H&M, Nike, ASOS), **kids' and maternity**, workwear, accessible premium (Barbour, Ralph Lauren) ⚠️ | **Vintage, Y2K, streetwear** (Stüssy, Supreme, Palace), rare denim, band tees, statement outerwear ⚠️ |
| How buyers search | **Literal**: brand + type + size + colour ⚠️ | **By aesthetic and era**: "dark academia coat", "90s grunge" ⚠️ |
| What moves a buyer | Value. They compare prices ⚠️ | Taste. They'll pay extra for the right piece ⚠️ |
| Typical order | ~£14, bought often ⚠️ | Higher, bought rarely ⚠️ |
| Seller identity | An anonymous person clearing out ⚠️ | A shop with a look, followers and repeat buyers; 59% of sellers also buy ✅ |
| Fees | Free to sell everywhere ✅ | Free in UK/US/AU, 10% elsewhere ✅ |
| Where bower's check does well | Well: Haiku finds comparables ✅ (own spike) | Poorly: wide, low-confidence bands ✅ (own spike) |

What this means for the product. Most of it is already built. Here it is so
nobody undoes it by accident:

- **The per-platform voice is load-bearing, not a nicety.** A Vinted title
  wants the literal search terms first. A Depop listing wants the era and the
  look in the title and tags. `platform-listing-guidance.md` and the
  `listing-spec.ts` fragments already split this way. Keep them split.
- **The market check is worth more per item on Depop and gets used more on
  Vinted.** A £4 kids' top isn't worth a check, but a £60 vintage jacket is.
  The Vinted side-hustler checks the odd good item; the Depop curator would
  check every item if the band were good. Improving the Depop band is worth more
  in Plus conversions than its share of users suggests.
- **Seller notes are a Vinted thing.** "Smoke-free, pet-free, posts next day"
  is the vocabulary of practical Vinted listings. On Depop, a shop's voice
  matters more than these facts.
- **The pack suits Vinted clear-outs and Plus suits Depop shops**, more or
  less. Don't split the paywall by platform. Just expect Plus conversion to be
  higher among Depop-preferred users, and check it in the dashboard.

---

## 5. Countries

### 5.1 The inputs

| Country | Vinted | Depop | eBay (private seller) | iPhone share | Language of the listing | Evidence of demand in this category |
|---|---|---|---|---|---|---|
| **UK** ✅ live | 2nd-largest market (~16% GMV), ~17–18m users | Home market, fee-free | Free since Oct 2024 | ~57% | English (GB) | `competitors.md`: small storefront, 43 ratings max |
| **Australia** ✅ live | New (1 Jul 2026), fee-free | 3rd market, fee-free since 22 Jul 2026 | Free (ADR-0009) | ~60% | English (GB spelling fine) | Unknown; both platforms are in a fee war there right now |
| **Ireland** (#56) | Established, EUR | **10% fee** | ebay.ie | roughly half | English | Unknown; small |
| **United States** | **New (Jan 2026), fee-free, growing fastest** | **Largest market: 74% of GMS** | **Not free**: final value fee on clothing ⚠️ check | **~60%** | **English (US)**: spelling, sizes, "pants", "sweater" | **Largest**: SellRaze 39,298 ratings, Vendoo 2,768 (`competitors.md` §6.1) |
| **France** | **Largest market (~33% GMV)**; Vinted outsells Amazon in clothing there ⚠️ | Small, 10% fee | ebay.fr | ~33% | **French** | Listed AI 489 FR ratings, 11× its GB count |
| **Germany** | 3rd market, growing again in 2025 ✅ | Small, 10% fee | ebay.de | ~27% | German | PreLoved AI / SellRaze DE reviews exist; thin |
| Italy, Spain | Top 7 ⚠️ | Italy is Depop's 4th (10% fee) | yes | ~25–27% | Italian / Spanish | Thin |
| Netherlands, Belgium, Poland | Core Vinted ⚠️ | 10% fee | yes | low (PL very low) | Dutch / French / Polish | None found |
| Canada | **Not available** | Yes, 10% fee | ebay.ca | ~55% ⚠️ | English (US-ish) | None found |
| New Zealand | Not found | Yes | yes | ~50% ⚠️ | English (GB) | None found |

### 5.2 Recommendation, in order

1. **Keep UK and Australia, and add Ireland in 1.0.** Ireland is data entry
   (ADR-0009): EUR, `vinted.ie`, `ebay.ie`, and a fee table with Depop at 10%.
   Note that it is the **first market where a platform charges again**, so the
   net-figure plumbing kept "for the day one of them charges again" gets used.
2. **United States next. It should come before France.** Reasons:
   - It is where the **money in this category** is: the one breakout app, the
     biggest storefront, and the highest iOS share of any market.
   - It is **Depop's main market** and **Vinted's newest one**, full of new
     sellers who don't yet know what their clothes are worth on a platform
     they've just joined. That is the market check's best case.
   - It is English, so the app's own text needs no translation.
   - What it costs: an **American listing voice** (spelling, US sizes,
     "pants"/"sweater"/"sneakers"; the prompts assume British English today,
     and ADR-0009 only got away with that because Australia is close enough);
     **USD** and US fee rows (eBay US charges a final value fee on clothing,
     so the net figure differs from the asking price for the first time); and
     `vinted.com` / `depop.com` / `ebay.com` as the search domains. Price Plus
     at **$4.99** (App Store tier equivalent).
   - The risk: it is **the most crowded storefront** (SellRaze, Vendoo,
     Crosslist), and the US seller's third and fourth platforms, **Poshmark and
     Mercari**, aren't in bower. Pitch it as the Vinted-and-Depop app, not as
     "every marketplace", and don't add Poshmark to the platform registry for
     launch.
3. **France third: the biggest prize, and the most real work.** It is the
   biggest Vinted market, and Listed AI's 489 French ratings prove demand. But
   it needs **French listings** (a French voice per platform, not a
   translation), the app itself in French, and a Vinted-only platform set,
   since Depop charges 10% there and is small. Only ~33% of phones are iPhones,
   so the reachable audience is smaller than the market. Listed AI is also
   there already and free with ads. The roadmap already calls this "a real
   feature and a real decision" (rung 4). This research agrees, and puts it
   after the US.
4. **Not yet: Germany, Italy, Spain, the Netherlands, Poland.** Each needs its
   own language, and iPhones are ~25–27% of phones in the big three (lower in
   Poland). Each is one more voice to maintain for a quarter of the phones.
   Revisit once French shows how much a new listing language costs.
5. **Not worth a Market yet: Canada and New Zealand.** Canada has no Vinted,
   and Depop charges 10% there. They're cheap to add later if TestFlight or
   support mail shows demand.

### 5.3 About "not blocking people"

Making the app available in every App Store storefront **without** a Market for
each country would let a German or American seller sign up and get **British
prices from British sites, in pounds**. That is the exact failure ADR-0009
describes ("confidently wrong for them"), and a first review saying the price
is nonsense is hard to undo. The way to be open is to **add Markets quickly**
(each English-speaking one is a day or two of data and a voice check) and open
each storefront the day its Market ships. The where-you-sell page already
guesses from the device region. For a region with no Market it should say
plainly that bower doesn't cover that country yet, rather than fall back to GB.

---

## 6. What this changes, and what it doesn't

**Doesn't change:** the free tier of 5 and 1, the pack, Plus at £4.99, the
per-platform voice, not posting to the platforms, or Haiku on every platform.
This research supports all of them.

**Adds:**

- A **US Market** as the next rung after App Store 1.0 and Ireland, ahead of
  France. That needs an American voice rule in the listing prompts, which is
  the first time the prompts change with the Market (ADR-0009 said they
  wouldn't; a US Market would amend it).
- A **"not in your country yet"** state on the where-you-sell page, instead of
  defaulting to GB.
- **Better Depop bands** move up in value. Depop users are the likeliest to
  convert on the price, and the price is weakest for them.

**Watch, on the dashboard after launch:**

1. How bursty free users are: listings a day across a user's month.
2. The share of free users who hit 5, split by Preferred Platform.
3. Pack buyers with 3+ packs a month (ADR-0010's cue for pointing them at Plus).
4. Plus conversion, Vinted-preferred against Depop-preferred.
5. Market checks per Plus user, which tells you how many pros you have.

---

## 7. Open questions

1. **The real share of sellers listing more than 5 a month.** Nothing public
   answers it. bower's own dashboard will, within a month of launch. Until
   then, "5–10% of active sellers" is a working figure, not a finding.
2. **eBay US fees on clothing for a casual seller in 2026**, for the US fee
   table. Check before the US Market ships ⚠️.
3. **Whether eBay will merge Depop's and eBay's data or fees.** It could change
   the Depop band's method.
4. **Vinted's share of UK sellers against buyers.** Consumer Edge measures the
   buyer side only.
5. **Reddit and seller forums** (r/Vinted, r/Depop, r/Flipping) for stated
   willingness to pay by segment: still unread.

---

### Sources

- [Vinted 2025 financial results](https://company.vinted.com/newsroom/financial-results-2025) ✅
- [Vinted impact report 2025](https://company.vinted.com/newsroom/impact-report) and [FashionUnited's summary](https://au.fashionunited.com/news/business/vinted-purchasing-power-resale-and-climate-at-the-heart-of-2025-impact-report/2026052220368) 🟡
- [Etsy 10-K for 2025 (Depop segment)](https://investors.etsy.com/sec-filings/all-sec-filings/content/0001370637-26-000019/etsy-20251231.htm) ✅
- [Digital Commerce 360: Etsy Q4 2025 and the Depop sale](https://www.digitalcommerce360.com/2026/02/20/etsy-marketplace-gms-sales-q4-2025-depop/) ✅
- [eBay completes acquisition of Depop](https://www.ebayinc.com/stories/news/ebay-completes-acquisition-of-depop/) ✅
- [Depop facts and figures](https://news.depop.com/who-we-are/facts-and-figures/) ✅
- [Depop makes selling free in Australia](https://news.depop.com/company-news/depop-makes-selling-free-in-australia-helping-people-earn-more-from-fashion-resale/) 🟡 and [ChannelX](https://channelx.world/2026/07/depop-australia-makes-selling-free-with-introduction-of-buyer-fee/) 🟡
- [Appfigures: Vinted is finally coming for America](https://appfigures.com/resources/insights/vinted-comes-to-the-us) ✅
- [FashionUnited: Vinted's US expansion](https://fashionunited.com/news/business/vinted-announces-major-us-expansion-to-address-growing-demand/2026012270176) 🟡
- [Consumer Edge: Vinted's UK dominance](https://www.consumeredge.com/resources/insights/as-vinted-cements-its-dominance-of-the-uk-resale-market-ce-data-sheds-light-on-additional-opportunities-for-expansion/) ⚠️
- [Measure Protocol: Depop vs Vinted](https://www.measureprotocol.com/insights/depop-vs-vinted-secondhand-fashion-market) ⚠️
- [Statista: Vinted GMV share by country (2023)](https://www.statista.com/forecasts/1427910/vinted-marketplace-gmv-share-by-country) 🟡
- [BusinessGreen: Vinted at 17m UK users](https://www.businessgreen.com/news/4525627/shift-hand-marketplace-vinted-grows-million-uk-users) 🟡
- [Vinted Pro: 400,000+ sellers](https://www.vinted.com/pro) 🟡
- [Vinted help: DAC7](https://www.vinted.ie/help/1308) ✅; [Startups.co.uk: HMRC reporting thresholds](https://startups.co.uk/news/hmrc-contacts-vinted-sellers/) 🟡
- [Margeo: Vinted seller earnings (illustrative tiers)](https://margeoapp.com/en/blog/how-much-do-vinted-sellers-make/) 🔴
- [Telvin: Vinted resellers' earnings](https://www.telvin-bot.com/en/blog/reselling-vinted-how-much-can-you-really-earn/) 🔴; [CLOSO: top Depop sellers](https://closo.co/blogs/platform-specific-guides/top-depop) 🔴
- [World Population Review: iPhone share by country](https://worldpopulationreview.com/country-rankings/iphone-market-share-by-country) ⚠️
