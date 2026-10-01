# Search terms and custom product pages

Researched 2026-09-30. What people type into the App Store when they are about to
download something like bower, what that means for the name, subtitle and keywords,
and the custom product pages to build on top. Companion to
`docs/research/marketing.md` §2.4.

## 1. How App Store search reads a listing

- Apple ranks on **three fields only**: the **app name** (30 characters, weighted
  most), the **subtitle** (30) and the hidden **keyword field** (100,
  comma-separated, no spaces needed). The description is not searched.
- Words combine across the three fields: "vinted" in the name and "worth" in the
  keywords can match a search for "vinted worth". So a word appears **once**,
  in the heaviest field that fits it.
- Each localization has its own three fields. A store that has its own
  localization uses it: en-US for the US store and en-AU for Australia, if they
  exist. Today bower has only en-GB, so all four stores share one set of 160
  characters.

## 2. What people search (App Store autocomplete, 30 Sep 2026)

Autocomplete lists what people type most, in order. Pulled from Apple's hints
endpoint for the UK, US and AU stores.

| Intent | What people type | Who shows up now (GB, ratings) | Worth it? |
|---|---|---|---|
| **An AI to write Vinted listings** | `vinted ai`, `vinted listing ai`, `vinted listing`, `listing ai`, `ai listing assistant`, `preloved ai` | Listed AI (45), PreLoved AI (24), VintSnap (15), AI Listing Assistant (11) | **Yes: the core term, and the competition is weak** |
| **What is my thing worth** | `how much is it worth`, `what's it worth`, `what's it worth on ebay`, `value my stuff`, `how much is this worth` (US) | How Much Is It Worth (19), What is it Worth? (8), Valuify (5) | **Yes: nobody here does clothes, and the market check is the answer** |
| **Depop listing** | `depop` suggestions are all Depop itself; `snapflip: vinted & depop ai` | SnapFlip (1), Sell AI (3) | Yes, via the name |
| **eBay listing** | `ebay listing`, `ebay lister`, `ai ebay listing` (US) | VendLists, Fliply | Yes, via keywords |
| **Resellers and thrifters** | `thrift ai`, `resell ai`, `reseller`, `resell scanner` (US), `thrift ai profit identifier` (AU) | ThriftAI (492), then zero-rating clones | Secondary: they want bulk and profit, bower is one item at a time |
| **Selling clothes, generally** | `sell clothes`, `apps to sell clothes`, `second hand clothes` | Vinted (3.7m), Depop (536k), eBay (2.3m) | No: the marketplaces own it; keep the words for combinations only |
| **Clear-out** | `declutter` (mostly photo cleaners) | Photo apps | Low: keep as a combination word |

What this says:

1. **"Vinted" plus "AI" or "listing" is the search.** Every competitor that ranks has
   Vinted in its **name**: "PreLoved AI: Vinted Listings", "VintSnap: Sell on
   Vinted Fast", "SnapFlip: Vinted & Depop AI". bower's name is just "bower", so
   it can only reach these searches through the keyword field, the weakest of
   the three.
2. **"What's it worth" is open.** A dozen apps with fewer than 20 ratings, none
   about clothes. It's the market check's search.
3. **The listing never says "AI"**, and a third of the high-intent searches
   contain it.

## 3. The proposal

### Does the name need "Vinted" in it?

No. The evidence says the words that earn the top spots are **"AI" and
"listing"**, and "Vinted" can sit in the subtitle:

- For `vinted ai` and `vinted listing ai` in the UK store, the top two apps are
  **"AI Listing Assistant"** and **"Listed AI - Listing Generator"**. Neither has
  Vinted in its name ✅ (iTunes search, 30 Sep).
- The name is still the heaviest field ⚠️ (AppRadar, AppFollow, ASO World), so a
  brand-only name gives up some weight. But the category is tiny (the leader in
  GB has 45 ratings), and at that size downloads and ratings move rankings more
  than a word in the name does.
- A name can change with any later update. So it can be tested rather than
  guessed.

**Recommendation: launch as `bower`.** Put Vinted, AI and listing in the subtitle.
Four weeks after launch, read App Store Connect's search terms report. If bower
isn't in the top five for `vinted ai` or `vinted listing` by then, try
`bower: AI listing & price` (25) in the next update. That name adds the two words
that are working for competitors without a trademark in it.

### The subtitle

bower writes the listing and prices it. It doesn't post it, so no "list it".
"Listing" as a noun (the text you post) is fine and it's the searched word.

| Subtitle | Length | Search words | Reads as |
|---|---|---|---|
| **`AI Vinted listings & prices`** | 27 | ai, vinted, listing, price | What it makes, both halves. **Recommended** |
| `Vinted & Depop listings by AI` | 29 | vinted, depop, listing, ai | Both platforms; loses price |
| `AI writes & prices for Vinted` | 29 | ai, write, price, vinted | The verbs; loses "listing", the main searched word |
| `Your Vinted listing, by AI` | 26 | vinted, listing, ai | Personal; loses price |

### Keywords

With `AI Vinted listings & prices` as the subtitle, the 100 characters become:

`ebay,depop,sell,clothes,worth,value,how,much,resell,resale,thrift,preloved,secondhand,declutter` (95)

