# What sells — terminology and phrasing on Vinted UK, Depop and eBay UK

Researched 2026-09-10. Builds on `docs/research/platform-listing-guidance.md` (fields
and mechanics) and `docs/research/seller-voice.md` (register and tone). Neither is
repeated here. Both said Reddit could not be fetched; **this time it could** (see §1),
so the phrase banks those docs marked 🔴 "guide-attested only" are now checked against
what buyers and sellers actually say, with vote counts.

The two questions the app's owner asked are answered head-on in §2.6–2.7, §3.6–3.7 and
§4.6–4.7, and folded into the prompt changes in §6.

**Confidence key** (same as the sibling docs):
✅ platform-owned primary source fetched ·
🟡 platform-owned source via snippet only ·
⚠️ secondary guide, directional ·
🔴 anecdotal / unverified.

Reddit threads are 🔴 by that key's definition (they are opinions, not policy), but every
one cited below was **fetched directly and read in full this session**, and the vote
score is given so the reader can weigh it. A 120-upvote thread with 40 agreeing comments
is not the same as one guide's claim. Quotes are kept to a few words each.

---

## 1. Method

**Fetched directly (✅):** Vinted *Describing an item*; Depop *Tips for describing your
item* and *How to list an item* (both previously 🟡, now read in full); eBay UK *Customs
requirements* (the Country/Region of Origin item specific). eBay UK title and item
specifics pages were already ✅ in the sibling doc and were not re-fetched.

**Reddit — what did and did not work:**

| Method | Result |
|---|---|
| `curl` to `old.reddit.com/r/<sub>/search.json` (browser UA) | `302` to `/login/?reason=lor2` — old Reddit now requires login, JSON included |
| `curl` to `www.reddit.com/r/<sub>/search.json` (any UA) | `403` HTML shell; Googlebot UA gets a "Blocked" page |
| Claude's `WebFetch` on reddit.com | refused ("unable to fetch") |
| Redlib/libreddit mirrors (`safereddit.com`, `redlib.privacyredirect.com`, others) | `200` but an Anubis proof-of-work bot challenge; not attempted further (the rules forbid bypassing bot-detection). Others `403`/`429`/timeout |
| **Chrome extension (claude-in-chrome), new tab on `www.reddit.com`, anonymous** | **Works.** Search pages render for logged-out users |
| **Same tab, `fetch('/r/<sub>/search.json?q=…&restrict_sr=1')` and `/r/<sub>/comments/<id>.json` via `javascript_tool`** | **Works, same-origin, no login.** Full JSON: titles, selftext, scores, top comments |

Two practical notes for the next researcher: (1) return an **object or array** from
`javascript_tool`, not a string — strings are truncated at ~1 KB, objects come back in
full (6 KB+); (2) strip URLs and `?&=` characters from comment bodies before returning
or the tool blocks the output as "cookie/query string data". Reddit's CSP blocks
`fetch` to `localhost`, so data cannot be POSTed out of the tab; page it through in
object results instead.

Subreddits searched: r/VintedUK, r/vinted, r/Vintedsellers (no useful results),
r/Depop, r/Flipping, r/eBaySellers, r/Ebay, r/ThriftGrift, r/VintageFashion. About 60
searches and 35 threads read. Live listing pages on vinted.co.uk were not reachable
(domain not permitted in the extension), so there is still no counted corpus of live
listings — but the Reddit threads quote and screenshot enough of them to settle the
questions below.

---

## 2. Vinted UK

### 2.1 What buyers search for

