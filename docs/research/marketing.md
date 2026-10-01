# Marketing: where a push still makes money, and in which market

Researched 2026-09-30. Builds on ADR-0010 (the per-install economics),
`sellers-and-markets.md` (who sells, where) and `competitors.md` (who else is in the
store). It replaces the "standing mode: no marketing" assumption in ADR-0010 with a
question: how much can bower spend per customer and still make money, and where is
that spend cheapest?

**Confidence key** (same as the sibling docs):
✅ platform-owned or primary source fetched ·
🟡 primary source via snippet only ·
⚠️ secondary source, directional ·
🔴 anecdotal / unverified.

The short version:

1. **Budget per subscriber, not per install.** An install is worth ~27p (ADR-0010),
   because only 2% of installs pay. A subscriber is worth ~£17 net over ~7 months,
   less ~£5 of free-tier usage from the 49 installs that came with them. **A paying
   subscriber can cost up to ~£12 and still break even; aim for £5 or less.**
2. **Every channel that bills per install or per view loses money** at a 2%
   conversion rate: Apple Ads, TikTok and Meta install ads all cost £0.75–£4 an
   install, which is £40–£200 a subscriber.
3. **What makes money:** content Jada makes herself, creators paid **per subscriber
   they bring** (not per post), press, free App Store tools (custom product pages
   with keywords), and a referral that costs a listing pack.
4. **Market order: the UK, then Australia. Ireland rides along with the UK; the US
   waits.** The UK is home, the press loves Vinted stories and competitors are weak.
   Australia has a one-off window: Vinted launched there on 1 July 2026, so a wave
   of people are selling for the first time.

---

## 1. What a customer is worth

From ADR-0010's model (2% install → paid, ~14% monthly churn, all Haiku):

| | |
|---|---|
| Net per install, lifetime | **27p** |
| Net per subscriber a month (£4.99, after Apple's 15% and their usage) | ~£2.52–£3.24 |
| Subscriber lifetime | ~7 months |
| **Net per subscriber, lifetime** | **~£17** |
| Free-tier cost of the ~49 installs that don't pay | ~£5 |
| **Break-even acquisition cost per subscriber** | **~£12** |

So any channel can be judged with one sum: *cost per install ÷ conversion rate*.
At 2%, a £1 install is a £50 subscriber. Raising conversion is the lever that
makes every channel cheaper: at 4%, the same £1 install is £25.

## 2. Channels, by what a subscriber costs

| Channel | Cost | Per subscriber at 2% | Verdict |
|---|---|---|---|
| Apple Ads, search results | $1.02 (IE) – $2.51 (US) an install ✅ | £38–£95 | Loses money. Only a capped Basic test on long-tail terms |
| TikTok install ads | $0.50–$5 an install, CPM $6–15 in UK/US ⚠️ | £20–£190 | Loses money |
| Meta (Instagram/Facebook) install ads | Dearer than TikTok per view, sometimes better per install ⚠️ | similar | Loses money |
| Creator, flat fee | £80–£1,500 a video for 10k–100k followers ⚠️ | Needs ~500 installs a £150 video to break even | A gamble; only for a creator already proven |
| **Creator, paid per subscriber** | Whatever you set, e.g. £5 per subscriber | **£5, by construction** | **Makes money** |
| **Jada's own short videos** | Time | ~£0 | **Makes money; the best channel** |
| **Press pitches** | Time | ~£0 | **Makes money; high variance** |
| **Custom product pages with keywords** | Free | £0 | **Do it** |
| **Referral: give a pack, get a pack** | ~15p of usage per referred user | pennies | **Do it once there are users** |
| Reddit / Facebook seller groups | Time | ~£0 | Small, and self-promotion is often banned; be a member first |

### 2.1 Short videos (TikTok, Reels, Shorts): the main channel

- The category's only breakout app, **SellRaze (39,298 US ratings)**, is all over
  reseller TikTok: reviews, "how to use", "is it worth it" videos, mostly made by
  users 🟡. Nothing in the UK has done this yet (`competitors.md` Q5: nobody in GB
  has passed 43 ratings).
- bower has a built-in payoff moment for video: **the price reveal**. "What's this
  jumper actually worth on Vinted, Depop and eBay?", then the market check with
  the three bands and the listings they came from. It's the hook resellers
  already use ("thrift haul, what it sold for").
- Formats that fit: a wardrobe clear-out listed in ten minutes; "I priced this at £5,
  bower says £22"; Vinted vs Depop vs eBay for the same item; a charity-shop find
  valued in the shop.
- Post the same video to TikTok, Reels and Shorts. Put each platform on its own
  custom product page link (§2.4) so the downloads can be told apart.

### 2.2 Creators, paid per subscriber

- Flat fees (£80–£1,500 a video ⚠️) don't pay back at a 2% conversion unless a
  video does unusually well. Paying per result always pays back.
- Mechanism: **an offer code per creator** (Apple has extended offer codes to
  every in-app purchase and retired promo codes in March 2026 ✅), e.g. "first
  month free with JADE10". The creator gets a fixed £3–5 for each redemption
  that is still subscribed after the free month. `/api/purchases` already
  already accepts offer-code purchases (they arrive with no account token), and
  Apple's signed transaction carries the offer identifier, so the count can come
  from the server. The work: store that identifier on `purchases`, and count it
  on `/admin`.
- Who: UK Vinted/Depop sellers with 2k–50k followers who already post
  "what I sold this week" content. They are the target user and know the audience.

### 2.3 Press: free, and Vinted is a reliable story

- UK consumer and tabloid press run Vinted pieces constantly (money-saving,
  decluttering, "how much is your wardrobe worth"). A pitch with a number in it
  works: "we priced 50 high-street items across Vinted, Depop and eBay; the same
  coat was worth £12 more on one of them". bower can produce that number with its
  own market check.
- Targets, UK: MoneySavingExpert's weekly email, Which?, the Metro/Sun/Mirror
  consumer desks, Stylist, and the Vinted-tips creators who write for them.
- Targets, AU: the outlets that covered Vinted's launch (Broadsheet, Pedestrian,
  Refinery29 AU, RUSSH, Concrete Playground) ✅. Their follow-up is "how to sell on
  Vinted"; bower is the answer to "how do I price it".

