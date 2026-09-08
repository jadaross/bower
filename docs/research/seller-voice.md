# Seller voice & register — how people actually *write* secondhand listings

Researched 2026-09-08. This is a **language / tone / sociolinguistic** study of how real
sellers talk when they write secondhand clothing listings — the register, the stock
phrases, the emoji and punctuation habits — **not** a fields/mechanics study. The
structured side (titles, measurements, condition taxonomy, character limits, the
per-platform prompt fragments) is already covered in
`docs/research/platform-listing-guidance.md` and is deliberately **not repeated here**.

Primary focus: **Vinted (UK)**. Secondary, for contrast only: **Depop** and **eBay UK**.

This feeds bower's `/api/format` and `/api/refine` copy-generation (see `ARCHITECTURE.md`
and ADR-0004 — format *only the platform being shown*). The goal is to capture the real
register so generated copy reads like a person, not a robot.

**Confidence key** (same as the sibling doc):
✅ fetched from a platform-owned primary source ·
🟡 platform-owned source reached via search snippet only ·
⚠️ secondary / reseller guide — directional, verify before relying ·
🔴 **anecdotal / could not verify** — treat as a hypothesis, not a fact.

**A standing caveat on the phrase banks.** I could *not* fetch r/VintedUK, r/Depop or
live listing pages directly — Reddit blocks the fetch tool (`403`/"unable to fetch") and
individual listings sit behind app/JS walls. So the stock-phrase banks below are
assembled from reseller guides and seller-tip articles that *claim* to describe common
seller language, cross-checked against what each platform's own help centre says about
tone. Where a phrase is only attested by a guide (not a primary source or a listing I
could see), it is marked ⚠️ or 🔴. **Everything in §2–§6 is "commonly reported seller
usage", not a verified frequency count.** A human should eyeball 20–30 live UK listings
before any of this is hard-coded.

---

## 1. Vinted (UK) — the voice profile

### 1.1 Register and tone

