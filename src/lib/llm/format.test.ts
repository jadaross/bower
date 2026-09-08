import { beforeEach, describe, expect, it, vi } from "vitest";
import { listing, platformListing, textMessage } from "@/test/fixtures";

const create = vi.fn();
vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  anthropicClient: () => ({ messages: { create } }),
}));

const { formatListing } = await import("./format");

/** The prompt text sent on the most recent call. */
function lastPrompt(): string {
  return create.mock.calls.at(-1)![0].messages[0].content as string;
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(textMessage(JSON.stringify(platformListing)));
});

describe("formatListing — prompt", () => {
  it("names the target platform", async () => {
    await formatListing({ listing, platform: "depop", tone: "casual" });
    expect(lastPrompt()).toContain("Depop");
  });

  it("embeds the platform's own listing spec", async () => {
    const { platformListingSpec } = await import("@/platforms");
    await formatListing({ listing, platform: "vinted", tone: "casual" });
    expect(lastPrompt()).toContain(platformListingSpec.vinted.promptFragment);
    expect(lastPrompt()).toContain(platformListingSpec.vinted.fieldsSchema);
  });

  it("carries the source listing through verbatim", async () => {
    await formatListing({ listing, platform: "ebay", tone: "professional" });
    expect(lastPrompt()).toContain("Carhartt");
    expect(lastPrompt()).toContain("Detroit jacket");
  });

  it("varies the tone hint", async () => {
    await formatListing({ listing, platform: "vinted", tone: "casual" });
    const casual = lastPrompt();
    await formatListing({ listing, platform: "vinted", tone: "professional" });
    expect(lastPrompt()).not.toBe(casual);
  });

  it("uses the format model, not the analyse model", async () => {
    const { MODELS } = await import("./client");
    await formatListing({ listing, platform: "vinted", tone: "casual" });
    expect(create.mock.calls.at(-1)![0].model).toBe(MODELS.format);
  });
});

describe("formatListing — response handling", () => {
  it("parses a clean JSON response", async () => {
    const result = await formatListing({ listing, platform: "vinted", tone: "casual" });
    expect(result).toEqual(platformListing);
  });

  it("constrains the response to the platform-listing schema", async () => {
    const { platformListingSchema } = await import("./schemas");
    await formatListing({ listing, platform: "vinted", tone: "casual" });
    expect(create.mock.calls.at(-1)![0].output_config.format).toEqual({
      type: "json_schema",
      schema: platformListingSchema,
    });
  });

  it("defaults hashtags to an empty array when the model omits them", async () => {
    create.mockResolvedValue(textMessage(JSON.stringify({ title: "t", description: "d" })));
    const result = await formatListing({ listing, platform: "vinted", tone: "casual" });
    expect(result.hashtags).toEqual([]);
  });

  it("throws on malformed JSON", async () => {
    create.mockResolvedValue(textMessage("not json at all"));
    await expect(formatListing({ listing, platform: "vinted", tone: "casual" })).rejects.toThrow();
  });

  it("throws when the model omits a title", async () => {
    create.mockResolvedValue(textMessage(JSON.stringify({ description: "d" })));
    await expect(formatListing({ listing, platform: "vinted", tone: "casual" })).rejects.toThrow(
      /missing title or description/
    );
  });

  it("throws when the response has no text block", async () => {
    create.mockResolvedValue({ content: [{ type: "tool_use" }] });
    await expect(formatListing({ listing, platform: "vinted", tone: "casual" })).rejects.toThrow();
  });
});
