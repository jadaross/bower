import type { Platform, PriceBand, ValuationItem } from "@/lib/types";
import type { Market } from "@/lib/markets";

/**
 * The seam ADR-0005 promises: today asking prices come from a web search, but
 * a paid sold-comps feed could implement this interface instead and no caller
 * would change. Keep this interface about *what an item is worth* — never
 * about what to do with that answer.
 */
export interface ValuationProvider {
  /** Value one item on one platform. Implementations must not throw for
   *  "no comparables found" — return a low-confidence band instead. */
  band(item: ValuationItem, platform: Platform, market: Market): Promise<PriceBand>;
}
