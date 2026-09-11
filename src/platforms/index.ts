import type { Platform } from "@/lib/types";
import { MARKETS, type Market } from "@/lib/markets";
import { platformMetadata } from "./registry";
import type { MarketPresence } from "./types";

export type { Platform } from "@/lib/types";
export * from "./types";
export { platformMetadata, platformListingSpec } from "./registry";

/** The canonical platform ordering. */
export const PLATFORM_IDS: readonly Platform[] = ["vinted", "depop", "ebay"];

/** The platform's site and fees in this Market. Throws where it does not operate — callers filter by `platformsIn` first. */
export function presence(platform: Platform, market: Market): MarketPresence {
  const p = platformMetadata[platform].markets[market];
  if (!p) throw new Error(`${platformMetadata[platform].name} does not operate in ${MARKETS[market].name}`);
  return p;
}

/** Platforms that exist in this Market, in registry order. */
export function platformsIn(market: Market): Platform[] {
  return PLATFORM_IDS.filter((p) => platformMetadata[p].markets[market] !== undefined);
}

/** Convert a list price into a take-home estimate after platform fees. */
export function netPrice(price: number, platform: Platform, market: Market): number {
  return price * (1 - presence(platform, market).feePct / 100);
}
