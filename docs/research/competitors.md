# Competitors — who else photographs a garment and writes the listing

Researched 2026-09-11. This is the competitive-intelligence file for the apps a UK
seller meets when they search the App Store for help listing on Vinted, Depop or
eBay. It builds on `pricing.md` §3, which priced seven of them; this one goes wider
(**28 direct competitors**, not seven) and much deeper — launch dates, ratings by
storefront, the substance of the reviews, developer replies, and what each one
actually does with a price.

**Confidence key** (same as the sibling docs):
✅ platform-owned or primary source fetched ·
🟡 primary source via snippet only ·
⚠️ secondary source, directional ·
🔴 anecdotal / unverified.

Three things worth knowing before the detail:

1. **The category is ten weeks old in the UK and already crowded.** Eleven of the
   direct competitors shipped between March and July 2026. Nobody in the GB cluster
   has more than 43 ratings.
2. **Nobody prices from live comparables except two**, and both of those read eBay
   only. Every other "smart price" in this field is the model guessing from the photo.
3. **The loudest complaint in the whole field is the same one**: users expect the app
   to *post* the listing, and it cannot, because the platforms forbid it. Two
   developers now say so in public review replies.

---

## 1. Method

**Fetched directly (✅).** The richest primary source turned out to be Apple's own
endpoints, reached with `curl` rather than a page fetcher:

- `itunes.apple.com/lookup?id=…&country=…` — release date, current-version date,
  version, average rating, rating count, seller, bundle id, languages, and the full
  App Store description. Run per storefront (gb, us, fr, de, ie), which is how the
  divergences in §6 were found.
- `itunes.apple.com/search?term=…&country=gb&entity=software` — used to *enumerate*
  the category rather than rely on recall. Six sweeps ("vinted listing", "vinted ai",
  "depop listing", "resale listing ai", "sell clothes ai", "crosslist reseller")
  surfaced 21 apps that `pricing.md` had not seen.
- `apps.apple.com/<cc>/app/<slug>/id<id>` — the product page embeds a
  `<script id="serialized-server-data">` JSON blob carrying the **ratings histogram**
  (5★→1★ counts), the **In-App Purchases** annotation with every price point, and the
  **written reviews with developer replies**. This is where most of §3 comes from.
- Google Play product pages for install bands and Android ratings.
- The apps' own sites: snappylisting.co.uk, vinting.app, autolister.app.
- Wayback CDX API (`web.archive.org/cdx/search/cdx`) for web-app first captures.

**Failed, and how it shows up below:**

- **Apple's customer-reviews RSS** (`itunes.apple.com/<cc>/rss/customerreviews/…`)
  returns a well-formed but **empty** feed for every app tried. It is deprecated. All
  review text here came from the embedded product-page JSON instead.
- **Reddit**: `old.reddit.com` → HTTP 403; `reddit.com/*.json` → HTML interstitial,
  not JSON; the redlib mirror → HTTP 429; and `reddit.com` is on the search tool's
  blocked-domain list, so even `site:reddit.com` queries error out. **No Reddit
  evidence is used in this file.** Where community sentiment appears it is from App
  Store reviews (which are verifiable and dated) or marked ⚠️/🔴. This is the same
  wall `pricing.md` and `what-sells-terminology.md` hit.
- **Chrome Web Store** returned an empty body behind a consent redirect, so
  AutoLister's install count and rating are unknown.
- **App Store "Version History"** is fetched by the web client from a token-gated API
  and is not in the page HTML. Shipping cadence below is inferred from release date →
  current-version date → version number, which is weaker. Marked where it matters.
- Wayback had **no captures at all** for snappylisting.co.uk, prelovedai.com,
  listedai.app, vintsnap.com or sellai-app.com. Where a domain *did* return an old
  capture (itemise.co 2021, rapidsell.org 2011) it is almost certainly a **previous
  owner of the domain**, not the product, so those dates are discarded rather than
  reported as launches.

**A note on rating counts.** Ratings are *per storefront*. Reading only the GB page
badly understates two of these companies — see §6.1. Every count below says which
store it came from.

---

## 2. The landscape

Direct competitors only — photo in, listing and/or price out, aimed at a casual
Vinted/Depop/eBay seller. Ordered by apparent traction. "Ratings" is the largest
single storefront, named.

| Name | Type | Launched | Best-store rating (n) | Price from | Metering | Prices? | Posts for you? | Last update |
|---|---|---|---|---|---|---|---|---|
| **Listed AI** | iOS + Android | 2025-06-24 | 4.7 (489 FR) | free + ads | listings/mo + rewarded ads | AI guess | no | 2026-08-20 |
| **PreLoved AI** | iOS + Android (TWA) | 2025-08-06 | 4.5 (22 GB) | £4.99/mo | listings/mo | AI guess | no ("pre-filled" claim, see §3.2) | 2026-09-03 |
| **Snappy** | web | ~2026 (no capture) | n/a | £3.49/mo | credits | AI guess, "UK market" | no | live |
| **Vinting.app** | web + Chrome ext | 2026-06-17 | n/a | £4.99/mo | listings/mo | **eBay UK asking** | no (autofill ext for eBay) | live |
| **VintSnap** | iOS | 2026-04-16 | 4.6 (11 GB) | £2.49/20cr | credits + ads | **eBay sold data** | no | 2026-09-08 |
| **Itemise** | iOS | 2026-07-29 | 5.0 (3 GB) | £0.99/10 | credits | AI guess | no | 2026-09-04 |
| **Flip: AI Resale Pricing** | iOS | 2026-08-05 | 5.0 (5 GB) | £1.99 top-up | pay-as-you-go | AI guess + venue pick | no | 2026-09-08 |
| **AI Listing Assistant** | iOS | 2026-04-16 | 3.7 (3 GB) | £2.99/wk | weekly sub | AI guess | no | 2026-09-10 |
| **VintyLook** | iOS + web | 2026-04-12 | 4.5 (29 FR) | £3.99/10cr | credits | no (photos only) | no | 2026-05-23 ⚠️stalled |
| **Sell AI — Snap, List, Sold** | iOS | 2026-04-16 | 5.0 (3 GB) | £2.99/5cr | credits | AI guess | no | 2026-09-04 |
| **Closet Resale App** (was List My Closet) | iOS | 2026-03-11 | 5.0 (4 US) | £1.99/5cr | credits + sub | AI guess | no | 2026-09-04 |
| **SnapFlip** | iOS | 2026-04-01 | 4.8 (22 US) | £7.99/wk | weekly sub | eBay sold (sourcing) | no | 2026-09-07 |
| **Listing Monster AI** | iOS | 2026-06-30 | 5.0 (3 GB) | n/d | n/d | AI guess | no | 2026-09-10 |
| **Vintsnap: AI Listing Photos** | iOS | 2026-07-04 | 5.0 (3 GB) | £5.99/wk | sub | no (photos only) | no | 2026-07-22 |
| **Sell AI - Listing Maker** | iOS | 2026-01-15 | 4.7 (26 FR) | £7.99 | tiered | AI guess | no | 2026-07-08 |
| **FlipFast** | iOS | 2026-06-26 | 5.0 (2 GB) | £4.99 | one-off | AI guess | no | 2026-08-11 |
| **ListingLab** | iOS | 2026-04-04 | 5.0 (1 US) | $9.99/mo | sub | AI guess | no | 2026-08-27 |
| **AutoLister AI** | Chrome ext | 2025-11-16 | unknown | €3.99/mo | 75 listings/mo | no | drafts in-page | live |
| **QuickList** | iOS + web | 2026-03-13 | — (0) | £19.99 | tiered | AI guess | no | 2026-03-13 ⚠️abandoned |
| **Rapid Sell AI** | iOS | 2026-07-03 | — (0) | n/d | n/d | AI guess | claims publish | 2026-09-03 |
| **Future Reference** | iOS (US) | 2025-03-20 | 4.0 (9 US) | free | 10% of sale | yes | **yes** | 2025-12-03 ⚠️stalled |
| **ListingGenie** | web + iOS | **2023-03-10** | 5.0 (7) | free tier | n/d | AI guess | no | 2023-06-21 ⚠️abandoned |
| **Descripto** | Android | n/d | 4.4 (50+ dl) | n/d | n/d | no | no | 2026-06-19 |
| **FlipStudio** | Android | n/d | 4.8 (1k+ dl) | n/d | n/d | AI guess | no | 2026-08-25 |
| SharkScribe · ListaPro · ControlResell · ILoveListing · Katapic | web | n/d | n/d | n/d | n/d | varies | no | live |

