import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ValuationItem } from "@/lib/types";

const create = vi.fn();
vi.mock("@/lib/llm/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/llm/client")>()),
  anthropicClient: () => ({ messages: { create } }),
}));

const { askingPriceProvider, buildValuationPrompt, coerceBand, describeItem, listingUrl } =
  await import("./asking-price");

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
    {
      title: "Carhartt Detroit M",
      price: 60,
      currency: "GBP",
      platform: "vinted",
      url: "https://www.vinted.co.uk/items/4821093321-carhartt-detroit-jacket",
    },
    {
      title: "Carhartt Detroit M brown",
      price: 78,
      currency: "GBP",
      platform: "vinted",
      url: "https://www.vinted.co.uk/items/4790011234-carhartt-detroit",
    },
  ],
};

/** A comparable that links to one listing on the named platform. */
function comp(platform: string, url: string, price = 10) {
  return { title: `on ${platform}`, price, currency: "GBP", platform, url };
}

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
    const prompt = buildValuationPrompt(item, "vinted", "GB");
    expect(prompt).toContain("Vinted");
    expect(prompt).toContain("vinted.co.uk");
  });

  it("forbids claiming sold-price knowledge", () => {
    const prompt = buildValuationPrompt(item, "depop", "GB");
    expect(prompt).toContain("ASKING prices");
    expect(prompt).toMatch(/do NOT have access to sold prices/i);
    expect(prompt).toContain('Never write "sells for"');
  });

  it("instructs low confidence rather than a confident guess", () => {
    const prompt = buildValuationPrompt(item, "ebay", "GB");
    expect(prompt).toContain("fewer than three");
    expect(prompt).toContain('"low" confidence');
    expect(prompt).toContain("a confident guess is not");
  });

  it("no longer invites a fallback to other marketplaces", () => {
    const prompt = buildValuationPrompt(item, "ebay", "GB");
    expect(prompt).not.toMatch(/fall back/i);
    expect(prompt).toContain("Only eBay counts");
  });

  it("shows what a link to one listing looks like", () => {
    expect(buildValuationPrompt(item, "ebay", "GB")).toContain("https://www.ebay.co.uk/itm/<id>");
    expect(buildValuationPrompt(item, "depop", "GB")).toContain("depop.com/products/");
  });
});

describe("listingUrl", () => {
  it("accepts a Vinted item page", () => {
    const url = "https://www.vinted.co.uk/items/4821093321-carhartt-detroit-jacket";
    expect(listingUrl(url, "vinted", "GB")).toBe(url);
  });

  it("accepts an eBay item page, with or without the slug", () => {
    expect(listingUrl("https://www.ebay.co.uk/itm/256431122334", "ebay", "GB")).toBeDefined();
    expect(
      listingUrl("https://www.ebay.co.uk/itm/Carhartt-Detroit-Jacket/256431122334?hash=1", "ebay", "GB")
    ).toBeDefined();
  });

  it("accepts a Depop product page", () => {
    expect(
      listingUrl("https://www.depop.com/products/jo-carhartt-detroit-jacket/", "depop", "GB")
    ).toBeDefined();
  });

  it("rejects a brand page, a catalogue search and the homepage", () => {
    expect(listingUrl("https://www.vinted.co.uk/brand/carhartt", "vinted", "GB")).toBeUndefined();
    expect(
      listingUrl("https://www.vinted.co.uk/catalog?brand_ids[]=53&search_text=detroit", "vinted", "GB")
    ).toBeUndefined();
    expect(listingUrl("https://www.vinted.co.uk/", "vinted", "GB")).toBeUndefined();
    expect(listingUrl("https://www.ebay.co.uk/sch/i.html?_nkw=carhartt+detroit", "ebay", "GB")).toBeUndefined();
    expect(listingUrl("https://www.depop.com/search/?q=carhartt", "depop", "GB")).toBeUndefined();
  });

  it("rejects a listing on a different platform", () => {
    expect(listingUrl("https://www.vinted.co.uk/items/4821093321-jacket", "ebay", "GB")).toBeUndefined();
    expect(listingUrl("https://www.ebay.com/itm/256431122334", "ebay", "GB")).toBeUndefined();
  });

  it("rejects anything that is not a string", () => {
    expect(listingUrl(undefined, "vinted", "GB")).toBeUndefined();
    expect(listingUrl(42, "vinted", "GB")).toBeUndefined();
  });

  it("distinguishes price confidence from sell likelihood", () => {
    const prompt = buildValuationPrompt(item, "vinted", "GB");
    expect(prompt).toContain("how sure you are of the PRICE");
    expect(prompt).toContain("how readily this kind of item MOVES");
  });

  it("carries the item through", () => {
    expect(buildValuationPrompt(item, "vinted", "GB")).toContain("Detroit jacket");
  });
});

