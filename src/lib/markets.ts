import type { Platform } from "@/lib/types";

/**
 * A Market is where the seller sells: which country's editions of the
 * platforms they list on, in which currency. It lives on the profile next to
 * the Enabled Platforms and is read from there, never from a request body —
 * a client that could name its own market could have an item priced against
 * the wrong country's listings.
 *
 * What changes is the money, the searching and the English: currency, the
 * sites the market check is confined to, the fee each platform takes there,
 * which platforms exist at all (every platform bower knows is in every market
 * today, but the shape allows for one that is not), and whether the listing
 * is written in British or American English with UK or US sizes. British
 * suits Ireland and Australia; the United States needed its own (ADR-0009,
 * amended).
 */
export type Market = "GB" | "IE" | "AU" | "US";

export interface MarketInfo {
  id: Market;
  name: string;
  /** The name as it reads after "in": "the United Kingdom", "Ireland". */
  place: string;
  /** ISO 4217, as it appears on Price Bands and Comparables. */
  currency: string;
  /** For copy the server writes, e.g. the recommendation's reasoning. */
  symbol: string;
  /**
   * `user_location.country` for the web search. Absent where the search tool
   * does not take the country (it rejects IE); the allowed domains still
   * confine the search to that country's sites.
   */
  searchCountry?: string;
  /** Platforms that operate here, in registry order. */
  platforms: readonly Platform[];
  /** The English the listing is written in, which also sets the size system. */
  english: "British" | "American";
}

export const MARKETS: Record<Market, MarketInfo> = {
  GB: {
    id: "GB",
    name: "United Kingdom",
    place: "the United Kingdom",
    currency: "GBP",
    symbol: "£",
    searchCountry: "GB",
    platforms: ["vinted", "depop", "ebay"],
    english: "British",
  },
  IE: {
    id: "IE",
    name: "Ireland",
    place: "Ireland",
    currency: "EUR",
    symbol: "€",
    platforms: ["vinted", "depop", "ebay"],
    english: "British",
  },
  AU: {
    id: "AU",
    name: "Australia",
    place: "Australia",
    currency: "AUD",
    symbol: "$",
    searchCountry: "AU",
    platforms: ["vinted", "depop", "ebay"],
    english: "British",
  },
  US: {
    id: "US",
    name: "United States",
    place: "the United States",
    currency: "USD",
    symbol: "$",
    searchCountry: "US",
    platforms: ["vinted", "depop", "ebay"],
    english: "American",
  },
};

export const MARKET_IDS: readonly Market[] = ["GB", "IE", "US", "AU"];
export const DEFAULT_MARKET: Market = "GB";

export function isMarket(v: unknown): v is Market {
  return typeof v === "string" && MARKET_IDS.includes(v as Market);
}

export class InvalidMarket extends Error {}

export function validateMarket(input: unknown): Market {
  if (!isMarket(input)) throw new InvalidMarket(`Unknown market: ${String(input)}`);
  return input;
}

/** "£50" / "€50" / "$50": the server only ever writes whole amounts. */
export function money(amount: number, market: Market): string {
  return `${MARKETS[market].symbol}${Math.round(amount)}`;
}

/** Whether this market's listings are written in American English with US sizes. */
export function isAmerican(market: Market): boolean {
  return MARKETS[market].english === "American";
}

/**
 * The one line that sets the spelling, the words, the money and the sizes of
 * a listing. Shared by every prompt that writes copy, so the three calls
 * cannot drift apart.
 */
export function languageRule(market: Market): string {
  const { symbol, currency } = MARKETS[market];
  if (isAmerican(market)) {
    return `- Use American English and American terms throughout, in the title, the description AND the field values: color, gray, sweater, sneakers, pants, overalls, snaps, shipping. The source listing may be written in British English: translate every British term, never copy it (jumper -> sweater, trainers -> sneakers, trousers -> pants, poppers -> snaps, dungarees -> overalls, grey -> gray, bobbling -> pilling). Prices in ${symbol} (${currency}), never any other currency.
- Sizes in US format, in the title and the Size field alike. Letter sizes (XS-XL) and waist/leg sizes (W32 L32) stay as they are. Convert a UK size with these rules only: women's clothing UK minus 4 (UK 10 -> US 6); men's shoes UK plus 1 (UK 8 -> US 9); women's shoes UK plus 2 (UK 5 -> US 7). Write the US size first with the original in brackets once, e.g. "US 6 (UK 10)". If no rule fits, keep the size as given.
- Measurements the source gives in cm, convert to whole inches (58cm -> 23 in). Converting is the only change allowed: never add a measurement the source does not give.`;
  }
  return `- Use British English and British terms throughout: colour, grey, jumper, trainers, dungarees, postage (not "shipping"). Prices in ${symbol} (${currency}), never any other currency. Sizes in UK format.`;
}
