import { beforeEach, describe, expect, it, vi } from "vitest";
import { analysisResult, textMessage, textStream , analysisResultWire} from "@/test/fixtures";
import { readStringStream, toStringStreamResponse } from "@/lib/streaming-text";

const create = vi.fn();
vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  anthropicClient: () => ({ messages: { create } }),
}));

const { analyseListing, analyseListingStream } = await import("./analyse");

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
    expect(JSON.parse(assembled)).toEqual(analysisResultWire);
  });

  it("requests a streaming completion", async () => {
    create.mockResolvedValue(textStream([JSON.stringify(analysisResult)]));
    await readStringStream(
      toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
    );
    expect(lastCall().stream).toBe(true);
  });

  it("emits a normalized document, filling photo_analysis the model omitted", async () => {
    const withoutPhotoAnalysis = { tag_data: analysisResult.tag_data, listing: analysisResult.listing };
    create.mockResolvedValue(textStream([JSON.stringify(withoutPhotoAnalysis)]));
    const assembled = await readStringStream(
      toStringStreamResponse(analyseListingStream({ photos: [PHOTO], tone: "casual" }))
    );
    const doc = JSON.parse(assembled);
    expect(doc.photo_analysis).toEqual({
      scores: [],
      missing_shots: [],
      suggestions: [],
      has_tag_photo: false,
      ready_to_list: true,
    });
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
    expect(JSON.parse(assembled)).toEqual(analysisResultWire);
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
