import { beforeEach, describe, expect, it, vi } from "vitest";
import { analysisResult, textMessage, textStream , analysisResultWire} from "@/test/fixtures";
import { readStringStream, toStringStreamResponse } from "@/lib/streaming-text";

const create = vi.fn();
vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  anthropicClient: () => ({ messages: { create } }),
}));

const { analyseListing, analyseListingStream, AnalyseRejected, earlySubject } = await import("./analyse");

const PHOTO = "data:image/jpeg;base64,AAAA";

function lastCall() {
  return create.mock.calls.at(-1)![0];
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(textMessage(JSON.stringify(analysisResult)));
});

describe("analyseListing — prompt", () => {
  it("sends one image block per photo, plus the text block", async () => {
    await analyseListing({ photos: [PHOTO, PHOTO, PHOTO], tone: "casual" });
    const content = lastCall().messages[0].content;
    expect(content.filter((b: { type: string }) => b.type === "image")).toHaveLength(3);
    expect(content.at(-1).type).toBe("text");
  });

  it("asks for the tag read and the listing in one pass, and nothing else", async () => {
    await analyseListing({ photos: [PHOTO], tone: "casual" });
    const prompt = lastCall().messages[0].content.at(-1).text as string;
    expect(prompt).toContain("tag_data");
    expect(prompt).toContain("listing");
    // Nothing displays photo scores; asking for them only delays the title.
    expect(prompt).not.toContain("photo_analysis");
  });

  it("puts the title first so it streams before anything else", async () => {
    await analyseListing({ photos: [PHOTO], tone: "casual" });
    const prompt = lastCall().messages[0].content.at(-1).text as string;
    // Title first, and the listing ahead of tag_data — so the client shows the
    // title as soon as possible while analysing.
    expect(prompt.indexOf('"title"')).toBeLessThan(prompt.indexOf('"tag_data"'));
    expect(prompt.indexOf('"listing"')).toBeLessThan(prompt.indexOf('"tag_data"'));
  });

  it("asks for the platform's form fields only when a platform is supplied", async () => {
    const { platformListingSpec } = await import("@/platforms");
    await analyseListing({ photos: [PHOTO], tone: "casual" });
    expect(lastCall().messages[0].content.at(-1).text).not.toContain('"fields"');
    await analyseListing({ photos: [PHOTO], tone: "casual", platform: "vinted" });
    const prompt = lastCall().messages[0].content.at(-1).text as string;
    expect(prompt).toContain('"fields"');
    expect(prompt).toContain(platformListingSpec.vinted.fieldsSchema);
  });

  it("builds a different prompt when a platform is supplied", async () => {
    await analyseListing({ photos: [PHOTO], tone: "casual" });
    const neutral = lastCall().messages[0].content.at(-1).text;
    await analyseListing({ photos: [PHOTO], tone: "casual", platform: "vinted" });
    expect(lastCall().messages[0].content.at(-1).text).not.toBe(neutral);
  });

  it("uses the analyse model", async () => {
    const { MODELS } = await import("./client");
    await analyseListing({ photos: [PHOTO], tone: "casual" });
    expect(lastCall().model).toBe(MODELS.analyse);
  });
});

describe("analyseListing — response handling", () => {
  it("returns a parsed AnalysisResult", async () => {
    expect(await analyseListing({ photos: [PHOTO], tone: "casual" })).toEqual(analysisResultWire);
  });

  it("throws when the model returns an incomplete result", async () => {
    create.mockResolvedValue(textMessage(JSON.stringify({ listing: {} })));
    await expect(analyseListing({ photos: [PHOTO], tone: "casual" })).rejects.toThrow(
      /missing required/
    );
  });
});

