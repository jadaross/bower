import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PriceBand, ValuationItem } from "@/lib/types";
import { clearCache, readCache, useSharedCache, writeCache, type SharedCache } from "./cache";

const item: ValuationItem = { brand: "Carhartt", clothing_type: "Detroit jacket", size: "M", condition: "Good" };

const band: PriceBand = {
  low: 50,
  high: 80,
  currency: "GBP",
  confidence: "medium",
  sell_likelihood: "medium",
  comparables: [{ title: "comp", price: 60, currency: "GBP", platform: "vinted" }],
  reasoning: "Listed at £50–£80.",
};

/** The table, as a map, with the time each row was stored. */
function fakeShared(): SharedCache & { rows: Map<string, { band: PriceBand; storedAt: number }> } {
  const rows = new Map<string, { band: PriceBand; storedAt: number }>();
  return {
    rows,
    get: vi.fn(async (key: string) => rows.get(key) ?? null),
    set: vi.fn(async (key: string, b: PriceBand) => {
      rows.set(key, { band: b, storedAt: Date.now() });
    }),
  };
}

let shared: ReturnType<typeof fakeShared>;

beforeEach(() => {
  clearCache();
  shared = fakeShared();
  useSharedCache(shared);
});

describe("the shared comparables cache", () => {
  // Every Vercel instance starts cold; the table is what they share.
  it("answers from the shared table when this process has never seen the item", async () => {
    await writeCache(item, "vinted", "GB", band);
    clearCache(); // a new instance
    expect(await readCache(item, "vinted", "GB")).toEqual(band);
  });

  it("writes to the shared table", async () => {
    await writeCache(item, "vinted", "GB", band);
    expect(shared.set).toHaveBeenCalledTimes(1);
  });

  it("forgets an answer after 7 days", async () => {
    await writeCache(item, "vinted", "GB", band);
    clearCache();
    const key = [...shared.rows.keys()][0];
    shared.rows.set(key, { band, storedAt: Date.now() - 8 * 864e5 });
    expect(await readCache(item, "vinted", "GB")).toBeNull();
  });

  // No listings is often a search that missed; the next check should look again.
  it("never keeps a band with no comparables", async () => {
    await writeCache(item, "vinted", "GB", { ...band, comparables: [] });
    expect(shared.set).not.toHaveBeenCalled();
    expect(await readCache(item, "vinted", "GB")).toBeNull();
  });

  it("keeps markets apart", async () => {
    await writeCache(item, "vinted", "GB", band);
    clearCache();
    expect(await readCache(item, "vinted", "AU")).toBeNull();
  });

  // Best-effort: a cache that is down means a check that costs what it
  // always did, never a check that fails.
  it("carries on without the table when it is unreachable", async () => {
    useSharedCache({
      get: async () => {
        throw new Error("connection reset");
      },
      set: async () => {
        throw new Error("connection reset");
      },
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(writeCache(item, "vinted", "GB", band)).resolves.toBeUndefined();
    clearCache();
    expect(await readCache(item, "vinted", "GB")).toBeNull();
    error.mockRestore();
  });
});
