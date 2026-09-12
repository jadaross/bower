# Model pricing — is Anthropic the right supplier, and what would a switch save?

Researched 2026-09-12, from the providers' own pricing pages where they could be
fetched. bower uses Anthropic for all four calls; nothing in the product requires
that. This doc prices the alternatives against bower's real call shapes and ends
with a judgement in §7.

**Confidence key** (same as the sibling docs):
✅ provider-owned page fetched this session ·
🟡 provider page via search snippet or aggregator ·
⚠️ my estimate from the provider's stated rules ·
🔴 unverified.

The short version: **switching supplier saves pence per user per month; changing
how the search step works saves pounds.** The cheapest architecture is the same
whichever model runs it, and the quality risk of a cheap model on bower's two hard
jobs (reading a care label, judging whether a listing is comparable) has not been
measured for anyone but Anthropic.

---

## 1. What bower actually buys

Four calls, from `src/lib/llm/client.ts` and the Langfuse measurements in
`pricing.md` §2 and `valuation-cost-speed.md`:

| Call | What it needs | Today | Measured cost |
|---|---|---|---|
| Listing (`analyse`) | Vision on up to 5 photos, label OCR, a subject check, **streamed** JSON with the title first, British voice | Sonnet 5 | $0.025 |
| Market check (`valuate`), per platform | Web search **restricted to one domain**, then judge comparables, JSON schema output | Sonnet 5 + `web_search` | $0.32 (Haiku 4.5: $0.043) |
| Format / refine | Rewrite text it was given, JSON | Haiku 4.5 | $0.003 |

The listing's cost is almost all photo tokens. The app sends photos at 1600 px on
the long edge (`Photos.swift`), so a 1600×1200 photo costs, per provider:

| Provider | Rule | Tokens per photo |
|---|---|---|
| Anthropic, Claude 4.7 and later | 28 px patches, high-res tier | 2,494 ✅ |
| Google Gemini | 768 px tiles at 258 tokens each | ~1,550 ✅ |
| OpenAI GPT-5 family | 32 px patches, capped at 1,536, × 1.2 | ~1,850 ✅ |
| Mistral Small 4 | 16 px patches after resize to 1024 | ~4,100 ⚠️ |

---

## 2. Token prices, September 2026

Per million tokens, input / output. Only models that take images, plus the
cheapest text model per provider for format and refine.

| Provider | Model | Input | Output | Notes |
|---|---|---|---|---|
| Anthropic ✅ | Sonnet 5 | $2.00 | $10.00 | The planned rise to $3/$15 was cancelled |
| Anthropic ✅ | Haiku 4.5 | $1.00 | $5.00 | Older web search tool only |
| OpenAI ✅ | GPT-5.6 Terra | $2.00 | $12.00 | |
| OpenAI ✅ | GPT-5.4 Mini | $0.75 | $4.50 | |
| OpenAI ✅ | GPT-5.4 Nano | $0.20 | $1.25 | |
| OpenAI ✅ | GPT-5.6 Luna | $0.20 | $1.20 | Vision support not confirmed 🔴 |
| OpenAI ✅ | GPT-5 Mini / Nano | $0.25 / $0.05 | $2.00 / $0.40 | Marked deprecated on OpenAI's own docs — do not build on them |
| Google ✅ | Gemini 3.8 Flash | $0.75 | $3.75 | **Doubles to $1.50 / $7.50 on 1 January 2027** (introductory) |
| Google ✅ | Gemini 3.5 Flash-Lite | $0.30 | $2.50 | |
| Google ✅ | Gemini 2.5 Flash | $0.30 | $2.50 | Previous generation, still served |
| Google ✅ | Gemini 2.5 Flash-Lite | $0.10 | $0.40 | Cheapest vision model on any list |
| Mistral ✅ | Mistral Small 4 | $0.15 | $0.60 | Multimodal |
| Mistral ✅ | Mistral Medium 3.5 | $1.50 | $7.50 | Multimodal |
| DeepSeek ✅ | deepseek-flash | $0.15–0.30 | $0.60–1.20 | Off-peak / peak; takes images; hosted in China |

Cache reads are 10% of input on Anthropic and OpenAI (2.5% on Fable 5.1), and
batch is 50% off everywhere — neither helps bower, whose prompts are short and
whose calls are live.

---

## 3. The search step — where the money is

