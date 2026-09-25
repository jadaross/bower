import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async () => (await import("@/test/auth-mock")).authMock());

const verifyTransaction = vi.fn();
const recordTransaction = vi.fn();
vi.mock("@/lib/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/purchases")>()),
  verifyTransaction,
  recordTransaction,
}));

const getProfile = vi.fn();
vi.mock("@/lib/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/profile")>()),
  getProfile,
}));

const { authState, resetAuthState } = await import("@/test/auth-mock");
const { PurchaseRejected } = await import("@/lib/purchases");
const { POST } = await import("./route");

const tx = {
  transactionId: "2000000111",
  originalTransactionId: "2000000111",
  productId: "com.jadaross.bower.pack.10",
  kind: "pack",
  environment: "Sandbox",
  purchasedAt: "2026-09-25T12:00:00.000Z",
  expiresAt: null,
  revokedAt: null,
  appAccountToken: "test-user-id",
  signed: "jws",
};

const profile = {
  market: "GB",
  enabledPlatforms: ["vinted"],
  preferredPlatform: "vinted",
  sellerNotes: [],
  firstName: null,
  lastName: null,
  allowance: { used: 10, limit: 10, resetsAt: "2026-10-01T00:00:00.000Z" },
  searches: { used: 0, limit: 3, resetsAt: "2026-10-01T00:00:00.000Z" },
  plan: "free",
  plusExpiresAt: null,
  packListings: 10,
};

function post(body: unknown) {
  return new Request("http://localhost/api/purchases", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetAuthState();
  verifyTransaction.mockReset().mockResolvedValue(tx);
  recordTransaction.mockReset().mockResolvedValue("test-user-id");
  getProfile.mockReset().mockResolvedValue(profile);
});

describe("POST /api/purchases", () => {
  it("records a verified purchase and answers with the profile", async () => {
    const res = await POST(post({ transaction: "jws" }));
    expect(res.status).toBe(200);
    expect(recordTransaction).toHaveBeenCalledWith(tx, "test-user-id");
    expect(await res.json()).toMatchObject({ pack_listings: 10, plan: "free" });
  });

  it("needs a signed-in caller", async () => {
    authState.userId = null;
    expect((await POST(post({ transaction: "jws" }))).status).toBe(401);
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("refuses a body without a transaction", async () => {
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post("{"))).status).toBe(400);
  });

  it("refuses a transaction that does not verify, and records nothing", async () => {
    verifyTransaction.mockRejectedValue(new PurchaseRejected("That transaction did not verify"));
    const res = await POST(post({ transaction: "forged" }));
    expect(res.status).toBe(422);
    expect(recordTransaction).not.toHaveBeenCalled();
  });

  it("refuses a purchase made from another bower account", async () => {
    verifyTransaction.mockResolvedValue({ ...tx, appAccountToken: "someone-else" });
    expect((await POST(post({ transaction: "jws" }))).status).toBe(422);
    expect(recordTransaction).not.toHaveBeenCalled();
  });

  it("says so when the transaction was already recorded against another account", async () => {
    recordTransaction.mockResolvedValue("someone-else");
    const res = await POST(post({ transaction: "jws" }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("purchase_elsewhere");
  });
});
