import { describe, expect, it } from "vitest";
import { StreamRejectedError, type StreamRejection } from "./streaming-text";

function source2(): ReadableStream<string | StreamRejection> {
  return new ReadableStream({
    start(c) {
      c.enqueue({ rejected: "explicit" });
      c.close();
    },
  });
}
import { readStringStream, toStringStreamResponse } from "./streaming-text";

function streamOf(chunks: string[]): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

describe("streaming-text", () => {
  it("round-trips a simple string", async () => {
    const res = toStringStreamResponse(streamOf(["hello ", "world"]));
    expect(await readStringStream(res)).toBe("hello world");
  });

  it("sets SSE headers", () => {
    const res = toStringStreamResponse(streamOf(["x"]));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("survives newlines inside a chunk", async () => {
    const res = toStringStreamResponse(streamOf(['{"a":\n1}']));
    expect(await readStringStream(res)).toBe('{"a":\n1}');
  });

  it("survives a chunk that looks like the DONE sentinel", async () => {
    const res = toStringStreamResponse(streamOf(["[DONE]"]));
    expect(await readStringStream(res)).toBe("[DONE]");
  });

  it("reassembles JSON split across many chunks", async () => {
    const payload = JSON.stringify({ listing: { brand: "Carhartt" } });
    const chunks = payload.match(/.{1,3}/g) ?? [];
    const res = toStringStreamResponse(streamOf(chunks));
    expect(JSON.parse(await readStringStream(res))).toEqual({ listing: { brand: "Carhartt" } });
  });

  it("carries a rejection frame through as a typed error", async () => {
    const source = new ReadableStream<string | StreamRejection>({
      start(c) {
        c.enqueue("{\"subject\":\"not_clothing\"");
        c.enqueue({ rejected: "not_clothing" });
        c.close();
      },
    });
    await expect(readStringStream(toStringStreamResponse(source))).rejects.toThrow(StreamRejectedError);
    await expect(readStringStream(toStringStreamResponse(source2()))).rejects.toMatchObject({ reason: "explicit" });
  });

  it("propagates an error thrown inside the source stream", async () => {
    const failing = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("partial");
        controller.error(new Error("upstream exploded"));
      },
    });
    const res = toStringStreamResponse(failing);
    await expect(readStringStream(res)).rejects.toThrow();
  });
});
