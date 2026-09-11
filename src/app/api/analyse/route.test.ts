import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async () => (await import("@/test/auth-mock")).authMock());
import { analysisResult } from "@/test/fixtures";
import { readStringStream, StreamRejectedError } from "@/lib/streaming-text";

const analyseListingStream = vi.fn();
vi.mock("@/lib/llm/analyse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/llm/analyse")>()),
  analyseListingStream,
}));
const { AnalyseRejected } = await import("@/lib/llm/analyse");

const spendAllowance = vi.fn();
const refundAllowance = vi.fn();
vi.mock("@/lib/allowance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/allowance")>()),
  spendAllowance,
  refundAllowance,
}));

const { authState, resetAuthState } = await import("@/test/auth-mock");
const { POST } = await import("./route");

const PHOTO = "data:image/jpeg;base64,AAAA";

function post(body: unknown, raw?: string) {
  return new Request("http://localhost/api/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

function streamOf(text: string): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

function failingStream(): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue("{");
      controller.error(new Error("model fell over"));
    },
  });
}

beforeEach(() => {
  resetAuthState();
  analyseListingStream.mockReset();
  analyseListingStream.mockReturnValue(streamOf(JSON.stringify(analysisResult)));
  spendAllowance.mockReset();
  refundAllowance.mockReset();
  spendAllowance.mockResolvedValue({ allowed: true, used: 3, limit: 40, resetsAt: "2026-10-01T00:00:00+00:00" });
  refundAllowance.mockResolvedValue(undefined);
});

describe("POST /api/analyse — the meter", () => {
  it("reserves one unit before the model is called", async () => {
    await POST(post({ images: [PHOTO], tone: "casual" }));
    expect(spendAllowance).toHaveBeenCalledWith("test-user-id", "read");
    expect(spendAllowance.mock.invocationCallOrder[0]).toBeLessThan(
      analyseListingStream.mock.invocationCallOrder[0]
    );
  });

  it("402s with the meter's numbers when the Allowance is used up", async () => {
    spendAllowance.mockResolvedValue({ allowed: false, used: 40, limit: 40, resetsAt: "2026-10-01T00:00:00+00:00" });
    const res = await POST(post({ images: [PHOTO], tone: "casual" }));
    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ code: "allowance_exhausted", allowance: { used: 40, limit: 40 } });
    expect(analyseListingStream).not.toHaveBeenCalled();
  });

  it("costs nothing when the request is invalid", async () => {
    await POST(post({ images: [], tone: "casual" }));
    await POST(post(null, "{"));
    expect(spendAllowance).not.toHaveBeenCalled();
  });

  it("refunds the unit when the stream fails part-way", async () => {
    analyseListingStream.mockReturnValue(failingStream());
    const res = await POST(post({ images: [PHOTO], tone: "casual" }));
    await expect(readStringStream(res)).rejects.toThrow();
    expect(refundAllowance).toHaveBeenCalledWith("test-user-id", "read");
  });

  it("refunds a rejected read and tells the client why", async () => {
    analyseListingStream.mockReturnValue(
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue('{"subject": "explicit"');
          controller.error(new AnalyseRejected("explicit"));
        },
      })
    );
    const res = await POST(post({ images: [PHOTO], tone: "casual" }));
    expect(res.status).toBe(200);
    await expect(readStringStream(res)).rejects.toThrow(StreamRejectedError);
    expect(refundAllowance).toHaveBeenCalledWith("test-user-id", "read");
  });

  it("does not refund a read that completed", async () => {
    const res = await POST(post({ images: [PHOTO], tone: "casual" }));
    await readStringStream(res);
    expect(refundAllowance).not.toHaveBeenCalled();
  });
});

describe("POST /api/analyse", () => {
  it("streams the analysis back as SSE", async () => {
    const res = await POST(post({ images: [PHOTO], tone: "casual" }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(JSON.parse(await readStringStream(res))).toEqual(analysisResult);
  });

  it("defaults the tone to casual", async () => {
    await POST(post({ images: [PHOTO] }));
    expect(analyseListingStream).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "casual" })
    );
  });

  it("forwards the platform when one is given", async () => {
    await POST(post({ images: [PHOTO], tone: "casual", platform: "depop" }));
    expect(analyseListingStream).toHaveBeenCalledWith(
      expect.objectContaining({ platform: "depop" })
    );
  });

  it("400s on unparsable JSON", async () => {
    expect((await POST(post(null, "nope"))).status).toBe(400);
  });

  it("400s when images is missing", async () => {
    expect((await POST(post({ tone: "casual" }))).status).toBe(400);
  });

  it("400s on an empty images array", async () => {
    expect((await POST(post({ images: [], tone: "casual" }))).status).toBe(400);
  });

  it("400s above the 5-image ceiling", async () => {
    const res = await POST(post({ images: Array(6).fill(PHOTO), tone: "casual" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Maximum 5/);
  });

  it("accepts exactly 5 images", async () => {
    const res = await POST(post({ images: Array(5).fill(PHOTO), tone: "casual" }));
    expect(res.status).toBe(200);
  });

  it("does not call the model when validation fails", async () => {
    await POST(post({ images: [] }));
    expect(analyseListingStream).not.toHaveBeenCalled();
  });
});

// #8 — every route is behind a bearer token.
describe("authentication", () => {
  it("401s without a bearer token", async () => {
    authState.userId = null;
    const res = await POST(post({ images: [PHOTO], tone: "casual" }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("missing_token");
  });

  it("does not call the model for an unauthenticated request", async () => {
    authState.userId = null;
    await POST(post({ images: [PHOTO], tone: "casual" }));
    expect(analyseListingStream).not.toHaveBeenCalled();
  });
});
