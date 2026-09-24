import { ANALYSIS_SUBJECTS, type AnalysisSubject, type AnalysisResult, type Condition, Platform, Tone } from "@/lib/types";
import { platformListingSpec, platformMetadata } from "@/platforms";
import { MODELS, anthropicClient } from "./client";
import { parseAnalysisResult } from "./analyse-parse";
import { jsonSchemaFormat } from "./structured";
import { analysisResultSchema } from "./schemas";
import { beginGeneration, flushObservability, observeGeneration, type TraceContext } from "@/lib/observability";
import { sellerNotesPrompt, type SellerNote } from "@/lib/seller-notes";
import { DEFAULT_MARKET, MARKETS, isAmerican, languageRule, type Market } from "@/lib/markets";
import { productFactsPrompt, readProductLink } from "./link";
export { parseAnalysisResult };

/**
 * The product page the seller pasted, with what they said about their own
 * item — the two things a page cannot know. Either may be absent.
 */
export interface LinkInput {
  url: string;
  size?: string;
  condition?: Condition;
}

export interface AnalyseInput {
  /** base64 JPEG strings, optionally with a `data:` prefix. Empty when the read is from a link alone. */
  photos: string[];
  /** A product page to read alongside the photos, or instead of them. */
  link?: LinkInput;
  tone: Tone;
  /** The seller's Market, from their profile: sets the currency of the estimate. */
  market?: Market;
  /** When set, the prompt is platform-specific; otherwise the neutral prompt is used. */
  platform?: Platform;
  /** The seller's opt-in notes (smoke-free etc.), read from their profile, never the body. */
  sellerNotes?: SellerNote[];
  /** Observability (#37): caller + route for the Langfuse trace. Optional. */
  trace?: TraceContext;
  /** History (#41): called with the parsed result so the route can persist it. */
  /** Awaited before the stream closes, so a write inside it lands. */
  onResult?: (result: AnalysisResult) => void | Promise<void>;
}

const TONE_HINT: Record<Tone, string> = {
  casual:
    "The description should be casual, friendly, and conversational — like how a real person sells on Depop or Vinted. Use natural language. Keep it genuine and relatable. No corporate speak. Short. Real sellers write two or three lines, not paragraphs.",
  professional:
    "The description should be clean, factual, and professional. Lead with the most important details. No slang. Focus on measurements, condition, fabric, and fit. Concise.",
};

/**
 * The document the model writes, in the order it streams. Tag data first —
 * it is the OCR pass that grounds the listing — then the listing with the
 * title early, so the client can show it while the description is still
 * being written. When a platform is named, the listing also carries that
 * platform's form fields, and the first listing needs no format call.
 */
function jsonShape(platform?: Platform): string {
  const fields = platform
    ? `,
    "fields": [
      { "label": "", "value": "", "hint": "" }
    ]`
    : "";
  return `{
  "subject": "clothing",
  "listing": {
    "title": "",
    "brand": "",
    "clothing_type": "",
    "colour_primary": "",
    "colour_secondary": null,
    "condition": "Good",
    "size": "",
    "material": "",
    "description": "",
    "hashtags": [],
    "price_min": 0,
    "price_max": 0,
    "price_reasoning": "",
    "gender": "women",
    "main_category": "tops",
    "subcategory": ""${fields}
  },
  "tag_data": {
    "brand": null,
    "size": null,
    "size_system": null,
    "fabric_composition": null,
    "country_of_manufacture": null,
    "care_instructions": null,
    "rn_number": null,
    "style_number": null,
    "barcode_visible": false
  }
}`;
}

