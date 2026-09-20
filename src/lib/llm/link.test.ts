import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  anthropicClient: () => ({ messages: { create } }),
}));

const { buildLinkPrompt, isProductUrl, linkActivity, readProductLink } = await import("./link");

const URL_OK = "https://www.zara.com/uk/en/ribbed-knit-dress-p01234.html";
const FACTS = {
  found: true, is_clothing: true, brand: "Zara", product_name: "Ribbed knit dress", clothing_type: "Dress",
  gender: "women", colours: ["Black"], material: "52% viscose, 48% polyamide", sizes_offered: ["XS", "S", "M", "L", "XL"],
  rrp_amount: 29.99, rrp_currency: "GBP", details: ["Midi length", "Round neck"],
};

function structured(text: string, stop = "end_turn") {
  return { content: [{ type: "text", text }], stop_reason: stop, usage: { input_tokens: 10, output_tokens: 5 } };
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(structured(JSON.stringify(FACTS)));
});

describe("isProductUrl", () => {
  it("takes an http(s) URL with a real host and nothing else", () => {
    expect(isProductUrl(URL_OK)).toBe(true);
    expect(isProductUrl("http://shop.example.com/x")).toBe(true);
    expect(isProductUrl("zara.com/dress")).toBe(false);
    expect(isProductUrl("ftp://zara.com/dress")).toBe(false);
    expect(isProductUrl("https://localhost/dress")).toBe(false);
    expect(isProductUrl("https://user:pw@zara.com/dress")).toBe(false);
    expect(isProductUrl(42)).toBe(false);
    expect(isProductUrl("https://zara.com/" + "a".repeat(2100))).toBe(false);
  });
});

describe("readProductLink", () => {
  it("asks for the page by URL with web fetch, a single search as fallback, and the facts schema", async () => {
    const facts = await readProductLink(URL_OK);
    expect(facts).toEqual(FACTS);
    const call = create.mock.calls[0][0];
    expect(call.messages[0].content).toContain(URL_OK);
    expect(buildLinkPrompt(URL_OK)).toContain("set \"found\" to false");
    const tools = call.tools.map((t: { type: string }) => t.type);
    expect(tools).toEqual(["web_fetch_20260209", "web_search_20260209"]);
    expect(call.tools[1].max_uses).toBe(1);
    expect(call.output_config.format.type).toBe("json_schema");
    expect(call.output_config.effort).toBe("low");
  });

  it("resumes after pause_turn by echoing the turn back", async () => {
    create
      .mockResolvedValueOnce({ content: [{ type: "server_tool_use", name: "web_fetch", input: { url: URL_OK } }], stop_reason: "pause_turn", usage: {} })
      .mockResolvedValueOnce(structured(JSON.stringify(FACTS)));
    const facts = await readProductLink(URL_OK);
    expect(facts.brand).toBe("Zara");
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].messages).toHaveLength(2);
    expect(create.mock.calls[1][0].messages[1].role).toBe("assistant");
  });

  it("coerces a thin answer into a safe shape", async () => {
    create.mockResolvedValue(structured(JSON.stringify({ found: true, is_clothing: true, brand: " ", colours: "no", rrp_amount: -3, details: ["a", "b", "c", "d", "e", "f", "g"] })));
    const facts = await readProductLink(URL_OK);
    expect(facts.brand).toBeNull();
    expect(facts.colours).toEqual([]);
    expect(facts.rrp_amount).toBeNull();
    expect(facts.details).toHaveLength(6);
  });

  it("reports not found when the model says so", async () => {
    create.mockResolvedValue(structured(JSON.stringify({ ...FACTS, found: false })));
    expect((await readProductLink(URL_OK)).found).toBe(false);
  });

  it("throws on a refusal", async () => {
    create.mockResolvedValue(structured("", "refusal"));
    await expect(readProductLink(URL_OK)).rejects.toThrow(/declined/);
  });
});

describe("linkActivity", () => {
  it("lists what was fetched and searched", () => {
    const turns = [[
      { type: "server_tool_use", name: "web_fetch", input: { url: URL_OK } },
      { type: "server_tool_use", name: "web_search", input: { query: "zara ribbed knit dress" } },
      { type: "text", text: "{}" },
    ]] as never;
    expect(linkActivity(turns)).toEqual({ fetched: [URL_OK], searched: ["zara ribbed knit dress"] });
  });
});
