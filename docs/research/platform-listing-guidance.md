# Platform listing guidance — Vinted, Depop, eBay UK (primary-source research)

Researched 2026-09-08 against each platform's own help centre / seller docs and API
references, plus reputable reseller guides, and cross-checked against the current
`bower` repo (`src/platforms/*`, `src/lib/llm/format.ts`, `src/lib/llm/refine.ts`).
Every substantive claim is sourced inline. Anything that could not be confirmed from a
primary source is flagged **[unverified]** and listed again in the final section rather
than presented as fact.

This doc exists to improve what bower injects when it formats a Neutral Listing for a
Platform (see `CONTEXT.md` — "Platform-formatted Listing", and ADR-0004 on writing for
**only the platform being shown**). The headline output is the three ready-to-use
**prompt fragments** in §4 — drop-in replacements for the `promptFragment` strings in
`src/platforms/<platform>/listing-spec.ts`.

**Confidence key:** ✅ fetched from a platform-owned primary source · 🟡 platform-owned
source reached via search snippet only · ⚠️ secondary/reseller source — verify before
relying.

---

## 1. Vinted (UK)

Vinted publishes a Help Centre and legal/price pages (primary), but **no** seller "SEO"
or title-length spec. Mechanics (condition, fees, parcel sizing, catalog/brand rules)
are well-sourced from Vinted itself; ranking/keyword tactics come only from reseller
guides (secondary).