- `vinted`, `listing`, `price` and `ai` move to the subtitle, which weighs more.
- `worth,value,how,much` are new, for "how much is it worth" and "what's it
  worth" (`what` and `it` are too common to rank on).
- `wardrobe` goes: its searches are wardrobe planners.

**Risk:** Apple's guideline 2.3.7 discourages other companies' names in metadata.
Naming a platform the app works with is common practice in this category, and
bower's current keywords already name all three, but a reviewer can ask for it to
come out of the subtitle.

## 4. Custom product pages

### What they are

A **custom product page** is another version of bower's App Store page with the
same name, icon, description and ratings, but **its own screenshots, preview
video and promotional text**. Each has its own link (the normal link plus
`?ppid=…`). Apple allows 70 at a time. Two things make them useful:

1. **Search.** A page can be given keywords from the keyword field. Someone who
   searches "how much is it worth" then sees the page whose first screenshot is a
   price, not the one whose first screenshot is a listing. Each keyword can
   belong to one page only. Across Apple's data, tailored pages lift installs by
   about 23% from the same views ⚠️.
2. **Counting.** App Store Connect reports views, installs and conversion **per
   page**. A page per TikTok, per creator or for referrals (#90) tells you where
   installs came from, with no tracking SDK.

Each page goes through App Review (a day or two). Editing a live page keeps its
link. The page can also deep-link into a screen of the app (iOS 18+).

### How to design one

Only the first three screenshots matter; on a search result that's all anyone
sees. For each page:

1. **Screenshot 1 answers the search**, in the searcher's words, as the caption.
   Someone who typed "what's it worth" sees a price.
2. **Screenshot 2 is the proof**: the listings the price came from, or the listing
   in Vinted's voice.
3. **Screenshot 3 is the reason to stay**: every field filled, or the other two
   platforms.
4. Same fonts, colours and frame as the default set, so it reads as one app.
5. Promotional text (170) says the same thing again in a sentence.

The screens exist already: `./scripts/screens.sh` and the `-bower…` launch
arguments reach every state (CLAUDE.md), and the current set is in
`docs/app-store/screenshots/`.

### The pages

**Search pages** (keywords assigned). Default page = the Vinted and Depop listing
story, because that's what the name promises.

| Page | Keywords assigned | Screenshot 1 caption | Then | Promotional text |
|---|---|---|---|---|
| **Default** | (subtitle: vinted, listing, ai, price; keyword: depop) | "Photos in. Vinted listing out." (the listing) | The price per platform; every field filled | Current text |
| **What's it worth** | `worth`, `value`, `how`, `much` | "What's it worth? Here's the price on each app." (market check, three bands; `1-price.png` today) | The listings the price came from; where to post, net of fees | "Snap it, and see what it sells for on Vinted, Depop and eBay, with the listings behind the price." |
| **eBay** | `ebay` | "An eBay listing, every field filled." (listing on eBay with the item specifics) | The price on eBay against Vinted; copy each part | "Title, item specifics and a price from live eBay listings. Copy it into eBay." |
| **Clear-out** | `declutter`, `wardrobe`, `sell`, `clothes`, `secondhand`, `preloved` | "Clear the wardrobe in an evening." (home with five photos in the pile) | The listing; history of what you listed and what it was worth | "Photograph it, list it, move on. Each listing in seconds, in the voice of the app you sell on." |
| **Resell and thrift** | `resell`, `resale`, `thrift` | "Worth buying? Check it in the shop." (market check) | Price per platform net of fees; a listing in seconds | "Price a find before you buy it, then list it on whichever app pays most." |

**Link pages** (no keywords; for counting where installs come from). Same
screenshots as the default until one proves itself:

- TikTok, Instagram, YouTube Shorts: one each, used in bio links.
- One per creator on per-subscriber terms (`marketing.md` §2.2).
- Referrals: the `/r/<code>` page's App Store button (#90).
- Press: one for each article that links, if any.

Start with the **default plus the four search pages**, then add link pages as
each channel starts. Screenshot production is the bottleneck, not the setup.

## 5. Later: a listing per country

If the name ever changes to one that's free in every store ("bower" alone is taken in en-US and en-AU), add en-US and en-AU localizations (en-IE
isn't a store localization; Ireland reads en-GB). Each gets its own 100
characters:

- **US:** `thrift`, `resell`, `reseller`, `flip`, `closet`, and `poshmark` only if
  bower ever writes for it (it doesn't, so leave it out). US sizes and "closet"
  instead of "wardrobe".
- **AU:** the UK set, plus `op shop` ("opshop"), which is how Australians say
  charity shop.

## Sources

- Autocomplete: Apple's hints endpoint
  (`search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints`), GB, US and AU
  storefronts, 30 Sep 2026 ✅
- Who ranks: `itunes.apple.com/search?country=gb`, 30 Sep 2026 ✅
- Custom product pages, 70 pages, keywords: https://developer.apple.com/news/?id=gf6mgrs6 ✅
- Keyword rules, per-page limits, review: https://respectaso.com/blog/custom-product-pages-app-store-guide-2026/ ⚠️,
  https://adapty.io/blog/custom-product-pages-app-store/ ⚠️
