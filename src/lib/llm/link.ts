import type Anthropic from "@anthropic-ai/sdk";
import type { ProductFacts } from "@/lib/types";
import { MODELS, anthropicClient } from "./client";
import { jsonSchemaFormat, parseStructuredContent } from "./structured";
import { productFactsSchema } from "./schemas";
import { beginGeneration, type TraceContext } from "@/lib/observability";

/**
 * The link half of a read. When the seller pastes the product page their item
 * was bought from, the model fetches it with Claude's server-side web fetch
 * and reports what the page says — brand, name, material, colours, sizes
 * offered, RRP — as `ProductFacts`. Those facts then go into the analyse
 * prompt beside the photos (or instead of them). Nothing is fetched by our
 * own server: the page is read on Anthropic's side, so a bot wall or a
 * JavaScript-only shop fails the same way for everyone and never touches
 * our IP. If the fetch fails the model may search for the product once by
 * its URL; if that finds nothing either, `found` is false and the read stops
 * before a listing is written, with the unit handed back.
 */

/** A product page the seller may paste: http(s), a real host, nothing exotic. */
export function isProductUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (!url.hostname.includes(".") || url.username || url.password) return false;
  return true;
}

export function buildLinkPrompt(url: string): string {
  return `Read this product page and report what it says about the product: ${url}

Fetch the page. If it cannot be fetched, search for the product once using the words in the URL, and read the best matching page from the same shop. If neither works, set "found" to false and leave everything else empty.

Report only what the page states about THIS product — not related items, not reviews, not the shop's other lines. Leave a field null or empty when the page does not say. "rrp_amount" is the full price the shop lists (before any sale), as a number, with "rrp_currency" as its ISO code. "sizes_offered" is the size range the shop sells, as written. "details" is up to six short facts a reseller would want: fit, length, closure, lining, care, a named feature. "is_clothing" is true when the product is a garment, shoes, a bag or an accessory someone could sell on secondhand.`;
}

function tools(): Anthropic.Messages.MessageCreateParams["tools"] {
  return [
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 2, max_content_tokens: 30000 },
    { type: "web_search_20260209", name: "web_search", max_uses: 1 },
  ];
}

/** What the model fetched and searched, for the trace. */
export function linkActivity(contents: Anthropic.Messages.ContentBlock[][]): { fetched: string[]; searched: string[] } {
  const fetched: string[] = [];
  const searched: string[] = [];
  for (const content of contents) {
    for (const block of content) {
      if (block.type !== "server_tool_use") continue;
      const input = block.input as { url?: unknown; query?: unknown };
      if (block.name === "web_fetch" && typeof input?.url === "string") fetched.push(input.url);
      if (block.name === "web_search" && typeof input?.query === "string") searched.push(input.query);
    }
  }
  return { fetched, searched };
}

/** Server tools can hand back `pause_turn` mid-fetch; resume by echoing. */
const MAX_RESUMES = 3;

function coerce(raw: Partial<ProductFacts> | null | undefined): ProductFacts {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []);
  return {
    found: raw?.found === true,
    is_clothing: raw?.is_clothing === true,
    brand: str(raw?.brand),
    product_name: str(raw?.product_name),
    clothing_type: str(raw?.clothing_type),
    gender: raw?.gender === "women" || raw?.gender === "men" || raw?.gender === "kids" || raw?.gender === "unisex" ? raw.gender : null,
    colours: list(raw?.colours),
    material: str(raw?.material),
    sizes_offered: list(raw?.sizes_offered),
    rrp_amount: typeof raw?.rrp_amount === "number" && Number.isFinite(raw.rrp_amount) && raw.rrp_amount > 0 ? raw.rrp_amount : null,
    rrp_currency: str(raw?.rrp_currency),
    details: list(raw?.details).slice(0, 6),
  };
}

export async function readProductLink(url: string, opts: { trace?: TraceContext } = {}): Promise<ProductFacts> {
  const client = anthropicClient();
  const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: buildLinkPrompt(url) }];
  const params = {
    model: MODELS.link,
    max_tokens: 2000,
    // "Fetch, read, report": not a reasoning problem, and low effort keeps the
    // tool calls consolidated — the seller is waiting on this before the title.
    output_config: { effort: "low" as const, format: jsonSchemaFormat(productFactsSchema) },
    tools: tools(),
  };
  const generation = beginGeneration({
    name: "link",
    model: MODELS.link,
    input: { url },
    modelParameters: { max_tokens: 2000 },
    trace: opts.trace,
  });
  try {
    let response = await client.messages.create({ ...params, messages });
    const turns = [response.content];
    for (let i = 0; response.stop_reason === "pause_turn" && i < MAX_RESUMES; i++) {
      messages.push({ role: "assistant", content: response.content });
      response = await client.messages.create({ ...params, messages });
      turns.push(response.content);
    }
    if (response.stop_reason === "refusal") throw new Error("The link read was declined by the model");
    const facts = coerce(parseStructuredContent<Partial<ProductFacts>>(response.content));
    generation?.finish({
      output: { ...facts, activity: linkActivity(turns) },
      usage: { input: response.usage?.input_tokens, output: response.usage?.output_tokens },
    });
    return facts;
  } catch (err) {
    generation?.fail(err);
    throw err;
  }
}

/** The facts as the analyse prompt reads them, plus what the seller said about their own item. */
export function productFactsPrompt(url: string, facts: ProductFacts, own: { size?: string; condition?: string }): string {
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep */ }
  const line = (label: string, v: string | null | undefined) => (v ? `- ${label}: ${v}` : null);
  const rrp = facts.rrp_amount ? `${facts.rrp_currency ?? ""} ${facts.rrp_amount}`.trim() : null;
  const page = [
    line("Brand", facts.brand),
    line("Product", facts.product_name),
    line("Type", facts.clothing_type),
    line("For", facts.gender),
    line("Colours", facts.colours.join(", ") || null),
    line("Material", facts.material),
    line("Sizes the shop sells", facts.sizes_offered.join(", ") || null),
    line("Full price (RRP)", rrp),
    ...facts.details.map((d) => `- ${d}`),
  ].filter(Boolean).join("\n");
  const size = own.size?.trim()
    ? `Their item is size ${own.size.trim()}.`
    : "They did not say the size: use the page's size only if the shop sells one size, otherwise leave size empty.";
  const condition = own.condition?.trim()
    ? `Its condition is "${own.condition.trim()}".`
    : 'They did not say the condition: write "Good" as the condition and say nothing about wear, use or flaws.';
  return `PRODUCT PAGE (${host}) — the seller's item is this product, bought new from this page:
${page || "- (the page gave no details)"}

The seller says: ${size} ${condition}`;
}