describe("analyseListingStream", () => {
  it("streams deltas that reassemble into the full payload", async () => {
    const payload = JSON.stringify(analysisResult);
    const chunks = payload.match(/.{1,40}/g) ?? [];
    create.mockResolvedValue(textStream(chunks));

    const assembled = await readStringStream(
      toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
    );
    expect(JSON.parse(assembled)).toEqual(analysisResult);
  });

  it("requests a streaming completion", async () => {
    create.mockResolvedValue(textStream([JSON.stringify(analysisResult)]));
    await readStringStream(
      toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
    );
    expect(lastCall().stream).toBe(true);
  });

  it("streams the raw listing (no legacy photo_analysis section)", async () => {
    create.mockResolvedValue(textStream([JSON.stringify(analysisResult)]));
    const assembled = await readStringStream(
      toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
    );
    const doc = JSON.parse(assembled);
    expect(doc.photo_analysis).toBeUndefined();
    expect(doc.tag_data).toEqual(analysisResult.tag_data);
    expect(doc.listing).toEqual(analysisResult.listing);
  });

  it("ignores non-text deltas, keeping only the text that forms the JSON", async () => {
    const json = JSON.stringify(analysisResult);
    create.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { type: "message_start" };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: json } };
        yield { type: "content_block_stop" };
      },
    });
    const assembled = await readStringStream(
      toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
    );
    expect(JSON.parse(assembled)).toEqual(analysisResult);
  });

  it("asks for the subject before anything else", () => {
    create.mockResolvedValue(textStream(["{}"]));
    void analyseListingStream({ photos: [PHOTO], tone: "casual" }).getReader().read();
    const prompt = lastCall().messages[0].content.at(-1).text as string;
    expect(prompt.indexOf('"subject"')).toBeLessThan(prompt.indexOf('"listing"'));
    expect(prompt).toContain('"not_clothing"');
    expect(prompt).toContain('"explicit"');
  });

  it("cuts the stream and rejects when the photos are not clothing", async () => {
    const abort = vi.fn();
    create.mockResolvedValue({
      controller: { abort },
      async *[Symbol.asyncIterator]() {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: '{"subject": "not_' } };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: 'clothing", "listing": {' } };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: '"title": "should never arrive"' } };
      },
    });
    const reader = analyseListingStream({ photos: [PHOTO], tone: "casual" }).getReader();
    let error: unknown;
    try {
      while (!(await reader.read()).done) { /* drain */ }
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(AnalyseRejected);
    expect((error as InstanceType<typeof AnalyseRejected>).subject).toBe("not_clothing");
    expect(abort).toHaveBeenCalled();
  });

  it("lets a clothing subject through untouched", async () => {
    const payload = JSON.stringify({ subject: "clothing", ...analysisResult });
    create.mockResolvedValue(textStream(payload.match(/.{1,30}/g) ?? []));
    const assembled = await readStringStream(
      toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
    );
    expect(JSON.parse(assembled).subject).toBe("clothing");
    expect(JSON.parse(assembled).listing).toEqual(analysisResult.listing);
  });

  it("reports a model refusal as a rejection, not a decode failure", async () => {
    create.mockResolvedValue({
      controller: { abort: vi.fn() },
      async *[Symbol.asyncIterator]() {
        yield { type: "message_start", message: { usage: { input_tokens: 900 } } };
        yield { type: "message_delta", delta: { stop_reason: "refusal" }, usage: { output_tokens: 0 } };
      },
    });
    const reader = analyseListingStream({ photos: [PHOTO], tone: "casual" }).getReader();
    await expect((async () => { while (!(await reader.read()).done) { /* drain */ } })()).rejects.toMatchObject({ subject: "refused" });
  });

  it("surfaces an API failure as a stream error", async () => {
    create.mockRejectedValue(new Error("rate limited"));
    await expect(
      readStringStream(
        toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
      )
    ).rejects.toThrow();
  });
});

describe("earlySubject", () => {
  it("is undefined until the closing quote has arrived", () => {
    expect(earlySubject('{"subject": "not_clo')).toBeUndefined();
    expect(earlySubject('{"subject": "not_clothing"')).toBe("not_clothing");
  });

  it("ignores a value outside the vocabulary", () => {
    expect(earlySubject('{"subject": "banana"')).toBeUndefined();
  });
});