### 2.4 Free App Store tools

- **Custom product pages**: up to 70, and they can now be **assigned keywords, so
  they show in search results** ✅. One page per intent: "Vinted listing", "Depop
  listing", "what is it worth", each with its own screenshots and first line.
  Also one page per video channel or creator, for attribution.
- **Keyword field** is already set (`docs/app-store/metadata.json`). Revisit it
  after a month of Search Terms data in App Store Connect.

### 2.5 Apple Ads, if at all

A **Basic** campaign with the maximum cost per install set at ~£0.30 can't lose
more than it earns; it will simply win few auctions. Worth running as a tripwire
on long-tail terms, not as a channel. Full detail in the conversation of 30 Sep;
2026 costs per install: IE $1.02, AU $1.89, UK $2.02, US $2.51 ✅ (Adapty).

## 3. Which market

| | UK | Australia | Ireland | US |
|---|---|---|---|---|
| iPhone share | 52% ⚠️ | 60% ⚠️ | 46% ⚠️ | 60% ⚠️ |
| Vinted | ~17–18m members, #2 market by sales ⚠️ | **Launched 1 Jul 2026** ✅ | Same site culture as UK | Launched Jan 2026, tens of millions in brand spend ✅ |
| Depop | Home market, no seller fee ✅ | No seller fee since 22 Jul 2026 ✅ | 10% seller fee ✅ | 74% of Depop sales ✅ |
| Competition in the store | Weak: max 43 ratings | Weak | Weak | **SellRaze, 39,298 ratings** |
| Paid costs | Mid | Mid | Cheapest | Dearest |
| Content Jada can make | **Native** | Needs AU creators and prices in A$ | UK content reaches it | Needs a US voice |
| Press | Loves Vinted | Covering Vinted's launch now | Irish outlets, small | Crowded |

**1. The UK first.** The biggest English-speaking Vinted market, the weakest
competition, the cheapest content to make (it's Jada's own voice and prices), and
a press that runs Vinted stories weekly. Everything in §2 works here first.

**2. Australia second, soon.** A market where most sellers are new is the
best time to be the app that answers "what do I charge?", and Vinted's launch was
three months ago. Short videos from the UK won't reach Australian feeds (TikTok's
feed is local), so this is the market for **per-subscriber creators and press**,
not Jada's own posts. The window closes as sellers learn prices for themselves.

**3. Ireland rides along.** Irish users see a lot of UK content, the same Vinted,
and the cheapest ads, but it's a country of five million with fewer iPhones. No
separate push.

**4. The US waits.** It's the biggest prize and the most expensive and crowded
place to spend. SellRaze owns the search terms and the TikTok conversation. Come
back to it with ratings from the UK and a conversion rate that makes paid work.

## 4. A plan that can't go negative

1. **Before launch:** make the three custom product pages with keywords, and
   record the offer code on `purchases` so creators can be paid per subscriber.
2. **Launch month, UK:** Jada posts 3–4 short videos a week built around the price
   reveal; one press pitch with bower's own numbers.
3. **Month two:** 5–10 UK creators on per-subscriber terms; 3–5 AU creators and
   pitches to the AU outlets that covered Vinted's launch.
4. **Rule for any paid spend:** stop a channel once it has cost more than £12 per
   subscriber over 30 days. The `/admin` dashboard doesn't count subscribers yet;
   it needs them, broken down by offer code.
5. **The lever behind all of it:** conversion. Every point of install → paid
   halves the cost of every channel above. Watch it before scaling any of them.

## 5. Open questions

- The 2% conversion rate is a category median, not bower's. The first 30 days
  replace it, and every number in §1 moves with it.
- Custom product pages report installs, not subscriptions; the offer code is the
  only per-source subscriber count. Is that enough, or does bower need its own
  attribution link?
- How big is Vinted Australia now? No figures have been published since launch.

## Sources

- Apple Ads 2026 benchmarks, per country: https://adapty.io/blog/apple-ads-benchmarks-2026/
- Apple Ads placements and Basic: https://ads.apple.com/app-store/best-practices/ad-placements, https://ads.apple.com/app-store/basic
- TikTok ad costs 2026: https://admanage.ai/blog/tiktok-ads-cost, https://benly.ai/learn/tiktok-ads/tiktok-ads-cost-benchmarks
- Creator rates UK 2026: https://whito.co.uk/research/influencer-ugc-rates-uk/, https://influencermarketinghub.com/influencer-rates/tiktok-influencer-rates/
- Offer codes and custom product pages: https://developer.apple.com/news/?id=gf6mgrs6, https://9to5mac.com/2025/10/29/apple-adds-new-app-store-submission-and-marketing-features-will-phase-out-promo-codes-in-2026/
- Vinted Australia: https://company.vinted.com/newsroom/vinted-launches-australia, https://www.broadsheet.com.au/national/fashion/article/vinted-australia-launch-july-2026
- iPhone share by country: https://worldpopulationreview.com/country-rankings/iphone-market-share-by-country
- SellRaze on TikTok: https://www.tiktok.com/discover/sellraze-app-review