The defining fact, from Vinted itself: the platform tells sellers to be **specific and
honest**, and explicitly to **avoid empty praise**. Its help centre says to "include
specific details about the item (e.g. its brand, colour, type, or unique features)" and
to "avoid words that don't specify how your item is different (e.g. 'nice', 'pretty', or
'good')", and that "honesty is the best policy." ✅
[Describing an item](https://www.vinted.co.uk/help/49-describing-an-item).

So the *authentic* Vinted register is **plain, first-person, domestic and slightly
terse** — closer to a classified ad or a text to a mate than to marketing copy. Practical
characterisation, triangulated across guides:

- **First person, lightly.** "I" and "my" appear naturally — *"no longer fits me"*,
  *"I've only worn it once"*, *"from my smoke-free home"* — but the listing is mostly
  *about the item*, not a diary entry. ⚠️
  [makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/).
- **A light personal "why I'm selling"** is considered a trust-builder, not fluff:
  *"Bought for a wedding, worn once"* is said to "do more to build trust than any number
  of five-star reviews." One short relatable line ("no longer fits", "not my style
  anymore") is encouraged; a paragraph about how much you loved it is not. ⚠️
  [makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/),
  [VintyLook](https://vintylook.com/en/articles/vinted-description-how-to-write-text-that-sells-ai-tool).
- **Warm-but-functional, not chatty.** Direct address to the buyer ("you") shows up
  mainly in the sign-off ("any questions just ask"), less in the body. The body is
  descriptive, not conversational. ⚠️ (guide consensus; 🔴 on exact proportion).
- **Scannable.** Guides converge on **3–5 short sentences**, because "buyers scan
  descriptions on their phones." ⚠️
  [makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/).

**How this differs from eBay:** eBay reads as a *catalogue entry* — keyword-front-loaded,
impersonal, "what it is / condition / what's included, in that order" ✅
[eBay Listing best practices](https://www.ebay.com/sellercenter/listings/create-listings/best-practices).
Vinted keeps the facts but lets a **person** hold the pen: contractions, a reason for
selling, a friendly closer. Vinted is *a tidy person selling their own wardrobe*; eBay is
*a shop writing a product page*.

### 1.2 Openers and closers

**Openers.** Real Vinted descriptions typically **open straight on the item**, not with a
greeting — the title already carries brand/type, so the first line confirms
*brand + item + colour* and then condition. Guides give the working pattern as "opening
line with brand + item type + colour to confirm what the buyer sees." ⚠️
[vinting.app](https://vinting.app/blog/best-way-to-write-vinted-descriptions). Greetings
("Hi!", "Hey lovelies") are **rare in the description itself** on Vinted — they belong to
Depop and to DMs. 🔴 (asserted from register, not a counted sample.)

**Closers / sign-offs.** These are the most recognisably "Vinted" bit of voice — a short
functional sign-off line. Commonly reported:

- *"Any questions just ask"* / *"Any questions, feel free to ask"* 🔴
- *"From a smoke-free home"* / *"pet-free, smoke-free home"* — treated as a genuine
  trust signal buyers search for, not filler. ⚠️
  [makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/),
  [PurseForum discussion](https://forum.purseblog.com/threads/smoke-free-pet-free-home.747444/).
- *"Happy to bundle"* / *"bundle to save on postage"* — invites a multi-item parcel. ⚠️
  [Vinted – selling a bundle](https://www.vinted.com/help/257-selling-a-bundle).
- *"Other items from the same brand on my profile"* / *"check out my other items"* —
  a cross-sell closer guides explicitly recommend. ⚠️
  [VintyLook](https://vintylook.com/en/articles/vinted-description-how-to-write-text-that-sells-ai-tool).
- *"Grab a bargain"*, *"no returns"*, *"no offers" / "offers welcome"* — attested as
  common register but 🔴 not verified from live listings.

One emoji at the very end of a closer (e.g. a single ✨ or 💚) is within norm; see §1.6.

### 1.3 Vocabulary and stock phrases

**Condition / history (the honest, high-trust core):**
*"worn once" · "only worn once" · "worn twice" · "worn a handful of times" ·
"hardly worn" · "barely worn" · "like new" · "excellent condition" · "good used
condition" (often abbreviated **GUC**) · "brand new with tags" (**BNWT**) · "brand new
without tags" (**BNWOT**) · "no rips, stains or marks" · "no pilling" · "small mark on
..." · "slight bobbling" · "label faded from washing"*. "Worn once" and BNWT/BNWOT are
flagged as trust-builders buyers look for. ⚠️
[makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/).

**Reason-for-selling:** *"no longer fits" · "doesn't fit me anymore" · "not my style
anymore" · "wardrobe clear-out" / "having a clear-out" · "too small/big for me" ·
"unwanted gift" · "bought for a wedding, worn once"*. ⚠️ (guides).

**British spellings / idiom that must survive generation:** *colour, grey, jumper,
trainers, pumps, dungarees, joggers, leggings, vest (= tank), co-ord, fit (= outfit),
bargain, postage (not "shipping"), quid / £, size 8/10/12 (UK), UK 6 (shoes)*. eBay/US
drift ("pants", "sneakers", "shipping", "$") reads as not-British and should be avoided
for UK listings. 🔴 (idiom list is editorial, not from a counted corpus — but low-risk.)

**Descriptor words that are fine in moderation:** *cosy, comfy, soft, flattering,
staple, versatile, everyday, smart, casual, roomy, stretchy*. These are acceptable when
**anchored to a fact** ("cosy oversized knit", "stretchy so forgiving on the waist").
Used bare and stacked, they drift into the "trying too hard" zone (§1.7).

**Words Vinted itself tells you to drop:** *"nice", "pretty", "good"* — too generic. ✅
[Describing an item](https://www.vinted.co.uk/help/49-describing-an-item). Guides extend
this to *"gorgeous", "stunning", "beautiful", "lovely"* — "they add nothing, nobody
searches for them." ⚠️
[VintyLook](https://vintylook.com/en/articles/vinted-description-how-to-write-text-that-sells-ai-tool).

### 1.4 Fit / sizing language (conversational)

Sellers describe fit relative to the body and to the tag, in plain terms:
*"true to size" (**TTS**) · "runs small" · "runs big" · "comes up small/large" ·
"oversized fit" · "relaxed/baggy fit" · "roomy" · "fitted" · "would fit a 10–12" /
"fits more like a M–L" · "generous sizing" · "snug on me, I'm usually a 10"*. Anchoring
to the seller's own size ("I'm usually a 10 and it was snug") is a recognised
trust/credibility move. ⚠️
[vinting.app](https://vinting.app/blog/best-way-to-write-vinted-descriptions); 🔴 on the
exact phrase frequencies. Vinted's own advice is simply to give **measurements** so the
buyer can decide, which pairs naturally with one conversational fit line. ✅
[Describing an item](https://www.vinted.co.uk/help/49-describing-an-item).

### 1.5 Bundle / offer / postage phrasing

On Vinted the buyer pays postage and **Buyer Protection**, and **bundling** several items
into one parcel is a first-class feature — so the conversational invitations cluster here:

- **Bundle:** *"Happy to bundle"* · *"bundle to save on postage"* · *"check my wardrobe,
  discount on bundles"* · *"grab a few bits and I'll combine postage"*. Bundling is a
  real Vinted mechanic (closet/bundle discount), so these lines map to something the
  buyer can actually do. ⚠️
  [Vinted – selling a bundle](https://www.vinted.com/help/257-selling-a-bundle),
  [bundles policy](https://www.vinted.com/help/260-bundles-policy).
- **Offers:** *"offers welcome"* · *"open to offers"* · *"make me an offer"* · or the
  gatekeeping *"no silly offers please"* / *"price is firm"*. 🔴 (register, not verified).
- **Postage:** sellers usually **don't quote a price** (Vinted sets it by parcel size),
  so postage lines are light-touch: *"posted next day"* · *"quick postage"* · *"sent
  tracked"*. 🔴 Avoid inventing a postage cost — bower must never state a figure Vinted
  controls.

> Note the conversational *"sadly selling as it no longer fits"* closer is flagged by at
> least one guide as a **cliché to avoid** — the sentiment (reason for selling) is good,
> the "sadly…" framing reads as tired. ⚠️
> [VintyLook](https://vintylook.com/en/articles/vinted-description-how-to-write-text-that-sells-ai-tool).

### 1.6 Emoji and punctuation norms

- **Emoji: sparing.** Guidance is explicit — "one or two emojis (✨ 💚 🌟) make the
  description more lively… don't overuse, otherwise it looks cheap. A single emoji at the
  end is usually enough." ⚠️
  [makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/). So Vinted
  tolerates a *light* emoji touch (✨ 🌟 💚 👕 ♻️ are the commonly cited set) but an
  emoji-per-line wall reads as spam. This is **much** lighter than Depop.
- **No emoji/hashtags in the *title*** (and no second brand name) — a hard Vinted
  Catalogue rule, not just taste. ✅
  [Catalog rules](https://www.vinted.co.uk/catalog-rules).
- **Line breaks / dashes:** short lines and simple dash bullets for facts
  (`- Pit to pit: 52cm`) are common and scan well on mobile. 🔴 (observed pattern in
  guides' sample layouts, not counted).
- **ALL CAPS:** used for abbreviations (BNWT, GUC, TTS) and the occasional one-word
  emphasis; a whole line in caps reads as shouty/spammy. 🔴.

### 1.7 What reads as "trying too hard" / fake / AI-written — the **avoid** list

This is the most decision-relevant section for bower. Tells that mark a listing as
spammy, dropshipped, or AI-generated, drawn from the critical/seller-community sources:

- **"Romanced" copy with no facts.** The clearest community tell: AI descriptions
  "'romance' the description with details that are superfluous and don't provide
  pertinent details like measurements and condition." ⚠️
  [eBay community – AI-generated descriptions](https://community.ebay.com/t5/Selling/AI-Generated-Descriptions/m-p/34461050/highlight/true)
  (quoted via search;
  [discussion index](https://community.ebay.com/t5/Selling/AI-generated-item-descriptions/m-p/35074750)).
- **Marketing-clone phrasing** that no real person selling one jumper would write:
  *"elevate your wardrobe", "must-have", "perfect addition to any collection",
  "effortlessly chic", "timeless elegance", "versatile piece that transitions from day to
  night", "exude confidence", "look no further"*. 🔴 These are the canonical AI/retail
  clichés — I could not pin each to a counted source, but they are exactly the "superfluous
  romance" the community complains about. **bower should blacklist this family.**
- **Over-polished uniformity.** Scam/dropship listings read (and look) identical across
  items — same cadence, same adjectives, same studio tone. The Vinted dropshipping
  investigation keys mostly on **visual** uniformity and AI-generated worn-photos rather
  than wording, but the "too slick to be one person's wardrobe" signal carries to text
  too. ✅ [science.feedback.org](https://science.feedback.org/genai-powered-dropshipping-scams-vinted/),
  ⚠️ [nssmag](https://www.nssmag.com/en/fashion/45705/artificial-intelligence-ai-vinted-scams-fake-listings).
- **Overselling / false condition.** AI "describe[s] an item as 'in perfect condition'
  when it has a stain" — copy that gushes about condition without specifics, or contradicts
  the photos, reads as lazy/fake and "make[s] sellers look like you can't count on [them]
  to describe the condition accurately." ⚠️ (eBay community, via search).
- **Adjective stacking** ("gorgeous stunning beautiful versatile timeless") — see §1.3;
  Vinted's own guidance is against the empty-praise words. ✅.
- **Em-dashes, flawless grammar, and a suspicious absence of the personal.** 🔴 This is a
  widely-held reader heuristic (ordinary sellers use commas, ellipses, and the odd typo;
  they say *why* they're selling). I could not source a hard study, so treat as a
  hypothesis — but the safe implication for bower is: **keep it plainly punctuated,
  first-person, and specific**, and don't out-polish a real person.

**Net rule for bower:** the line between "a person who writes well" and "AI" on Vinted is
**facts + a reason for selling + plain punctuation**. Every sentence should carry
information (a measurement, a condition note, a fit note, a reason for selling). The
moment a sentence carries only *vibe*, it reads as generated.

### 1.8 Length and rhythm

- **Short.** 3–5 sentences is the repeated guide recommendation; buyers scan on mobile. ⚠️
  [makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/).
- **Fragments are fine.** Real listings mix full sentences with telegraphic fragments and
  dash-bullets (`- 100% cotton`, `- Pit to pit 50cm`, `- From a smoke-free home`). 🔴
  (observed in sample layouts).
- **Rhythm:** confirm the item → condition/history → material/measurements (often
  bulleted) → one-line closer (bundle / questions / smoke-free). This is the shape to
  generate, not a flowing paragraph.

---

## 2. Contrast — Depop's voice (shorter)

Depop is the **Gen-Z, aesthetic-led** end of the spectrum. Its own help centre frames
description writing as casual and community-native; reseller guides describe the target
voice as **"write like you're texting a friend about something cool you found."** 🟡
[Depop – Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item)
(reached via snippet; the page `403`s the fetch tool), ⚠️
[sagedatum](https://sagedatum.com/blogs/apps/how-do-i-write-a-good-depop-description).

What changes versus Vinted:

- **Warmer, more first-person-emotive and style-led** — "vivid, descriptive language to
  evoke interest and style ideas", friendly calls-to-action, personal touches. ⚠️
  [getquicklist](https://getquicklist.app/blog/ebay-listing-description-best-practices-what-sells-vs-what-doesnt).
- **Aesthetic vocabulary does real work** here (unlike Vinted): *y2k, coquette,
  cottagecore, grunge, vintage, downtown, clean-girl, fairycore, streetwear* — these are
  both style signals *and* discovery tags.
- **Hashtag culture is central.** Depop gives **5 hashtag slots**; the reported pattern is
  item-type → era/origin → material/fit → aesthetic → trending. ⚠️
  [nifty.ai – Depop hashtags](https://nifty.ai/post/depop-hashtags),
  [vintageclothingguides](https://vintageclothingguides.com/guides/optimizing-hashtags-and-keywords-for-vintage-sales-on-depop/).
  Depop itself notes it auto-generates tags you can keep or extend, and says to include
  only *relevant* words/tags. 🟡
  [Depop – Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item).
- **Emoji-heavier and CTA-friendly.** *"dm me"*, *"make an offer"*, *"open to offers"*,
  *"more on my page"*, heart/sparkle/flame emoji are at home here. Depop has a formal
  **Make Offer** flow, so offer-invites map to a real feature. ✅
  [Depop – Make Offer](https://depophelp.zendesk.com/hc/en-gb/articles/4412315779345-Make-Offer).
- **Still wants the facts underneath.** Depop's own guidance is to add measurements, fit
  notes, and flaws — the aesthetic voice sits *on top of* the same honest core. 🟡 (help
  centre snippet).

So: **same honest skeleton as Vinted, styled up** — more emoji, aesthetic/era words,
hashtags, and a chattier "texting a friend" register.

## 3. Contrast — eBay UK's voice (shorter)

eBay is the **formal, factual, keyword-dense** end. Personality is optional and secondary;
**searchability and accuracy** dominate. From eBay's own Seller Centre:

- **Front-load keywords, logical order, use the 80-character title, real buyer language,
  no ALL CAPS / asterisks / obscure acronyms (e.g. don't use "NIB").** ✅
  [eBay – Listing best practices](https://www.ebay.com/sellercenter/listings/create-listings/best-practices).
- **Essential info first:** "exactly what the item is, its condition, and what's
  included — in that order", overview at the top, least-important at the bottom. ✅ (same).
- **Description must be accurate and complete** (Item Description Policy). ✅ (same).
- Tone guidance from guides: eBay is peer-to-peer so *some* informality is fine, but
  "buyers primarily want factual information… descriptions should inform, not oversell."
  ⚠️ [salehoo](https://www.salehoo.com/learn/ebay-product-descriptions).

So for eBay bower should **drop the personal "why I'm selling" and the warm closer**,
and write a **factual, keyword-forward, structured** description — closer to a spec sheet
than a note. No emoji. This matches the sibling fields doc and ADR-0004's "format only the
platform being shown."

---

## 4. "Real seller" vs "robot/AI" — same item, side by side

Item: a women's COS navy A-line midi dress, UK 12, worn twice, 100% organic cotton, from
a smoke-free home. (The base facts mirror a sample description in ⚠️
[makemoneywithoutajob](https://makemoneywithoutajob.com/vinted-description/); the two
renderings below are illustrative, written for this doc.)

**✅ Sounds like a real Vinted seller:**

> COS navy A-line midi dress, UK 12. Worn twice, no marks or pilling — basically like
> new. 100% organic cotton, fully lined, so it hangs really nicely. Pit to pit 46cm,
> length 112cm. True to size, I'm usually a 12 and it fit well. From a smoke-free home.
> Happy to bundle with other bits on my page ✨

Why it works: first line confirms the item; every sentence carries a fact (condition,
material, measurements, fit); one light personal anchor ("I'm usually a 12"); a real
trust line; a functional bundle closer; exactly one emoji.

**🔴 Sounds like a robot / AI:**

> Elevate your wardrobe with this absolutely stunning, timeless COS midi dress! ✨💙 This
> gorgeous, versatile piece effortlessly transitions from day to night and is the perfect
> addition to any fashion-lover's collection. Crafted from luxurious fabric, it exudes
> elegance and sophistication. A true must-have staple you won't want to miss — grab this
> beauty today! 💃🔥👗

Why it fails on Vinted: pure "romance", no measurements, no honest condition, adjective
stacking ("stunning/gorgeous/timeless/versatile"), marketing clichés ("elevate your
wardrobe", "must-have", "day to night", "exude elegance"), emoji spray, and zero personal
reason for selling — every tell from §1.7 at once.

---

## 5. Proposal — candidate voice instructions for bower's prompts

> **This section is a proposal for a human to review, NOT something I have implemented.**
> I did not touch any prompt. These are candidate lines for the `voice`/tone portion of
> each platform's `promptFragment` (`src/platforms/<platform>/listing-spec.ts`), to sit
> *alongside* the field/structure guidance already proposed in the sibling doc. Wording
> is a starting point, not final.

**Shared preamble (all platforms):**

> Write as the real person selling their own item, not as a shop or a marketer. Every
> sentence must carry information — a measurement, a condition note, a fit note, or the
> reason for selling. Never use empty praise ("nice", "pretty", "good", "gorgeous",
> "stunning", "beautiful", "timeless"). Never use retail/marketing clichés ("elevate your
> wardrobe", "must-have", "perfect addition", "effortlessly", "day to night", "exude",
> "look no further"). Do not oversell or contradict the stated condition. Use British
> English and British terms (colour, jumper, trainers, postage, £).

**Vinted fragment (candidate):**

> Tone: plain, honest, lightly personal — like a tidy person selling from their own
> wardrobe. First line confirms brand + item + colour. Then condition/history, material,
> and at least one measurement (bullet the facts). Allow one short personal reason for
> selling if natural ("no longer fits", "only worn once") but never a paragraph about it.
> Optionally close with one functional line: a bundle invite, "any questions just ask",
> or "from a smoke-free home" (only if true / provided). 3–5 short sentences; fragments
> and dash-bullets are fine. At most one emoji, at the very end, optional. No emoji or
> hashtags in the title; never name a second brand.

**Depop fragment (candidate):**

> Tone: casual and friendly, like texting a mate about something cool you found. Keep the
> honest core (condition, fit, measurements, flaws) but lead with style — era and
> aesthetic words are welcome where accurate (e.g. y2k, vintage, oversized, grunge). A
> short style suggestion and a light CTA ("dm me", "open to offers") fit. Emoji are fine
> in moderation. Put relevant hashtags at the end (item type, era/origin, material/fit,
> aesthetic) — only accurate ones.

**eBay UK fragment (candidate):**

> Tone: factual and neutral — a clear product description, not a personal note. No emoji,
> no "why I'm selling", no warm sign-off. Front-load the important keywords in buyer
> language. State exactly what the item is, its condition, and what's included, in that
> order, then specifics (brand, size, colour, material, measurements). Accuracy over
> personality; inform, don't oversell. No ALL CAPS, asterisks, or obscure acronyms.

**Refinement-chip implication:** a "make it warmer / more personal" chip should push
*toward* the Vinted/Depop end (add a reason-for-selling line, a closer, soften); a "keep
it factual" chip toward eBay. None of these chips should ever be allowed to add the §1.7
cliché family — that blacklist should hold regardless of chip.

---

## 6. Open questions / what a human should verify before relying on this

1. 🔴 **The phrase banks are from guides, not a counted corpus of live listings.** Reddit
   (r/VintedUK, r/Depop) and individual listing pages could not be fetched by the research
   tool. Someone should skim 20–30 real UK listings per platform and confirm which
   openers/closers/fit phrases actually recur, and in what proportion.
2. 🔴 **The "AI tells" wording list (em-dashes, marketing clichés) is partly a reader
   heuristic, not a sourced study.** The *superfluous-romance-without-facts* signal is
   well-attested; the specific banned-phrase list is editorial. Validate before hard-coding
   a blacklist.
3. ⚠️ **Emoji tolerance on Vinted** ("one or two, at the end") comes from one guide; worth
   a second source or a live spot-check, since it materially affects generated output.
4. 🟡 **Depop's official tone guidance** was only reachable via search snippet (its help
   page `403`s the fetch tool). Re-read
   [Depop – Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item)
   in a browser to confirm the exact wording before quoting it in a prompt.
5. Nothing here changes the **fields/mechanics** conclusions in
   `docs/research/platform-listing-guidance.md`; this doc only adds the *voice* layer on
   top of them.

### Sources

Primary / platform-owned:
- [Vinted – Describing an item](https://www.vinted.co.uk/help/49-describing-an-item) ✅
- [Vinted – Catalog rules](https://www.vinted.co.uk/catalog-rules) ✅
- [Vinted – Selling a bundle](https://www.vinted.com/help/257-selling-a-bundle) ✅ · [Bundles policy](https://www.vinted.com/help/260-bundles-policy) ✅
- [eBay – Listing best practices (Seller Centre)](https://www.ebay.com/sellercenter/listings/create-listings/best-practices) ✅
- [Depop – Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item) 🟡 (snippet only)
- [Depop – Make Offer](https://depophelp.zendesk.com/hc/en-gb/articles/4412315779345-Make-Offer) ✅

Critical / community (AI & scam tells):
- [Science Feedback – GenAI-powered dropshipping scams on Vinted](https://science.feedback.org/genai-powered-dropshipping-scams-vinted/) ✅
- [nss magazine – Is AI ruining Vinted?](https://www.nssmag.com/en/fashion/45705/artificial-intelligence-ai-vinted-scams-fake-listings) ⚠️
- [eBay community – AI-Generated Descriptions](https://community.ebay.com/t5/Selling/AI-Generated-Descriptions/m-p/34461050/highlight/true) ⚠️ · [AI-generated item descriptions](https://community.ebay.com/t5/Selling/AI-generated-item-descriptions/m-p/35074750) ⚠️

Reseller / seller-tip guides (directional, ⚠️):
- [makemoneywithoutajob – Vinted descriptions](https://makemoneywithoutajob.com/vinted-description/)
- [VintyLook – How to write text that sells](https://vintylook.com/en/articles/vinted-description-how-to-write-text-that-sells-ai-tool)
- [vinting.app – Best way to write Vinted descriptions](https://vinting.app/blog/best-way-to-write-vinted-descriptions)
- [nifty.ai – Depop hashtags](https://nifty.ai/post/depop-hashtags)
- [vintageclothingguides – Depop hashtags/keywords](https://vintageclothingguides.com/guides/optimizing-hashtags-and-keywords-for-vintage-sales-on-depop/)
- [sagedatum – Depop descriptions](https://sagedatum.com/blogs/apps/how-do-i-write-a-good-depop-description)
- [getquicklist – eBay vs (description best practices)](https://getquicklist.app/blog/ebay-listing-description-best-practices-what-sells-vs-what-doesnt)
- [salehoo – eBay product descriptions](https://www.salehoo.com/learn/ebay-product-descriptions)
- [PurseForum – Smoke-free / pet-free home](https://forum.purseblog.com/threads/smoke-free-pet-free-home.747444/)