const COMMON_RULES = `Rules:

SUBJECT (write this field first, before anything else):
- "clothing": at least one photo shows a garment, shoes, a bag or an accessory that could be sold secondhand. This is the normal case; a tag, label or detail shot on its own still counts.
- "not_clothing": none of the photos show such an item (a room, a pet, a car, a document, a screenshot, food).
- "explicit": any photo contains nudity or sexual content, whatever else is in frame.
- "unsafe": any photo contains graphic violence, gore, or other content that should not be described.
When the subject is anything but "clothing", fill the rest of the document with empty strings, nulls, zeros and empty arrays. Do not describe the photo.

STYLE:
- Never use an em dash (—) anywhere in the title or description. Use a comma, a full stop, or a hyphen instead.
- Never claim anything the photos cannot show: not "smoke-free home", "pet-free", "washed before sending", "posted next day" or any fact about the seller. If the seller wants those lines they will add them.

TAG DATA (a record for the seller, NOT material for the listing):
- Extract ALL readable text from any tag/label visible in any photo into tag_data.
- rn_number: US FTC Registered Identification Number (format "RN XXXXX"), useful for dating vintage
- size_system: "UK" | "EU" | "US" | "IT" | "Universal" | null
- care_instructions: plain English summary of care symbols/text
- Never copy tag_data into the title or description: no country of manufacture, no RN or style number, no care instructions, no barcode. Buyers do not search for these and copying them reads as a robot reading a label.
- The one exception is country of manufacture when it genuinely raises the price or dates the piece for THIS brand: Made in USA (Carhartt, Levi's, vintage tees), Made in England (Dr. Martens, Barbour), Made in Italy or France (designer, Ray-Ban, Lacoste), Made in Japan (denim). Then it may go in the title or first line. Never mention China, Bangladesh, Vietnam, Turkey, Cambodia or similar.`;

/**
 * The UK and Australian prompts were tuned without a language line: the
 * British field labels and examples carry the voice. An American listing
 * needs telling, so the line is added there and nowhere else.
 */
function languageRules(market: Market): string {
  return isAmerican(market) ? `\n\nLANGUAGE:\n${languageRule(market)}` : "";
}

/** What the model is looking at: photos, a page, or both. */
export interface Source {
  photoCount: number;
  /** The product page as `productFactsPrompt` writes it, when there is one. */
  page?: string;
}

function task(source: Source): string {
  if (source.photoCount === 0) return "Write a listing for the product on the page below, as the seller's secondhand item,";
  if (source.page) return `Analyse these ${source.photoCount} clothing photo(s) together with the product page below,`;
  return `Analyse these ${source.photoCount} clothing photo(s)`;
}

/** The rules that change when a page is in play. Appended after the common ones. */
function pageRules(source: Source): string {
  if (!source.page) return "";
  const noPhotos = source.photoCount === 0;
  return `

${source.page}

PRODUCT PAGE RULES:
- The page describes the product as sold new. Brand, name, type, material, colours and fit come from it${noPhotos ? "" : " where the photos cannot show them; where they disagree, trust the photos"}.
- ${noPhotos ? 'subject: judge from the page. "clothing" if the product is a garment, shoes, a bag or an accessory; "not_clothing" otherwise.' : "subject: judge from the photos as usual."}
- ${noPhotos ? "condition: exactly what the seller stated above. Never invent how often it was worn, nor wear, marks or flaws you cannot see; with nothing stated, the description says nothing about condition at all." : "condition: from the photos, as usual; the seller's stated condition, if any, is what to check the photos against."}
- size: what the seller stated above${noPhotos ? "; otherwise as the rule above says" : ", else from the photos, else as the rule above says"}.
- price_min/price_max: the RRP is a strong anchor. Secondhand in good condition is typically 30–60% of RRP for high-street brands, higher for sought-after or sold-out pieces, lower for basics. Say so in price_reasoning.
- tag_data: ${noPhotos ? "all null and barcode_visible false — no label was seen." : "from the photos only, never from the page."}
- Never mention the page, the link or the RRP in the title or description. Write it as the seller would.`;
}

