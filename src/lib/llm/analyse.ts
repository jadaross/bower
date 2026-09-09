import type { AnalysisResult, Platform, Tone } from "@/lib/types";
import { platformListingSpec, platformMetadata } from "@/platforms";
import { MODELS, anthropicClient } from "./client";
import { parseAnalysisResult } from "./analyse-parse";
import { jsonSchemaFormat } from "./structured";
import { analysisResultSchema } from "./schemas";
import { beginGeneration, observeGeneration, type TraceContext } from "@/lib/observability";
export { parseAnalysisResult };

export interface AnalyseInput {
  /** base64 JPEG strings, optionally with a `data:` prefix. */
  photos: string[];
  tone: Tone;
  /** When set, the prompt is platform-specific; otherwise the neutral prompt is used. */
  platform?: Platform;
  /** Observability (#37): caller + route for the Langfuse trace. Optional. */
  trace?: TraceContext;
  /** History (#41): called with the parsed result so the route can persist it. */
  onResult?: (result: AnalysisResult) => void;
}

const TONE_HINT: Record<Tone, string> = {
  casual:
    "The description should be casual, friendly, and conversational — like how a real person sells on Depop or Vinted. Use natural language. Keep it genuine and relatable. No corporate speak.",
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
  },
  "listing": {
    "brand": "",
    "clothing_type": "",
    "colour_primary": "",
    "colour_secondary": null,
    "condition": "Good",
    "size": "",
    "material": "",
    "title": "",
    "description": "",
    "hashtags": [],
    "price_min": 0,
    "price_max": 0,
    "price_reasoning": "",
    "gender": "women",
    "main_category": "tops",
    "subcategory": ""${fields}
  }
}`;
}

const COMMON_RULES = `Rules:

TAG DATA:
- Extract ALL readable text from any tag/label visible in any photo
- rn_number: US FTC Registered Identification Number (format "RN XXXXX") — critical for vintage dating
- size_system: "UK" | "EU" | "US" | "IT" | "Universal" | null
- care_instructions: plain English summary of care symbols/text`;

function buildPlatformPrompt(platform: Platform, tone: Tone, photoCount: number): string {
  const spec = platformListingSpec[platform];
  return `You are an expert clothing photographer and professional reselling assistant for secondhand fashion platforms.

Analyse these ${photoCount} clothing photo(s) and return ONLY a valid JSON object — no markdown code fences, no explanation text, just raw JSON starting with { and ending with }.

${spec.promptFragment}

${TONE_HINT[tone]}

Return exactly this JSON structure (fill in all fields):

${jsonShape(platform)}

${COMMON_RULES}

LISTING:
- brand: from tag if visible, otherwise infer from logo/design, otherwise "Unknown"
- condition: infer from visible wear, pilling, fading, stains. Be honest.
- price_min/price_max: realistic GBP resale prices. Consider brand, condition, type, and typical secondhand market values. For luxury/designer, price higher. For fast fashion in good condition, price accordingly.
- price_reasoning: one sentence explaining the price logic
- title: ${platform === 'ebay' ? 'max 80 characters' : 'max 60 characters'}
- description: ${platform === 'depop' ? '3–4 short punchy sentences, max 60 words. Give it personality. No filler phrases.' : platform === 'vinted' ? '4–5 clear sentences, max 80 words. Lead with the most important details. No waffle.' : '4–6 sentences, 150–250 words. Detailed and factual. Include fabric, visible measurements, condition specifics, care info.'}
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
- description: 4–5 clear sentences, 80–100 words. Lead with the most important details. Factual and thorough.
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
    ? buildPlatformPrompt(input.platform, input.tone, input.photos.length)
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
 * Streams raw text deltas from the model. The full concatenated text is the JSON
 * payload — consumers buffer until done, then call parseAnalysisResult.
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
        // Buffer the model's text, then emit one normalized JSON document. The
        // model's template only produces `listing` and `tag_data`, so the raw
        // stream is missing `photo_analysis` and would fail the client's decode.
        // The client buffers to completion before decoding anyway, so emitting
        // the whole normalized document rather than token-by-token costs it
        // nothing and guarantees a complete contract.
        let buffer = "";
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;
        for await (const chunk of stream) {
          if (chunk.type === "message_start") {
            inputTokens = chunk.message?.usage?.input_tokens;
          } else if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            buffer += chunk.delta.text;
          } else if (chunk.type === "message_delta") {
            outputTokens = chunk.usage?.output_tokens ?? outputTokens;
          }
        }
        const parsed = parseAnalysisResult(buffer) as ReturnType<typeof parseAnalysisResult> & { trace_id?: string };
        if (analyseTraceId) parsed.trace_id = analyseTraceId;
        const doc = JSON.stringify(parsed);
        input.onResult?.(parsed);
        generation?.finish({ output: doc, usage: { input: inputTokens, output: outputTokens } });
        controller.enqueue(doc);
        controller.close();
      } catch (err) {
        generation?.fail(err);
        controller.error(err);
      }
    },
  });
}