describe("coerceBand", () => {
  it("passes a well-formed band through", () => {
    const result = coerceBand(band, "vinted", "GB");
    expect(result.low).toBe(55);
    expect(result.high).toBe(85);
    expect(result.confidence).toBe("high");
    expect(result.comparables).toHaveLength(2);
  });

  it("orders low and high even when the model inverts them", () => {
    const result = coerceBand({ ...band, low: 85, high: 55 }, "vinted", "GB");
    expect(result.low).toBe(55);
    expect(result.high).toBe(85);
  });

  it("downgrades confidence to low when there are no comparables", () => {
    expect(coerceBand({ ...band, comparables: [] }, "vinted", "GB").confidence).toBe("low");
  });

  it("downgrades an unrecognised confidence value to low", () => {
    expect(coerceBand({ ...band, confidence: "very sure" }, "vinted", "GB").confidence).toBe("low");
  });

  it("drops malformed comparables rather than failing", () => {
    const result = coerceBand(
      {
        ...band,
        comparables: [
          comp("vinted", "https://www.vinted.co.uk/items/1-ok"),
          { title: "no price", url: "https://www.vinted.co.uk/items/2-x" },
          "nonsense",
          null,
        ],
      },
      "vinted",
      "GB"
    );
    expect(result.comparables).toHaveLength(1);
  });

  it("caps comparables at five", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      comp("vinted", `https://www.vinted.co.uk/items/${100 + i}-c${i}`, 10 + i)
    );
    expect(coerceBand({ ...band, comparables: many }, "vinted", "GB").comparables).toHaveLength(5);
  });

  // The eBay band once came back with five Vinted listings under an eBay
  // heading. A comparable on another platform is not a comparable here.
  it("drops comparables that live on a different platform", () => {
    const result = coerceBand(
      {
        ...band,
        comparables: [
          comp("vinted", "https://www.vinted.co.uk/items/1-a"),
          comp("ebay", "https://www.ebay.co.uk/itm/256431122334"),
          comp("depop", "https://www.depop.com/products/jo-a/"),
        ],
      },
      "ebay",
      "GB"
    );
    expect(result.comparables).toHaveLength(1);
    expect(result.comparables[0].url).toContain("ebay.co.uk/itm/");
  });

  it("drops comparables whose link is not an individual listing", () => {
    const result = coerceBand(
      {
        ...band,
        comparables: [
          comp("vinted", "https://www.vinted.co.uk/brand/carhartt"),
          comp("vinted", "https://www.vinted.co.uk/catalog?search_text=carhartt"),
          { title: "no link at all", price: 12, currency: "GBP", platform: "vinted" },
          comp("vinted", "https://www.vinted.co.uk/items/4821093321-carhartt"),
        ],
      },
      "vinted",
      "GB"
    );
    expect(result.comparables).toHaveLength(1);
    expect(result.comparables[0].url).toContain("/items/4821093321");
  });

  it("names the platform from the link, not from the model", () => {
    const result = coerceBand(
      { ...band, comparables: [comp("other", "https://www.vinted.co.uk/items/1-a")] },
      "vinted",
      "GB"
    );
    expect(result.comparables[0].platform).toBe("vinted");
  });

  it("defaults the currency to GBP", () => {
    expect(coerceBand({ ...band, currency: undefined }, "vinted", "GB").currency).toBe("GBP");
  });

  it("throws when low/high are not numbers", () => {
    expect(() => coerceBand({ ...band, low: "cheap" }, "vinted", "GB")).toThrow(/numeric low\/high/);
  });

  it("throws on a non-positive price", () => {
    expect(() => coerceBand({ ...band, low: 0, high: 0 }, "vinted", "GB")).toThrow(/non-positive/);
  });
});