function buildPlatformPrompt(platform: Platform, tone: Tone, source: Source, notes: SellerNote[] = [], market: Market = DEFAULT_MARKET): string {
  const currency = MARKETS[market].currency;
  const spec = platformListingSpec[platform];
  return `You are an expert clothing photographer and professional reselling assistant for secondhand fashion platforms.

${task(source)} and return ONLY a valid JSON object — no markdown code fences, no explanation text, just raw JSON starting with { and ending with }.

${spec.promptFragment(market)}

${TONE_HINT[tone]}

Return exactly this JSON structure (fill in all fields):

${jsonShape(platform)}

${sellerNotesPrompt(notes, platform, market)}

${COMMON_RULES}${languageRules(market)}${pageRules(source)}

LISTING:
- brand: from tag if visible, otherwise infer from logo/design, otherwise "Unknown"
- condition: infer from visible wear, pilling, fading, stains. Be honest.
- price_min/price_max: realistic ${currency} resale prices in ${MARKETS[market].place}. Consider brand, condition, type, and typical secondhand market values. For luxury/designer, price higher. For fast fashion in good condition, price accordingly.
- price_reasoning: one sentence explaining the price logic
- title: ${platform === 'ebay' ? 'max 80 characters' : 'max 60 characters'}
- description: ${platform === 'depop'
    ? 'Line 1 is the searchable title (3-5 words + size). Then 2-3 short lines: fit or a measurement, condition with any flaw named, one personal line at most. Under 60 words before the hashtags.'
    : platform === 'vinted'
    ? '2-4 short lines, under 50 words. Fragments are fine. What it is, size (with one measurement if visible), condition with any flaw named. Nothing else unless it carries a fact.'
    : '50-120 words, factual. What it is (brand, line, material), size with laid-flat measurements if visible, condition with flaws named against the photos, what is included. No care instructions, no country line, no story.'}
- hashtags: ${platform === 'depop' ? 'UP TO 5 actual hashtag strings with # prefix (mix: 3 descriptive — type/brand/material — + 1–2 style/aesthetic like #y2k, #cottagecore). Each tag must be genuinely relevant.' : 'EMPTY ARRAY []. ' + (platform === 'vinted' ? 'Vinted has no hashtag system — its search reads title and description directly, so bake keywords into those instead.' : 'eBay has no tag field — search runs off the 80-char title and item specifics, so pack keywords into the title.')}
- gender: "women" | "men" | "kids" | "unisex" — who this item is for
- main_category: "tops" | "bottoms" | "dresses" | "outerwear" | "knitwear" | "swimwear" | "underwear" | "sportswear" | "shoes" | "accessories" | "bags" | "other"
- subcategory: specific item type, e.g. "jeans", "hoodie", "midi dress", "trainers"

FIELDS (the dropdowns/inputs the seller picks on the ${platformMetadata[platform].name} listing form):
${spec.fieldsSchema(market)}

For every field:
- "value" MUST come from the allowed list when one is given (don't paraphrase).
- "hint" is optional — only include it when the rationale is non-obvious.
- If the photos genuinely lack the info, pick the best safe default (e.g. "Unbranded" if no brand) rather than leaving the value empty.`;
}

function buildNeutralPrompt(tone: Tone, source: Source, market: Market = DEFAULT_MARKET): string {
  const currency = MARKETS[market].currency;
  return `You are an expert clothing photographer and professional reselling assistant for secondhand fashion platforms.

${task(source)} and return ONLY a valid JSON object — no markdown code fences, no explanation text, just raw JSON starting with { and ending with }.

${TONE_HINT[tone]}

Return exactly this JSON structure (fill in all fields):

${jsonShape()}

${COMMON_RULES}${languageRules(market)}${pageRules(source)}

LISTING:
- brand: from tag if visible, otherwise infer from logo/design, otherwise "Unknown"
- condition: infer from visible wear, pilling, fading, stains. Be honest.
- price_min/price_max: realistic ${currency} resale prices in ${MARKETS[market].place}. Consider brand, condition, type, and typical secondhand market values. For luxury/designer, price higher. For fast fashion in good condition, price accordingly.
- price_reasoning: one sentence explaining the price logic
- title: max 70 characters, descriptive and search-friendly (brand + type + key feature)
- description: 3-4 short lines, 40-70 words. Lead with the most important details. Factual, nothing padded.
- hashtags: 8–10 general search keywords relevant across all resale platforms (no # prefix)
- gender: "women" | "men" | "kids" | "unisex" — who this item is for
- main_category: "tops" | "bottoms" | "dresses" | "outerwear" | "knitwear" | "swimwear" | "underwear" | "sportswear" | "shoes" | "accessories" | "bags" | "other"
- subcategory: specific item type, e.g. "jeans", "hoodie", "midi dress", "trainers"`;
}

function imageBlocks(photos: string[]) {
  return photos.map((b64) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/jpeg" as const,
      data: b64.replace(/^data:image\/\w+;base64,/, ""),
    },
  }));
}