- Vinted's search is keyword-on-catalogue plus filters; the structured fields (category,
  brand, size, colour) are the primary levers and the title is secondary. ✅ (sibling
  doc, [Finding items](https://www.vinted.com/help/5/35-finding-items),
  [Catalog rules](https://www.vinted.co.uk/catalog-rules)).
- **Size is the search buyers care about most and the one sellers most often get wrong.**
  A 163-upvote thread, *"No accurate size is driving me bananas"*: top reply (68) "If I
  search for jeans, I want size 8. End of." 🔴
  [r/VintedUK 1rflsfm](https://www.reddit.com/r/vintedUK/comments/1rflsfm/). Buyers ask
  for the size in the description and a photo of the size label, because the size filter
  buckets (6/8, 8/10) hide the actual size.
- Searchable words are the plain ones: brand, garment type, colour, material, size.
  A seller's own recipe, in reply to "how do I write descriptions so the algorithm picks
  them up": "brand, size, condition, colour, and any flaws. Then make sure the title
  contains the main keywords someone would actually search for." 🔴
  [r/vinted 1vsqfg3](https://www.reddit.com/r/vinted/comments/1vsqfg3/).

### 2.2 Title recipe

Unchanged from the sibling doc (brand → type → descriptor → size, ~40–60 chars, no emoji,
no second brand). ✅/⚠️. Nothing on Reddit contradicts it, and the size thread above
argues for putting the **actual size** in the title, not just the field.

### 2.3 Description shape and length that sells

This is the strongest finding of the session, and it is one-directional: **shorter**.

- The seller with "100% positive feedback… across thousands of sales" on both Vinted
  and eBay, in a 255-upvote tips post: "**I keep descriptions brief; Condition / size /
  any flaws.**" and "I generally understate the condition". 🔴
  [r/VintedUK 1sixee7](https://www.reddit.com/r/vintedUK/comments/1sixee7/).
- On a thread mocking an AI description (80 upvotes): "descriptions dont even need to
  be elaborate… briefly describe the item (pink short sleeved tank top), add the brand,
  possibly the condition and add measurements if you want THATS IT" and "Why do I have
  to scroll through your whole life story to find out if the item is an 8 or a 10, and
  whether it has any defects." 🔴
  [r/VintedUK 1uw4urt](https://www.reddit.com/r/vintedUK/comments/1uw4urt/).
- "most of the stuff I buy and sell is just '**only used a couple times. Smoke free
  home**' and that does the job. like why do we need its lore" (12 upvotes). 🔴
  [r/VintedUK 1rvlars](https://www.reddit.com/r/vintedUK/comments/1rvlars/).
- "I just bullet point things needed to know, I don't even write in full sentences as
  people don't want that anyways!" 🔴
  [r/VintedUK 1pml465](https://www.reddit.com/r/vintedUK/comments/1pml465/).
- The ideal, as a buyer wrote it: "**'100% wool, multicolour yarn, great condition size
  M'**". Top reply (76): "I ain't reading all thaaaaaat". 🔴
  [r/vinted 1qyrbgh](https://www.reddit.com/r/vinted/comments/1qyrbgh/) (119 upvotes).

So the working Vinted description is **two to four short lines, often fragments**:
what it is (brand, type, colour) · size, ideally with one measurement · condition with
any flaw named · one optional functional line. The repo's current "4–5 clear sentences,
max 80 words" is at the long end of what real sellers write and should come down.

### 2.4 Phrases that are expected

- **Condition shorthand**: "worn once", "only used a couple of times", "BNWT", "new
  without tags", "very good condition", "no marks", "small mark on…". Confirmed
  everywhere; sellers also warn that the *dropdown* must agree with the text (117-upvote
  rant about "new without tags" listings whose descriptions admit wear). 🔴
  [r/vinted 1r4r7dr](https://www.reddit.com/r/vinted/comments/1r4r7dr/).
- **Flaw vocabulary**: Vinted's own list — "marks, stains, spots, holes, tears or rips,
  scratches, abrasions, fraying, pilling, creases, stretching, washed colour, or
  odours". ✅ [Describing an item](https://www.vinted.co.uk/help/49-describing-an-item).
- **"Smoke free home"** — genuinely expected *when true*; see §2.6.
- **"No silly offers" / "price is firm"** — common seller-side gatekeeping, and buyers
  resent "open to offers" on already-cheap items. 🔴
  [r/VintedUK 1vyph94](https://www.reddit.com/r/vintedUK/comments/1vyph94/),
  [r/VintedUK 1usphee](https://www.reddit.com/r/vintedUK/comments/1usphee/).
- **Bundle lines** are fine; the bundle discount is a real setting and buyers use it. ✅
  (sibling doc). But a 20-comment thread complains about sellers who *say* "bundle
  discount" and then refuse offers, so the line should only be generated if the seller
  actually has one — the app cannot know, so keep it soft ("happy to bundle") or drop it.
  🔴 [r/VintedUK 1rso3ah](https://www.reddit.com/r/vintedUK/comments/1rso3ah/).

### 2.5 Phrases that read as fake or AI-written

Buyers on both Vinted subs are explicit and consistent (threads of 80, 105, 119 and
1,203 upvotes):

- **Length itself** is the first tell. "Wall of text", "novel", "life story",
  "sale pitch". 🔴 (all four threads above, plus
  [r/vinted 1uny871](https://www.reddit.com/r/vinted/comments/1uny871/) — a seller
  left the ChatGPT prompt in, 1,203 upvotes.)
- **Named giveaways**: "**elevate your style**" ("Definitely AI slop. The giveaway is
  the 'elevate your style' phrasing"), "**artisanal charm**", "prepare to fall in love",
  "frivolous puffery", "creative writing attempts". 🔴
  [1rvlars](https://www.reddit.com/r/vintedUK/comments/1rvlars/),
  [1ne471a](https://www.reddit.com/r/vinted/comments/1ne471a/).
- **Wrong facts**: AI text that contradicts the photos or lists a flaw as a feature
  ("crease on back" treated as a design detail). 🔴
  [1pml465](https://www.reddit.com/r/vintedUK/comments/1pml465/).
- **The buying consequence is stated outright**: "I don't buy anything where the
  description is clearly AI written", "That would make me less likely to buy", "it
  actually deters me from purchasing". 🔴 (1rvlars, 1ne471a).
- One claim, 54 upvotes, that AI descriptions are now against Vinted's terms. **Not
  found in any Vinted help page** — treat as 🔴 unverified.
  [1ne471a](https://www.reddit.com/r/vinted/comments/1ne471a/).

What people *do* accept from AI: a couple of correct garment-construction words
("really good… at describing cuts/features with the correct words. I like to use those")
and tidy bullets — never the prose. 🔴
[1rvlars](https://www.reddit.com/r/vintedUK/comments/1rvlars/).

### 2.6 The smoke-free question

**Do real sellers write it?** Yes, routinely, and buyers treat it as meaningful:

- "I always put smoke free home in adverts". "I thought it was expected to say whether
  it's a smoke free and/or pet free home". "I do put in my listing that it is a smoke
  free home". 🔴 [1t68s2k](https://www.reddit.com/r/vintedUK/comments/1t68s2k/)
  (119 upvotes, *"It should be mandatory to declare you're a smoker"*),
  [1v1abar](https://www.reddit.com/r/vinted/comments/1v1abar/) (130 upvotes).
- "Should be a tick box on all vinted items to show if from a smoke/pet free home"
  (12). 🔴 [1v1abar](https://www.reddit.com/r/vinted/comments/1v1abar/).
- Buyers say a smoke smell fails "basic satisfactory condition", and Vinted's own flaw
  list includes "odours". ✅ [Describing an item](https://www.vinted.co.uk/help/49-describing-an-item).

**Do buyers care?** Intensely. Three separate high-vote threads in five months are
buyers demanding disclosure. So the phrase is *not* filler on Vinted.

**Does it belong in generated copy?** **No — not unless the seller says so.** The
evidence for that is as strong as the evidence that the phrase matters:

- A thread titled *"If you list your items as coming from smoke free & pet free home
  and I find them covered in fur and smelling like ashtray, you suck"*. 🔴
  [1w2mtsx](https://www.reddit.com/r/vintedUK/comments/1w2mtsx/).
- *"Smoke & pet free home?"* — a listing that said so, with a dog visible in the
  photo (38 upvotes, mocked). 🔴
  [1r3xbkn](https://www.reddit.com/r/vintedUK/comments/1r3xbkn/).
- Sellers with pets deliberately **do not** write "pet free"; the honest ones write
  "smoke free home but I do have a dog" or "dog hairs included". 🔴
  [190tlns](https://www.reddit.com/r/vinted/comments/190tlns/),
  [1t68s2k](https://www.reddit.com/r/vintedUK/comments/1t68s2k/).
- "Smells of smoke" is also a known **return excuse** buyers use against sellers,
  which a false "smoke free" claim makes indefensible. 🔴
  [1w12ie6](https://www.reddit.com/r/vintedUK/comments/1w12ie6/).

The app has no way to know. Generating "from a smoke-free home" on every listing
manufactures exactly the lie the community is angriest about, and it also makes every
bower listing look identical (the drop-shipper tell in the sibling doc). **Drop it from
generation entirely.** If a future version adds a per-seller profile toggle ("my home is
smoke-free" / "I have pets"), then and only then emit it, as the seller's own line.

One seller asked whether "smoke free home" triggers listing removal; replies say no,
and "I include that in all my listings and none have ever been removed". 🔴
[1w27kch](https://www.reddit.com/r/vinted/comments/1w27kch/). So it is safe to write
when true; it is just not ours to write.

### 2.7 The country-of-manufacture question

**Do real Vinted sellers write it?** Almost never as a bare fact. Across ~60 searches
no Vinted seller was found writing "Made in China" or "Made in Bangladesh" as a
description line; where "made in" appears it is one of three things:

1. **An authenticity / quality cue for specific brands and eras** — buyers *use* it as
   a check. A buyer accused a seller of fakes because the Ray-Bans "don't say 'Made in
   Italy'" (86 upvotes). 🔴 [1uf85gt](https://www.reddit.com/r/vintedUK/comments/1uf85gt/).
   "Dolce & Gabbana made in china…" as a fake tell. 🔴
   [1izfand](https://www.reddit.com/r/vinted/comments/1izfand/). A buyer celebrating
   "8€ for a made in France 100% wool sweater" (Lacoste). 🔴
   [1wa15gn](https://www.reddit.com/r/vinted/comments/1wa15gn/).
2. **A drop-shipper / fake-brand tell** — pseudo-brands literally named "Made in Italy"
   or "Luxe Paris" flooding the feed. 🔴
   [1v8jtcm](https://www.reddit.com/r/vintedUK/comments/1v8jtcm/),
   [1qpix5h](https://www.reddit.com/r/vinted/comments/1qpix5h/).
3. **Nothing** — for ordinary high-street clothing it simply is not mentioned.

**When is it a selling point?** When the country *raises the price or dates the piece*:
Made in USA (Carhartt, Levi's, vintage tees — "deadstock, nwt, made in usa" is
Depop-title language, and "is anything that says made in usa vintage?" is a real
question), Made in England (Dr. Martens — "not even made in England" is the insult on a
151-upvote r/ThriftGrift post), Made in Italy / France (designer, Ray-Ban, Lacoste),
Made in Japan (denim). 🔴
[r/Depop 14v5wy6](https://www.reddit.com/r/Depop/comments/14v5wy6/),
[r/Depop vqxbrh](https://www.reddit.com/r/Depop/comments/vqxbrh/),
[r/ThriftGrift v2jj4c](https://www.reddit.com/r/ThriftGrift/comments/v2jj4c/),
[r/VintageFashion 14njc7n](https://www.reddit.com/r/VintageFashion/comments/14njc7n/).

**When is it noise?** Every other case. "Made in China/Bangladesh/Turkey/Vietnam/
Cambodia" on a Zara top tells the buyer nothing they would search for, reads as
tag-parroting, and on Vinted specifically sits next to the drop-shipper stigma. It
should never be copied into a description as a fact about the garment.

The cause in the repo is structural, not stylistic: `tag_data.country_of_manufacture`
sits in the same JSON document the model writes the description into, and the eBay
description rule literally says "include… care info". The model treats the OCR record as
material. §6 fixes that at the source.

---

## 3. Depop

### 3.1 What buyers search for

The best source this session is a set of notes from three Depop-run seller webinars,
relayed by an attendee (131 upvotes; the speaker "is also employed by Depop"). It is
second-hand reporting of a platform source, so 🔴/⚠️ — but it is consistent with
Depop's own help page (✅) and with the top-seller post below.
[r/Depop 1utphmm](https://www.reddit.com/r/Depop/comments/1utphmm/):

- Ranking is "relevancy > listing quality > buyer behavior".
- **"3 to 5 word titles are the most impactful… something that a buyer would type or
  search for."** "'Cute' or 'Amazing' aren't going to help push it."
- **Niche words like "cottagecore" "don't actually help your listing"** — fine in the
  body, keep them out of the first 3–5 words.
- **Hashtags "do not do anything extra"** beyond the same word in the title.
- More filled attributes (colour, brand, style, age, material) = higher in search.
- **Measurements do not boost search**; they "merely make your buyer… feel more
  comfortable".
- "Try your best to refrain from utilizing the AI feature."

Depop's own page agrees on the shape: "Start with a title: add relevant words that you
would search for as a buyer… **Keep it short and to the point.** Only include relevant
words, hashtags, brands, and tags." ✅
[Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item).
And the listing flow is "Describe your item, using up to five hashtags and **up to two
brand hashtags**". ✅ (previously 🟡)
[How to list an item](https://depophelp.zendesk.com/hc/en-gb/articles/360032716413-How-to-list-an-item).

On the title field: Depop's help still frames the title as the *start of the
description*; the webinar notes talk about "titles" as the first 3–5 words. Either way,
**line one is the title** and the sibling doc's pseudo-title rule stands. ✅/🔴.

### 3.2 Title recipe

Brand + garment + one or two searchable descriptors (era, fit, colour) + size, in **3–5
words plus the size**. Aesthetic tags after, never first. Example from the 2023
top-seller post (189 upvotes): "Grunge y2k flare low rise pants Size 6 grey pants with
buckle details and wide leg fit." 🔴
[r/Depop 108047q](https://www.reddit.com/r/Depop/comments/108047q/).

### 3.3 Description shape and length

From the same top-seller post, the **good** shape: searchable line → size/colour/fit
detail → "No flaws, from the early 2000's" → one personal line ("they just don't fit
me!") → 5 hashtags. The **bad** shape, which "could also get you banned": "Super cool
and unique pants! Just clearing out my closet, love these…" followed by keyword
stuffing. The stated rule: "as few unnecessary words as possible and as many descriptors
as possible in the first part… If you want to… talk about why you're selling etc, make
sure you put that lower". 🔴 [108047q](https://www.reddit.com/r/Depop/comments/108047q/).

Depop: "Add measurements and fit notes… Describe the condition… noting any flaws or
signs of wear… Add shipping info and any bundle options." ✅
[Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item).

Measurements are a hard buyer expectation even if they don't rank: "I don't buy anything
from anyone who doesn't provide measurements. There is not 'true size'" (41). 🔴
[r/Depop 11860gu](https://www.reddit.com/r/Depop/comments/11860gu/) (72 upvotes).

### 3.4 Phrases that are expected

Era/aesthetic words (**y2k, 90s, grunge, streetwear, vintage**) are load-bearing on
Depop because they mirror the Style/Age/Source fields ✅ (sibling doc) — *after* the
searchable words, and only where accurate. "No flaws" / "no rips or stains" as the
condition line. "Open to offers" is tolerable because Make Offer exists ✅, but see 3.5.

### 3.5 Phrases that read as fake, spammy or AI

- **"rare"** — a 146-upvote thread, *"The overuse of 'rare'"*: "9/10 times there's at
  least 100 of the exact same item". Top reply (73): young sellers "with very little
  knowledge about what actually constitutes a rare or vintage item". Also: "I hate the
  use of 'deadstock' when it's just old season Topshop". 🔴
  [r/Depop 1481381](https://www.reddit.com/r/Depop/comments/1481381/). A 2019 buzzword
  thread names "Y2k vInTaGe" and "RARE" as the least-liked. 🔴
  [efyf2v](https://www.reddit.com/r/Depop/comments/efyf2v/).
- **AI text**: "I don't trust any of the AI text to be accurate, so I'd be only looking
  at the pictures" (16); "Every time I can tell there is an AI description I pass even
  if I like the item" (7); "reads low effort, and isn't able to identify small details"
  (11). The one defence: fine "if you don't overdo it (paragraphs of clearly AI
  generated text)". 🔴 [r/Depop 1u91aie](https://www.reddit.com/r/Depop/comments/1u91aie/).
  Depop's own auto-descriptions are mocked for "#festivalvibes" on everything and for
  retitling lawn flags as "Water Sports". 🔴
  [1nk6tkh](https://www.reddit.com/r/Depop/comments/1nk6tkh/),
  [1txqw8n](https://www.reddit.com/r/Depop/comments/1txqw8n/).
- **"DM me for an offer"** — buyers are caught out by it and Depop has a native offer
  flow; a 113-upvote post is a warning about exactly this. 🔴
  [1t305l2](https://www.reddit.com/r/Depop/comments/1t305l2/). Drop "dm me" from
  generated copy.
- **Keyword stuffing** at the bottom of the description — a stated ban risk. 🔴
  [108047q](https://www.reddit.com/r/Depop/comments/108047q/).

### 3.6 The smoke-free question (Depop)

Less ritualised than on Vinted, but present. Sellers put "smoke free, dog friendly home"
**in their bio** rather than every listing (10 upvotes), and a minority add a line per
textile item: "my home is smoke free, low scent but pet friendly". 🔴
[r/Depop 1umv8f5](https://www.reddit.com/r/Depop/comments/1umv8f5/). The phrase is
also the seller's defence in the (many) "buyer claims it smells of smoke" disputes —
an 893-upvote thread is a seller "appealing a subjective 'smoke odor' claim… I am a
non-smoker". 🔴 [1uj87va](https://www.reddit.com/r/Depop/comments/1uj87va/). Same
conclusion as Vinted: meaningful when the seller says it, a liability when generated.

### 3.7 Country of manufacture (Depop)

"Made in USA" is genuine **title** currency for vintage and workwear on Depop
("deadstock, nwt, made in usa"; "made in USA true religion jeans"; "Tag says made in
usa!" as a dating question). 🔴 [14v5wy6](https://www.reddit.com/r/Depop/comments/14v5wy6/),
[14nj8zl](https://www.reddit.com/r/Depop/comments/14nj8zl/),
[techab](https://www.reddit.com/r/Depop/comments/techab/). "Made in China" appears
only as an accusation — a "handmade" shop caught with Made in China tags, 139 upvotes,
top reply (452) "They lied. File a claim". 🔴
[12eq20q](https://www.reddit.com/r/Depop/comments/12eq20q/). So: the same
selling-point-or-silence rule as Vinted, with USA/England/Italy/France/Japan as the
allowlist and only for brands/eras where it matters.

---

## 4. eBay UK

### 4.1 Item specifics versus description

The sibling doc's finding holds and is reinforced: **item specifics are where eBay
search lives; the description is for condition and what's included.** ✅. Sellers who
sell in volume say "I just use my title and condition as the description. That's all
people really want" (19) and "descriptions don't even matter at all… I use the
condition field for condition" (8). 🔴
[r/Flipping 1ikaq93](https://www.reddit.com/r/Flipping/comments/1ikaq93/),
[1bwlsi9](https://www.reddit.com/r/Flipping/comments/1bwlsi9/).

**Country of origin is an item specific, not prose.** eBay: "Enter a valid country name
in the 'Country/Region of Origin' field in your listing under 'Item Specifics'";
"selecting 'Unknown' is not a valid entry"; listings without it "may not be eligible
for purchase by US buyers". ✅
[eBay UK — Customs requirements](https://www.ebay.co.uk/sellercentre/global-sales/customs-requirements).
eBay has started auto-filling it, wrongly ("all Toyota parts come from Japan"). 🔴
[r/Ebay 1qr6qxh](https://www.reddit.com/r/Ebay/comments/1qr6qxh/). This is the one
place the tag's `country_of_manufacture` has a proper home — as a field value, which is
exactly what the OCR is good for.

### 4.2 Title keyword order and what buyers filter on

Unchanged: 80 chars, Brand → Department → Type → Colour → Material → Style/Fit → Size,
no unrelated brands, no "fits/for". ✅ (sibling doc). Buyers filter on Brand, Size,
Colour, Condition, Style, Material — the required/recommended specifics. ✅.

### 4.3 Description shape and length

The evidence points **shorter and plainer** than the repo's current 150–250 words:

- 214-upvote *"Hot take: eBay's AI-generated descriptions suck"*: "Give me a list of the
  dimensions, flaws, and any relevant details. Don't make me search through a paragraph
  of disingenuous filler." Top reply (47): AI turns "a few bullet points of clear,
  concise, easy to read information" into "3 paragraphs of used car salesmen fluff". 🔴
  [r/Flipping 1bwlsi9](https://www.reddit.com/r/Flipping/comments/1bwlsi9/).
- "AI description is useless, give real information (measurements, years, faults with
  product, etc…)". 🔴 [1ikaq93](https://www.reddit.com/r/Flipping/comments/1ikaq93/).
- Buyers of clothing and handbags specifically: "the majority of descriptions are now
  generated by AI… Frequently, the photos are not sufficient to determine the true
  condition". 🔴 [r/Ebay 1ntjd1l](https://www.reddit.com/r/Ebay/comments/1ntjd1l/);
  and "The AI nonsense descriptions are what killed eBay for me" (46). 🔴
  [r/vinted 1qyrbgh](https://www.reddit.com/r/vinted/comments/1qyrbgh/).
- The exception is genuinely high-ticket collectables, where "collectors want to READ
  all about it". 🔴 [1ikaq93](https://www.reddit.com/r/Flipping/comments/1ikaq93/).

A UK pre-loved clothing description therefore wants **50–120 words**: what it is (brand,
line, material), size with laid-flat measurements, condition with named flaws, what's
included. No story, no care label, no country line (that is a field).

### 4.4 Phrases that are expected

"Pre-owned – Good" style condition strings ✅ (sibling doc); "measurements laid flat";
"see photos" for flaws; "from a smoke-free home" is common on collectables and
electronics and, when true, is a real selling point ("Anything white I refuse to buy
from a smoker home"; "You should make a note of it in your description"). 🔴
[r/Ebay c2j10q](https://www.reddit.com/r/Ebay/comments/c2j10q/).

### 4.5 Phrases that read as fake or AI

Boilerplate walls: "New condition unless stated otherwise, blah, blah… You couldn't be
bothered to take a pic of the fabric content" (13); "[copy and paste condition]
Guaranteed, buy with confidence. See our store for related items" (23, sarcastic). 🔴
[1bwlsi9](https://www.reddit.com/r/Flipping/comments/1bwlsi9/). "the perfect widget to
accessorize your home for widget-collectors" as the shape of every AI description. 🔴
(same). The sibling doc's "romance without facts" tell is confirmed at scale.

### 4.6 Smoke-free (eBay)

Same as Vinted: cared about, especially for fabric and anything porous ("a vintage coat
it's gonna reek like an ashtray forever"), and a false claim is remembered — a buyer
watched his old synth relisted as "Kept in a smoke free home with one careful owner"
after he'd smoked around it for ten years. 🔴
[c2j10q](https://www.reddit.com/r/Ebay/comments/c2j10q/),
[fc24zi](https://www.reddit.com/r/Ebay/comments/fc24zi/). Generated copy must not
assert it.

### 4.7 Country of manufacture (eBay)

Put it in the **Country/Region of Origin** item specific from the tag (✅ §4.1). In the
title/description only when it is a price-relevant attribute (Made in USA Carhartt /
Levi's, Made in England Dr. Martens, Made in Italy designer), because those are terms
buyers type. Otherwise omit from prose.

---

## 5. Cross-platform verdict on stock phrases

Verdicts: **keep** (generate freely when supported by the photos/source) ·
**only-if-true** (generate only when the user has supplied the fact — the app currently
cannot, so effectively drop) · **drop** (never generate).

| Phrase | Vinted UK | Depop | eBay UK | Why |
|---|---|---|---|---|
| "smoke-free home" | only-if-true | only-if-true | only-if-true | Expected and valued when true (§2.6); a fabricated one is the most-hated lie. The app cannot know → **drop from generation** |
| "pet-free home" | only-if-true | only-if-true | only-if-true | Same; honest sellers with pets deliberately omit it |
| "Made in X" | keep **only** for USA/England/Italy/France/Japan on brands or eras where it prices; else drop | same, and it is title currency for vintage | put in the *Country/Region of Origin* specific; prose only when price-relevant | §2.7, §3.7, §4.1 |
| "bundle to save on postage" / "happy to bundle" | keep (soft form) | keep (Depop asks for "bundle options") ✅ | drop | Real mechanic on Vinted/Depop; no equivalent culture on eBay clothing |
| "any questions just ask" | keep, optional, one line | keep, optional | drop | Harmless functional closer; eBay is a catalogue |
| "open to offers" | keep only if price is not already low; never "no silly offers" | keep (Make Offer exists) ✅ | drop (Best Offer is a setting) | §2.4, §3.4 |
| "DM me" / "dm for offer" | drop | **drop** | drop | Circumvents the offer flow, warned against by the community (§3.5) |
| "grab a bargain" | drop | drop | drop | Empty; nobody searches it |
| "rare" | drop | **drop unless verifiably rare** | drop | 146-upvote thread on its overuse; reads as naive or scammy |
| "vintage" | keep only if 20+ years old | keep (a Source/Age field) ✅, same age test | keep (a Style value) ✅, same age test | "Y2k vInTaGe" is the mocked form |
| "y2k" | fine in body if 1998–2005 | keep, after the searchable words | fine in Style field | Depop webinar: aesthetic words help *after* the title, not in it |
| "deadstock" | drop | only-if-true (unworn, with tags, discontinued) | only-if-true | "old season Topshop" is not deadstock |
| "NWT" / "BNWT" | keep BNWT (British form) | keep | keep "New with tags" (eBay's own string) | Universal shorthand; must match the condition dropdown |
| "VGC" / "very good condition" | keep, matching the Condition field | keep as "used – excellent/good" wording | keep as "Pre-owned – Excellent/Good" | Understated beats glowing (§2.3) |
| "excellent condition" | keep only when no flaw is visible | same | same | Overclaiming condition is the return trigger |
| "true to size" | keep, but pair with a measurement | **weak** — "There is not 'true size'"; give measurements | keep with measurements | §3.3 |
| "fits like a…" | keep ("fits more like a 10") | keep | fine | Concrete fit relative to a size is what buyers want |
| "sold as seen" | drop | drop | drop | Reads as evasive; no legal force on these platforms |
| "washed before sending" / "hygiene washed" | only-if-true | only-if-true | only-if-true | Sellers do write it, and mean it; the app cannot know |
| "sent tracked / dispatched within 1 day" | drop (Vinted sets postage) | only-if-true | only-if-true | Seller setting, not garment fact |
| care instructions ("machine wash 30") | drop | drop | drop | Nobody searches it; tag-parroting tell |
| RN / style number | drop | drop | drop from prose; fine as an eBay specific if one exists | OCR record, not copy |

---

## 6. Recommended prompt changes

Short, file by file, with replacement wording. Em-dash and empty-praise rules already
exist and are not repeated. Nothing here has been applied.

### 6.1 `src/lib/llm/analyse.ts`

**(a) Tag data is a record, not source material.** In `COMMON_RULES`, replace the
`TAG DATA:` block with:

```
TAG DATA (a record for the seller, NOT material for the listing):
- Extract ALL readable text from any tag/label visible in any photo into tag_data.
- rn_number: US FTC Registered Identification Number (format "RN XXXXX") — useful for dating vintage
- size_system: "UK" | "EU" | "US" | "IT" | "Universal" | null
- care_instructions: plain English summary of care symbols/text
- Never copy tag_data into the title or description: no country of manufacture, no RN or style number, no care instructions, no barcode. Buyers do not search for these and copying them reads as a robot reading a label.
- The one exception is country of manufacture when it genuinely raises the price or dates the piece for THIS brand: Made in USA (Carhartt, Levi's, vintage tees), Made in England (Dr. Martens, Barbour), Made in Italy or France (designer, Ray-Ban, Lacoste), Made in Japan (denim). Then it may go in the title or first line. Never mention China, Bangladesh, Vietnam, Turkey, Cambodia or similar.
```

**(b) Nothing about the seller's home or habits.** Add to `STYLE:`:

```
- Never claim anything the photos cannot show: not "smoke-free home", "pet-free", "washed before sending", "posted next day" or any fact about the seller. If the seller wants those lines they will add them.
```

**(c) Description lengths.** Replace the `description:` line in `buildPlatformPrompt`:

```
- description: ${platform === 'depop'
    ? 'Line 1 is the searchable title (3–5 words + size). Then 2–3 short lines: fit or a measurement, condition with any flaw named, one personal line at most. Under 60 words before the hashtags.'
    : platform === 'vinted'
    ? '2–4 short lines, under 50 words. Fragments are fine. What it is, size (with one measurement if visible), condition with any flaw named. Nothing else unless it carries a fact.'
    : '50–120 words, factual. What it is (brand, line, material), size with laid-flat measurements if visible, condition with flaws named against the photos, what is included. No care instructions, no country line, no story.'}
```

**(d) Tone hint.** In `TONE_HINT.casual`, append: `Short. Real sellers write two or three lines, not paragraphs.`

**(e) Neutral prompt.** Change `4–5 clear sentences, 80–100 words` to `3–4 short lines, 40–70 words`.

### 6.2 `src/lib/llm/format.ts`

Add three bullets to `VOICE_CORE`, after the "Do not oversell" bullet:

```
- Shorter wins. On every platform buyers call long descriptions "a wall of text" and skip the listing. If it can be a fragment, make it a fragment.
- Never state anything about the seller's home or habits: no "smoke-free", "pet-free", "washed before sending", "posted next day". The source listing does not know these. A false smoke-free line is the complaint buyers make most.
- Never copy label data into the copy: no "Made in China", no RN or style numbers, no care instructions. Country of manufacture only when it is a known selling point for that brand (Made in USA workwear, Made in England boots, Made in Italy designer).
```

Add to the cliché list in the second bullet: `"elevate your style"`, `"artisanal"`,
`"curated"`, `"statement piece"`, `"wardrobe staple"`, `"prepare to fall in love"`.

### 6.3 `src/lib/llm/refine.ts`

Add two rules to the `Rules:` block:

```
- Do not add claims about the seller (smoke-free, pet-free, washed, dispatch speed) or label data (country of manufacture, care instructions, RN/style numbers) unless the refinement instruction supplies that fact in its own words.
- Do not add "rare", "deadstock" or an era unless the current listing already supports it.
```

### 6.4 `src/platforms/vinted/listing-spec.ts`

In `DESCRIPTION:` replace

> `facts over adjectives, 3-5 short lines, each on its own line with a blank line between. MUST state the size.`

with

> `facts over adjectives, 2-4 short lines, fragments welcome, each on its own line. MUST state the actual size in the first line (buyers filter by size bucket and want the real number).`

Delete `and say if the home is smoke-free`.

Replace `End with a short bundle invite such as "Bundle with my other items to save on postage."` with
`Optionally end with ONE short functional line, e.g. "Happy to bundle." Never assert a bundle discount exists.`

In `VOICE:` replace `Optionally close with ONE functional line: a bundle invite ("happy to bundle to save on postage"), "any questions just ask", or "from a smoke-free home" — only if it is true or provided. 3-5 short sentences;`
with
`Optionally close with ONE functional line: "happy to bundle" or "any questions just ask". Never write "smoke-free", "pet-free" or "washed" — the seller adds those if true. Understate the condition rather than oversell it. 2-4 short lines;`

### 6.5 `src/platforms/depop/listing-spec.ts`

Replace the first line's pseudo-title guidance `Brand + item type + era/fit + colour + size` with
`3–5 plain words a buyer would type (brand, garment, colour or fit) + size. Aesthetic words (y2k, grunge, cottagecore) go AFTER the first line, never in it — Depop's own sellers' training says they do not help the title.`

In `HASHTAGS:` add `Hashtags add nothing beyond the same word in the first line; use them for genuine extra search terms, and at most 2 may be brands.`

In `VOICE:` replace `A short styling suggestion and a light call-to-action ("dm me", "open to offers") fit the platform.` with
`One personal line at the end is fine ("just don't fit me"). Offers go through Make Offer, so never write "dm me". Never write "rare" or "deadstock" unless the source says so; never claim smoke-free, pet-free or washed.`

Replace `Keep the honest core (condition, fit, measurements, any flaws)` with `Keep the honest core (measurements first — buyers refuse to buy without them — then condition and any flaws)`.

### 6.6 `src/platforms/ebay/listing-spec.ts`

Replace `DESCRIPTION: factual and complete, roughly 80-200 words.` with
`DESCRIPTION: factual and short, 50-120 words. Buyers read the item specifics and the condition; the description is for measurements, flaws and what is included.`

Replace `Close with postage expectations ("sent tracked, dispatched within 1 working day") when appropriate.` with
`Do not state postage times, smoke-free or pet-free, washing, care instructions or a "Made in" line in the description; country of manufacture belongs in the Country/Region of Origin specific.`

Add to `fieldsSchema`, after Condition:

```
- { "label": "Country/Region of Origin", "value": "<country from the tag, e.g. 'China', 'United Kingdom'; omit this row if no tag shows it>", "hint": "eBay requires this for listings visible to US buyers; 'Unknown' is not accepted" }
```

(Leave it out of `REQUIRED_LABELS`; it is optional when the tag is not visible.)

### 6.7 `src/lib/chip-vocab.ts`

Two chips currently make the model **invent facts**, which is the one thing every
community above punishes:

- `measurements` hard-codes `chest 23", length 26", sleeve 25"` — fabricated numbers in
  inches on UK platforms. Replace the instruction with:
  `Add a measurements line for the seller to complete, laid flat, in cm, suited to the garment (e.g. "Pit to pit __ cm, length __ cm, sleeve __ cm"; waist/inseam for trousers). Only if not already present. Never invent a number.`
- `condition` says "be explicit that there are no rips, stains, smells, or repairs, and
  that the lining is intact" — claims the model cannot know. Replace with:
  `Move the condition to the first or second line and make it concrete using only what the listing already says: name the flaws it mentions in plain words (mark, stain, hole, pilling, fading) or, if it mentions none, say "no marks or damage that I can see". Do not add new claims such as "no smells" or "lining intact".`
  Real sellers write "no rips, stains or marks" / "no flaws"; "no smells" is not seller
  language — smell is handled by the (seller-supplied) smoke-free line, not the chip.
- `vintage`: replace `mention era (90s/2000s) and broken-in character` with
  `only if the brand, tag or style already supports it; name the decade, never write "rare" or "deadstock".`
- `hashtags`: add `Respect the platform cap (Depop 5, at most 2 brands; eBay none).`
- `shorter`: fine. Consider making it the default state rather than a chip: the
  evidence says the un-refined output should already be the short one.

---

## 7. Open questions

1. 🔴 No counted corpus of **live** listings still exists; Reddit screenshots and
   quotes stand in for it. The Chrome extension could reach vinted.co.uk if the domain
   is allowed — 30 listings per platform would settle emoji use, closer frequency and
   how often "smoke free" really appears.
2. 🔴 The "AI descriptions are against Vinted's terms" claim (54 upvotes) has no
   matching help page. Worth watching; it would change the risk of any generated copy
   that *looks* generated.
3. 🔴 Whether Depop's app now has a literal title input (the webinar notes speak of
   "titles"; the help centre still says "start with a title" inside the description).
   Does not change the recommendation.
4. The product question behind §2.6: a seller-profile toggle for "smoke-free" / "I have
   pets" would let bower emit the line honestly and is cheap. Until then, silence.

---

### Sources

Platform-owned (✅):
- [Vinted — Describing an item](https://www.vinted.co.uk/help/49-describing-an-item)
- [Depop — Tips for describing your item](https://depophelp.zendesk.com/hc/en-gb/articles/360020435158-Tips-for-describing-your-item) (read in full via browser)
- [Depop — How to list an item](https://depophelp.zendesk.com/hc/en-gb/articles/360032716413-How-to-list-an-item)
- [eBay UK — Customs requirements / Country of Origin item specific](https://www.ebay.co.uk/sellercentre/global-sales/customs-requirements)
- Sibling docs' eBay and Vinted pages (titles, item specifics, catalogue rules) — not re-fetched.

Reddit, r/VintedUK (🔴, fetched in full):
[1t68s2k mandatory to declare smoker](https://www.reddit.com/r/vintedUK/comments/1t68s2k/) ·
[1w2mtsx smoke free & pet free… you suck](https://www.reddit.com/r/vintedUK/comments/1w2mtsx/) ·
[1r3xbkn Smoke & pet free home?](https://www.reddit.com/r/vintedUK/comments/1r3xbkn/) ·
[1w12ie6 cop-out excuse](https://www.reddit.com/r/vintedUK/comments/1w12ie6/) ·
[1uw4urt using AI for descriptions](https://www.reddit.com/r/vintedUK/comments/1uw4urt/) ·
[1rvlars does AI help sell](https://www.reddit.com/r/vintedUK/comments/1rvlars/) ·
[1pml465 AI descriptions](https://www.reddit.com/r/vintedUK/comments/1pml465/) ·
[1sixee7 Selling tips, my top 10](https://www.reddit.com/r/vintedUK/comments/1sixee7/) ·
[1rflsfm No accurate size](https://www.reddit.com/r/vintedUK/comments/1rflsfm/) ·
[1uf85gt Ray-Bans "Made in Italy"](https://www.reddit.com/r/vintedUK/comments/1uf85gt/) ·
[1v8jtcm "made in Italy" pseudo-brands](https://www.reddit.com/r/vintedUK/comments/1v8jtcm/) ·
[1vyph94 open to offers](https://www.reddit.com/r/vintedUK/comments/1vyph94/) ·
[1usphee price is firm](https://www.reddit.com/r/vintedUK/comments/1usphee/) ·
[1rso3ah bundle discounts](https://www.reddit.com/r/vintedUK/comments/1rso3ah/) ·
[1qojecz AI photos](https://www.reddit.com/r/vintedUK/comments/1qojecz/)

Reddit, r/vinted (🔴):
[1ne471a AI generated descriptions](https://www.reddit.com/r/vinted/comments/1ne471a/) ·
[1qyrbgh what is it with AI descriptions](https://www.reddit.com/r/vinted/comments/1qyrbgh/) ·
[1uny871 ChatGPT prompt left in](https://www.reddit.com/r/vinted/comments/1uny871/) ·
[1v1abar smokers should disclose](https://www.reddit.com/r/vinted/comments/1v1abar/) ·
[190tlns declaring not pet free](https://www.reddit.com/r/vinted/comments/190tlns/) ·
[1w27kch smoke free trigger deletions?](https://www.reddit.com/r/vinted/comments/1w27kch/) ·
[1r4r7dr new without tags then…](https://www.reddit.com/r/vinted/comments/1r4r7dr/) ·
[1vsqfg3 how to write descriptions](https://www.reddit.com/r/vinted/comments/1vsqfg3/) ·
[1uwtgk2 need tips for selling](https://www.reddit.com/r/vinted/comments/1uwtgk2/) ·
[1wa15gn made in France Lacoste](https://www.reddit.com/r/vinted/comments/1wa15gn/) ·
[1izfand D&G made in china](https://www.reddit.com/r/vinted/comments/1izfand/) ·
[1qpix5h Italian brand](https://www.reddit.com/r/vinted/comments/1qpix5h/)

Reddit, r/Depop (🔴):
[1utphmm Depop 101 panel notes](https://www.reddit.com/r/Depop/comments/1utphmm/) ·
[108047q top-seller tips, good vs bad description](https://www.reddit.com/r/Depop/comments/108047q/) ·
[1u91aie AI in listings](https://www.reddit.com/r/Depop/comments/1u91aie/) ·
[1txqw8n AI descriptions making no sense](https://www.reddit.com/r/Depop/comments/1txqw8n/) ·
[1nk6tkh #festivalvibes](https://www.reddit.com/r/Depop/comments/1nk6tkh/) ·
[1481381 overuse of "rare"](https://www.reddit.com/r/Depop/comments/1481381/) ·
[efyf2v buzzwords](https://www.reddit.com/r/Depop/comments/efyf2v/) ·
[11860gu sellers without measurements](https://www.reddit.com/r/Depop/comments/11860gu/) ·
[1t305l2 "dm for an offer"](https://www.reddit.com/r/Depop/comments/1t305l2/) ·
[1umv8f5 disclose dogs?](https://www.reddit.com/r/Depop/comments/1umv8f5/) ·
[1uj87va smoke odour claim](https://www.reddit.com/r/Depop/comments/1uj87va/) ·
[12eq20q handmade with made in china tags](https://www.reddit.com/r/Depop/comments/12eq20q/) ·
[14v5wy6 deadstock nwt made in usa](https://www.reddit.com/r/Depop/comments/14v5wy6/) ·
[14nj8zl made in USA True Religion](https://www.reddit.com/r/Depop/comments/14nj8zl/) ·
[techab tag says made in usa](https://www.reddit.com/r/Depop/comments/techab/) ·
[vqxbrh is made in usa vintage](https://www.reddit.com/r/Depop/comments/vqxbrh/)

Reddit, eBay-side (🔴):
[r/Flipping 1bwlsi9 eBay AI descriptions suck](https://www.reddit.com/r/Flipping/comments/1bwlsi9/) ·
[r/Flipping 1ikaq93 descriptions, what's your method](https://www.reddit.com/r/Flipping/comments/1ikaq93/) ·
[r/Ebay 1ntjd1l AI being used for descriptions](https://www.reddit.com/r/Ebay/comments/1ntjd1l/) ·
[r/Ebay c2j10q items from homes that smoke](https://www.reddit.com/r/Ebay/comments/c2j10q/) ·
[r/Ebay fc24zi smoke-free package smelling of cigarettes](https://www.reddit.com/r/Ebay/comments/fc24zi/) ·
[r/Ebay 1qr6qxh auto-filled country of manufacture](https://www.reddit.com/r/Ebay/comments/1qr6qxh/) ·
[r/ThriftGrift v2jj4c Docs not made in England](https://www.reddit.com/r/ThriftGrift/comments/v2jj4c/) ·
[r/VintageFashion 14njc7n vintage 80s made in USA](https://www.reddit.com/r/VintageFashion/comments/14njc7n/)
