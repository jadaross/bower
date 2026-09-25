import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyNotification = vi.fn();
const verifyTransaction = vi.fn();
const recordTransaction = vi.fn();
vi.mock("@/lib/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/purchases")>()),
  verifyNotification,
  verifyTransaction,
  recordTransaction,
}));

const { PurchaseRejected } = await import("@/lib/purchases");
const { POST } = await import("./route");

const tx = { transactionId: "2000000222", appAccountToken: "user-1", kind: "plus" };

function post(body: unknown) {
  return new Request("http://localhost/api/apple/notifications", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  verifyNotification.mockReset().mockResolvedValue({
    notificationType: "DID_RENEW",
    data: { signedTransactionInfo: "signed-tx" },
  });
  verifyTransaction.mockReset().mockResolvedValue(tx);
  recordTransaction.mockReset().mockResolvedValue("user-1");
});

describe("POST /api/apple/notifications", () => {
  it("verifies the notification and the transaction inside it, then records it", async () => {
    const res = await POST(post({ signedPayload: "payload" }));
    expect(res.status).toBe(200);
    expect(verifyNotification).toHaveBeenCalledWith("payload");
    expect(verifyTransaction).toHaveBeenCalledWith("signed-tx");
    expect(recordTransaction).toHaveBeenCalledWith(tx, "user-1");
  });

  it("refuses a payload that does not verify, and records nothing", async () => {
    verifyNotification.mockRejectedValue(new PurchaseRejected("did not verify"));
    expect((await POST(post({ signedPayload: "forged" }))).status).toBe(400);
    expect(recordTransaction).not.toHaveBeenCalled();
  });

  it("answers Apple's test notification", async () => {
    verifyNotification.mockResolvedValue({ notificationType: "TEST", data: {} });
    expect((await POST(post({ signedPayload: "payload" }))).status).toBe(200);
    expect(recordTransaction).not.toHaveBeenCalled();
  });

  // A retry cannot fix an account bower never saw, so Apple is told it landed.
  it("still answers 200 when the transaction matches no account", async () => {
    recordTransaction.mockResolvedValue(null);
    expect((await POST(post({ signedPayload: "payload" }))).status).toBe(200);
  });

  it("answers 500 so Apple retries when the database fails", async () => {
    recordTransaction.mockRejectedValue(new Error("connection reset"));
    expect((await POST(post({ signedPayload: "payload" }))).status).toBe(500);
  });

  it("refuses a body with no signedPayload", async () => {
    expect((await POST(post({}))).status).toBe(400);
  });
});