### Titles
- **No documented character limit.** No primary Vinted source states one. Secondary
  sources range from "~100" to "no hard cap, keep it ~40–60 so it isn't truncated in the
  grid." ⚠️ [Vinta.app](https://blog.vinta.app/blog/vinted-title-best-practices-write-titles-that-sell),
  [Vendoo](https://blog.vendoo.co/how-does-vinted-work-a-step-by-step-guide-on-how-to-sell-on-vinted).
  **[unverified]** — the repo's hardcoded 60 is a safe choice but is not a Vinted-published number.
- **What Vinted itself says:** include "specific details about the item (e.g. its brand,
  colour, type, or unique features)" and avoid generic words like "nice", "pretty",
  "good". ✅ [Describing an item](https://www.vinted.co.uk/help/49-describing-an-item).
- **Search:** the search bar matches "by keywords" across the catalog, combined with
  structured filters — worked example "skinny black H&M jeans". ✅ [Finding items](https://www.vinted.com/help/5/35-finding-items).
  That free-text *descriptions* are indexed, and "keywords in the first 3 lines sell 35%
  faster"-type stats, are **[unverified]** vendor claims. ⚠️ [topbubbleindex](https://www.topbubbleindex.com/blog/vinted-listing-optimization/).
- **Ordering (reseller consensus, not official):** Brand → item type → descriptor
  (style/colour/material) → size. ⚠️ [crosslist](https://crosslist.com/blog/how-to-sell-on-vinted).
- **No emoji, no hashtags, no second brand name in the title.** Vinted's Catalogue Rules
  prohibit naming/hashtagging any brand other than the one selected in the brand field
  *anywhere* in the listing. ✅ [Catalog rules](https://www.vinted.co.uk/catalog-rules).

### Descriptions
- **Measurements and honest condition are explicitly expected by Vinted** (not just a
  buyer preference): "Always provide accurate and detailed information… so buyers can
  decide." Cover measurements; materials beyond the one selected; alterations/repairs;
  missing parts; and flaws — Vinted's own flaw vocabulary is "marks, stains, spots,
  holes, tears or rips, scratches, abrasions, fraying, pilling, creases, stretching,
  washed colour, or odours," shown in photos. ✅ [Describing an item](https://www.vinted.co.uk/help/49-describing-an-item).
- **Tone:** facts over adjectives; replace "gorgeous/stunning" with specifics. ⚠️ [Vinta.app](https://blog.vinta.app/blog/vinted-description-tips-write-listings-that-sell).
- **Hashtags:** no primary guidance on count; guides suggest ~5–8 relevant tags at the
  end. ⚠️ [crosslist](https://crosslist.com/blog/how-to-sell-on-vinted). Hard primary
  rule: no brand hashtag other than the selected brand. ✅ [Catalog rules](https://www.vinted.co.uk/catalog-rules).
- **Invite a bundle.** Sellers set a closet bundle discount; buyers can filter for it and
  one parcel serves several items — a "bundle to save on postage" line fits the culture.
  ✅ [Set up a discount for your closet](https://www.vinted.com/help/422-set-up-a-discount-for-your-closet).

### Categories & structured fields
- Items must be listed under the correct catalog node **and** brand; the brand field and
  catalog node power buyers' filters, so wrong structured fields make an item
  unfilterable. Discoverability magnitude is not quantified by Vinted, but catalog +
  brand + size + colour are the primary levers; the title is secondary. ✅ [Catalog rules](https://www.vinted.co.uk/catalog-rules),
  [Finding items](https://www.vinted.com/help/5/35-finding-items).
- **Condition values — discrepancy to flag.** The Help Centre "Choosing item condition"
  page lists six verbatim values: **New**, **Like new**, **Very good**, **Good**,
  **Satisfactory**, **Needs repair** (electronics only). ✅ [Choosing item condition](https://www.vinted.co.uk/help/50-choosing-item-condition).
  The UK **clothing** upload flow has historically shown "New with tags" / "New without
  tags" in place of "New"/"Like new" — which is what the repo currently hardcodes. I
  could not confirm the exact current UK clothing dropdown strings from a primary source.
  **[unverified]** — ideally read the enum from the live app per category; until then the
  repo's `New with tags | New without tags | Very good | Good | Satisfactory` is a
  reasonable clothing set (drop "Needs repair" — it's electronics-only, correctly absent).
- **Parcel size** is a shipping/logistics choice, not discoverability. Vinted suggests a
  size and enforces carrier limits; once the buyer pays, size/carrier can't change, and
  oversized parcels get refused or surcharged. A lined Carhartt Detroit jacket → **Large**.
  ✅ [Choosing the right parcel size](https://www.vinted.co.uk/help/51-choosing-the-right-parcel-size),
  [Parcel size limits](https://www.vinted.co.uk/help/1227); item→size mapping ⚠️ [mrbags](https://mrbags.co.uk/blogs/blog/how-to-pack-and-send-clothes-on-vinted-2026-guide).

### Selling mechanics that shape wording
- **Sellers pay £0 commission** — the seller keeps 100% of the listed price. ✅ [Price list](https://www.vinted.co.uk/pricelist).
  But **the buyer pays a mandatory fee at checkout** ("usually 3%–8% + £0.30–£0.80"),
  historically the "Buyer Protection fee." ✅ [Buyer Protection fee](https://www.vinted.co.uk/help/342-buyer-protection-fee-on-vinted).
  A reported Oct-2026 terms update renames it a mandatory "Vinted fee" with the same
  calculation — **[unverified]**, secondary only. ⚠️ [Value Added Resource](https://www.valueaddedresource.net/vinted-us-uk-australia-terms-october-2026/).
  **Wording implication:** never tell the buyer "no fees" (they pay the add-on); the
  listed price is what the seller receives.

### Good vs weak — Carhartt Detroit jacket (Vinted)
- **Good title:** `Carhartt Detroit Jacket Brown Duck Canvas Blanket Lined Size L`
- **Weak title:** `Lovely warm jacket - great condition!!` (no brand/type/size; "lovely"
  is a banned filler word) / `Carhartt Detroit Jacket #dickies #workwear 🔥` (second brand
  breaches Catalogue Rules; emoji clutter).
- **Good description:**
  > Carhartt Detroit jacket in brown duck canvas, blanket-lined, corduroy collar. Men's size L.
  >
  > Very good condition — worn a handful of times, no rips, stains or fraying; minor natural fading on the cuffs (shown in photos).
  >
  > Pit-to-pit 58cm, length 68cm, sleeve 65cm. Smoke-free home. Bundle with my other workwear to save on postage.
- **Weak description:** "Gorgeous vintage-style jacket, stunning piece, must-have!!
  #carhartt #dickies #northface #supreme #vintage #ootd" — empty adjectives Vinted tells
  you to avoid, no measurements, no condition specifics, unrelated brand hashtags.

---

## 2. Depop (UK)

Depop's **Selling API reference** is an unusually rich primary source (field schema,
enums, limits). The Zendesk Help Centre and blog block direct fetch (HTTP 403), so a few
tone/description claims come via search snippet (🟡).

### "Titles" — there is no title field
- **Depop is description-first. The listing schema has `description` only — no `title`/
  `name`.** ✅ [Your first listing](https://partnerapi.depop.com/api-docs/getting-started/your-first-listing/),
  [API reference](https://partnerapi.depop.com/api-docs/reference/). **The first line of
  the description is effectively the title** (it's what shows in feeds), so front-load it
  with brand + item type + era/fit + colour + size.
- **Description limit: 1000 characters.** ✅ [API reference](https://partnerapi.depop.com/api-docs/reference/).
- **Search** reads description text + hashtags + structured fields (brand etc.); include
  only relevant words. 🟡 [Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item).

### Descriptions
- **Structure that sells:** item + brand/era → condition notes → measurements → hashtags
  at the end (mirrors Depop's own API example, which pairs condition notes with
  hashtags). ✅ [Your first listing](https://partnerapi.depop.com/api-docs/getting-started/your-first-listing/) · 🟡 [Tips for describing](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item).
- **Culture/tone:** Gen-Z, style-led; casual tone, emojis, and era/aesthetic framing
  ("y2k", "streetwear", "grunge", "vintage") are normal **and map directly onto Depop's
  own `style`/`age`/`source` fields** (below). ⚠️ [voolist](https://www.voolist.com/blog/how-to-sell-on-depop-guide) · framing terms confirmed as first-class fields ✅ [API reference](https://partnerapi.depop.com/api-docs/reference/).
- **Hashtags:** go **inside the description**; **max 5 per listing**. ✅ [API reference](https://partnerapi.depop.com/api-docs/reference/),
  [Your first listing](https://partnerapi.depop.com/api-docs/getting-started/your-first-listing/).
  A "max 2 brand hashtags" sub-limit appears in the Zendesk help but could only be reached
  via snippet — **[unverified]** 🟡. Don't tag a brand the item isn't.
- **Measurements:** strong community norm (pit-to-pit, length) but not a documented Depop
  rule. **[unverified]** ⚠️ [vendoo](https://blog.vendoo.co/how-to-get-started-selling-on-depop).

### Categories & structured fields (all ✅ from the Selling API)
[API reference](https://partnerapi.depop.com/api-docs/reference/), [taxonomy](https://partnerapi.depop.com/api-docs/concepts/taxonomy/):
- **Condition enum:** `brand_new`, `used_like_new`, `used_excellent`, `used_good`,
  `used_fair` → app labels ≈ "Brand new", "Used – like new", "Used – excellent",
  "Used – good", "Used – fair".
- **Department:** `womenswear`, `menswear`, `kidswear`, `everything-else`.
- **Product type:** specific subcategory (`tshirts`, `jeans`, `jackets`…).
- **Size:** `size_set_id` + `size_id` (region-dependent; US/GB/EU).
- **Brand:** free string; unmatched → `unbranded` ("Other").
- **Colour:** array, **max 2**. **Style:** array, **max 3**. **Age:** array, **max 1**
  (`modern`/`y2k`/`90s`…). **Source:** array, **max 2** (`vintage`, `preloved`, `reworked`,
  `custom`, `handmade`, `deadstock`, `designer`, `repaired` — note there is **no `new`
  source value**).
- Accurate structured fields widen where the item surfaces (buyers filter on them).
  ⚠️ [listperfectly](https://listperfectly.com/selling/depop-seo-guide/).

### Selling mechanics that shape wording
- **Make Offer** is on every listing; default suggested offer is **15% off**, and Depop
  reports an **average 23% discount** via offers. ✅ [Make Offer launch](https://news.depop.com/company-news/depop-launches-make-offer/),
  [negotiation tools](https://news.depop.com/company-news/depop-community-embraces-offers-as-suite-of-negotiation-tools-expands/).
  Price with negotiation headroom; copy may invite offers.
- **Fees (UK):** the **10% seller fee was removed** for UK listings created from
  20 Mar 2024, replaced by a **buyer-paid marketplace fee** (up to ~5% + up to £1) plus
  **Depop Payments processing 2.9% + £0.30**. ⚠️ [Value Added Resource](https://www.valueaddedresource.net/depop-drops-selling-fee-in-uk-shifts-fee-burden-to-buyers/),
  [vendoo UK fees](https://uk.blog.vendoo.co/guide-to-depop-fees-for-uk-sellers-buyers).
  **The repo's `feePct: 10` for Depop is now out of date for the UK** — flagged in §5
  (metadata, out of scope for this doc to change).
- Discovery is search/hashtag-led and freshness-weighted (recent listings/edits rank
  higher). ⚠️ [exportyourstore](https://www.exportyourstore.com/blog/depop-algorithm).

### Good vs weak — Carhartt Detroit jacket (Depop)
- **Good (description, line 1 = pseudo-title):**
  > Carhartt Detroit Jacket — Brown Duck Canvas, Blanket Lined 🧥
  > Men's M (pit-to-pit 22", length 27"). Classic workwear fit.
  > Condition: used – good. Light fading + honest wear at cuffs, cord collar intact, all poppers work. No rips or stains.
  > #carhartt #detroitjacket #workwear #vintage #streetwear
  (brand + item + colour + size front-loaded; real measurements; honest condition matching
  `used_good`; exactly 5 relevant hashtags; aesthetic framing mirroring `style`/`age`/`source`.)
- **Weak:** "Lovely brown jacket, so warm 🥰 perfect for winter vibes!! DM me 💌 #ootd
  #fashion #tumblr #aesthetic #cute #vibes #sale #fyp #cheap" — no brand/size/condition/
  measurements, >5 hashtags (over the limit), tone over substance.

---

## 3. eBay UK

eBay UK Seller Centre and Help pages are primary. eBay does **not** publish Cassini's
internal weightings, so any "% of ranking" or "optimal char count" figures are
third-party **[unverified]**.

### Titles
- **80 characters:** "You've got 80 characters… use as many as you can." ✅ [Create great listings](https://www.ebay.co.uk/sellercentre/listings/create-listings),
  [Best practices](https://www.ebay.co.uk/sellercentre/listings/create-listings/best-practices).
- **Content/ordering:** eBay says include "the brand, model or type, colour, style, and
  even the model number." Its own examples model **Brand → department → type →
  material/colour → size** (e.g. "Ann Taylor Women's Sweater 100% Cotton Black Yellow
  Sleeves Size 6"). ✅ [Create great listings](https://www.ebay.co.uk/sellercentre/listings/create-listings).
  A practical full order: **Brand → Department → Type → Colour → Material → Style/Fit →
  Size** (+ model number where relevant).
- **Keyword stuffing / brand misuse — official policy.** "Using keywords that are not
  directly related to the item for sale is not allowed"; prohibited are unrelated popular
  keywords, comparisons to other products, question marks, and **mixing different brands/
  models in one listing**. For clothing, "fits / for / compatible with" before a brand
  name is **not allowed**. ✅ [Search & browse manipulation policy](https://www.ebay.com/help/policies/listing-policies/search-browse-manipulation-policy?id=4243).
  So: dense *real* attributes are encouraged; unrelated brand/designer names are a
  violation.
- **No hashtags, no emojis.** eBay has no hashtag feature and says "avoid using special
  characters or irrelevant words." ✅ [Create great listings](https://www.ebay.co.uk/sellercentre/listings/create-listings).
  (The literal "no emoji" is inferred from "avoid special characters," not a verbatim ban —
  **[unverified]** as a quote, sound as an inference.)

### Descriptions
- Include "the item's brand name, style, and model numbers, along with any unique
  qualities"; "be accurate and transparent about your item's condition"; the more relevant
  detail, the easier for buyers. ✅ [Create great listings](https://www.ebay.co.uk/sellercentre/listings/create-listings),
  [Best practices](https://www.ebay.co.uk/sellercentre/listings/create-listings/best-practices).
- **No required length** — completeness and relevance, not word count. The repo's
  "150–200 words" is a reasonable internal target, not an eBay figure. **[unverified]** as
  an eBay rule.
- **Condition disclosure is tied to search visibility and returns:** inaccurate condition
  "can result in listings not appearing in relevant searches, increased returns, and
  negative feedback." ✅ [Pre-loved fashion condition guidance](https://pages.ebay.co.uk/prelovedfashionconditionguidance/).
- Laid-flat garment measurements (pit-to-pit/length/sleeve) are reseller-community
  practice, strongly implied by "photograph all angles and imperfections" but **not an
  eBay-published standard**. **[unverified]** ⚠️.

### Categories & item specifics
- Item specifics are structured fields that "help buyers locate products through search
  and filters," power the left-hand "shop by" navigation, and feed Google Shopping.
  ✅ [Item specifics](https://www.ebay.co.uk/sellercentre/listings/item-specifics).
- **Tiers:** **Required** (Brand, Size, Colour — "critical… will ensure maximum
  visibility"), **Recommended** ("provide as many as you can"), **Additional**.
  "Completed item specifics are essential for being found on both eBay and external search
  engines." ✅ [Item specifics](https://www.ebay.co.uk/sellercentre/listings/item-specifics).
- eBay made many fashion specifics mandatory (Style, Colour, Material, Sleeve Type, Fit,
  Neckline…) and cited that women's dresses with Style + Dress Length "sell on average 81%
  better." ✅ [New item specifics requirements for Fashion](https://community.ebay.co.uk/t5/Announcements/New-item-specifics-requirements-for-Fashion-start-today/ba-p/6291682).
  The exact per-subcategory required list is set **live in the listing form** and shifts —
  treat the form's required/recommended flags as authoritative. **[unverified]** as a
  fixed list.
- **A blank specific = invisible to that filter:** if a buyer filters by a size you left
  empty, the listing doesn't appear — completeness, independent of the title, is what makes
  a listing eligible for faceted search. ✅ [Item specifics](https://www.ebay.co.uk/sellercentre/listings/item-specifics).
- **Condition values (official, 2025 scheme):** **New with tags** · **New without tags** ·
  **New with imperfections** (renamed from "New with defects") · **Pre-owned – Excellent** ·
  **Pre-owned – Good** · **Pre-owned – Fair**. The three-tier Pre-owned set replaced the
  single "Pre-owned/Used" value for UK pre-loved clothing in 2025 — emit these exact
  strings, never legacy "Used." ✅ [Item conditions by category](https://www.ebay.co.uk/help/selling/listings/creating-managing-listings/item-conditions-category?id=4765),
  [New conditions for Fashion, Jan 2025](https://www.ebay.co.uk/sellercentre/news/2025-january/fashion-conditions),
  [Pre-loved fashion condition guidance](https://pages.ebay.co.uk/prelovedfashionconditionguidance/).

### Selling mechanics that shape wording
- **Best Offer / Offers to Buyers:** acceptance is handled by the mechanism, not prose —
  copy can note openness to offers but shouldn't bury a firm minimum in text. ✅ [Offers to Buyers & Best Offer](https://ebay.co.uk/sellercentre/grow-your-sales/using-promotions-to-boost-your-sales/offer-to-buyers-best-offer).
- **Returns:** "not as described" / damaged returns are **paid by the seller** — the single
  biggest reason to be specific and disclose flaws rather than flattering. ✅ [Return postage for sellers](https://www.ebay.co.uk/help/selling/managing-returns-refunds/return-postage-sellers?id=4703).
- **Tracked postage** recommended so eBay can see progress in disputes — stating "sent
  tracked" + dispatch time sets expectations. ✅ [Return postage for sellers](https://www.ebay.co.uk/help/selling/managing-returns-refunds/return-postage-sellers?id=4703).
- **Promoted Listings** (fixed-price clothing qualifies) rely on the same title/specific
  relevance, so keyword completeness matters even more when paying for placement.
  ✅ [Promoted Listings FAQ](https://pages.ebay.co.uk/promote-your-listings/faq/b2c/).

### Good vs weak — Carhartt Detroit jacket (eBay UK)
- **Good title (~76 chars):** `Carhartt Detroit Jacket Mens Brown Duck Canvas Blanket Lined Workwear Size L`
- **Weak (under-filled):** `Carhartt jacket used` — wastes ~60 chars, omits size/colour/
  material, invisible to filters. **Weak (policy-violating):** `Carhartt Detroit Jacket
  like Dickies Stussy Supreme vintage RARE L 🔥` — unrelated brands breach the
  search-manipulation policy; emoji/"RARE" are discouraged.
- **Good description:** "Genuine Carhartt Detroit Jacket in brown duck canvas with corduroy
  collar and blanket lining. Men's size L. Measurements laid flat: pit-to-pit 23in, back
  length 27in, sleeve 25in. Pre-owned – Good: light fading at cuffs and one small mark on
  the left forearm (shown in photos), all zips and snaps work, no rips. Smoke-free home.
  Sent tracked, dispatched within 1 working day."
- **Weak:** "Nice Carhartt jacket, good condition, any questions just ask!" — no
  measurements/size/material, vague condition, no flaw disclosure; raises returns risk
  (seller-funded) and ranks poorly.

---

## 4. Ready-to-use prompt fragments

These are drop-in replacements for the `promptFragment` string in each
`src/platforms/<platform>/listing-spec.ts`. They are phrased as instructions to the model
and assume the surrounding `format.ts` scaffold (which supplies the source Neutral
Listing, the tone hint, the `fields` schema, and the JSON output shape). Each keeps the
repo's existing JSON contract: `title`, `description`, `hashtags[]`, `fields[]`.

### Vinted
```
Format for Vinted. Vinted has NO hashtag-based ranking and NO documented title-length
limit — its search matches keywords against the catalog plus the structured fields, so
correct fields matter more than clever prose. Keep the "hashtags" array to AT MOST a few
(0–6) genuinely relevant terms (e.g. #workwear, #vintage) — never a second brand name, and
never a brand other than the one in the Brand field (Vinted's Catalogue Rules forbid it
anywhere in the listing).

TITLE: Brand + item type + key descriptor (colour/material/style) + size. Sentence case
(capitalise first word and proper nouns only). Aim for ~40–60 characters so it is not
truncated in the grid. No emojis, no hashtags, no second brand. Do NOT use empty filler
words Vinted explicitly discourages ("nice", "pretty", "lovely", "gorgeous", "stunning").

DESCRIPTION: facts over adjectives, 3–5 short lines, each on its own line with a blank
line between. MUST state the size. SHOULD include measurements (e.g. pit-to-pit, length,
sleeve in cm) whenever they are available in the source — Vinted explicitly expects them.
State condition honestly using Vinted's own flaw vocabulary where relevant (marks, stains,
holes, rips, fraying, pilling, fading, odours) and say if the home is smoke-free. End with
a short bundle invite such as "Bundle with my other items to save on postage." Do NOT tell
the buyer there are "no fees" — buyers pay a mandatory fee at checkout. Do NOT suggest
outfit pairings or styling ideas; keep to fabric, fit, condition, and key details.
```

### Depop
```
Format for Depop. Depop has NO separate title field — the listing is one description of up
to 1000 characters, and its FIRST LINE is what shows in the feed, so treat line 1 as a
keyword-dense pseudo-title: Brand + item type + era/fit + colour + size. Put the value you
would have used as a title into BOTH the "title" field (for bower's own UI) and as the
opening line of "description".

TONE: casual and style-led for a Gen-Z audience — light emoji use is welcome, and
era/aesthetic framing ("y2k", "streetwear", "grunge", "vintage", "workwear") is expected.
Keep it genuine, not salesy.

DESCRIPTION STRUCTURE: line 1 pseudo-title → fit/measurements (pit-to-pit, length if
available) → honest condition note → hashtags on the last line. State condition in words
that match the structured Condition field.

HASHTAGS: put them in the "hashtags" array (Depop stores them inside the description).
MAXIMUM 5, each with a # prefix and each genuinely relevant — mix garment type + brand +
style/era (e.g. #carhartt #detroitjacket #workwear #vintage #streetwear). Fewer relevant
tags beat five padded ones. Never tag a brand the item is not. Keep the hashtags
consistent with the Style/Age/Source fields.

Price leaves room to negotiate (Make Offer is on every listing; buyers expect ~15% off),
so the copy may gently welcome offers.
```

### eBay (UK)
```
Format for eBay UK. eBay has NO hashtag field and no emoji — search ("Best Match") is
driven by the 80-character title and the item specifics in "fields". Leave the "hashtags"
array EMPTY ([]).

TITLE: use as many of the 80 characters as you can with the item's REAL attributes only,
ordered Brand → Department → Type → Colour → Material → Style/Fit → Size (add a model
number/name if known, e.g. "Detroit"). Do NOT pad with unrelated brand names, "like",
"fits", "for", comparisons, question marks, or emojis — eBay's search-manipulation policy
forbids them for clothing and it can suppress the listing.

DESCRIPTION: factual and complete, roughly 80–200 words. Include brand, model/style name,
material, and — whenever the source provides them — laid-flat measurements (pit-to-pit,
length, sleeve). Disclose condition specifically and name any flaws with reference to the
photos; accurate condition is tied to search visibility and to who pays for a "not as
described" return (the seller always does). Close with postage expectations ("sent
tracked, dispatched within 1 working day") when appropriate. Searchable real keywords, no
hashtags, no flattery in place of detail.

ITEM SPECIFICS: populate every field in the schema below — do not just mention an
attribute in prose, MIRROR it into the specific. Brand, Size and Colour are required by
eBay and a blank specific makes the listing invisible to that filter. Use eBay's exact
condition strings (New with tags / New without tags / New with imperfections / Pre-owned –
Excellent / Pre-owned – Good / Pre-owned – Fair) — never the legacy "Used".
```

---

## 5. How the three should differ — and what's wrong/missing in the repo today

### How they differ from each other
- **Unit of discoverability.** eBay = 80-char keyword title **+** item specifics (a blank
  specific = invisible to that filter). Vinted = catalog node + brand + size + colour
  first, title/description human-facing second. Depop = description text + up to 5 hashtags
  + style/age/source fields; there is **no title at all**.
- **Tone.** Depop rewards casual, emoji-friendly, aesthetic/era framing. eBay rewards
  formal, factual, keyword-dense prose with zero decoration. Vinted sits between: honest
  and plain, facts over adjectives, but not salesy.
- **Hashtags.** Depop: up to 5, inside the description, load-bearing for discovery.
  Vinted: optional, a handful at most, never a second brand. eBay: none, ever.
- **What the text must carry.** All three want measurements and honest condition; eBay
  most strictly (it's tied to returns the seller funds). Depop uniquely wants era/aesthetic
  vocabulary because those are real filter fields.

### What the repo's current prompts get wrong or miss
1. **Depop `promptFragment` invents a title.** It says "Title: Brand + Type + Key Feature,
   max 60 chars." Depop has **no title field** and a **1000-char** description; the title
   concept should be reframed as the description's first line (pseudo-title). `format.ts`
   still needs a `title` for bower's own UI, so keep producing one but tell the model it is
   the opening line of the description, not a platform field. (src/platforms/depop/listing-spec.ts)
2. **Depop Source value `New` is invalid.** The API `source` enum is
   `vintage/preloved/reworked/custom/handmade/deadstock/designer/repaired` — there is no
   `new`. The repo's `Source: Vintage | Pre-loved | New` should drop "New". Also: Style may
   be up to **3** (repo says "one or two"), Colour up to **2**, Source up to **2**, Age
   exactly **1**. Condition "Like new" is really "Used – like new" per the API. (depop/listing-spec.ts)
3. **eBay condition string is stale.** The repo lists `New with defects`; eBay renamed it
   **New with imperfections** in the 2025 fashion-condition scheme. The other five strings
   match. (src/platforms/ebay/listing-spec.ts)
4. **eBay prompt doesn't warn against the search-manipulation policy.** Packing the 80
   chars with *unrelated* brand names or "fits/for" is a policy breach for clothing that
   can suppress the listing — the current "pack in keywords" wording risks encouraging it.
   The §4 fragment adds the guardrail. (src/platforms/ebay/listing-spec.ts)
5. **Vinted misses measurements and bundles.** The repo requires only size in the
   description and explicitly bans styling, but omits measurements — which Vinted's own
   Help Centre *expects* — and the bundle invite that fits the zero-seller-fee culture. The
   §4 fragment adds both. Its hardcoded "max 60 characters" is defensible but **unverified**
   against any Vinted source. (src/platforms/vinted/listing-spec.ts)
6. **Metadata fee figures are drifting from reality (out of scope to edit here, flagged).**
   `depop/metadata.ts` still has `feePct: 10`; the UK **seller** fee was removed in Mar
   2024 (buyers now pay a marketplace fee + processing). `vinted/metadata.ts` `0%` is
   correct for sellers but the buyer pays a mandatory fee. Because `netPrice()` and the
   Recommendation weighting (ADR-0004) lean on `feePct`, a stale Depop 10% understates
   Depop take-home — worth a separate fix. (src/platforms/*/metadata.ts)
7. **Generic, not per-platform, tone handling.** `format.ts`'s `TONE_HINT` lumps "Depop or
   Vinted" together as "casual." Depop's emoji/era culture and Vinted's plain-honest
   culture are different registers; the §4 fragments now carry the platform-specific tone,
   so the shared tone hint can stay light.

### Things to verify live rather than hardcode (per the flags above)
- Vinted: exact **title length limit** and the current **UK clothing condition dropdown
  strings** ("New with tags" vs "New"/"Like new") — read from the live app/API per
  category.
- Depop: the **"max 2 brand hashtags"** sub-limit (snippet-only); measurement expectation
  is a norm, not a documented rule.
- eBay: Cassini weightings and "optimal char count" stats (third-party); the complete
  current **per-subcategory required item-specifics list** (set live in the listing form);
  the literal "no emoji" ban (inferred from "avoid special characters").

---

### Primary sources (index)
- Vinted: [Describing an item](https://www.vinted.co.uk/help/49-describing-an-item) ·
  [Choosing item condition](https://www.vinted.co.uk/help/50-choosing-item-condition) ·
  [Parcel size](https://www.vinted.co.uk/help/51-choosing-the-right-parcel-size) ·
  [Catalog rules](https://www.vinted.co.uk/catalog-rules) ·
  [Finding items](https://www.vinted.com/help/5/35-finding-items) ·
  [Price list](https://www.vinted.co.uk/pricelist) ·
  [Buyer Protection fee](https://www.vinted.co.uk/help/342-buyer-protection-fee-on-vinted) ·
  [Closet bundle discount](https://www.vinted.com/help/422-set-up-a-discount-for-your-closet)
- Depop: [Selling API reference](https://partnerapi.depop.com/api-docs/reference/) ·
  [Your first listing](https://partnerapi.depop.com/api-docs/getting-started/your-first-listing/) ·
  [Taxonomy](https://partnerapi.depop.com/api-docs/concepts/taxonomy/) ·
  [Make Offer launch](https://news.depop.com/company-news/depop-launches-make-offer/) ·
  [Negotiation tools](https://news.depop.com/company-news/depop-community-embraces-offers-as-suite-of-negotiation-tools-expands/)
- eBay UK: [Create great listings](https://www.ebay.co.uk/sellercentre/listings/create-listings) ·
  [Best practices](https://www.ebay.co.uk/sellercentre/listings/create-listings/best-practices) ·
  [Item specifics](https://www.ebay.co.uk/sellercentre/listings/item-specifics) ·
  [Item conditions by category](https://www.ebay.co.uk/help/selling/listings/creating-managing-listings/item-conditions-category?id=4765) ·
  [New fashion conditions Jan 2025](https://www.ebay.co.uk/sellercentre/news/2025-january/fashion-conditions) ·
  [Pre-loved fashion condition guidance](https://pages.ebay.co.uk/prelovedfashionconditionguidance/) ·
  [Search & browse manipulation policy](https://www.ebay.com/help/policies/listing-policies/search-browse-manipulation-policy?id=4243) ·
  [Return postage for sellers](https://www.ebay.co.uk/help/selling/managing-returns-refunds/return-postage-sellers?id=4703) ·
  [Offers to Buyers & Best Offer](https://ebay.co.uk/sellercentre/grow-your-sales/using-promotions-to-boost-your-sales/offer-to-buyers-best-offer)
