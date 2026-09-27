import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Platform, PriceBand, ValuationItem } from "@/lib/types";
import { clearCache, valuate, type ValuationProvider } from "./index";

const item: ValuationItem = {
  brand: "Carhartt",
  clothing_type: "Detroit jacket",
  size: "M",
  condition: "Good",
};

function bandFor(platform: Platform): PriceBand {
  return {
    low: 50,
    high: 80,
    currency: "GBP",
    confidence: "medium",
    sell_likelihood: "medium",
    comparables: [{ title: `${platform} comp`, price: 60, currency: "GBP", platform }],
    reasoning: `Listed at £50–£80 on ${platform}.`,
  };
}

const band = vi.fn();
const provider: ValuationProvider = { band };

beforeEach(() => {
  clearCache();
  band.mockReset();
  band.mockImplementation((_item: ValuationItem, platform: Platform) =>
    Promise.resolve(bandFor(platform))
  );
});

describe("valuate — scope", () => {
  it("values exactly the enabled platforms", async () => {
    const result = await valuate(item, ["vinted", "depop"], "GB", provider);
    expect(Object.keys(result.perPlatform).sort()).toEqual(["depop", "vinted"]);
  });

  it("never looks up a disabled platform", async () => {
    await valuate(item, ["vinted"], "GB", provider);
    const asked = band.mock.calls.map((c) => c[1]);
    expect(asked).toEqual(["vinted"]);
    expect(asked).not.toContain("ebay");
  });

  it("handles a single enabled platform", async () => {
    const result = await valuate(item, ["depop"], "GB", provider);
    expect(Object.keys(result.perPlatform)).toEqual(["depop"]);
    expect(band).toHaveBeenCalledTimes(1);
  });

  it("deduplicates a repeated platform", async () => {
    await valuate(item, ["vinted", "vinted"], "GB", provider);
    expect(band).toHaveBeenCalledTimes(1);
  });

  it("refuses to value with no enabled platforms", async () => {
    await expect(valuate(item, [], "GB", provider)).rejects.toThrow(/no enabled platforms/);
  });

  it("exposes the query it used", async () => {
    const result = await valuate(item, ["vinted"], "GB", provider);
    expect(result.query).toContain("Carhartt");
  });
});

describe("valuate — caching", () => {
  it("does not look the same item up twice", async () => {
    await valuate(item, ["vinted"], "GB", provider);
    await valuate(item, ["vinted"], "GB", provider);
    expect(band).toHaveBeenCalledTimes(1);
  });

  it("keys the cache on brand, type, size and condition", async () => {
    await valuate(item, ["vinted"], "GB", provider);
    await valuate({ ...item, size: "L" }, ["vinted"], "GB", provider);
    expect(band).toHaveBeenCalledTimes(2);
  });

  it("ignores case and padding in the key", async () => {
    await valuate(item, ["vinted"], "GB", provider);
    await valuate({ ...item, brand: "  carhartt " }, ["vinted"], "GB", provider);
    expect(band).toHaveBeenCalledTimes(1);
  });

  it("caches per platform, not per item", async () => {
    await valuate(item, ["vinted"], "GB", provider);
    await valuate(item, ["vinted", "depop"], "GB", provider);
    expect(band.mock.calls.map((c) => c[1])).toEqual(["vinted", "depop"]);
  });
});

describe("valuate — failure", () => {
  it("returns a partial answer when one platform fails", async () => {
    band.mockImplementation((_i: ValuationItem, platform: Platform) =>
      platform === "ebay" ? Promise.reject(new Error("no results")) : Promise.resolve(bandFor(platform))
    );
    const result = await valuate(item, ["vinted", "ebay"], "GB", provider);
    expect(Object.keys(result.perPlatform)).toEqual(["vinted"]);
  });

  it("throws when every platform fails", async () => {
    band.mockRejectedValue(new Error("search is down"));
    await expect(valuate(item, ["vinted", "depop"], "GB", provider)).rejects.toThrow(/every platform/);
  });

  it("does not cache a failed lookup", async () => {
    band.mockRejectedValueOnce(new Error("transient"));
    await expect(valuate(item, ["vinted"], "GB", provider)).rejects.toThrow();
    await valuate(item, ["vinted"], "GB", provider);
    expect(band).toHaveBeenCalledTimes(2);
  });
});

// ADR-0005: a Price Band exists only with Comparables. The benchmark (#78)
// found 22% of bands resting on none; those are "no listings found", not a range.
describe("valuate — no listings", () => {
  it("reports a platform whose band has no comparables as no listings, not a band", async () => {
    band.mockImplementation((_item: ValuationItem, platform: Platform) =>
      Promise.resolve(platform === "depop" ? { ...bandFor(platform), comparables: [] } : bandFor(platform))
    );
    const result = await valuate(item, ["vinted", "depop"], "GB", provider);
    expect(Object.keys(result.perPlatform)).toEqual(["vinted"]);
    expect(result.noListings).toEqual(["depop"]);
  });

  it("says so for every platform when none found any", async () => {
    band.mockImplementation((_item: ValuationItem, platform: Platform) =>
      Promise.resolve({ ...bandFor(platform), comparables: [] })
    );
    const result = await valuate(item, ["vinted", "depop"], "GB", provider);
    expect(result.perPlatform).toEqual({});
    expect(result.noListings).toEqual(["vinted", "depop"]);
  });

  it("lists nothing when every platform found listings", async () => {
    expect((await valuate(item, ["vinted", "depop"], "GB", provider)).noListings).toEqual([]);
  });
});

describe("valuate — market", () => {
  it("passes the market to the provider", async () => {
    await valuate(item, ["depop"], "AU", provider);
    expect(band.mock.calls[0][2]).toBe("AU");
  });

  it("does not serve a British band to an Australian seller", async () => {
    await valuate(item, ["depop"], "GB", provider);
    await valuate(item, ["depop"], "AU", provider);
    expect(band).toHaveBeenCalledTimes(2);
  });
});
