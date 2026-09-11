import type Anthropic from "@anthropic-ai/sdk";
import type { Comparable, Platform, PriceBand, ValuationItem } from "@/lib/types";
import { platformMetadata, presence } from "@/platforms";
import { MARKETS, type Market } from "@/lib/markets";
import { MODELS, anthropicClient } from "@/lib/llm/client";
import { jsonSchemaFormat, parseStructuredContent } from "@/lib/llm/structured";
import { beginGeneration } from "@/lib/observability";
import { priceBandSchema } from "@/lib/llm/schemas";
import type { ValuationProvider } from "./provider";

/**
 * Grounds a Price Band in public ASKING prices via Claude's server-side web
 * search. Sold prices are not available for our platforms at any price — see
 * ADR-0005 — so this must never claim to know what anything sold for.
 */

/**
 * The search is confined to the platform being priced. Before this the model
 * was allowed to "fall back to other UK marketplaces", and the eBay band came
 * back with five Vinted listings under an eBay heading.
 */
function webSearchTool(platform: Platform, market: Market): Anthropic.Messages.WebSearchTool20260209 {
  return {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 2,
    user_location: { type: "approximate", country: MARKETS[market].searchCountry },
    allowed_domains: [...presence(platform, market).searchDomains],
  };
}

/** A URL that opens one listing on this platform in this market, or undefined. */
export function listingUrl(url: unknown, platform: Platform, market: Market): string | undefined {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  return presence(platform, market).itemUrl.test(trimmed) ? trimmed : undefined;
}

export function describeItem(item: ValuationItem): string {
  return [item.brand, item.colour_primary, item.clothing_type, `size ${item.size}`]
    .filter(Boolean)
    .join(" ");
}

export function buildValuationPrompt(item: ValuationItem, platform: Platform, market: Market): string {
  const meta = platformMetadata[platform];
  const here = presence(platform, market);
  const { name: country, currency, symbol } = MARKETS[market];
  return `You are pricing a secondhand clothing item for a seller in the ${country} who is about to list it on ${meta.name}.

Item:
${JSON.stringify(item, null, 2)}

Search ${here.webUrl} for items currently LISTED FOR SALE there that are as close to this as you can find — same brand, same kind of garment, comparable size and condition. Only ${meta.name} counts: this band is what the item could be listed at on ${meta.name}, so a listing on any other site is not a comparable here. If ${meta.name} has too little, say so with "low" confidence rather than looking elsewhere.

CRITICAL CONSTRAINTS:
- You are looking at ASKING prices — what sellers are currently asking. You do NOT have access to sold prices, and you must not claim or imply that you do.
- Prices are in ${currency}. Convert if a source is in another currency, and say so in the reasoning.
- If you find fewer than three genuinely comparable items, return "low" confidence and a wider band. A low-confidence answer is useful; a confident guess is not.
- Never invent a comparable. Every entry must correspond to a real listing you actually saw.
- Every comparable's "url" must open THAT ONE LISTING — a page of the form ${here.itemUrlExample}. A brand page, a search or catalogue page, or the homepage is not a listing and will be discarded, so do not list an item unless you have its own page.

Return ONLY a valid JSON object — no markdown fences, no commentary:

{
  "low": 0,
  "high": 0,
  "currency": "${currency}",
  "confidence": "low" | "medium" | "high",
  "sell_likelihood": "low" | "medium" | "high",
  "reasoning": "",
  "comparables": [
    { "title": "", "price": 0, "currency": "${currency}", "platform": "${platform}", "url": "" }
  ]
}

Rules:
- "low" and "high" bracket what this item could sensibly be listed at on ${meta.name}. Never return low === high.
- "confidence": how sure you are of the PRICE. "high" only when several close comparables agree; "medium" when they roughly agree or are loosely comparable; "low" when they are few, scattered, or only tangentially similar.
- "sell_likelihood": how readily this kind of item MOVES on ${meta.name}, judged from how many people are listing and buying it there. This is a different question from confidence — a common item can have a very well-established price and still sit unsold, and a rare one can be hard to price but sell the day it goes up.
- "reasoning": one sentence, phrased as asking prices — e.g. "Similar Carhartt Detroit jackets in this size are listed at ${symbol}55–${symbol}85." Never write "sells for".
- "comparables": up to 5, each a real listing you found.`;
}

