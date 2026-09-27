import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceClient: () => ({ rpc }) }));

const { claimFor, PurchaseForAnotherAccount, PurchaseRejected, recordTransaction, toVerified, verifyTransaction } = await import("./purchases");

/** An unsigned JWS carrying `payload`, for the checks that run before the signature's. */
function unsigned(payload: object): string {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${part({ alg: "ES256" })}.${part(payload)}.c2ln`;
}

const decoded = {
  transactionId: "2000000111",
  originalTransactionId: "2000000100",
  productId: "com.jadaross.bower.plus.monthly",
  purchaseDate: Date.UTC(2026, 8, 25, 12),
  expiresDate: Date.UTC(2026, 9, 25, 12),
  appAccountToken: "6F1D2C3B-0000-4000-8000-000000000001",
  environment: "Sandbox",
  bundleId: "com.jadaross.bower",
};

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: "user-1", error: null });
});

describe("verifyTransaction", () => {
  it("rejects something that is not a signed transaction", async () => {
    await expect(verifyTransaction("not a jws")).rejects.toBeInstanceOf(PurchaseRejected);
  });

  // Xcode's local StoreKit testing signs with a certificate of its own, and
  // Apple's library skips the signature check for it entirely. Accepting it
  // would let anyone mint a purchase.
  it("never accepts a transaction from Xcode's local testing", async () => {
    await expect(verifyTransaction(unsigned({ ...decoded, environment: "Xcode" }))).rejects.toThrow(/environment/);
    await expect(verifyTransaction(unsigned({ ...decoded, environment: "LocalTesting" }))).rejects.toThrow(/environment/);
  });

  it("rejects a sandbox transaction whose signature does not verify", async () => {
    await expect(verifyTransaction(unsigned(decoded))).rejects.toBeInstanceOf(PurchaseRejected);
  });
});

describe("toVerified", () => {
  it("turns Apple's milliseconds into dates and names the product", () => {
    expect(toVerified(decoded, "jws")).toEqual({
      transactionId: "2000000111",
      originalTransactionId: "2000000100",
      productId: "com.jadaross.bower.plus.monthly",
      kind: "plus",
      environment: "Sandbox",
      purchasedAt: "2026-09-25T12:00:00.000Z",
      expiresAt: "2026-10-25T12:00:00.000Z",
      revokedAt: null,
      appAccountToken: "6f1d2c3b-0000-4000-8000-000000000001",
      signed: "jws",
    });
  });

  it("carries a refund's revocation date", () => {
    const v = toVerified({ ...decoded, revocationDate: Date.UTC(2026, 8, 26) }, "jws");
    expect(v.revokedAt).toBe("2026-09-26T00:00:00.000Z");
  });

  it("refuses a product bower does not sell", () => {
    expect(() => toVerified({ ...decoded, productId: "com.someone.else" }, "jws")).toThrow(PurchaseRejected);
  });

  it("refuses another app's transaction", () => {
    expect(() => toVerified({ ...decoded, bundleId: "com.someone.else" }, "jws")).toThrow(PurchaseRejected);
  });
});

describe("claimFor", () => {
  const tx = toVerified(decoded, "jws");

  it("accepts a transaction bought by the caller, whatever the UUID's case", () => {
    expect(() => claimFor(tx, "6f1d2c3b-0000-4000-8000-000000000001")).not.toThrow();
  });

  it("refuses a transaction bought from another bower account", () => {
    expect(() => claimFor(tx, "someone-else")).toThrow(PurchaseForAnotherAccount);
  });

  // A purchase made outside the app (an offer code, say) carries no token.
  it("accepts a transaction with no account token for whoever sends it", () => {
    expect(() => claimFor({ ...tx, appAccountToken: null }, "anyone")).not.toThrow();
  });
});

describe("recordTransaction", () => {
  it("applies the transaction in one SQL call and returns the account", async () => {
    const tx = toVerified(decoded, "jws");
    expect(await recordTransaction(tx, "user-1")).toBe("user-1");
    expect(rpc).toHaveBeenCalledWith("apply_transaction", {
      p_user_id: "user-1",
      p_transaction_id: "2000000111",
      p_original_transaction_id: "2000000100",
      p_product_id: "com.jadaross.bower.plus.monthly",
      p_kind: "plus",
      p_environment: "Sandbox",
      p_purchased_at: "2026-09-25T12:00:00.000Z",
      p_expires_at: "2026-10-25T12:00:00.000Z",
      p_revoked_at: null,
      p_signed: "jws",
    });
  });

  it("throws when the database call fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection reset" } });
    await expect(recordTransaction(toVerified(decoded, "jws"), "user-1")).rejects.toThrow(/connection reset/);
  });
});