| Route | Search fee | Domain restriction | Estimated per platform |
|---|---|---|---|
| Anthropic `web_search` + Sonnet 5 ✅ | $10 / 1,000 | `allowed_domains` ✅ | **$0.32 measured** |
| Anthropic `web_search` + Haiku 4.5 ✅ | $10 / 1,000 | `allowed_domains` ✅ | **$0.043 measured** |
| OpenAI `web_search` + GPT-5.4 Mini ✅ | $10 / 1,000 + content tokens | `filters.allowed_domains` ✅ (Responses API only) | ~$0.04 ⚠️ — same shape as Haiku |
| Gemini 3.x Flash + Grounding with Google Search ✅ | **5,000 prompts a month free**, then $14 / 1,000 | **None in the Gemini API** 🟡 — only the enterprise Agent Studio has "preferred domains" | ~$0.015 inside the free quota ⚠️ |
| Perplexity Sonar 🟡 | $5–12 / 1,000 requests + $1 / $1 tokens | `search_domain_filter` ✅ | ~$0.02 ⚠️ |
| **Your own search**: Serper (Google results) 🟡 + Haiku or Flash to judge | $0.30–1.00 / 1,000 queries | `site:` in the query | **~$0.005** ⚠️ |
| Brave / Exa / Tavily 🟡 | $5 / $7 / $8 per 1,000 | Brave: yes | dearer than Serper for the same job |
| eBay Browse API 🟡 | free | eBay only | ~$0 — already on the roadmap |

Two things fall out. The model choice inside a hosted web search matters far
less than the search fee and the result tokens: Haiku and GPT-5.4 Mini land at the
same ~4¢. And the only route under a penny is **owning the search**: a Google
results call at a tenth of a penny, then a small model reading ten snippets. That
is the architecture `pricing.md` §8 guessed Vinting and VintSnap use.

The Gemini free quota is tempting (bower's whole standing-mode volume fits inside
5,000 a month) but grounding cannot be confined to one site, and the eBay band
that came back full of Vinted listings is why `asking-price.ts` confines it today.
A `site:` operator in the grounding query is untested 🔴.

---

## 4. bower's calls, re-costed per provider

Same shapes as §1: a listing is 4 photos, ~1.5k prompt tokens, ~800 out; a check
is one platform. Anthropic rows are measured; the rest are ⚠️ estimates from §2
and §3.

| Provider and model | Listing | Check, per platform | Light user a month (2 listings, 2 checks × 3 platforms) |
|---|---|---|---|
| Anthropic Sonnet 5 (today) | 1.9p | 24p | **£1.48** |
| Anthropic Haiku 4.5 (roadmap) | 1.0p | 3.2p | **21p** |
| OpenAI GPT-5.4 Mini + web search | 0.8p | ~3p | ~20p |
| Gemini 3.8 Flash + grounding (free quota) | 0.7p | ~1.1p | ~8p |
| Gemini 2.5 Flash-Lite + grounding | 0.1p | ~1p | ~6p |
| Haiku 4.5 + your own Serper search | 1.0p | ~0.4p | **~4.5p** |
| Gemini Flash + your own Serper search | 0.7p | ~0.4p | ~4p |

The difference between staying on Anthropic (Haiku) and the cheapest credible
provider switch is about **13p per light user per month**. The difference between
a hosted web search and owning the search is about **17p**, and it is available on
Anthropic too.

What that is worth at bower's scales, per month:

| Active users | Haiku → cheapest provider | Haiku → own search, still Anthropic |
|---|---|---|
| 10 | £1.30 | £1.70 |
| 100 | £13 | £17 |
| 1,000 | £130 | £170 |

Vercel Pro is £14.80.

---

## 5. What a switch would cost in work

The code is written against the Anthropic SDK, not a neutral layer:

- `analyse.ts` — streaming a JSON document with the title first, `output_config.format`,
  the subject check, the refusal path. Every provider streams and every provider
  has JSON schema output, but the streaming-title trick and the reject-early frame
  in `streaming-text.ts` would be rebuilt and re-tested on the client's wire format.
- `asking-price.ts` — the server-side `web_search` tool, `allowed_domains`,
  `pause_turn` resumes, `searchActivity` for the trace. OpenAI's Responses API is
  the only like-for-like; Gemini has no domain filter; owning the search means
  rewriting this file regardless of model.
- `format.ts`, `refine.ts` — trivial.
- Langfuse and the tests are provider-neutral already.