interface RawBand {
  low?: unknown;
  high?: unknown;
  currency?: unknown;
  confidence?: unknown;
  sell_likelihood?: unknown;
  reasoning?: unknown;
  comparables?: unknown;
}

const CONFIDENCE = new Set(["low", "medium", "high"]);

export function coerceBand(raw: RawBand, platform: Platform, market: Market): PriceBand {
  const currency = MARKETS[market].currency;
  if (typeof raw.low !== "number" || typeof raw.high !== "number") {
    throw new Error("Valuation response missing a numeric low/high");
  }
  const low = Math.min(raw.low, raw.high);
  const high = Math.max(raw.low, raw.high);
  if (low <= 0) throw new Error("Valuation returned a non-positive price");

  // A comparable is only kept when it links to one listing on the platform
  // being priced. The platform is taken from that URL, never from what the
  // model says — the URL is the thing the user will actually open.
  const comparables = Array.isArray(raw.comparables)
    ? raw.comparables
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .filter((c) => typeof c.price === "number" && typeof c.title === "string")
        .flatMap((c): Comparable[] => {
          const url = listingUrl(c.url, platform, market);
          if (!url) return [];
          return [
            {
              title: String(c.title),
              price: Number(c.price),
              currency: typeof c.currency === "string" ? c.currency : currency,
              platform,
              url,
            },
          ];
        })
        .slice(0, 5)
    : [];

  const stated = CONFIDENCE.has(String(raw.confidence))
    ? (raw.confidence as PriceBand["confidence"])
    : "low";
  const likelihood = CONFIDENCE.has(String(raw.sell_likelihood))
    ? (raw.sell_likelihood as PriceBand["sell_likelihood"])
    : "medium";

  return {
    low,
    high,
    currency: typeof raw.currency === "string" ? raw.currency : currency,
    // A band with nothing behind it cannot honestly be called confident.
    confidence: comparables.length === 0 ? "low" : stated,
    sell_likelihood: likelihood,
    comparables,
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
  };
}

/** Server tools can hand back `pause_turn` mid-search; resume by echoing. */
const MAX_RESUMES = 3;

/**
 * Sonnet 5 defaults to `effort: "high"` on the API, which on this task meant
 * ~8 minutes per platform — unusable for someone standing in a shop. This is
 * "search, read prices, average them", not a reasoning problem: low effort
 * also makes the model consolidate its tool calls instead of trickling them.
 */
function request(
  platform: Platform,
  market: Market
): Omit<Anthropic.Messages.MessageCreateParamsNonStreaming, "messages"> {
  return {
    model: MODELS.valuation,
    max_tokens: 4000,
    output_config: { effort: "low", format: jsonSchemaFormat(priceBandSchema) },
    tools: [webSearchTool(platform, market)],
  };
}

export const askingPriceProvider: ValuationProvider = {
  async band(item: ValuationItem, platform: Platform, market: Market): Promise<PriceBand> {
    const client = anthropicClient();
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: buildValuationPrompt(item, platform, market) },
    ];

    const generation = beginGeneration({
      name: `valuate:${platform}`,
      model: MODELS.valuation,
      input: { item, platform, market },
      modelParameters: { max_tokens: 4000 },
    });

    try {
      const params = request(platform, market);
      let response = await client.messages.create({ ...params, messages });

      for (let i = 0; response.stop_reason === "pause_turn" && i < MAX_RESUMES; i++) {
        messages.push({ role: "assistant", content: response.content });
        response = await client.messages.create({ ...params, messages });
      }

      if (response.stop_reason === "refusal") {
        throw new Error("Valuation request was declined by the model");
      }

      const band = coerceBand(parseStructuredContent<RawBand>(response.content), platform, market);
      generation?.finish({
        output: band,
        usage: { input: response.usage?.input_tokens, output: response.usage?.output_tokens },
      });
      return band;
    } catch (err) {
      generation?.fail(err);
      throw err;
    }
  },
};
