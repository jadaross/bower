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
    expect(lastPrompt()).toContain(platformListingSpec.vinted.promptFragment("GB"));
    expect(lastPrompt()).toContain(platformListingSpec.vinted.fieldsSchema("GB"));
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

describe("formatListing — the Market's English", () => {
  it("writes British English with UK sizes for the UK", async () => {
    await formatListing({ listing, platform: "vinted", tone: "casual", market: "GB" });
    expect(lastPrompt()).toContain("Use British English");
    expect(lastPrompt()).toContain('"label": "Colour"');
  });

  it("writes American English with US sizes and US form labels for the US", async () => {
    await formatListing({ listing, platform: "ebay", tone: "casual", market: "US" });
    const prompt = lastPrompt();
    expect(prompt).toContain("Use American English");
    expect(prompt).toContain("Sizes in US format");
    expect(prompt).toContain("Prices in $ (USD)");
    expect(prompt).toContain("Format for eBay US");
    expect(prompt).toContain('"label": "Color"');
    expect(prompt).toContain("New with defects");
    expect(prompt).not.toContain("Use British English");
    expect(prompt).not.toContain("eBay UK");
  });

  it("uses Vinted US's form labels", async () => {
    await formatListing({ listing, platform: "vinted", tone: "casual", market: "US" });
    expect(lastPrompt()).toContain('"label": "Package size"');
    expect(lastPrompt()).toContain("Gray");
    expect(lastPrompt()).not.toContain("Parcel size");
  });
});
