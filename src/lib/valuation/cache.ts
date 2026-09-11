import type { Platform, PriceBand, ValuationItem } from "@/lib/types";
import type { Market } from "@/lib/markets";

/**
 * "Nike vintage windbreaker, M, Good" is worth the same to every user who
 * scans one, so a warm cache makes the marginal lookup free.
 *
 * Process-local and therefore per-instance — on serverless this warms per
 * container and evaporates with it. That is deliberately the cheap version;
 * a shared cache is a later problem, and this interface won't change when
 * it arrives.
 */

const TTL_MS = 1000 * 60 * 60 * 12;
const MAX_ENTRIES = 500;

interface Entry {
  band: PriceBand;
  storedAt: number;
}

const store = new Map<string, Entry>();

/** Market + platform + brand + type + size + condition, per ADR-0004. A Depop band in AUD is not a Depop band in GBP. */
export function cacheKey(item: ValuationItem, platform: Platform, market: Market): string {
  return [
    market,
    platform,
    item.brand.trim().toLowerCase(),
    item.clothing_type.trim().toLowerCase(),
    item.size.trim().toLowerCase(),
    item.condition,
  ].join("|");
}

export function readCache(item: ValuationItem, platform: Platform, market: Market): PriceBand | null {
  const entry = store.get(cacheKey(item, platform, market));
  if (!entry) return null;
  if (Date.now() - entry.storedAt > TTL_MS) {
    store.delete(cacheKey(item, platform, market));
    return null;
  }
  return entry.band;
}

export function writeCache(item: ValuationItem, platform: Platform, market: Market, band: PriceBand): void {
  if (store.size >= MAX_ENTRIES) {
    // Cheapest possible eviction: drop the oldest insertion.
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  store.set(cacheKey(item, platform, market), { band, storedAt: Date.now() });
}

/** Test seam. */
export function clearCache(): void {
  store.clear();
}