describe("askingPriceProvider.band", () => {
  it("declares the web search tool", async () => {
    await askingPriceProvider.band(item, "vinted", "GB");
    const tools = create.mock.calls.at(-1)![0].tools;
    expect(tools[0].type).toBe("web_search_20260209");
    expect(tools[0].user_location.country).toBe("GB");
  });

  it("confines the search to the platform being priced", async () => {
    await askingPriceProvider.band(item, "ebay", "GB");
    expect(create.mock.calls.at(-1)![0].tools[0].allowed_domains).toEqual(["ebay.co.uk"]);
    await askingPriceProvider.band(item, "depop", "GB");
    expect(create.mock.calls.at(-1)![0].tools[0].allowed_domains).toEqual(["depop.com"]);
  });

  it("searches from Australia, on the Australian site, for an Australian seller", async () => {
    await askingPriceProvider.band(item, "ebay", "AU");
    const tool = create.mock.calls.at(-1)![0].tools[0];
    expect(tool.user_location.country).toBe("AU");
    expect(tool.allowed_domains).toEqual(["ebay.com.au"]);
  });

  it("uses the valuation model", async () => {
    const { MODELS } = await import("@/lib/llm/client");
    await askingPriceProvider.band(item, "vinted", "GB");
    expect(create.mock.calls.at(-1)![0].model).toBe(MODELS.valuation);
  });

  it("returns a coerced band", async () => {
    const result = await askingPriceProvider.band(item, "vinted", "GB");
    expect(result.low).toBe(55);
    expect(result.reasoning).toContain("listed at");
  });

  it("constrains the response to the price-band schema", async () => {
    const { priceBandSchema } = await import("@/lib/llm/schemas");
    await askingPriceProvider.band(item, "vinted", "GB");
    expect(create.mock.calls.at(-1)![0].output_config.format).toEqual({
      type: "json_schema",
      schema: priceBandSchema,
    });
  });

  it("resumes when the search pauses the turn", async () => {
    create
      .mockResolvedValueOnce(reply("", "pause_turn"))
      .mockResolvedValueOnce(reply(JSON.stringify(band)));
    const result = await askingPriceProvider.band(item, "vinted", "GB");
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.low).toBe(55);
  });

  it("gives up rather than resuming forever", async () => {
    create.mockResolvedValue(reply("", "pause_turn"));
    await expect(askingPriceProvider.band(item, "vinted", "GB")).rejects.toThrow();
    expect(create.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("surfaces a refusal as an error", async () => {
    create.mockResolvedValue(reply("", "refusal"));
    await expect(askingPriceProvider.band(item, "vinted", "GB")).rejects.toThrow(/declined/);
  });

  it("throws when the model returns no JSON", async () => {
    create.mockResolvedValue(reply("I could not find anything."));
    await expect(askingPriceProvider.band(item, "vinted", "GB")).rejects.toThrow();
  });
});

describe("in Australia", () => {
  it("searches the Australian site in Australian dollars", () => {
    const prompt = buildValuationPrompt(item, "ebay", "AU");
    expect(prompt).toContain("seller in the Australia who");
    expect(prompt).toContain("ebay.com.au");
    expect(prompt).toContain("Prices are in AUD");
    expect(prompt).toContain("https://www.ebay.com.au/itm/<id>");
    expect(prompt).not.toContain("co.uk");
  });

  it("only accepts listings from the Australian site", () => {
    expect(listingUrl("https://www.ebay.com.au/itm/256431122334", "ebay", "AU")).toBeDefined();
    expect(listingUrl("https://www.ebay.co.uk/itm/256431122334", "ebay", "AU")).toBeUndefined();
  });

  it("defaults the currency to AUD", () => {
    const band = coerceBand({ low: 20, high: 40, comparables: [] }, "depop", "AU");
    expect(band.currency).toBe("AUD");
  });

  it("searches Vinted's Australian site and, because Vinted ships between the two, the UK one", async () => {
    const prompt = buildValuationPrompt(item, "vinted", "AU");
    expect(prompt).toContain("vinted.com.au");
    expect(prompt).toContain("vinted.co.uk is a comparable for an Australian seller too");
    expect(listingUrl("https://www.vinted.com.au/items/12345-jacket", "vinted", "AU")).toBeDefined();
    expect(listingUrl("https://www.vinted.co.uk/items/12345-jacket", "vinted", "AU")).toBeDefined();
    await askingPriceProvider.band(item, "vinted", "AU");
    expect(create.mock.calls.at(-1)![0].tools[0].allowed_domains).toEqual(["vinted.com.au", "vinted.co.uk"]);
  });

  it("lets a UK Vinted seller see Australian listings too", async () => {
    await askingPriceProvider.band(item, "vinted", "GB");
    expect(create.mock.calls.at(-1)![0].tools[0].allowed_domains).toEqual(["vinted.co.uk", "vinted.com.au"]);
  });
});
