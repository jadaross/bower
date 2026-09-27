import type { Platform, PriceBand, ValuationItem } from "@/lib/types";
import type { Market } from "@/lib/markets";
import { serviceClient } from "@/lib/supabase";

/**
 * "Nike vintage windbreaker, M, Good" is worth the same to every user who
 * scans one, so a warm cache makes the marginal lookup free, and gives the
 * same item the same answer (the benchmark, #78, found two fresh runs agree
 * only about 60% of the time).
 *
 * Two layers. This process's memory first; then `valuation_cache` in
 * Supabase (migration 0020), which every Vercel instance shares, since on
 * serverless the memory layer is nearly always cold. Seven days, per the
 * roadmap's market check v2. The shared layer is best-effort: if it is down,
 * a check costs what it always did, and never fails because of the cache.
 *
 * A band with no comparables is never kept. It is often a search that
 * missed, and the next check should look again.
 */

const TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_ENTRIES = 500;

interface Entry {
  band: PriceBand;
  storedAt: number;
}

/** Where the shared layer lives. A seam so tests need no database. */
export interface SharedCache {
  get(key: string): Promise<Entry | null>;
  set(key: string, band: PriceBand): Promise<void>;
}

const supabaseCache: SharedCache = {
  async get(key) {
    const { data, error } = await serviceClient()
      .from("valuation_cache")
      .select("band, stored_at")
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as { band: PriceBand; stored_at: string };
    return { band: row.band, storedAt: Date.parse(row.stored_at) };
  },
  async set(key, band) {
    const { error } = await serviceClient()
      .from("valuation_cache")
      .upsert({ key, band, stored_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  },
};

let shared: SharedCache | null = supabaseCache;

/** Test seam: a stand-in for the table, or null for memory only. */
export function useSharedCache(cache: SharedCache | null): void {
  shared = cache;
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

const fresh = (entry: Entry) => Date.now() - entry.storedAt <= TTL_MS;

function remember(key: string, entry: Entry): void {
  if (store.size >= MAX_ENTRIES) {
    // Cheapest possible eviction: drop the oldest insertion.
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  store.set(key, entry);
}

export async function readCache(item: ValuationItem, platform: Platform, market: Market): Promise<PriceBand | null> {
  const key = cacheKey(item, platform, market);
  const local = store.get(key);
  if (local && fresh(local)) return local.band;
  if (local) store.delete(key);

  if (!shared) return null;
  try {
    const entry = await shared.get(key);
    if (!entry || !fresh(entry)) return null;
    remember(key, entry);
    return entry.band;
  } catch (err) {
    console.error(`valuation cache read failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function writeCache(item: ValuationItem, platform: Platform, market: Market, band: PriceBand): Promise<void> {
  if (band.comparables.length === 0) return;
  const key = cacheKey(item, platform, market);
  remember(key, { band, storedAt: Date.now() });
  if (!shared) return;
  try {
    await shared.set(key, band);
  } catch (err) {
    console.error(`valuation cache write failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Test seam: empties this process's memory (the shared layer is left alone). */
export function clearCache(): void {
  store.clear();
}