/** The document, wherever it sits: a thinking block may come first. */
function textOf(content: { type: string; text?: string }[]): string {
  return content.find((b): b is { type: "text"; text: string } => b.type === "text")?.text ?? "";
}

function buildPrompt(input: AnalyseInput, source: Source): string {
  return input.platform
    ? buildPlatformPrompt(input.platform, input.tone, source, input.sellerNotes, input.market)
    : buildNeutralPrompt(input.tone, source, input.market);
}

/**
 * Read the pasted page, if there is one, and describe what the model will
 * look at. A page that cannot be read (or is not a product) stops the read
 * here — before a unit of model time is spent on the listing — as a
 * rejection the route hands the unit back for.
 */
async function resolveSource(input: AnalyseInput): Promise<Source> {
  if (!input.link) return { photoCount: input.photos.length };
  const facts = await readProductLink(input.link.url, { trace: input.trace });
  if (!facts.found) throw new AnalyseRejected("link_unreadable");
  if (input.photos.length === 0 && !facts.is_clothing) throw new AnalyseRejected("not_clothing");
  return {
    photoCount: input.photos.length,
    page: productFactsPrompt(input.link.url, facts, { size: input.link.size, condition: input.link.condition }),
  };
}

/** The request shape for the trace: never the photos, never the page text. */
function traceInput(input: AnalyseInput) {
  let link: string | undefined;
  if (input.link) {
    try { link = new URL(input.link.url).hostname.replace(/^www\./, ""); } catch { link = "invalid"; }
  }
  return { platform: input.platform ?? "neutral", tone: input.tone, photoCount: input.photos.length, ...(link ? { link } : {}) };
}

/**
 * Returns the parsed AnalysisResult. Throws on invalid JSON or missing top-level
 * fields. Suitable for tests, scripts, anywhere SSE framing is not needed.
 */
export async function analyseListing(input: AnalyseInput): Promise<AnalysisResult> {
  const client = anthropicClient();
  const source = await resolveSource(input);
  const messages = [
    {
      role: "user" as const,
      content: [...imageBlocks(input.photos), { type: "text" as const, text: buildPrompt(input, source) }],
    },
  ];
  const message = await observeGeneration(
    {
      name: "analyse",
      model: MODELS.analyse,
      // Never trace the base64 photos — log only the meaningful request shape.
      input: traceInput(input),
      modelParameters: { max_tokens: 4096 },
      trace: input.trace,
    },
    () =>
      client.messages.create({
        model: MODELS.analyse,
        max_tokens: 4096,
        output_config: { format: jsonSchemaFormat(analysisResultSchema) },
        messages,
      }),
    (m) => ({
      output: textOf(m.content),
      usage: { input: m.usage?.input_tokens, output: m.usage?.output_tokens },
    })
  );
  const text = textOf(message.content);
  const parsed = parseAnalysisResult(text);
  await input.onResult?.(parsed);
  return parsed;
}

/**
 * The read was stopped on purpose: the photos are not of clothing, or the
 * model declined them. `subject` is one of `AnalysisSubject` minus "clothing",
 * or "refused" when the model returned no document at all.
 */
export class AnalyseRejected extends Error {
  constructor(readonly subject: Exclude<AnalysisSubject, "clothing"> | "refused" | "link_unreadable") {
    super(`Analyse rejected: ${subject}`);
    this.name = "AnalyseRejected";
  }
}

/** The subject, once its closing quote has streamed in. */
export function earlySubject(buffer: string): AnalysisSubject | undefined {
  const m = buffer.match(/"subject"\s*:\s*"([a-z_]+)"/);
  if (!m) return undefined;
  return (ANALYSIS_SUBJECTS as readonly string[]).includes(m[1]) ? (m[1] as AnalysisSubject) : undefined;
}

/**
 * Streams raw text deltas from the model. The full concatenated text is the JSON
 * payload — consumers buffer until done, then call parseAnalysisResult.
 *
 * The first field is the subject. Anything but "clothing" ends the stream with
 * an `AnalyseRejected` before a listing is written, and a model refusal (no
 * document at all) is reported the same way — so the route can hand the unit
 * back and tell the client why, instead of a decode failure downstream. A
 * pasted link that cannot be read is a fourth reason, `link_unreadable`,
 * raised before the model is asked for a listing at all.
 */
