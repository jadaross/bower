import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ValuationItem } from "@/lib/types";

const create = vi.fn();
vi.mock("@/lib/llm/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/llm/client")>()),
  anthropicClient: () => ({ messages: { create } }),
}));

const { askingPriceProvider, buildValuationPrompt, coerceBand, describeItem } = await import(
  "./asking-price"
);

const item: ValuationItem = {
  brand: "Carhartt",
  clothing_type: "Detroit jacket",
  size: "M",
  condition: "Good",
  colour_primary: "Brown",
};

const band = {
  low: 55,
  high: 85,
  currency: "GBP",
  confidence: "high",
  sell_likelihood: "medium",
  reasoning: "Similar Detroit jackets are listed at £55–£85.",
  comparables: [
    { title: "Carhartt Detroit M", price: 60, currency: "GBP", platform: "vinted", url: "https://x" },
    { title: "Carhartt Detroit M brown", price: 78, currency: "GBP", platform: "depop" },
  ],
};

function reply(text: string, stop_reason = "end_turn") {
  return { content: [{ type: "text", text }], stop_reason };
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(reply(JSON.stringify(band)));
});

describe("describeItem", () => {
  it("reads as a search phrase", () => {
    expect(describeItem(item)).toBe("Carhartt Brown Detroit jacket size M");
  });

  it("skips absent optional fields", () => {
    expect(describeItem({ ...item, colour_primary: undefined })).toBe(
      "Carhartt Detroit jacket size M"
    );
  });
});

describe("buildValuationPrompt", () => {
  it("names the platform and its site", () => {
    const prompt = buildValuationPrompt(item, "vinted");
    expect(prompt).toContain("Vinted");
    expect(prompt).toContain("vinted.co.uk");
  });

  it("forbids claiming sold-price knowledge", () => {
    const prompt = buildValuationPrompt(item, "depop");
    expect(prompt).toContain("ASKING prices");
    expect(prompt).toMatch(/do NOT have access to sold prices/i);
    expect(prompt).toContain('Never write "sells for"');
  });

  it("instructs low confidence rather than a confident guess", () => {
    const prompt = buildValuationPrompt(item, "ebay");
    expect(prompt).toContain("fewer than three");
    expect(prompt).toContain('"low" confidence');
    expect(prompt).toContain("a confident guess is not");
  });

  it("distinguishes price confidence from sell likelihood", () => {
    const prompt = buildValuationPrompt(item, "vinted");
    expect(prompt).toContain("how sure you are of the PRICE");
    expect(prompt).toContain("how readily this kind of item MOVES");
  });

  it("carries the item through", () => {
    expect(buildValuationPrompt(item, "vinted")).toContain("Detroit jacket");
  });
});

describe("coerceBand", () => {
  it("passes a well-formed band through", () => {
    const result = coerceBand(band);
    expect(result.low).toBe(55);
    expect(result.high).toBe(85);
    expect(result.confidence).toBe("high");
    expect(result.comparables).toHaveLength(2);
  });

  it("orders low and high even when the model inverts them", () => {
    const result = coerceBand({ ...band, low: 85, high: 55 });
    expect(result.low).toBe(55);
    expect(result.high).toBe(85);
  });

  it("downgrades confidence to low when there are no comparables", () => {
    expect(coerceBand({ ...band, comparables: [] }).confidence).toBe("low");
  });

  it("downgrades an unrecognised confidence value to low", () => {
    expect(coerceBand({ ...band, confidence: "very sure" }).confidence).toBe("low");
  });

  it("drops malformed comparables rather than failing", () => {
    const result = coerceBand({
      ...band,
      comparables: [{ title: "ok", price: 10 }, { title: "no price" }, "nonsense", null],
    });
    expect(result.comparables).toHaveLength(1);
  });

  it("caps comparables at five", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `c${i}`, price: 10 + i }));
    expect(coerceBand({ ...band, comparables: many }).comparables).toHaveLength(5);
  });

  it("labels an unknown marketplace as other", () => {
    const result = coerceBand({
      ...band,
      comparables: [{ title: "x", price: 10, platform: "grailed" }],
    });
    expect(result.comparables[0].platform).toBe("other");
  });

  it("defaults the currency to GBP", () => {
    expect(coerceBand({ ...band, currency: undefined }).currency).toBe("GBP");
  });

  it("throws when low/high are not numbers", () => {
    expect(() => coerceBand({ ...band, low: "cheap" })).toThrow(/numeric low\/high/);
  });

  it("throws on a non-positive price", () => {
    expect(() => coerceBand({ ...band, low: 0, high: 0 })).toThrow(/non-positive/);
  });
});

describe("askingPriceProvider.band", () => {
  it("declares the web search tool", async () => {
    await askingPriceProvider.band(item, "vinted");
    const tools = create.mock.calls.at(-1)![0].tools;
    expect(tools[0].type).toBe("web_search_20260209");
    expect(tools[0].user_location.country).toBe("GB");
  });

  it("uses the valuation model", async () => {
    const { MODELS } = await import("@/lib/llm/client");
    await askingPriceProvider.band(item, "vinted");
    expect(create.mock.calls.at(-1)![0].model).toBe(MODELS.valuation);
  });

  it("returns a coerced band", async () => {
    const result = await askingPriceProvider.band(item, "vinted");
    expect(result.low).toBe(55);
    expect(result.reasoning).toContain("listed at");
  });

  it("constrains the response to the price-band schema", async () => {
    const { priceBandSchema } = await import("@/lib/llm/schemas");
    await askingPriceProvider.band(item, "vinted");
    expect(create.mock.calls.at(-1)![0].output_config.format).toEqual({
      type: "json_schema",
      schema: priceBandSchema,
    });
  });

  it("resumes when the search pauses the turn", async () => {
    create
      .mockResolvedValueOnce(reply("", "pause_turn"))
      .mockResolvedValueOnce(reply(JSON.stringify(band)));
    const result = await askingPriceProvider.band(item, "vinted");
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.low).toBe(55);
  });

  it("gives up rather than resuming forever", async () => {
    create.mockResolvedValue(reply("", "pause_turn"));
    await expect(askingPriceProvider.band(item, "vinted")).rejects.toThrow();
    expect(create.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("surfaces a refusal as an error", async () => {
    create.mockResolvedValue(reply("", "refusal"));
    await expect(askingPriceProvider.band(item, "vinted")).rejects.toThrow(/declined/);
  });

  it("throws when the model returns no JSON", async () => {
    create.mockResolvedValue(reply("I could not find anything."));
    await expect(askingPriceProvider.band(item, "vinted")).rejects.toThrow();
  });
});
