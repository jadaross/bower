import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async () => (await import("@/test/auth-mock")).authMock());

const valuate = vi.fn();
const recommend = vi.fn();
vi.mock("@/lib/valuation", () => ({ valuate, recommend }));

const getEnabledPlatforms = vi.fn();
vi.mock("@/lib/profile", () => ({ getEnabledPlatforms }));

const spendAllowance = vi.fn();
const refundAllowance = vi.fn();
vi.mock("@/lib/allowance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/allowance")>()),
  spendAllowance,
  refundAllowance,
}));

const { authState, resetAuthState } = await import("@/test/auth-mock");
const { POST } = await import("./route");

const item = {
  brand: "Carhartt",
  clothing_type: "Detroit jacket",
  size: "M",
  condition: "Good",
};

const valuation = {
  perPlatform: {
    vinted: {
      low: 55,
      high: 85,
      currency: "GBP",
      confidence: "high",
      sell_likelihood: "high",
      comparables: [],
      reasoning: "Listed at £55–£85.",
    },
  },
  query: "Carhartt Detroit jacket size M",
};

const allowance = { allowed: true, used: 3, limit: 20, resetsAt: "2026-09-01T00:00:00+00:00" };

function post(body: unknown, raw?: string) {
  return new Request("http://localhost/api/valuate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  resetAuthState();
  valuate.mockReset();
  recommend.mockReset();
  getEnabledPlatforms.mockReset();
  spendAllowance.mockReset();
  refundAllowance.mockReset();
  valuate.mockResolvedValue(valuation);
  recommend.mockReturnValue(null);
  getEnabledPlatforms.mockResolvedValue(["vinted"]);
  spendAllowance.mockResolvedValue(allowance);
  refundAllowance.mockResolvedValue(undefined);
});

describe("POST /api/valuate", () => {
  it("returns the valuation", async () => {
    const res = await POST(post({ item }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ...valuation, recommendation: null });
  });

  it("returns a null recommendation for a single platform", async () => {
    expect((await (await POST(post({ item }))).json()).recommendation).toBeNull();
  });

  it("includes the recommendation when there is one", async () => {
    const rec = { platform: "depop", listAt: 70, net: 63, currency: "GBP", reasoning: "x", runnersUp: [] };
    recommend.mockReturnValue(rec);
    getEnabledPlatforms.mockResolvedValue(["vinted", "depop"]);
    expect((await (await POST(post({ item }))).json()).recommendation).toEqual(rec);
  });

  it("401s without authentication", async () => {
    authState.userId = null;
    const res = await POST(post({ item }));
    expect(res.status).toBe(401);
    expect(valuate).not.toHaveBeenCalled();
  });

  it("400s on unparsable JSON", async () => {
    expect((await POST(post(null, "{"))).status).toBe(400);
  });

  it("400s when the item is missing", async () => {
    expect((await POST(post({}))).status).toBe(400);
  });

  it("400s when the item lacks a size", async () => {
    const { size: _omitted, ...partial } = item;
    expect((await POST(post({ item: partial }))).status).toBe(400);
  });

  it("500s when valuation throws", async () => {
    valuate.mockRejectedValue(new Error("search is down"));
    const res = await POST(post({ item }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/search is down/);
  });
});

// #10 — the platform set is the user's, not the request's.
describe("enabled platforms", () => {
  it("values the caller's Enabled Platforms", async () => {
    getEnabledPlatforms.mockResolvedValue(["vinted", "depop"]);
    await POST(post({ item }));
    expect(valuate).toHaveBeenCalledWith(item, ["vinted", "depop"]);
  });

  it("reads them for the authenticated caller", async () => {
    await POST(post({ item }));
    expect(getEnabledPlatforms).toHaveBeenCalledWith("test-access-token");
  });

  it("ignores a platform list supplied by the client", async () => {
    getEnabledPlatforms.mockResolvedValue(["vinted"]);
    await POST(post({ item, platforms: ["vinted", "depop", "ebay"] }));
    expect(valuate).toHaveBeenCalledWith(item, ["vinted"]);
  });

  it("400s when the user has no platforms enabled", async () => {
    getEnabledPlatforms.mockResolvedValue([]);
    const res = await POST(post({ item }));
    expect(res.status).toBe(400);
    expect(valuate).not.toHaveBeenCalled();
  });

  it("500s when the profile cannot be read", async () => {
    getEnabledPlatforms.mockRejectedValue(new Error("profile unreachable"));
    expect((await POST(post({ item }))).status).toBe(500);
  });
});

// #9 — the meter.
describe("the Allowance meter", () => {
  it("spends a unit for the authenticated caller", async () => {
    await POST(post({ item }));
    expect(spendAllowance).toHaveBeenCalledWith("test-user-id", "search");
  });

  it("reports the remaining Allowance alongside the valuation", async () => {
    const body = await (await POST(post({ item }))).json();
    expect(body.searches).toEqual({ used: 3, limit: 20, resets_at: "2026-09-01T00:00:00+00:00" });
  });

  it("402s with the reset time when the Allowance is exhausted", async () => {
    spendAllowance.mockResolvedValue({ ...allowance, allowed: false, used: 20 });
    const res = await POST(post({ item }));
    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({
      code: "allowance_exhausted",
      kind: "search",
      allowance: { used: 20, limit: 20, resets_at: "2026-09-01T00:00:00+00:00" },
    });
  });

  it("does not value anything once the Allowance is exhausted", async () => {
    spendAllowance.mockResolvedValue({ ...allowance, allowed: false });
    await POST(post({ item }));
    expect(valuate).not.toHaveBeenCalled();
  });

  it("spends before valuing, so concurrent callers cannot share a unit", async () => {
    const order: string[] = [];
    spendAllowance.mockImplementation(async () => {
      order.push("spend");
      return allowance;
    });
    valuate.mockImplementation(async () => {
      order.push("valuate");
      return valuation;
    });
    await POST(post({ item }));
    expect(order).toEqual(["spend", "valuate"]);
  });

  it("refunds the unit when the valuation fails", async () => {
    valuate.mockRejectedValue(new Error("search is down"));
    await POST(post({ item }));
    expect(refundAllowance).toHaveBeenCalledWith("test-user-id", "search");
  });

  it("does not refund when the valuation succeeds", async () => {
    await POST(post({ item }));
    expect(refundAllowance).not.toHaveBeenCalled();
  });

  it("does not spend when validation fails", async () => {
    await POST(post({}));
    expect(spendAllowance).not.toHaveBeenCalled();
  });

  it("does not spend for an unauthenticated caller", async () => {
    authState.userId = null;
    await POST(post({ item }));
    expect(spendAllowance).not.toHaveBeenCalled();
  });

  it("500s rather than 402s when the meter itself is broken", async () => {
    spendAllowance.mockRejectedValue(new Error("No profile for user test-user-id"));
    const res = await POST(post({ item }));
    expect(res.status).toBe(500);
  });
});
