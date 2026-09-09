import type { Platform, PriceBand, Valuation, ValuationItem } from "@/lib/types";
import { askingPriceProvider, describeItem } from "./asking-price";
import { observeParent } from "@/lib/observability";
import { readCache, writeCache } from "./cache";
import type { ValuationProvider } from "./provider";

export type { ValuationProvider } from "./provider";
export { clearCache } from "./cache";
export { askingPriceProvider } from "./asking-price";
export { recommend, midpoint, score } from "./recommend";

/**
 * Answers "what is this item worth?" — nothing more. It does not decide where
 * to post, and it does not know why it was asked, which is what lets Sell and
 * Scout share it unchanged (ADR-0004).
 *
 * Only Enabled Platforms are valued. A platform the user doesn't sell on is
 * never looked up, so cost scales with what each user actually uses.
 */
export async function valuate(
  item: ValuationItem,
  enabledPlatforms: readonly Platform[],
  provider: ValuationProvider = askingPriceProvider
): Promise<Valuation> {
  if (enabledPlatforms.length === 0) {
    throw new Error("Cannot value an item with no enabled platforms");
  }

  const unique = [...new Set(enabledPlatforms)];

  return observeParent("valuate", { item, platforms: unique }, async () => {
  const results = await Promise.allSettled(
    unique.map(async (platform): Promise<[Platform, PriceBand]> => {
      const cached = readCache(item, platform);
      if (cached) return [platform, cached];
      const band = await provider.band(item, platform);
      writeCache(item, platform, band);
      return [platform, band];
    })
  );

  const perPlatform: Partial<Record<Platform, PriceBand>> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      const [platform, band] = result.value;
      perPlatform[platform] = band;
    }
  }

  // A partial answer is useful; no answer at all is a failure worth surfacing.
  if (Object.keys(perPlatform).length === 0) {
    const reason = results.find((r) => r.status === "rejected");
    throw new Error(
      `Valuation failed on every platform: ${
        reason && reason.status === "rejected" ? String(reason.reason) : "unknown"
      }`
    );
  }

  return { perPlatform, query: describeItem(item) };
  });
}
