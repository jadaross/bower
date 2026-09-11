import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ serviceClient: () => ({ rpc }) }));

const { allowanceExhausted, refundAllowance, spendAllowance } = await import("./allowance");

/** `spend_allowance` returns rows, `refund_allowance` returns none. */
function returning(data: unknown, error: unknown = null) {
  return Promise.resolve({ data, error });
}

const spent = {
  allowed: true,
  allowance_used: 3,
  allowance_limit: 20,
  resets_at: "2026-09-01T00:00:00+00:00",
};

beforeEach(() => {
  rpc.mockReset();
  rpc.mockReturnValue(returning([spent]));
});

describe("spendAllowance", () => {
  it("reports a spent unit and the state after it", async () => {
    expect(await spendAllowance("user-1", "read")).toEqual({
      allowed: true,
      used: 3,
      limit: 20,
      resetsAt: "2026-09-01T00:00:00+00:00",
    });
  });

  it("spends against the user it was given", async () => {
    await spendAllowance("user-1", "read");
    expect(rpc).toHaveBeenCalledWith("spend_allowance", { p_user_id: "user-1", p_kind: "read" });
  });

  it("reports an exhausted Allowance without throwing", async () => {
    rpc.mockReturnValue(returning([{ ...spent, allowed: false, allowance_used: 20 }]));
    const result = await spendAllowance("user-1", "read");
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(20);
  });

  it("carries the reset time through, since the client has to explain it", async () => {
    rpc.mockReturnValue(returning([{ ...spent, allowed: false }]));
    expect((await spendAllowance("user-1", "read")).resetsAt).toBe("2026-09-01T00:00:00+00:00");
  });

  it("throws when the database call fails", async () => {
    rpc.mockReturnValue(returning(null, { message: "connection reset" }));
    await expect(spendAllowance("user-1", "read")).rejects.toThrow(/connection reset/);
  });

  // A missing profile is a broken invariant, not an exhausted Allowance —
  // reporting it as 402 would tell the user to wait for a reset that will
  // never fix anything.
  it("throws rather than reporting exhaustion when the user has no profile", async () => {
    rpc.mockReturnValue(returning([]));
    await expect(spendAllowance("ghost", "read")).rejects.toThrow(/No profile/);
  });
});

describe("refundAllowance", () => {
  it("refunds against the user it was given", async () => {
    rpc.mockResolvedValue({ error: null });
    await refundAllowance("user-1", "search");
    expect(rpc).toHaveBeenCalledWith("refund_allowance", { p_user_id: "user-1", p_kind: "search" });
  });

  // The caller is already returning an error to the client; a failed refund
  // must not become a second, different error on top of it.
  it("swallows a refund failure rather than masking the original error", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { message: "nope" } });
    await expect(refundAllowance("user-1", "search")).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});

describe("allowanceExhausted", () => {
  it("is a 402 carrying the reset time", async () => {
    const res = allowanceExhausted({ used: 20, limit: 20, resetsAt: "2026-09-01T00:00:00+00:00" }, "read");
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({
      error: expect.any(String),
      code: "allowance_exhausted",
      kind: "read",
      allowance: { used: 20, limit: 20, resets_at: "2026-09-01T00:00:00+00:00" },
    });
  });
});
