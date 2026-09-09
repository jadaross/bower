/**
 * Streams a string from server to client in chunks.
 *
 * The wire format is server-sent events — each chunk is JSON-stringified so
 * embedded newlines don't break SSE framing, and a `[DONE]` sentinel marks
 * end-of-stream. Both ends of the pipe live in this module so the protocol
 * is described in exactly one place.
 *
 * Producer: pass any `ReadableStream<string>` (e.g. an LLM text stream).
 * Consumer: pass the `fetch` Response; await the full assembled string.
 *
 * Errors thrown inside the input stream propagate as a rejected promise on
 * the consumer side.
 */

const DONE = "[DONE]";
const DATA_PREFIX = "data: ";

/**
 * The one non-text frame: the server stopped the read on purpose and says
 * why. Sent as a JSON object where every other frame is a JSON string, so a
 * consumer can tell them apart by shape. The stream ends after it.
 */
export interface StreamRejection {
  rejected: string;
}

export class StreamRejectedError extends Error {
  constructor(readonly reason: string) {
    super(`Stream rejected: ${reason}`);
    this.name = "StreamRejectedError";
  }
}

/**
 * Wrap a stream of text fragments as an SSE `Response`. The returned Response
 * carries `Content-Type: text/event-stream` and `Cache-Control: no-cache` —
 * callers should return it directly.
 */
export function toStringStreamResponse(input: ReadableStream<string | StreamRejection>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = input.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // A string fragment and a rejection object serialise the same way;
          // the consumer tells them apart by which one parses.
          controller.enqueue(encoder.encode(`${DATA_PREFIX}${JSON.stringify(value)}\n\n`));
        }
        controller.enqueue(encoder.encode(`${DATA_PREFIX}${DONE}\n\n`));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

/**
 * Read the full assembled string from a streaming-text Response. Concatenates
 * every text fragment and returns once `[DONE]` is seen (or the stream closes).
 *
 * Malformed frames are skipped silently; the caller's only contract is that
 * a clean stream produces a complete string.
 */
export async function readStringStream(res: Response): Promise<string> {
  if (!res.body) throw new Error("Response has no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lineRemainder = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = lineRemainder + decoder.decode(value, { stream: true });
    const lines = text.split("\n");
    // The last entry may be a partial line — hold it until more bytes arrive.
    lineRemainder = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith(DATA_PREFIX)) continue;
      const payload = line.slice(DATA_PREFIX.length);
      if (payload === DONE) return buffer;
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue; // malformed frame — skip
      }
      if (typeof parsed === "string") buffer += parsed;
      else if (isRejection(parsed)) throw new StreamRejectedError(parsed.rejected);
    }
  }
  return buffer;
}

function isRejection(value: unknown): value is StreamRejection {
  return typeof value === "object" && value !== null && typeof (value as StreamRejection).rejected === "string";
}
