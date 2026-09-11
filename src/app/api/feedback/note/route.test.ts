import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async () => (await import("@/test/auth-mock")).authMock());

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock("@/lib/supabase", () => ({ userClient: vi.fn(() => ({ from })) }));

const recordScore = vi.fn();
vi.mock("@/lib/observability", () => ({ recordScore }));

const { resetAuthState } = await import("@/test/auth-mock");
const { POST } = await import("./route");

function post(body: unknown, raw?: string) {
  return new Request("http://localhost/api/feedback/note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  resetAuthState();
  insert.mockReset();
  insert.mockResolvedValue({ error: null });
  recordScore.mockReset();
});

describe("POST /api/feedback/note", () => {
  it("stores the note as the caller with its context", async () => {
    const res = await POST(
      post({ message: "  price way too low ", screen: "listing", session_id: "s1", platform: "vinted", trace_id: "t1" })
    );
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      user_id: "test-user-id",
      message: "price way too low",
      screen: "listing",
      session_id: "s1",
      platform: "vinted",
      trace_id: "t1",
    });
  });

  it("attaches the note to the listing's trace when there is one", async () => {
    await POST(post({ message: "odd wording", trace_id: "t1" }));
    expect(recordScore).toHaveBeenCalledWith(
      expect.objectContaining({ traceId: "t1", name: "note", comment: "odd wording" })
    );
  });

  it("does not touch Langfuse for a general note", async () => {
    await POST(post({ message: "love it", screen: "settings" }));
    expect(recordScore).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ trace_id: null, platform: null }));
  });

  it("400s on an empty message", async () => {
    expect((await POST(post({ message: "   " }))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("400s on a message over 2000 characters", async () => {
    expect((await POST(post({ message: "x".repeat(2001) }))).status).toBe(400);
  });

  it("ignores an unknown platform rather than failing", async () => {
    await POST(post({ message: "hi", platform: "grailed" }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ platform: null }));
  });

  it("500s when the write is refused", async () => {
    insert.mockResolvedValue({ error: { message: "nope" } });
    expect((await POST(post({ message: "hi" }))).status).toBe(500);
  });
});