Also enumerated and **excluded** as not-quite-direct: Value Scout, Treasure AI,
ThriftAI, Underpriced AI, ThriftLens, Profit Prophet (sourcing scanners — "should I
buy this?", not "write my listing"); Navi, InstantAlert, Vinotify, Trouve (Vinted
buyer alerts); Reluv, Dropstitch, Spadeberry (marketplaces).

---

## 3. The direct competitors, in order of traction

### 3.1 Listed AI — the actual leader, and it is French

**What it is.** "Listed AI - Listing Generator". Photos in, up to **15 listings at
once** out, for Vinted, eBay, Depop, Poshmark and Mercari.
Developer **WIL7 / Boissier Julien**, France. Solo indie by the look of the
developer record; the review replies sign off "The Listed AI Team".
Bundle `WIL7.Listed`, App Store id **6746462486**; Play `com.wil7.listedai`.
✅ [App Store GB](https://apps.apple.com/gb/app/listed-ai-listing-generator/id6746462486) ·
✅ [Play](https://play.google.com/store/apps/details?id=com.wil7.listedai) ·
✅ [listedai.app](https://listedai.app/en/)

**Launched 24 June 2025** — making it, with PreLoved AI, one of only two apps in this
cluster older than a year. Currently v1.4.2, shipped 20 August 2026. ✅ iTunes lookup.

**Ratings, and why the GB page misleads.** This is the single most important number
in the file:

| Store | Average | Ratings | Distribution 5★→1★ |
|---|---|---|---|
| **France** | **4.7** | **489** | 417 · 37 · 13 · 3 · 19 |
| Germany | 4.5 | 35 | 27 · 4 · 1 · 2 · 1 |
| **GB** | 4.8 | **43** | 38 · 3 · 0 · 1 · 1 |
| US | 3.6 | 8 | 5 · 0 · 0 · 1 · 2 |
| Ireland | 4.2 | 5 | 4 · 0 · 0 · 0 · 1 |

≈580 ratings in total, of which GB is 7%. Read only the GB page — as `pricing.md`
did — and this looks like a 43-rating indie. It is the category leader in the EU.
Play adds **10,000+ downloads at 4.4★**. ✅ histograms from the embedded product-page
JSON, per storefront.

**Pricing.** GB in-app purchases: **Weekly PRO £3.99 · Pro Monthly £5.99 · Pro Yearly
£49.99**, plus a second **Pro Yearly at £24.99** (an intro or win-back price). Ireland
runs €4.99 / €6.99 / €59.99 / €29.99. ✅ App Store IAP annotation. The free tier is
**ad-funded**: rewarded video unlocks generations, topped up with referrals and daily
rewards — the only app in the field monetising non-payers this way.

**What the reviews say.** Ten written reviews in France, two each in GB and Germany,
one in the US — and the developer replies to nearly all of them, in the reviewer's
language.

*The recurring French complaint is ads, and it is emphatic.* "Trop de pub" ("too much
advertising") is a review title on its own. One three-star review explains the real
problem: one to two ads per listing, and *"par moment on est bloqué car plus de pub de
dispo"* — sometimes you are stuck because there is no ad inventory left to watch. A
four-star reviewer says the app twice gave wrong information and dislikes that
unlimited listings need a subscription. The developer's reply promises higher free
limits "dès cette semaine" and thanks the user for watching ads because "cela
contribue directement à faire vivre le projet". ✅ App Store FR.

*The praise is about time and trust in the output.* A regular Vinted seller writes
that they rarely edit the generated listing "tant le rendu est fiable" and reports
both time saved and a rise in sales. A professional resale seller calls it "un vrai
avantage sur le marché". One five-star reviewer notes the price is "pas encore tout à
fait fiable" — not yet quite reliable — but useful as an indication. ✅ App Store FR.

*The expectation gap, three times.* The GB one-star is titled "Not worth it in my
opinion": "Doesn't work as advertised, all it does is bring you on to the marketplace
app you still have to upload and add the listing manually." The German two-star says
the same: the listing generates, but upload to Vinted leaves an empty listing. The
developer's answer is the most useful single sentence in this whole research file:

> "Vinted, eBay and the other marketplaces explicitly prohibit third-party apps from
> creating a listing or pre-filling its fields on your behalf, so the app writes the
> title, price and description and copies them to your clipboard for you to paste."

— and, notably, "If that was not clear enough before you subscribed, that is on us and
we are reworking how we describe it." ✅ App Store GB/DE developer replies.

*Bugs.* The US two-star reports having to restore purchases on every listing and ads
not disappearing after paying; fixed in 1.4.1 the same day per the reply. A German
one-star alleges email data leaked (the developer attributes the spam to the
marketplaces themselves). An Irish one-star simply could not create an account. ✅

**Distinctive.** Bulk 15 at once; 11 UI languages and, since August 2026, a
**listing-currency picker** (pound, euro, dollar, krona, złoty and ten more); one-tap
background remover with swappable backgrounds; emoji toggle; custom hashtags.

**Weak spots vs bower.** The price is an AI guess and its own users say so. The
ad-funded free tier actively degrades the experience — the thing users complain about
most is the monetisation, not the output. No live comparables, no per-platform price
band, no notion of which platforms this seller actually uses.

---

### 3.2 PreLoved AI — virtual model photos, and a traction claim that changes by country

**What it is.** "PreLoved AI: Vinted Listings" (renamed "PreLoved AI - Sell Faster!"
in some stores). Vinted-only. Its differentiator is **Virtual Model Photos** — AI
generates the garment worn by a model, or on a hanger, mannequin or flat lay.
Developer **Daniel Steel / iAuroraApps**; bundle `auroraapps.Vinted-Co-Pilot`,
id **6749449859**; Play `com.prelovedai.app.twa`.
✅ [App Store GB](https://apps.apple.com/gb/app/preloved-ai-vinted-listings/id6749449859) ·
✅ [Play](https://play.google.com/store/apps/details?id=com.prelovedai.app.twa) ·
✅ [prelovedai.com/promo](https://www.prelovedai.com/promo)

**Launched 6 August 2025.** v1.9.33 on 3 September 2026 — the version number implies a
fast shipping cadence (33 patch releases in the 1.9 line). Minimum iOS **18.2**, the
highest floor in the field bar one, which cuts off a chunk of the second-hand-phone
audience that overlaps heavily with second-hand-clothes sellers. ✅

**Ratings.** GB 4.5 (22) · Germany 3.7 (3) · France 4.0 (2) · US 0. Play 4.8 with
**1,000+ downloads**, last updated **24 December 2025** — the Android build is a
Trusted Web Activity (a wrapped website, per the `.twa` package name) and has been
left alone for nine months. ✅

**The traction claim does not survive a second storefront.** The GB description says
"Used by **20,000+** active sellers" and "We have helped **20,000+** people stop
spending Sunday evenings typing the same listing format over and over." The US
description, same app, same sentences, says **300+** both times. ✅ verified by running
the iTunes lookup against `country=us` and `country=gb` on 2026-09-11. Treat every
user-count claim in this category as marketing copy, including this one.

**Pricing** (GB, from the App Store IAP annotation ✅): Basic **£4.99/mo**, Standard
**£12.99/mo**, Basic Annual **£29.99**, Standard Annual **£99.99**, plus a "Special
Offer" pair at **£2.99** and **£6.99** (first month), and two further products, Pro
£17.99 and Elite £29.99. Free tier is **one listing a month, no card**. Per the
description, Basic is 50 listings and Standard 250. 🟡 (counts from the description,
not the paywall).

**What the reviews say.** Six written reviews in GB, one in Germany.

*Praise is specific and about sales, not speed.* "My items were selling before I had
time to list another." Another: relisting old items with the generated photos sold
them. Several single out the developer's responsiveness — "the team are genuinely
responsive to feedback". ✅ App Store GB.

*Two real criticisms.* The German one-star is the substantive one: the virtual model
"verändert er die Kleidung zu mindestens 80% zu stark" — it alters the garment far too
much, in every mode, so the output is unusable as a listing image. The developer
steers them toward flat lay/mannequin/hanger as more faithful. ✅ That is the central
risk of generative listing photos, and it is also a **Vinted policy risk**: an image
that does not depict the actual item is exactly what Vinted's catalogue rules and the
GenAI-dropshipping-scam coverage in `seller-voice.md` are about.

*The other is a design own-goal.* A GB one-star, "Biased and Backwsrd", objects to
being **required to pick an ethnicity and age** when creating a listing, with no
"prefer not to say"; the categories offered ("African", "Asian", "Hispanic",
"Caucasian") exclude Black British / Afro-Caribbean and use a term many organisations
have dropped. The developer replied at length, explained the fields belong to the
optional Virtual Model feature, and shipped changes within 18 days ("**Update 24/06,
the changes to the app are now live**"). ✅ Worth reading in full as a case study in
what an apparently innocuous model-configuration UI can cost.

**The "pre-filled" claim.** The GB description says "One tap and Vinted opens with
everything pre-filled." Listed AI's developer says in public that the platforms
prohibit exactly that, and Listed AI's own users confirm Vinted opens empty. Either
PreLoved AI has something Listed AI does not, or "pre-filled" means "on your
clipboard". The description also says, two paragraphs later, "We never post for you.
We never touch your Vinted account." 🟡 unresolved — see §8 Q1.

**Weak spots vs bower.** Vinted only. Price is an AI guess. The headline feature
generates images that at least one paying user says misrepresent the garment. Android
is an abandoned web wrapper. iOS 18.2 floor.

---

### 3.3 VintSnap — the one that already prices from sold data

**What it is.** "VintSnap: Sell on Vinted Fast". Developer **Brian Merlehan**, trading
as **agentm.co.uk** (UK). Bundle `com.ajentm.vintsnap`, id **6761385561**.
✅ [App Store GB](https://apps.apple.com/gb/app/vintsnap-sell-on-vinted-fast/id6761385561) ·
✅ [agentm.co.uk/products/vintsnap](https://agentm.co.uk/products/vintsnap/)

**Launched 16 April 2026**, and already at **v3.0.9** (8 September 2026) — three major
versions in under five months, the fastest-shipping app in the cluster. ✅

**This is the closest competitor to bower's actual thesis**, and its App Store copy
attacks the rest of the field on exactly the axis bower chose:

> "PRICED FROM REAL SOLD DATA — NOT GUESSWORK. Other tools let the AI make up a price.
> VintSnap checks what similar items actually sold for and gives you three strategies:
> Quick Sale, Fair Price and Max Value."

✅ App Store description. The comparables source is **eBay sold data** — one platform,
used as a proxy for all of them. bower's Price Band per *Enabled Platform* is a
strictly richer version of the same idea; VintSnap's is cheaper to run.

It also markets the no-account position bower holds, in the same words a bower
screenshot could use: "NO LOGIN. NO BOT. NO BAN RISK. VintSnap never asks for your
Vinted password and never posts on your behalf. You stay in control — it physically
cannot get your account restricted." ✅ Given the Crosslist ban reports in §4, this is
a real and well-chosen wedge.

**Ratings.** GB 4.6 (11) · US 3.8 (11) · France 5.0 (3) · Germany 5.0 (1).
The two storefronts with eleven ratings each tell different stories: GB is
[10,0,0,0,1], US is **[7,0,1,1,2]**. **Zero written reviews in any storefront** — 26
ratings, no text, so there is no qualitative evidence about this app at all. ✅

**Pricing.** Credits only, **no subscription ever** (stated in the description):
20/**£2.49** · 35/**£4.99** · 50/**£6.99** · 120/**£12.99** — roughly 11–12p a
listing. First listing free; more credits by watching an ad. ✅ IAP annotation.
"You only pay when you list."

**Features** that go beyond the field: live camera coaching for blur and lighting;
guided front/back/label shots; a **quality check before spending an analysis**; batch
mode for 30 items; **listing health scores**, relist reminders with suggested price
drops, and seasonal-demand timing; copy-ready formats for eBay and Depop; email the
listing to yourself. Explicit GDPR line: "Your photos are analysed, never sold." ✅

**Weak spots vs bower.** One comparables source (eBay sold) applied to three very
different markets — a Vinted asking price and an eBay sold price are not the same
number, which is the whole reason bower searches per platform. No streaming, so the
user waits on a blank screen. Eleven ratings and no text means no proof any of the
clever retention features are used. And the name collides with an unrelated app (§3.9).

---

### 3.4 Vinting.app — the other one that reads the market, on the web

**What it is.** A web app, UK, for Vinted, eBay and Gumtree. Headline: **"Stop
staring. Start uploading."** ✅ [vinting.app](https://vinting.app/)

**First Wayback capture 17 June 2026** ✅ — so roughly three months old, though the
domain may have been live earlier without being archived.

**Pricing.** Free **10 lifetime listings**; **Pro £4.99/mo** for 50/month; **Max
£9.99/mo** for 250. Subscription only, no packs. ✅

**How it prices** — the most transparent statement of method in the field: it
"compares current eBay UK asking prices, removes obvious outliers and adjusts for
likely sale price", and for vintage items with few comparables it says so rather than
inventing a number. ✅ That is asking-price-based (like bower's) rather than
sold-based (like VintSnap's), and the outlier-removal and vintage-uncertainty
behaviours are both things bower should be able to match or beat.

**Distinctive.** A **Chrome extension that autofills eBay**, plus a "Smart Clipboard"
for Vinted and Gumtree — the correct reading of the ToS line: automate where the
platform allows it (eBay), assist where it does not (Vinted). Batch photo sorting for
30 items; brand detection; flaw identification and "honest condition assessments";
barcode scanning. Generation takes "usually 30 to 60 seconds". ✅

**Weak spots vs bower.** Web-only on mobile, which is the wrong shape for a job that
starts with a camera. 30–60 seconds with nothing shown until the end, against bower's
~2s title. eBay-only comparables again. No Depop.

---

### 3.5 Snappy — the widest marketplace coverage and an HMRC angle

**What it is.** "The UK reseller's AI listing writer — for Vinted, eBay, Depop,
Facebook, Gumtree, Etsy & TikTok". Web app, UK, built by Jarvis Studio.
✅ [snappylisting.co.uk](https://www.snappylisting.co.uk/). No Wayback captures, so
launch date is unknown; the site says founded 2026 and advertises TikTok Shop support
"arriving August 14, 2026", which dates the copy. ⚠️

**Pricing** (unchanged from `pricing.md` §3.1, re-verified ✅): free **3 listings**, no
card; **£3.49/mo** for 50 credits; **£29.99/yr** for 600; packs **£3.99/50**,
**£5.99/100**, **£9.99/250**, credits never expire. The cheapest subscription in the
field.

**What is new since `pricing.md`.** The feature list is the longest of any competitor
and two items are genuinely unusual:

- **HMRC income tracking.** No other app in this research touches tax. Given the
  UK digital-platform reporting rules that every Vinted seller has been nervously
  reading about, this is a sharp piece of positioning for the exact anxiety that makes
  casual sellers hesitate.
- **Bundle builder** (combine 2–10 items into one listing) — which maps directly onto
  the Vinted bundles behaviour documented in `seller-voice.md`.

Plus: up to 3 photos per item, batch of 10, barcode/ISBN scanning, an AI rewriter for
*existing* listings, watermarking, auto-relist, best-time-to-post, and a "sellability
score". Pricing is "UK market"-based but the site does not say whether that is sold
data, asking data, or the model's opinion — and that ambiguity is itself the point. ⚠️

**Weak spots vs bower.** Seven marketplaces is a breadth claim that almost certainly
means one prompt with the platform name swapped — the fan-out mistake ADR-0004 exists
to avoid. Unverifiable pricing method. Web-only. No ratings anywhere, no Trustpilot
page found despite the site linking to one.

---

### 3.6 Itemise — the cheapest per listing, and the only one writing per-platform

**What it is.** "Itemise – Snap to Sell", **Coding Warehouse Limited** (UK), bundle
`com.codingwarehouse.itemise`, id **6787769529**. ✅
[App Store GB](https://apps.apple.com/gb/app/itemise-snap-to-sell/id6787769529)

**Launched 29 July 2026** — six weeks old. v1.1.1 on 4 September 2026. GB 5.0 (3),
two written reviews. ✅

**Pricing is the most aggressive in the field**: 10 listings **£0.99**, 25 **£1.99**,
60 **£3.99**, 100 **£4.99** — **5p a listing** at the top pack, less than half
Snappy's and a quarter of VintSnap's. Credits, no subscription. ✅ IAP annotation.

**Why it matters to bower.** Its latest release notes describe, almost exactly,
bower's platform-specific-listing design:

> "Written for where you sell. Pick Vinted, Depop, eBay or Facebook Marketplace before
> each listing and the words follow that site's rules — the right title length,
> keywords or hashtags, and eBay item specifics."

✅ And: "Three styles, one listing. Every item comes back as Pro, Detailed and Quick.
Flip between them for the one token usage" — i.e. the tone switch is free, which is
the same economic insight behind bower's cheap Haiku `format`/`refine` calls. This is
the competitor whose *thinking* is closest to bower's, at a third of the price.

**Reviews.** Both five-star and both about the same thing — keywords. "I always get
brain freeze thinking of keywords and spend way too long on it but this app does it
all!" and "didn't know what to label various garms for Vinted". ✅ Useful: the job the
user thinks they are buying is **vocabulary**, not prose.

**Weak spots vs bower.** No pricing from comparables at all. Three ratings. Six weeks
old with one developer. At 5p a listing there is no room to pay for a web search, so
it structurally cannot add one.

---

### 3.7 Flip: AI Resale Pricing — priced the job, then abandoned subscriptions

**What it is.** Developer **Ben Copeman** (UK), id **6792281092**, launched
**5 August 2026**. Photograph anything — "clothes, trainers, furniture, electronics" —
and it says what it is worth **and which UK marketplace to use**. GB 5.0 (5), three
written reviews. ✅

**The pricing change is the interesting part.** Release notes for v1.3.0 (8 September
2026, five weeks after launch):

> "Flip now runs on pay-as-you-go credits instead of subscriptions — top up any
> amount, pay pennies per scan, no monthly fee. Every account gets a small free credit
> top-up automatically each month. Also in this update: every feature — Batch Scan,
> Price Alerts, My Statistics, Reseller Tools — is now free for everyone."

✅ Top-ups are £1.99 / £4.99 / £9.99 / £14.99 / £19.99 of credit. A subscription-to-
credits retreat inside five weeks is a data point for `pricing.md` §7: this developer
tried a subscription on a valuation-shaped product and it did not hold.

**Reviews** praise pricing accuracy *relative to the field* — "The pricing is more
accurate than other apps I have used", from a self-described daily eBay and Vinted
seller — and the marketplace recommendation: "helped me understand quickly margins and
best venues to list on". ✅ That second one is bower's Recommendation feature, and a
user volunteered it as the reason they liked the app.

**Weak spots vs bower.** Not clothing-specialised, so no tag OCR, no garment
vocabulary, no per-platform listing voice. Five ratings.

---

### 3.8 AI Listing Assistant — the weekly-subscription play

**Angel App Publishing Ltd.** (UK), id **6762225350**, bundle
`com.angelappications.AI-Companion-for-Vinted`. Launched **16 April 2026**, v1.7 on
**10 September 2026** — the most recently updated app in the file. ✅

**Ratings: 3.7 (3) in GB** — the lowest-rated of the listing generators, on a tiny
base. US 5.0 (1), DE 5.0 (2), FR 5.0 (1). No written reviews anywhere. ✅

**Pricing.** Weekly subscriptions at two price points plus an annual: US $2.99/wk,
$5.99/wk, $34.99/yr; Ireland €2.99/wk, €6.99/wk, €39.99/yr; GB £2.99/wk, £5.99/wk,
£34.99/yr per `pricing.md`. Free tier is **1 listing per day**. ✅ A £2.99 weekly is
£155/year — the most expensive effective rate in the whole field, and the App Store
subtitle does not say so.

**What it just shipped** is worth noting because it is the localisation move Listed AI
made and bower has not: "Your listings are written in your own language and priced in
your own currency, **for your local Vinted** — English, French, German, Spanish,
Italian, Polish and Dutch." Plus a change to drip free listings "a day at a time, so
you can see what the app can do before you decide". ✅

**Weak spots vs bower.** Weekly pricing is the tell of a template app monetising
before it earns trust; 3.7★ suggests it is not landing. No comparables. 5 photos max.

---

### 3.9 The photo-generation sub-cluster: VintyLook and Vintsnap (the other one)

These sell **images**, not words, to the same buyer — and both are cautionary.

**VintyLook** — Theo Vidal (France), id **6761313759**, launched **12 April 2026**,
last updated **23 May 2026** and nothing since: stalled at v1.0.5. "Turn your flat lay
photos into AI model photos in 30 seconds… No model. No studio. No effort." for
Vinted, Depop and Vestiaire Collectif. ✅

The storefront split is extreme and instructive:

| Store | Average | n | 5★→1★ |
|---|---|---|---|
| France | 4.5 | 29 | 24 · 0 · 3 · 0 · 2 |
| US | 3.5 | 4 | 2 · 0 · 1 · 0 · 1 |
| **GB** | **1.9** | 9 | 1 · 0 · 1 · 2 · **5** |
| **Germany** | **1.6** | 5 | 0 · 1 · 0 · 0 · **4** |

✅ Marketed hard in France (where the reviews are enthusiastic and several cluster on
20–21 May 2026, which looks like a push), and rejected in GB and Germany. The
substantive complaints: a GB user chose "medium build" and got very slim models; a US
one-star says the model "does NOT generate according to your selections"; and the most
useful, a French three-star, quantifies it — "**environ 10% de perte** sur des photos
AI inexploitables. Et un autre 10% qui dégrade le vêtement" — about 10% unusable, and
another 10% that *degrades the garment* — with credits lost on failures and no support
response. ✅

**Vintsnap: AI Listing Photos** — **Four Star Ventures Ltd**, id **6761347142**,
launched **4 July 2026**. Studio-quality listing photos for Vinted, Depop, eBay and
Poshmark. GB 5.0 (3). Pricing **£5.99/wk · £9.99/mo · £79.99/yr**. Minimum iOS
**26.0** — it will run on almost no one's phone. ✅ And the name is one capital letter
away from §3.3's VintSnap, a different company, in the same store, in the same month.

**The lesson for bower.** Generated garment images are the most commercially obvious
adjacent feature and the most dangerous one: ~20% failure by a paying user's count,
misrepresentation risk under Vinted's rules, and the ethnicity-picker trap PreLoved AI
walked into. bower stores no images, which sidesteps all of it.

---

### 3.10 The rest, briefly

**Sell AI — Snap, List, Sold** — JAG Studio Ltd, id 6758883858, 16 April 2026, GB 5.0
(3) / US 3.0 (2). Credits 5/£2.99, 12/£4.99, 20/£9.99, 50/£24.99 — **50p a listing**,
ten times Itemise. Recently raised the free allocation from 3 to 5 credits and started
refunding credits on failed generations. The US one-star is about the paywall: "They
make you pay to even try it." ✅

**Closet Resale App: AI Listings** (renamed from **List My Closet**) — Hoftware LLC
(US), id 6758005659, 11 March 2026. **0 ratings in GB**, 5.0 (4) in the US. Pro
£7.99/mo or £49.99/yr plus packs 5/£1.99, 10/£3.99, 25/£6.99. Leads with **photo
enhancement** — background removal, lighting correction, "wrinkle reduction and
garment smoothing" — and claims Vinted, Poshmark, eBay, Mercari, Depop and Facebook.
Latest release note in full: "Bug fixes for uploading images to List my Closet
servers." ✅ Note the rename: the `pricing.md` name no longer matches the store.

**SnapFlip: Vinted & Depop AI** — Valeriy Loveyko, id 6761262922, 1 April 2026. GB 5.0
(1), **US 4.8 (22)**. £7.99/week or £39.99/year. It has **pivoted away** from listing
writing to sourcing: the description now leads "Stop overpaying at charity shops and
car boot sales… shows REAL eBay sold prices — not AI guesses." Its eight US reviews
are worth reading as a set: seven are five-star, same length, same shape, each
describing a different thrift scenario, each with a warm developer reply. The eighth,
a one-star, says the quiet part: "These reviews are so fake. They are clearly written
by AI, same goes for the dev's responses." ✅ Draw your own conclusion; the pattern is
visible in the data.

**Listing Monster AI** — Production Ready AI Ltd (UK), id 6759717220, 30 June 2026, GB
5.0 (3). eBay and Shopify first, "pricing suggestions, merchandising strategy and
perfect images". Shipping fast (v1.27 by September). ✅

**Sell AI - Listing Maker** — Thomas Biglione (France), id 6755742172, 15 January 2026,
**FR 4.7 (26)**, GB 0. £7.99 / £19.99 / £29.99 tiers. One French three-star reveals the
architecture: "API ERROR, incorrect api key" — the app was surfacing raw provider
errors to users. ✅

**FlipFast** — Robert Plociennik, id 6769902890, 26 June 2026, GB 5.0 (2), a single
£4.99 purchase. Added **sold-and-profit tracking** (cost basis in, profit out) and
relist reminders. Its support URL is an unbranded Netlify subdomain. ✅

**ListingLab: Seller Assistant** — Oleksandr Udalov, id 6761454886, 4 April 2026, US
5.0 (1). $9.99/mo or $69.99/yr. "AI Photo Studio" plus copywriting. ✅

**QuickList: AI Listing Tool** — William Isaac Lewis, id 6759634194. Released
**13 March 2026** and last updated **13 March 2026** — never shipped again. eBay-first
(item specifics, custom templates), priced £19.99 / £49.99 / £69.99, which is
crosslister money for a single-purpose app. 0 ratings. ✅ A useful corpse.

**Rapid Sell AI** — Konrad Maliszewski, id 6758882748, 3 July 2026, 0 ratings. Claims
to "publish to eBay, Vinted, OLX, and more, all from one app" — the claim Listed AI
says the platforms forbid. ✅

**Future Reference: Resale AI** — Future Reference Inc. (US), id 6739167071, launched
**20 March 2025**, last updated **3 December 2025**: stalled. US 4.0 (9), 0 in GB.
Free, taking **10% of each sale** — the only commission model found. It genuinely does
post for you, because it is also the marketplace. Its reviews split cleanly: the 2025
five-stars love the Gmail-import digital closet, and the later ones are about the app
failing — "Extremely buggy", a sold item with no shipping label and no customer
service, and a blank interface. ✅ The commission model plus the abandonment is the
clearest "do not do this" in the file.

**ListingGenie** — Paige Digital Ltd (UK). **The oldest thing in this category**: first
Wayback capture **10 March 2023**, iOS app id 6446372994 released **25 March 2023**,
last updated **21 June 2023**, 5.0 (7). ✅ The website still runs a free Vinted listing
generator. Three years and it never got past seven ratings — see §6.4.

**Android-only.** *Descripto* (PAJO Solutions, `pl.pajo.marketplacedescriptiongenerator`)
4.4★, **50+ downloads**, updated June 2026 — descriptions and hashtags only.
*FlipStudio: Vinted AI Photos* (`studio.flipai.app`) 4.8★, **1,000+ downloads**,
updated August 2026 — photos plus listings for Vinted, Depop and eBay in "about 10
seconds". ✅

**Web and extension, thin evidence.** *AutoLister AI* — Chrome extension, "AI
description & listing assistant · You stay in control", Vinted plus limited eBay,
**€3.99/mo for 75 listings**, free trial, no card; first Wayback capture 16 November
2025. It uploads photos from your phone and drafts **in the page**, so there is no
copy-paste step — the closest anyone gets to posting for you without breaking the
rules. Install count unknown (Chrome Web Store blocked). ✅ site / ⚠️ traction.
Also enumerated but not profiled, all web, all with pricing pages that were not
fetched this session: *SharkScribe*, *ListaPro.ai*, *ControlResell*, *ILoveListing*,
*Katapic*, *Vintefy*, *VintyLook web*. 🟡

---

## 4. Adjacent: the US crosslisters — expensive, established, and a liability

| Tool | iOS rating (n) | Price/mo | Meters AI separately? | Note |
|---|---|---|---|---|
| **SellRaze** | **4.8 (39,298 US)** · 4.8 (601 GB) | £7.99–£34.99 | tiered listings | The only real scale in this whole file |
| Crosslist | 4.7 (271 US) · 4.5 (54 GB) | $29.99–$44.99 | **yes**, +$4.99 AI credits | Newest, shipping hard |
| Vendoo | 4.5 (2,768 US) · **2.7 (14 GB)** | $14.99–$59.99 | background removals | 2022 app, poor in GB |
| Evriwhere (UK) | **2.7 (47 GB)** | tiered | AI generator included | UK-built, 20 of 47 are 1★ |
| List Perfectly | — (web) | $29–$99 | **yes**, 25–1,000/mo | — |
| Nifty | — | $39.99–$59.99 | **yes**, smart credits | — |
| OneShop | — | $45 flat | — | — |
| Flyp | — | $9 flat | no AI | — |

(Prices from `pricing.md` §3.2 ✅; iOS ratings and reviews newly fetched ✅.)

**SellRaze is the ceiling, and it is not a crosslister so much as the category's one
success.** Launched **11 September 2023**, `com.sellraze.scanner`, currently v5.21
(9 September 2026). **39,298 ratings at 4.8 in the US**, 601 at 4.8 in GB, 187 in
Germany, 139 in France. ✅ Nothing else in this research is within two orders of
magnitude. Its GB reviews, though, are a map of where a US-first product breaks for a
UK seller: "Vinted always having trouble with connecting"; "Kept assuming I was in the
US and would not let me do anything"; and the sharpest, a two-star titled **"Not for
the UK"** — "Got an advert for it by UK seller. Seems it's all American based… You also
have to pay a subscription fee to sell something… I'd just recommend googling the
worth of your stuff online and selling it on your usual, more trusted, platforms
yourself." ✅ That review is bower's target customer explaining why the biggest player
in the category lost her.

**The crosslisters carry a risk bower does not, and their users are discovering it.**
Crosslist's GB reviews contain two independent, dated reports of Vinted enforcement:
"I got a 24 hour ban on Vinted for using this even though it says it's partnered with
Vinted?!" (2 September 2026) and "in the space of two months my vinted account has been
suspended twice for using 3rd party services. The second one came with a possible
future permanent ban" (24 August 2026). ✅ Alongside those: a user "threatened with
small claims court" for charging back £3.82 of AI credits, a one-star calling it "so
complex… really expensive for what it is", and a five-star calling it "the best cross
listing app I have used". Vendoo's GB page is 2.7★ from 14 ratings against 4.5★ from
2,768 in the US — the same product, a different market. Evriwhere, the UK-built one, is
2.74★ with **20 of its 47 ratings at one star**, and its reviews are overwhelmingly
about support silence: "the customer support has ignored me for the last month",
"a fake looking chat which seemingly goes to no one". ✅

The strategic read: connecting to a seller's Vinted account is where the money is and
where the bans are. VintSnap's "NO LOGIN. NO BOT. NO BAN RISK." and bower's
never-touch-your-account position are the same bet, and the Crosslist reviews are the
evidence it is the right one.

---

## 5. Adjacent: the platforms' own AI — the free substitute

- **Depop** shipped generative AI descriptions on **12 September 2024**: one photo in,
  category, subcategory, colour, brand and hashtags out, in Depop's colloquial voice.
  Free. English-speaking markets. The number that matters: in the pre-launch test
  **"nearly half of listers used the tool"**. 🟡
  [Retail Dive](https://www.retaildive.com/news/depop-generative-artificial-intelligence-product-descriptions-photo/727860/),
  🟡 [Depop newsroom](https://news.depop.com/company-news/depop-launches-ai-powered-listing-from-one-photo/).
- **eBay Magical Listing** — free, no subscription, available to private accounts in
  the **US, UK and Germany**; UK testing showed a **50% reduction in listing steps**.
  A next-generation, "AI native" version began rolling out in Q4 2025 that builds a
  listing from images alone with no title first, and per CEO Jamie Iannone "provides
  intelligent pricing recommendations based on real time transaction data". 🟡
  [eBay innovation](https://innovation.ebayinc.com/stories/ebay-reduces-the-time-to-list-on-mobile-with-new-simplified-selling-tool-now-featuring-magical-listing-ai-technology/),
  ⚠️ [Value Added Resource](https://www.valueaddedresource.net/ebay-ai-magical-listing-revisited/).
  **But it misidentifies badly**: in that review a mousepad came back as a ceramic
  decorative plaque, then as a fridge magnet; a wrong identification cascades into a
  wrong title, wrong item specifics and a wrong description; and the description field
  is **left blank by default**, in which case eBay copies the title into it. ⚠️
- **Vinted** — **no official photo-to-listing AI was found.** Repeated searches
  surfaced only third-party tools and secondary blogs asserting that Vinted "uses
  generative AI to auto-write listing titles and descriptions"; no Vinted newsroom or
  help page confirms it. ⚠️ What Vinted verifiably does with AI is *enforcement* —
  flagging listings on image quality, price anomalies and keyword patterns, and the
  Item Verification service. ⚠️ The largest platform in bower's market has **not**
  closed this gap. That is the single most load-bearing fact in §5 and it should be
  re-checked (§8 Q3).
- **ChatGPT and Claude** remain the real free substitute, as `pricing.md` §3.3 said.

So a Depop seller and an eBay seller each already have a free, in-app, one-photo
description writer; a Vinted seller does not. bower's market is, in substitution
terms, **Vinted-shaped**.

---

## 6. Patterns across the field

### 6.1 Read the wrong storefront and you will misjudge the market

Three apps look completely different depending on which country's page you open:

| App | GB | Best store | Ratio |
|---|---|---|---|
| Listed AI | 43 | **489 (FR)** | 11× |
| VintyLook | 9 @ 1.9★ | **29 @ 4.5★ (FR)** | quality inverts |
| Vendoo | 14 @ 2.7★ | **2,768 @ 4.5★ (US)** | 198× |
| SellRaze | 601 | **39,298 (US)** | 65× |

`pricing.md` §3.1 read GB pages and concluded the field tops out at 22 ratings. It
tops out at 39,298. The UK is a *small, late* storefront for this category — France is
ahead of it, and the US is ahead of both.

### 6.2 Everyone charges the same, and it is cheap

The listing generators cluster at **£3.49–£5.99 a month**, **£29.99–£49.99 a year**,
and credits from **5p (Itemise) to 50p (Sell AI)** with most at **10–12p**. The two
outliers are instructive: the weekly subscriptions (AI Listing Assistant £2.99/wk =
£155/yr; SnapFlip £7.99/wk = £415/yr) and QuickList's £19.99–£69.99 tiers. Neither
outlier has traction. Meanwhile **Flip abandoned subscriptions for credits five weeks
after launch**, and **VintSnap and Itemise never offered one**. For a product whose
cost is per-generation, the market is drifting toward credits.

Nobody charges separately for a price lookup. Vinting bundles "real-time market
pricing" into 50 listings for £4.99 and VintSnap bundles eBay sold data into an 11p
credit — which, as `pricing.md` §8 Q4 noted, means neither is paying anything like
bower's 14p-per-platform search cost. They are using a cheap API, a cached corpus, or
far fewer lookups than bower's `max_uses: 2` per platform.

### 6.3 What the reviews say everyone gets wrong

Ranked by how often it recurs across apps and storefronts:

1. **"It doesn't actually post it."** Listed AI GB and DE, Vendoo, Crosslist, and
   implicitly every copy-paste app. This is a *marketing* failure, not a product one —
   the platforms forbid pre-filling — and the developers know it: Listed AI now says
   so in three languages and admitted "if that was not clear enough before you
   subscribed, that is on us".
2. **Monetisation felt before value.** "They make you pay to even try it" (Sell AI),
   "you have to pay a subscription fee to sell something" (SellRaze), "trop de pub"
   ×4 (Listed AI), "for a completely new app… you have to pay €9.99/month after a
   3-day trial" (SellRaze DE). The free tier is the whole battleground.
3. **Subscription and trial billing.** Charged despite an advertised trial (SellRaze
   ×2), unable to cancel (SellRaze), charged three times for one credit pack and then
   threatened with small claims (Crosslist), paid Pro but ads remained (Listed AI).
4. **Accuracy, stated plainly and without much anger.** "sometimes the AI will get the
   size or brand wrong… the price however I would not trust completely" (Crosslist
   US); "le prix pas encore tout à fait fiable" (Listed AI FR); "deux fois il donne des
   mauvais informations" (Listed AI FR). Users forgive wrong prices more readily than
   wrong billing.
5. **Generated photos that misrepresent the garment.** PreLoved AI DE ("alters the
   clothing by at least 80%"), VintyLook FR (~10% unusable, ~10% degrade the garment),
   VintyLook GB (wrong body type), VintyLook US ("looks like straight out of the
   walking dead").
6. **Account bans** — crosslisters only, but severe (Crosslist ×2).

Conspicuously **absent**: almost nobody complains that the copy sounds AI-generated.
That is the opposite of what `seller-voice.md` found *buyers* saying on eBay and
Vinted forums. Sellers are happy with the prose; the people reading the listings are
not. Nobody in this field is optimising for the second group.

### 6.4 How old the category is, and who has escaped

- **2023**: ListingGenie (March 2023, UK) and SellRaze (September 2023, US). Everything
  else is younger.
- **2025**: Future Reference (March), Listed AI (June), PreLoved AI (August),
  AutoLister (November).
- **2026, a stampede**: Sell AI - Listing Maker (15 Jan), Closet Resale (11 Mar),
  QuickList (13 Mar), SnapFlip (1 Apr), ListingLab (4 Apr), Crosslist iOS (9 Apr),
  VintyLook (12 Apr), **VintSnap, AI Listing Assistant and Sell AI all on 16 April**,
  FlipFast (26 Jun), Listing Monster (30 Jun), Rapid Sell (3 Jul), Vintsnap Photos
  (4 Jul), Itemise (29 Jul), Flip (5 Aug). ✅

**Has anyone escaped "indie with 20 ratings"? One.** SellRaze, at 39,298 US ratings,
and it did so by being American, general-purpose and three years old. In the
UK/EU clothing niche the ceiling so far is **Listed AI at ~580 ratings across five
storefronts plus 10,000+ Android downloads** — and it is ad-funded, which is what
scale without willingness-to-pay looks like. ListingGenie proves the other outcome:
first to the idea in March 2023, abandoned by June 2023, seven ratings.

Five of the 28 are already **dead or stalled**: QuickList (never updated past launch
day), ListingGenie (2023), VintyLook (May 2026), Future Reference (December 2025),
PreLoved AI's Android build (December 2025). An 18% mortality rate in a category whose
median age is five months.

### 6.5 What nobody does

- **Nobody streams.** Every competitor makes the user wait on a blank screen for
  "30 seconds", "30 to 60 seconds", "under 30 seconds". bower's ~2s title is
  unmatched, and no competitor even advertises latency as a feature beyond the
  round number.
- **Nobody prices per platform.** VintSnap and SnapFlip use eBay sold; Vinting uses
  eBay asking. All three then apply that one number to Vinted and Depop, which are
  different markets with different buyers. **No competitor produces a Price Band per
  marketplace.**
- **Nobody knows which platforms you sell on.** Every app asks per listing or fans out
  to all of them. There is no equivalent of Enabled Platforms or a Preferred Platform.
- **Nobody has opt-in seller notes.** No competitor lets a seller say "smoke-free,
  posts next day" once and have it appear, correctly worded, on every platform.
  Several generate it unprompted, which is precisely the fabrication risk
  `what-sells-terminology.md` warned about.
- **Nobody refuses work.** No competitor advertises a subject check, a non-clothing
  rejection, or a refund of the unit when it declines. Several proudly list
  "electronics, furniture, anything".
- **Almost nobody is honest about storage.** VintSnap's "Your photos are analysed,
  never sold" is the only privacy line in any description. bower storing no images at
  all is a stronger claim than anything on offer, and nobody is making it.
- **Nobody does refinement chips.** The closest is Itemise's three fixed styles.

---

## 7. Where bower sits

Against the four that matter — Listed AI (scale), VintSnap (closest thesis), PreLoved
AI (UK incumbent), Vinting.app (best method).

| | **bower** | Listed AI | VintSnap | PreLoved AI | Vinting.app |
|---|---|---|---|---|---|
| Time to first useful output | **~2s (streamed title)** | 30s, blank | "30 seconds", blank | seconds, blank | 30–60s, blank |
| Price method | **live comparables, per platform** | AI guess | eBay **sold**, one source | AI guess | eBay **asking**, one source |
| Price Band per marketplace | **yes** | no | no (3 strategies, one source) | no | no |
| Knows your platforms | **yes (Enabled/Preferred)** | no | no | Vinted only | no |
| Per-platform listing voice | **yes** | partial | copy-ready formats | Vinted only | yes |
| Seller notes, opt-in | **yes** | no | no | no | no |
| Refuses non-clothing, refunds unit | **yes** | no | no | no | no |
| Stores your photos | **no** | n/d | "analysed, never sold" | n/d (generates images) | n/d |
| Touches your marketplace account | **no** | no | **no, and says so loudly** | no | eBay ext only |
| Platforms | Vinted, Depop, eBay | 5+ | Vinted (+eBay/Depop copy) | Vinted | Vinted, eBay, Gumtree |
| Price | TBD (£4.99/mo, §7 pricing.md) | free+ads / £5.99 | 11p/credit | £4.99 | £4.99 |
| Ratings | — | ~580 + 10k Android | 26 | 25 | — |

### Four things to copy

1. **Say the ban thing out loud.** VintSnap's "NO LOGIN. NO BOT. NO BAN RISK… it
   physically cannot get your account restricted" is the best line in the category,
   and the Crosslist suspension reviews prove the fear is real and current. bower has
   the identical property and says nothing about it. This belongs in the App Store
   subtitle and on the first screenshot.
2. **Drip the free tier daily, not monthly.** AI Listing Assistant just moved to
   releasing free listings "a day at a time", and Listed AI added daily rewards and
   referrals. `pricing.md` §7.1 proposes 3 reads a month; three *a month* gives a user
   one evening and then silence, whereas a daily trickle builds the habit that a
   wardrobe clear-out actually has. Worth testing against the §7.1 recommendation.
3. **Make the tone/platform switch visibly free.** Itemise advertises "three styles,
   one listing… for the one token usage". bower's `format` and `refine` are Haiku calls
   costing ~£0 — the same fact, currently unadvertised. Users meter themselves
   anxiously; telling them switching is free removes the friction that stops them
   exploring.
4. **Publish the pricing method.** Vinting.app's "compares current eBay UK asking
   prices, removes obvious outliers and adjusts for likely sale price" is the most
   credible sentence any competitor has written, and bower's method is genuinely
   better. Say it, per platform, with the Comparables shown — ADR-0005 already
   requires them to exist.

### Four things to avoid

1. **Do not add generative garment photos.** It is the most obvious next feature and
   the field's biggest failure mode: ~20% unusable by a paying user's count,
   misrepresentation risk against Vinted's catalogue rules, and PreLoved AI's
   ethnicity-picker incident. bower's no-image-storage position is worth more.
2. **Do not claim to pre-fill or post.** It is the number-one complaint, it is
   prohibited, and two developers have had to apologise for the ambiguity in public.
   "Copy and paste" said plainly beats "one tap and Vinted opens with everything
   pre-filled" said carefully.
3. **Do not fund the free tier with ads.** Listed AI has the field's best traction and
   its worst reviews, and the reviews are about the ads, not the app. Four separate
   French users; one describes being blocked because ad inventory ran out.
4. **Do not price weekly.** £2.99/week reads cheap and bills at £155/year. The two
   apps doing it are the lowest-rated (3.7★) and the one accused of fake reviews.

---

## 8. Open questions

**Q1. Can anyone legitimately pre-fill a Vinted listing?** PreLoved AI's GB
description says "One tap and Vinted opens with everything pre-filled"; Listed AI's
developer says in three languages that the platforms explicitly forbid it, and Listed
AI's users confirm Vinted opens empty. Rapid Sell AI claims to "publish to eBay,
Vinted, OLX". Someone is wrong. Resolving this decides whether bower's paste step is a
permanent constraint or a gap. *Next step: install PreLoved AI and watch what the
"one tap" actually does; read Vinted's developer/ToS terms directly.*

**Q2. What does a search actually cost the two apps that do one?** VintSnap sells
eBay-sold-data lookups inside an 11p credit and Vinting bundles "real-time market
pricing" into 10p a listing, against bower's measured 14p **per platform**. Either
they use the eBay Browse/Marketplace Insights API (cheap, structured, no LLM reading
result pages) rather than an LLM web search, or they cache aggressively. If it is the
former, that is a direct cost lever for `pricing.md` §7.6 and possibly a better
architecture than `asking-price.ts`.

**Q3. Does Vinted have an official AI listing feature?** No primary source was found
either way. Depop shipped in September 2024 and eBay is on its second generation; if
Vinted ships one, bower's core differentiator on its largest platform narrows to
pricing overnight. *Next step: check the Vinted app directly in a GB account, and the
Vinted careers/newsroom pages.*

**Q4. Why is France so far ahead of the UK?** Listed AI has 11× more French ratings
than British, Sell AI - Listing Maker is FR-only in practice, and VintyLook is loved
in France and rejected in Britain. Is French Vinted simply bigger and more
seller-dense, or is there a distribution channel (a TikTok scene, an influencer, an
ASO advantage in a less contested language) that the UK apps have not found?

**Q5. How many ratings does a UK listing app need before it compounds?** The GB
ceiling is 43. SellRaze's 601 GB ratings came off a US base of 39,298. Nothing in this
category has been shown to grow organically in the UK alone.

**Q6. Are the SnapFlip reviews fake, and does it matter?** Seven near-identical
five-star US reviews in sixteen days, each with a bespoke developer reply, and one
user calling it out. If review-farming is normal in this category, then every rating
in §2 is softer evidence than it looks — including the ones flattering to bower's
competitors.

**Q7. What does the buyer think?** This file is built almost entirely on *seller*
reviews, and sellers do not complain that AI copy sounds like AI. `seller-voice.md`
found buyers on eBay and Vinted forums who very much do. Nobody in this field is
measuring the second group, which is either a gap in the market or a sign it does not
convert.

---

### Sources

**Apple (✅, fetched 2026-09-11 via `itunes.apple.com` lookup/search and the
`serialized-server-data` blob on `apps.apple.com` product pages):**
[Listed AI](https://apps.apple.com/gb/app/listed-ai-listing-generator/id6746462486) ·
[PreLoved AI](https://apps.apple.com/gb/app/preloved-ai-vinted-listings/id6749449859) ·
[VintSnap](https://apps.apple.com/gb/app/vintsnap-sell-on-vinted-fast/id6761385561) ·
[AI Listing Assistant](https://apps.apple.com/gb/app/ai-listing-assistant/id6762225350) ·
[Itemise](https://apps.apple.com/gb/app/itemise-snap-to-sell/id6787769529) ·
[Flip: AI Resale Pricing](https://apps.apple.com/gb/app/id6792281092) ·
[VintyLook](https://apps.apple.com/gb/app/id6761313759) ·
[Sell AI — Snap, List, Sold](https://apps.apple.com/gb/app/id6758883858) ·
[Closet Resale App](https://apps.apple.com/gb/app/id6758005659) ·
[SnapFlip](https://apps.apple.com/gb/app/id6761262922) ·
[Listing Monster AI](https://apps.apple.com/gb/app/id6759717220) ·
[Vintsnap: AI Listing Photos](https://apps.apple.com/gb/app/id6761347142) ·
[Sell AI - Listing Maker](https://apps.apple.com/gb/app/id6755742172) ·
[FlipFast](https://apps.apple.com/gb/app/id6769902890) ·
[ListingLab](https://apps.apple.com/gb/app/id6761454886) ·
[QuickList](https://apps.apple.com/gb/app/id6759634194) ·
[Rapid Sell AI](https://apps.apple.com/gb/app/id6758882748) ·
[Future Reference](https://apps.apple.com/gb/app/future-reference/id6739167071) ·
[ListingGenie](https://apps.apple.com/gb/app/id6446372994) ·
[SellRaze](https://apps.apple.com/gb/app/id6455042085) ·
[Crosslist](https://apps.apple.com/gb/app/id6756124351) ·
[Vendoo](https://apps.apple.com/gb/app/id1612168777) ·
[Evriwhere](https://apps.apple.com/gb/app/id6748237786)

**Google Play (✅):**
[Listed AI](https://play.google.com/store/apps/details?id=com.wil7.listedai) ·
[Preloved AI](https://play.google.com/store/apps/details?id=com.prelovedai.app.twa) ·
[FlipStudio](https://play.google.com/store/apps/details?id=studio.flipai.app) ·
[Descripto](https://play.google.com/store/apps/details?id=pl.pajo.marketplacedescriptiongenerator)

**Competitor sites (✅):**
[Snappy](https://www.snappylisting.co.uk/) ·
[Vinting.app](https://vinting.app/) ·
[AutoLister AI](https://autolister.app/) ·
[listedai.app](https://listedai.app/en/) ·
[agentm.co.uk/products/vintsnap](https://agentm.co.uk/products/vintsnap/) ·
[prelovedai.com/promo](https://www.prelovedai.com/promo) ·
[itemise.co](https://itemise.co) ·
[listingmonster.ai](https://listingmonster.ai/)
🟡 not fetched this session: [SharkScribe](https://sharkscribeai.com/vinted-descriptions) ·
[ListaPro](https://listapro.ai/vinted/) ·
[ControlResell](https://controlresell.com/en/docs/automation/ai-listing-creation) ·
[ILoveListing](https://ilovelisting.com/) ·
[Katapic](https://katapic.com/blog/vendere-vinted-ai-2026) ·
[VintyLook articles](https://vintylook.com/en/articles/ai-vinted-complete-guide-automate-sales-2026)

**Platforms (🟡 unless marked):**
[Depop — AI listing from one photo](https://news.depop.com/company-news/depop-launches-ai-powered-listing-from-one-photo/) ·
[Retail Dive — Depop generative AI](https://www.retaildive.com/news/depop-generative-artificial-intelligence-product-descriptions-photo/727860/) ·
[eBay — Magical Listing on mobile](https://innovation.ebayinc.com/stories/ebay-reduces-the-time-to-list-on-mobile-with-new-simplified-selling-tool-now-featuring-magical-listing-ai-technology/) ·
[eBay — Magical Listing tool](https://innovation.ebayinc.com/stories/magical-listing-tool-harnesses-the-power-of-ai-to-make-selling-on-ebay-faster-easier-and-more-accurate/) ·
⚠️ [Value Added Resource — Magical Listing revisited](https://www.valueaddedresource.net/ebay-ai-magical-listing-revisited/) ·
⚠️ [Value Added Resource — does it live up to the hype](https://www.valueaddedresource.net/ebay-magical-listing-ai/) ·
⚠️ [Digital Commerce 360 — eBay AI listing steps halved](https://www.digitalcommerce360.com/2025/04/15/ebay-ai-aided-tool-cut-steps-create-listings/) ·
✅ [Vinted Pro](https://www.vinted.co.uk/pro)

**Crosslisters (✅, from `pricing.md` §3.2):**
[Vendoo](https://www.vendoo.co/pricing) · [List Perfectly](https://listperfectly.com/pricing/) ·
[Crosslist](https://crosslist.com/pricing) · [Nifty](https://nifty.ai/pricing) ·
[OneShop](https://tools.oneshop.com/pricing) · [Evriwhere](https://www.evriwhere.co.uk)

**Archival (✅):** Wayback CDX API — first captures for vinting.app (2026-06-17),
autolister.app (2025-11-16), listinggenie.co (2023-03-10), quicklistai.org
(2026-05-20), vintylook.com (2025-05-19). No captures for snappylisting.co.uk,
prelovedai.com, listedai.app, vintsnap.com, sellai-app.com.

**Could not be reached:** Apple customer-reviews RSS (deprecated, empty feeds) ·
Reddit (403 / interstitial / 429 / blocked domain — **no Reddit evidence in this
file**) · Chrome Web Store (consent redirect, empty body) · App Store Version History
(token-gated API) · Trustpilot pages for any direct competitor (none found to exist).

**Sibling docs:** `docs/research/pricing.md` §3 (the pricing baseline this builds on),
`docs/research/seller-voice.md` (buyer reactions to AI-sounding copy),
`docs/research/what-sells-terminology.md` (seller-note fabrication risk),
`docs/adr/0004-unified-valuation-core.md`, `docs/adr/0005-asking-price-valuation.md`,
`docs/adr/0003-ebay-oauth-and-publishing-removed.md` (bower already decided not to publish — see Q1).
