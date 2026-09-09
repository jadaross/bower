import { beforeEach, describe, expect, it, vi } from "vitest";
import { listing } from "@/test/fixtures";

// Minimal PostgREST query-builder stand-in, enough for the history module.
const limit = vi.fn(() => Promise.resolve({ data: [{ id: "h1", title: "Jacket" }], error: null }));
const order = vi.fn(() => ({ limit }));
const select = vi.fn(() => ({ order }));
const insert = vi.fn(() => Promise.resolve({ error: null }));
const eqUpdate = vi.fn(() => Promise.resolve({ error: null }));
const update = vi.fn(() => ({ eq: eqUpdate }));
const from = vi.fn(() => ({ select, insert, update }));
const userClient = vi.fn(() => ({ from }));
vi.mock("@/lib/supabase", () => ({ userClient }));

const { recordItem, recordValuation, listHistory } = await import("./history");

beforeEach(() => {
  [limit, order, select, insert, eqUpdate, update, from, userClient].forEach((m) => m.mockClear());
});

describe("recordItem", () => {
  it("inserts the listing essentials as the caller, tagged with the session", async () => {
    await recordItem("token-abc", { userId: "u-1", sessionId: "sess-1", listing, preferredPlatform: "vinted" });
    expect(userClient).toHaveBeenCalledWith("token-abc");
    expect(from).toHaveBeenCalledWith("item_history");
    const row = insert.mock.calls.at(-1)![0];
    expect(row).toMatchObject({
      user_id: "u-1",
      session_id: "sess-1",
      brand: listing.brand,
      title: listing.title,
      condition: listing.condition,
      preferred_platform: "vinted",
    });
  });

  it("is best-effort — a returned error does not throw", async () => {
    insert.mockResolvedValueOnce({ error: { message: "nope" } });
    await expect(
      recordItem("t", { userId: "u", sessionId: "s", listing, preferredPlatform: "depop" })
    ).resolves.toBeUndefined();
  });
});

describe("recordValuation", () => {
  it("updates the item for this session", async () => {
    await recordValuation("token-abc", "sess-1", { perPlatform: {}, query: "q", recommendation: null });
    expect(update).toHaveBeenCalledWith({ valuation: { perPlatform: {}, query: "q", recommendation: null } });
    expect(eqUpdate).toHaveBeenCalledWith("session_id", "sess-1");
  });

  it("is a no-op without a session id", async () => {
    await recordValuation("token-abc", undefined, { perPlatform: {}, query: "q", recommendation: null });
    expect(userClient).not.toHaveBeenCalled();
  });
});

describe("listHistory", () => {
  it("reads the caller's rows newest first", async () => {
    const rows = await listHistory("token-abc", { limit: 10 });
    expect(userClient).toHaveBeenCalledWith("token-abc");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10);
    expect(rows).toEqual([{ id: "h1", title: "Jacket" }]);
  });
});
