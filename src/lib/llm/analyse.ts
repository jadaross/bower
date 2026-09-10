import { ANALYSIS_SUBJECTS, type AnalysisSubject, type AnalysisResult, Platform, Tone } from "@/lib/types";
import { platformListingSpec, platformMetadata } from "@/platforms";
import { MODELS, anthropicClient } from "./client";
import { parseAnalysisResult } from "./analyse-parse";
import { jsonSchemaFormat } from "./structured";
import { analysisResultSchema } from "./schemas";
import { beginGeneration, observeGeneration, type TraceContext } from "@/lib/observability";
import { sellerNotesPrompt, type SellerNote } from "@/lib/seller-notes";
export { parseAnalysisResult };

export interface AnalyseInput {
  /** base64 JPEG strings, optionally with a `data:` prefix. */
  photos: string[];
  tone: Tone;
  /** When set, the prompt is platform-specific; otherwise the neutral prompt is used. */
  platform?: Platform;
  /** The seller's opt-in notes (smoke-free etc.), read from their profile, never the body. */
  sellerNotes?: SellerNote[];
  /** Observability (#37): caller + route for the Langfuse trace. Optional. */
  trace?: TraceContext;
  /** History (#41): called with the parsed result so the route can persist it. */
  onResult?: (result: AnalysisResult) => void;
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

function buildPlatformPrompt(platform: Platform, tone: Tone, photoCount: number, notes: SellerNote[] = []): string {
  const spec = platformListingSpec[platform];
  return `You are an expert clothing photographer and professional reselling assistant for secondhand fashion platforms.

Analyse these ${photoCount} clothing photo(s) and return ONLY a valid JSON object — no markdown code fences, no explanation text, just raw JSON starting with { and ending with }.

${spec.promptFragment}

${TONE_HINT[tone]}

Return exactly this JSON structure (fill in all fields):

${jsonShape(platform)}

${sellerNotesPrompt(notes, platform)}

${COMMON_RULES}

LISTING:
- brand: from tag if visible, otherwise infer from logo/design, otherwise "Unknown"
- condition: infer from visible wear, pilling, fading, stains. Be honest.
- price_min/price_max: realistic GBP resale prices. Consider brand, condition, type, and typical secondhand market values. For luxury/designer, price higher. For fast fashion in good condition, price accordingly.
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
${spec.fieldsSchema}

For every field:
- "value" MUST come from the allowed list when one is given (don't paraphrase).
- "hint" is optional — only include it when the rationale is non-obvious.
- If the photos genuinely lack the info, pick the best safe default (e.g. "Unbranded" if no brand) rather than leaving the value empty.`;
}

function buildNeutralPrompt(tone: Tone, photoCount: number): string {
  return `You are an expert clothing photographer and professional reselling assistant for secondhand fashion platforms.

Analyse these ${photoCount} clothing photo(s) and return ONLY a valid JSON object — no markdown code fences, no explanation text, just raw JSON starting with { and ending with }.

${TONE_HINT[tone]}

Return exactly this JSON structure (fill in all fields):

${jsonShape()}

${COMMON_RULES}

LISTING:
- brand: from tag if visible, otherwise infer from logo/design, otherwise "Unknown"
- condition: infer from visible wear, pilling, fading, stains. Be honest.
- price_min/price_max: realistic GBP resale prices. Consider brand, condition, type, and typical secondhand market values. For luxury/designer, price higher. For fast fashion in good condition, price accordingly.
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

function buildPrompt(input: AnalyseInput): string {
  return input.platform
    ? buildPlatformPrompt(input.platform, input.tone, input.photos.length, input.sellerNotes)
    : buildNeutralPrompt(input.tone, input.photos.length);
}

/**
 * Returns the parsed AnalysisResult. Throws on invalid JSON or missing top-level
 * fields. Suitable for tests, scripts, anywhere SSE framing is not needed.
 */
export async function analyseListing(input: AnalyseInput): Promise<AnalysisResult> {
  const client = anthropicClient();
  const messages = [
    {
      role: "user" as const,
      content: [...imageBlocks(input.photos), { type: "text" as const, text: buildPrompt(input) }],
    },
  ];
  const message = await observeGeneration(
    {
      name: "analyse",
      model: MODELS.analyse,
      // Never trace the base64 photos — log only the meaningful request shape.
      input: { platform: input.platform ?? "neutral", tone: input.tone, photoCount: input.photos.length },
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
      output: m.content[0].type === "text" ? m.content[0].text : "",
      usage: { input: m.usage?.input_tokens, output: m.usage?.output_tokens },
    })
  );
  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseAnalysisResult(text);
  input.onResult?.(parsed);
  return parsed;
}

/**
 * The read was stopped on purpose: the photos are not of clothing, or the
 * model declined them. `subject` is one of `AnalysisSubject` minus "clothing",
 * or "refused" when the model returned no document at all.
 */
export class AnalyseRejected extends Error {
  constructor(readonly subject: Exclude<AnalysisSubject, "clothing"> | "refused") {
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
 * back and tell the client why, instead of a decode failure downstream.
 */
export function analyseListingStream(input: AnalyseInput): ReadableStream<string> {
  return new ReadableStream({
    async start(controller) {
      let generation: ReturnType<typeof beginGeneration> = null;
      try {
        const client = anthropicClient();
        const messages = [
          {
            role: "user" as const,
            content: [...imageBlocks(input.photos), { type: "text" as const, text: buildPrompt(input) }],
          },
        ];
        let analyseTraceId: string | undefined;
        generation = beginGeneration({
          name: "analyse",
          model: MODELS.analyse,
          // Never trace the base64 photos — log only the meaningful request shape.
          input: { platform: input.platform ?? "neutral", tone: input.tone, photoCount: input.photos.length },
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
          throw new AnalyseRejected("refused");
        }
        const parsed = parseAnalysisResult(buffer);
        input.onResult?.(parsed);
        generation?.finish({
          output: JSON.stringify({ ...parsed, trace_id: analyseTraceId }),
          usage: { input: inputTokens, output: outputTokens },
        });
        controller.close();
      } catch (err) {
        generation?.fail(err);
        controller.error(err);
      }
    },
  });
}