export function analyseListingStream(input: AnalyseInput): ReadableStream<string> {
  return new ReadableStream({
    async start(controller) {
      let generation: ReturnType<typeof beginGeneration> = null;
      try {
        const client = anthropicClient();
        // The link read happens here, inside the stream, so a page that cannot
        // be read fails the same way a rejection does and refunds the unit.
        const source = await resolveSource(input);
        const messages = [
          {
            role: "user" as const,
            content: [...imageBlocks(input.photos), { type: "text" as const, text: buildPrompt(input, source) }],
          },
        ];
        let analyseTraceId: string | undefined;
        generation = beginGeneration({
          name: "analyse",
          model: MODELS.analyse,
          // Never trace the base64 photos — log only the meaningful request shape.
          input: traceInput(input),
          modelParameters: { max_tokens: 4096 },
          trace: input.trace,
          onTraceId: (id) => { analyseTraceId = id; },
        });
        const stream = await client.messages.create({
          model: MODELS.analyse,
          max_tokens: 4096,
          stream: true,
          output_config: { format: jsonSchemaFormat(analysisResultSchema) },
          messages,
        });
        // Stream the model's text to the client as it arrives, so the title —
        // now the first field — reaches the client in ~2s while the rest keeps
        // streaming, instead of the client waiting for the whole ~7s document.
        // The trace id (known up front) is prepended and the model's opening
        // brace dropped, so the assembled stream stays one valid JSON object;
        // the raw buffer is kept for the history write and the recorded output.
        // The current client does not need the legacy `photo_analysis` section.
        controller.enqueue(analyseTraceId ? `{"trace_id":${JSON.stringify(analyseTraceId)},` : "{");
        let buffer = "";
        let strippedOpen = false;
        let subjectSeen = false;
        let stopReason: string | null | undefined;
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;
        for await (const chunk of stream) {
          if (chunk.type === "message_start") {
            inputTokens = chunk.message?.usage?.input_tokens;
          } else if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            buffer += chunk.delta.text;
            if (!subjectSeen) {
              const subject = earlySubject(buffer);
              if (subject) {
                subjectSeen = true;
                if (subject !== "clothing") {
                  // Stop the model here: nothing after this field is wanted.
                  stream.controller.abort();
                  generation?.finish({ output: JSON.stringify({ rejected: subject }), usage: { input: inputTokens } });
                  generation = null;
                  // Flushed here, not left to the request's after()-scheduled
                  // flush: that fires as soon as the route handler returns the
                  // stream, which for a streaming response is long before this
                  // point, and this generation must not depend on the platform
                  // keeping the function alive afterwards.
                  await flushObservability();
                  throw new AnalyseRejected(subject);
                }
              }
            }
            let out = chunk.delta.text;
            if (!strippedOpen) {
              const idx = out.indexOf("{");
              if (idx === -1) continue; // whitespace before the object — nothing to send yet
              out = out.slice(idx + 1); // drop the model's opening brace; we sent ours
              strippedOpen = true;
            }
            if (out) controller.enqueue(out);
          } else if (chunk.type === "message_delta") {
            outputTokens = chunk.usage?.output_tokens ?? outputTokens;
            stopReason = chunk.delta?.stop_reason ?? stopReason;
          }
        }
        if (stopReason === "refusal") {
          generation?.finish({ output: JSON.stringify({ rejected: "refused" }), usage: { input: inputTokens, output: outputTokens } });
          generation = null;
          await flushObservability(); // see the rejection branch above
          throw new AnalyseRejected("refused");
        }
        const parsed = parseAnalysisResult(buffer);
        await input.onResult?.(parsed);
        generation?.finish({
          output: JSON.stringify({ ...parsed, trace_id: analyseTraceId }),
          usage: { input: inputTokens, output: outputTokens },
        });
        await flushObservability(); // see the rejection branch above
        controller.close();
      } catch (err) {
        generation?.fail(err);
        await flushObservability(); // see the rejection branch above
        controller.error(err);
      }
    },
  });
}