The Vercel AI SDK through AI Gateway would make the model a string per call and
unify streaming and structured output 🟡, but each provider's web search is still
its own tool shape, so the valuation file does not get simpler.

Two or three days for a full switch, plus the spike below, versus a one-line
change for Haiku.

## 6. What nobody has measured

Every non-Anthropic number above is a price, not a result. bower's two hard jobs
have only ever been run on Claude:

1. **Label OCR and the subject check.** Reading "80% wool 20% nylon, made in
   Italy, size 40" off a crumpled care label, and refusing non-clothing and
   explicit photos with a refund. A cheaper vision model may read fewer labels
   and refuse fewer photos; the second is a safety property, not a cost one.
2. **Judging comparables.** `valuation-cost-speed.md` found Haiku strong on eBay
   and Vinted and weak on Depop, and fabricating placeholder URLs one call in
   fifteen. Smaller models on other providers will have their own version of
   that; nothing says it is smaller.
3. **Voice.** The British seller register in `seller-voice.md` was tuned on
   Claude. Cheap models write the "elevate your wardrobe" copy that buyers
   distrust.

Any switch needs the same kind of spike: the real prompts, thirty items, three
platforms, about £5 of calls, scored by Jada.

---

## 7. Judgement

1. **Stay on Anthropic for now.** The roadmap's Haiku change takes a light user
   from £1.48 to 21p a month. The best provider switch would take it to about
   8p, saving pence a month at standing-mode scale, for two or three days of
   work and an unmeasured quality risk on the two jobs that are the product.
2. **The lever worth a spike is owning the search**, not the model: eBay's
   Browse API for eBay (free), and a Google results call at a tenth of a penny
   for Vinted and Depop, with Haiku judging ten snippets. That gets a check to
   about 1.2p for all three platforms, on Anthropic, with domain restriction
   intact because the query carries `site:`. ADR-0005 removed a SerpAPI-plus-scraper
   stack for *sold* prices; this is asking prices from a search engine, which
   the ADR allows. Spike it after Haiku ships, ~£5.
3. **Revisit the provider when the Anthropic bill passes £50 a month.** At that
   point the saving is real money and the volume justifies the spike. Gemini
   Flash is the cheapest credible read; OpenAI's mini is the like-for-like for the
   search. Do not build on GPT-5 Mini or Nano (deprecated) and note Gemini 3.8
   Flash doubles in price on 1 January 2027 — every provider moves its prices, so a
   switch buys a snapshot, not a rate.
4. **Set the spend limit in the Anthropic console** regardless. It is the only
   control that bounds the bill whatever the model costs.

---

### Sources

Provider pages fetched ✅:
[Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) ·
[Anthropic vision and image tokens](https://platform.claude.com/docs/en/build-with-claude/vision) ·
[OpenAI pricing](https://developers.openai.com/api/docs/pricing) ·
[OpenAI image token rules](https://developers.openai.com/api/docs/guides/images-vision) ·
[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) ·
[Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding) ·
[Mistral API pricing](https://mistral.ai/pricing/api) ·
[DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing)

Via search snippets 🟡:
[OpenAI web search domain filters](https://developers.openai.com/api/docs/guides/tools-web-search) ·
[Gemini grounding domain restriction (forum)](https://discuss.ai.google.dev/t/how-to-restrict-gemini-grounding-search-to-specific-domain-s/107324) ·
[Gemini grounding pricing summary](https://developer.puter.com/tutorials/gemini-api-pricing/) ·
[Serper](https://serper.dev/) · [Serper pricing analysis](https://coldiq.com/blog/serper-pricing) ·
[Brave Search API pricing](https://costbench.com/software/ai-search-apis/brave-search-api/) ·
[Exa pricing](https://fastcrw.com/blog/exa-pricing-explained) ·
[Tavily pricing](https://coldiq.com/blog/tavily-pricing) ·
[Perplexity Sonar pricing](https://www.cloudzero.com/blog/perplexity-api-pricing/) ·
[Vision model price comparison](https://www.clawrouters.com/blog/cheapest-vision-multimodal-llm-api-2026)

Repo: `docs/research/pricing.md` §2, `docs/research/valuation-cost-speed.md`,
`src/lib/llm/client.ts`, `src/lib/valuation/asking-price.ts`, `ios-app/bower/bower/Photos.swift`.
