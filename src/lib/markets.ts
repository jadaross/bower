import type { Platform } from "@/lib/types";

/**
 * A Market is where the seller sells: which country's editions of the
 * platforms they list on, in which currency. It lives on the profile next to
 * the Enabled Platforms and is read from there, never from a request body —
 * a client that could name its own market could have an item priced against
 * the wrong country's listings.
 *
 * The listing prompts are unchanged across markets (British English suits
 * both). What changes is the money and the searching: currency, the sites
 * the market check is confined to, the fee each platform takes there, and
 * which platforms exist at all — every platform bower knows is in both
 * markets today, but the shape allows for one that is not.
 */
export type Market = "GB" | "AU";

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
}

export const MARKETS: Record<Market, MarketInfo> = {
  GB: {
    id: "GB",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    searchCountry: "GB",
    platforms: ["vinted", "depop", "ebay"],
  },
  AU: {
    id: "AU",
    name: "Australia",
    currency: "AUD",
    symbol: "$",
    searchCountry: "AU",
    platforms: ["vinted", "depop", "ebay"],
  },
};

export const MARKET_IDS: readonly Market[] = ["GB", "AU"];
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
