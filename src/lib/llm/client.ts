import Anthropic from "@anthropic-ai/sdk";

/**
 * Cheapest model that can actually do each job, checked against live pricing
 * on 2026-08-21. Costs are per million tokens (input / output).
 *
 *   Sonnet 5   $2 / $10   — supports web_search_20260209
 *   Haiku 4.5  $1 / $5    — older web_search_20250305 only, 200k context
 *   Opus 5     $5 / $25
 *
 * Valuation moved to Haiku on 2026-09-23. The spike in
 * docs/research/valuation-cost-speed.md found it cheaper, faster and with more
 * valid comparables than Sonnet on eBay and Vinted; Depop is its weak spot
 * (few comparables, all "low" confidence), accepted for a 9p check (ADR-0010).
 */
export const MODELS = {
  analyse: "claude-sonnet-5",
  format: "claude-haiku-4-5-20251001",
  refine: "claude-haiku-4-5-20251001",
  valuation: "claude-haiku-4-5-20251001",
  /** The product-page read behind a pasted link: needs web fetch, so Sonnet. */
  link: "claude-sonnet-5",
} as const;

let _client: Anthropic | null = null;

export function anthropicClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  _client = new Anthropic({ apiKey });
  return _client;
}

// `extractJsonObject` and `parseAnalysisResult` live in `./analyse-parse` so
// that client bundles can import them without pulling the Anthropic SDK.
