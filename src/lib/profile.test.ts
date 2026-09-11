import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A minimal stand-in for the PostgREST query builder — enough of the chain
 * that the module under test can drive it, and no more.
 */
const single = vi.fn();
const eq = vi.fn(() => ({ select: () => ({ single }) }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select: () => ({ single }), update }));
const userClient = vi.fn(() => ({ from }));
vi.mock("@/lib/supabase", () => ({ userClient }));

const {
  getEnabledPlatforms,
  getProfile,
  InvalidPlatformSet,
  setEnabledPlatforms,
  validatePlatformSet,
} = await import("./profile");

const row = {
  enabled_platforms: ["vinted", "depop"],
  preferred_platform: "depop",
  reads_used: 4,
  reads_limit: 20,
  searches_used: 1,
  searches_limit: 3,
  allowance_period_start: "2026-08-01T00:00:00+00:00",
};

beforeEach(() => {
  single.mockReset();
  userClient.mockClear();
  update.mockClear();
  eq.mockClear();
  single.mockResolvedValue({ data: row, error: null });
});

describe("getProfile", () => {
  it("returns the caller's platforms and meter", async () => {
    expect(await getProfile("token-abc")).toEqual({
      enabledPlatforms: ["vinted", "depop"],
      preferredPlatform: "depop",
      sellerNotes: [],
      allowance: { used: 4, limit: 20, resetsAt: "2026-09-01T00:00:00.000Z" },
      searches: { used: 1, limit: 3, resetsAt: "2026-09-01T00:00:00.000Z" },
    });
  });

  // RLS is what stops one user reading another's row, and it only applies if
  // the query actually runs as that user.
  it("queries as the caller, not as the service role", async () => {
    await getProfile("token-abc");
    expect(userClient).toHaveBeenCalledWith("token-abc");
  });

  it("rolls the reset date over a year boundary", async () => {
    single.mockResolvedValue({
      data: { ...row, allowance_period_start: "2026-12-01T00:00:00+00:00" },
      error: null,
    });
    expect((await getProfile("t")).allowance.resetsAt).toBe("2027-01-01T00:00:00.000Z");
  });

  it("throws when the row cannot be read", async () => {
    single.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(getProfile("t")).rejects.toThrow(/permission denied/);
  });
});

describe("getEnabledPlatforms", () => {
  it("returns just the platform set", async () => {
    expect(await getEnabledPlatforms("t")).toEqual(["vinted", "depop"]);
  });
});

describe("validatePlatformSet", () => {
  it("accepts a known platform", () => {
    expect(validatePlatformSet(["vinted"])).toEqual(["vinted"]);
  });

  it("orders the set by the platform registry, not by the client", () => {
    expect(validatePlatformSet(["ebay", "vinted"])).toEqual(["vinted", "ebay"]);
  });

  it("deduplicates", () => {
    expect(validatePlatformSet(["vinted", "vinted"])).toEqual(["vinted"]);
  });

  it("rejects an empty set — at least one platform must stay enabled", () => {
    expect(() => validatePlatformSet([])).toThrow(InvalidPlatformSet);
  });

  it("rejects a non-array", () => {
    expect(() => validatePlatformSet("vinted")).toThrow(InvalidPlatformSet);
  });

  it("rejects a platform bower does not write for", () => {
    expect(() => validatePlatformSet(["grailed"])).toThrow(/Unknown platform: grailed/);
  });
});

describe("setEnabledPlatforms", () => {
  it("returns the profile as stored", async () => {
    expect(await setEnabledPlatforms("t", "user-1", ["vinted", "depop"])).toMatchObject({
      enabledPlatforms: ["vinted", "depop"],
    });
  });

  it("writes the platform set and a valid preference — never the meter", async () => {
    await setEnabledPlatforms("t", "user-1", ["vinted"]);
    // The stored preference was depop, which is no longer enabled, so the
    // preference moves to the first enabled platform in the same statement.
    expect(update).toHaveBeenCalledWith({
      enabled_platforms: ["vinted"],
      preferred_platform: "vinted",
    });
  });

  it("keeps the stored preference when it is still enabled", async () => {
    await setEnabledPlatforms("t", "user-1", ["vinted", "depop"]);
    expect(update).toHaveBeenCalledWith({
      enabled_platforms: ["vinted", "depop"],
      preferred_platform: "depop",
    });
  });

  it("takes a named preference when it is in the new set", async () => {
    await setEnabledPlatforms("t", "user-1", ["vinted", "ebay"], "ebay");
    expect(update).toHaveBeenCalledWith({
      enabled_platforms: ["vinted", "ebay"],
      preferred_platform: "ebay",
    });
  });

  it("narrows the update to the caller's own row", async () => {
    await setEnabledPlatforms("t", "user-1", ["vinted"]);
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("throws when the write is refused", async () => {
    single.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(setEnabledPlatforms("t", "user-1", ["vinted"])).rejects.toThrow(/permission denied/);
  });
});
