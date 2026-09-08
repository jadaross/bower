import { beforeEach, describe, expect, it, vi } from "vitest";
import { platformListing, textMessage } from "@/test/fixtures";

const create = vi.fn();
vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  anthropicClient: () => ({ messages: { create } }),
}));

const { refineListing } = await import("./refine");

function lastPrompt(): string {
  return create.mock.calls.at(-1)![0].messages[0].content as string;
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(textMessage(JSON.stringify(platformListing)));
});

describe("refineListing — prompt", () => {
  it("numbers the instructions in order", async () => {
    await refineListing({
      platform: "vinted",
      listing: platformListing,
      instructions: ["make it shorter", "stress the condition"],
    });
    expect(lastPrompt()).toContain("1. make it shorter");
    expect(lastPrompt()).toContain("2. stress the condition");
  });

  it("includes the current listing so the model can rewrite it", async () => {
    await refineListing({ platform: "depop", listing: platformListing, instructions: ["shorter"] });
    expect(lastPrompt()).toContain(platformListing.title);
  });

  it("names the target platform", async () => {
    await refineListing({ platform: "ebay", listing: platformListing, instructions: ["shorter"] });
    expect(lastPrompt()).toContain("eBay");
  });

  it("tells the model that later refinements win", async () => {
    await refineListing({ platform: "vinted", listing: platformListing, instructions: ["a", "b"] });
    expect(lastPrompt()).toContain("the later one wins");
  });

  it("constrains the response to the platform-listing schema", async () => {
    const { platformListingSchema } = await import("./schemas");
    await refineListing({ platform: "vinted", listing: platformListing, instructions: ["x"] });
    expect(create.mock.calls.at(-1)![0].output_config.format).toEqual({
      type: "json_schema",
      schema: platformListingSchema,
    });
  });
});

describe("refineListing — response handling", () => {
  it("parses a clean response", async () => {
    const result = await refineListing({
      platform: "vinted",
      listing: platformListing,
      instructions: ["shorter"],
    });
    expect(result).toEqual(platformListing);
  });

  it("throws when the model drops the description", async () => {
    create.mockResolvedValue(textMessage(JSON.stringify({ title: "t" })));
    await expect(
      refineListing({ platform: "vinted", listing: platformListing, instructions: ["x"] })
    ).rejects.toThrow(/missing title or description/);
  });

  it("throws on malformed JSON", async () => {
    create.mockResolvedValue(textMessage("¯\\_(ツ)_/¯"));
    await expect(
      refineListing({ platform: "vinted", listing: platformListing, instructions: ["x"] })
    ).rejects.toThrow();
  });
});
