import type Anthropic from "@anthropic-ai/sdk";
import type { Comparable, Platform, PriceBand, ValuationItem } from "@/lib/types";
import { platformMetadata, presence, type MarketPresence } from "@/platforms";
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
function webSearchTool(site: MarketPresence, market: Market): Anthropic.Messages.WebSearchTool20260209 {
  return {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 2,
    user_location: { type: "approximate", country: MARKETS[market].searchCountry },
    allowed_domains: [...site.searchDomains],
  };
}

/**
 * What the search actually did, for the trace: each query, and how many
 * results came back from each host. Without this a band with no comparables
 * cannot be told apart from a search that never reached the second site.
 */
export function searchActivity(contents: Anthropic.Messages.ContentBlock[][]): { queries: string[]; hits: Record<string, number> } {
  const queries: string[] = [];
  const hits: Record<string, number> = {};
  for (const content of contents) {
    for (const block of content) {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        const q = (block.input as { query?: unknown })?.query;
        if (typeof q === "string") queries.push(q);
      }
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === "web_search_result" && typeof r.url === "string") {
            let host = r.url;
            try { host = new URL(r.url).hostname.replace(/^www\./, ""); } catch { /* keep as is */ }
            hits[host] = (hits[host] ?? 0) + 1;
          }
        }
      }
    }
  }
  return { queries, hits };
}

/** A URL that opens one listing on this platform in this market, or undefined. */
export function listingUrl(url: unknown, platform: Platform, market: Market): string | undefined {
  return listingUrlOn(url, presence(platform, market));
}

function listingUrlOn(url: unknown, site: MarketPresence): string | undefined {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  return site.itemUrl.test(trimmed) ? trimmed : undefined;
}

export function describeItem(item: ValuationItem): string {
  return [item.brand, item.colour_primary, item.clothing_type, `size ${item.size}`]
    .filter(Boolean)
    .join(" ");
}

export function buildValuationPrompt(item: ValuationItem, platform: Platform, market: Market, site?: MarketPresence): string {
  const meta = platformMetadata[platform];
  const here = site ?? presence(platform, market);
  const { name: country, currency, symbol } = MARKETS[market];
  return `You are pricing a secondhand clothing item for a seller in the ${country} who is about to list it on ${meta.name}.

Item:
${JSON.stringify(item, null, 2)}

Search ${here.webUrl} for items currently LISTED FOR SALE there that are as close to this as you can find — same brand, same kind of garment, comparable size and condition. Only ${meta.name} counts: this band is what the item could be listed at on ${meta.name}, so a listing on any other site is not a comparable here. If ${meta.name} has too little, say so with "low" confidence rather than looking elsewhere.${here.searchNote ? `\n${here.searchNote}` : ""}

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

export function coerceBand(raw: RawBand, platform: Platform, market: Market, site?: MarketPresence): PriceBand {
  const currency = MARKETS[market].currency;
  const on = site ?? presence(platform, market);
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
          const url = listingUrlOn(c.url, on);
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
  site: MarketPresence,
  market: Market
): Omit<Anthropic.Messages.MessageCreateParamsNonStreaming, "messages"> {
  return {
    model: MODELS.valuation,
    max_tokens: 4000,
    output_config: { effort: "low", format: jsonSchemaFormat(priceBandSchema) },
    tools: [webSearchTool(site, market)],
  };
}

/**
 * One search of one site. Named for the trace as `valuate:<platform>` for the
 * seller's own edition and `valuate:<platform>@<market>` for a corridor.
 */
async function searchSite(
  item: ValuationItem,
  platform: Platform,
  market: Market,
  site: MarketPresence,
  label: string
): Promise<PriceBand> {
  const client = anthropicClient();
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: buildValuationPrompt(item, platform, market, site) },
  ];

  const generation = beginGeneration({
    name: label,
    model: MODELS.valuation,
    input: { item, platform, market, site: site.searchDomains },
    modelParameters: { max_tokens: 4000 },
  });

  try {
    const params = request(site, market);
    let response = await client.messages.create({ ...params, messages });
    const turns = [response.content];

    for (let i = 0; response.stop_reason === "pause_turn" && i < MAX_RESUMES; i++) {
      messages.push({ role: "assistant", content: response.content });
      response = await client.messages.create({ ...params, messages });
      turns.push(response.content);
    }

    if (response.stop_reason === "refusal") {
      throw new Error("Valuation request was declined by the model");
    }

    const band = coerceBand(parseStructuredContent<RawBand>(response.content), platform, market, site);
    generation?.finish({
      output: { ...band, search: searchActivity(turns) },
      usage: { input: response.usage?.input_tokens, output: response.usage?.output_tokens },
    });
    return band;
  } catch (err) {
    generation?.fail(err);
    throw err;
  }
}

/** Enough comparables to stand on their own; below this the corridor fills in. */
const ENOUGH = 3;

/**
 * Fold a corridor search into the home one. Home comparables come first and
 * the home band stands when it has enough behind it; otherwise the corridor
 * widens it, or replaces it when home found nothing at all. The corridor
 * band was asked for in the seller's currency, so the numbers line up.
 */
export function mergeBands(home: PriceBand, away: PriceBand, awayNote: string): PriceBand {
  const comparables = [...home.comparables, ...away.comparables].slice(0, 5);
  if (home.comparables.length >= ENOUGH || away.comparables.length === 0) {
    return { ...home, comparables };
  }
  if (home.comparables.length === 0) {
    return { ...away, comparables, reasoning: `${awayNote} ${away.reasoning}`.trim() };
  }
  return {
    ...home,
    low: Math.min(home.low, away.low),
    high: Math.max(home.high, away.high),
    confidence: away.comparables.length >= ENOUGH ? away.confidence : home.confidence,
    comparables,
    reasoning: `${home.reasoning} ${awayNote} ${away.reasoning}`.trim(),
  };
}

export const askingPriceProvider: ValuationProvider = {
  async band(item: ValuationItem, platform: Platform, market: Market): Promise<PriceBand> {
    const home = presence(platform, market);
    const corridor = home.corridor;
    if (!corridor) return searchSite(item, platform, market, home, `valuate:${platform}`);

    // Two sites, two searches, side by side — the model runs one query per
    // call at low effort whatever it is told, so a second site has to be a
    // second call. The corridor is best-effort: if it fails, home stands.
    const away = presence(platform, corridor.market);
    const [homeResult, awayResult] = await Promise.allSettled([
      searchSite(item, platform, market, home, `valuate:${platform}`),
      searchSite(item, platform, market, { ...away, searchNote: corridor.note }, `valuate:${platform}@${corridor.market}`),
    ]);
    if (homeResult.status === "rejected") {
      if (awayResult.status === "fulfilled") return { ...awayResult.value, reasoning: `${corridor.note} ${awayResult.value.reasoning}`.trim() };
      throw homeResult.reason;
    }
    if (awayResult.status === "rejected") return homeResult.value;
    return mergeBands(homeResult.value, awayResult.value, corridor.reasoningPrefix);
  },
};
