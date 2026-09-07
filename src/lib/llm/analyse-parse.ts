import type { AnalysisResult } from "@/lib/types";

/**
 * Models sometimes wrap JSON in prose or markdown fences. Extract the first
 * balanced top-level JSON object as a string. Throws if none found.
 *
 * Kept SDK-free so client bundles (e.g. the listing pipeline hook) can call it
 * without pulling in `@anthropic-ai/sdk`.
 */
export function extractJsonObject(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model output");
  return match[0];
}

/**
 * The `photo_analysis` section. The server type dropped it and the prompt never
 * asks for it, but the shipped iOS client still requires it to decode the
 * response. Emitting a well-formed empty one keeps that client working; it is
 * typed here rather than in `types.ts` precisely because the server no longer
 * models it. The next client drops the requirement and this can go.
 */
interface PhotoAnalysisCompat {
  scores: unknown[];
  missing_shots: string[];
  suggestions: string[];
  has_tag_photo: boolean;
  ready_to_list: boolean;
}

type AnalysisResultWire = AnalysisResult & { photo_analysis: PhotoAnalysisCompat };

function defaultPhotoAnalysis(): PhotoAnalysisCompat {
  return { scores: [], missing_shots: [], suggestions: [], has_tag_photo: false, ready_to_list: true };
}

/**
 * Normalise a parsed analyse object. `listing` and `tag_data` are the model's
 * real work and are required; `photo_analysis` is added for the shipped client
 * when the model (correctly, per the current prompt) omits it.
 */
export function normalizeAnalysisResult(
  parsed: Partial<AnalysisResult> & { photo_analysis?: PhotoAnalysisCompat }
): AnalysisResultWire {
  if (!parsed.listing || !parsed.tag_data) {
    throw new Error("AnalysisResult missing required top-level fields");
  }
  return {
    photo_analysis: parsed.photo_analysis ?? defaultPhotoAnalysis(),
    tag_data: parsed.tag_data,
    listing: parsed.listing,
  };
}

/**
 * Parse and normalise a fully-buffered analyse response. Throws on unparsable
 * JSON or a missing listing/tag_data; completes photo_analysis when absent.
 */
/**
 * Escape raw control characters that appear INSIDE JSON string literals. The
 * model routinely writes multi-line descriptions with real newlines, which is
 * invalid JSON — JSON.parse (and Swift, and Python) reject it, and the stream
 * dies, which the client shows as a dropped connection. A tiny state machine
 * tracks whether we are inside a string and escapes any control char there;
 * structural whitespace between tokens is left alone.
 */
export function escapeControlCharsInStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === "\\") { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (inString) {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        out += ch === "\n" ? "\\n" : ch === "\t" ? "\\t" : ch === "\r" ? "\\r"
             : "\\u" + code.toString(16).padStart(4, "0");
        continue;
      }
    }
    out += ch;
  }
  return out;
}

export function parseAnalysisResult(buffer: string): AnalysisResultWire {
  const json = escapeControlCharsInStrings(extractJsonObject(buffer));
  return normalizeAnalysisResult(
    JSON.parse(json) as Partial<AnalysisResult> & { photo_analysis?: PhotoAnalysisCompat }
  );
}
