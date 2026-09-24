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
 * suits Australia; the United States needed its own (ADR-0009, amended).
 */
export type Market = "GB" | "AU" | "US";

export interface MarketInfo {
  id: Market;
  name: string;
  /** ISO 4217, as it appears on Price Bands and Comparables. */
  currency: string;
  /** For copy the server writes, e.g. the recommendation's reasoning. */
  symbol: string;
  /** `user_location.country` for the web search. */
  searchCountry: string;
  /** Platforms that operate here, in registry order. */
  platforms: readonly Platform[];
  /** The English the listing is written in, which also sets the size system. */
  english: "British" | "American";
}

export const MARKETS: Record<Market, MarketInfo> = {
  GB: {
    id: "GB",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    searchCountry: "GB",
    platforms: ["vinted", "depop", "ebay"],
    english: "British",
  },
  AU: {
    id: "AU",
    name: "Australia",
    currency: "AUD",
    symbol: "$",
    searchCountry: "AU",
    platforms: ["vinted", "depop", "ebay"],
    english: "British",
  },
  US: {
    id: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
    searchCountry: "US",
    platforms: ["vinted", "depop", "ebay"],
    english: "American",
  },
};

export const MARKET_IDS: readonly Market[] = ["GB", "AU", "US"];
export const DEFAULT_MARKET: Market = "GB";

export function isMarket(v: unknown): v is Market {
  return typeof v === "string" && MARKET_IDS.includes(v as Market);
}

export class InvalidMarket extends Error {}

export function validateMarket(input: unknown): Market {
  if (!isMarket(input)) throw new InvalidMarket(`Unknown market: ${String(input)}`);
  return input;
}

/** "£50" / "$50" — the server only ever writes whole amounts. */
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
    return `- Use American English and American terms throughout: color, gray, sweater, sneakers, pants (not "trousers"), overalls, shipping (not "postage"). Prices in ${symbol} (${currency}), never any other currency. Sizes in US format: women's numeric (0-16) or XS-XL, men's chest and waist in inches, US shoe sizes. If the tag gives only a UK or EU size, write the US size with the tag's size in brackets, e.g. "US 6 (UK 10)". Measurements in inches.`;
  }
  return `- Use British English and British terms throughout: colour, grey, jumper, trainers, dungarees, postage (not "shipping"). Prices in ${symbol} (${currency}), never any other currency. Sizes in UK format.`;
}
