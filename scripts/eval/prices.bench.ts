/**
 * The price benchmark (#78). Runs the real market check (Haiku, live web
 * search) on every item in prices.json, twice, per platform, and scores what
 * can be scored without an answer key:
 *
 *   agreement  how much two runs' bands overlap (intersection / union)
 *   width      (high - low) / midpoint; wide bands say little
 *   evidence   comparables, and how many carry a real listing URL
 *   honesty    the confidence label beside all of the above
 *   cost/time  tokens and seconds per check
 *
 * `known` ranges in prices.json, once someone checks them by hand, add
 * "the band contains the fair price". Writes docs/research/price-benchmark.json.
 * Spends real money (about 9p a check): run it on purpose, never in CI.
 *
 *   npm run bench:prices
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";

const root = process.cwd();
// .env.local, read directly: Next's loader keys off NODE_ENV, which vitest sets to "test".
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
// Not user traffic: keep it out of Langfuse and the owner's dashboard.
delete process.env.LANGFUSE_PUBLIC_KEY;
delete process.env.LANGFUSE_SECRET_KEY;

type Platform = "vinted" | "depop" | "ebay";
const PLATFORMS: Platform[] = ["vinted", "depop", "ebay"];

interface Band { low: number; high: number; currency: string; confidence: string; comparables: { url?: string; price: number }[] }
interface Run { band: Band | null; error?: string; seconds: number; inputTokens: number; outputTokens: number; searches: number }

const realUrl = (platform: Platform, url?: string) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (!host.includes(platform === "ebay" ? "ebay." : platform)) return false;
    return !/unknown|example|placeholder|\/itm\/0+$|\/0+$/i.test(u.pathname + u.search);
  } catch {
    return false;
  }
};

const overlap = (a: Band, b: Band) => {
  const inter = Math.max(0, Math.min(a.high, b.high) - Math.max(a.low, b.low));
  const union = Math.max(a.high, b.high) - Math.min(a.low, b.low);
  return union > 0 ? inter / union : 1;
};
const width = (b: Band) => (b.high - b.low) / ((b.high + b.low) / 2 || 1);

it("prices benchmark", { timeout: 60 * 60 * 1000 }, async () => {
  const { anthropicClient } = await import("@/lib/llm/client");
  const { askingPriceProvider } = await import("@/lib/valuation");
  const client = anthropicClient();

  // Count what each check spends by watching the one client every call uses.
  let usage = { input: 0, output: 0, searches: 0 };
  const create = client.messages.create.bind(client.messages);
  client.messages.create = (async (...args: Parameters<typeof create>) => {
    const res = (await create(...args)) as { usage?: { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } } };
    usage.input += res.usage?.input_tokens ?? 0;
    usage.output += res.usage?.output_tokens ?? 0;
    usage.searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
    return res;
  }) as typeof client.messages.create;

  const spec = JSON.parse(readFileSync(join(root, "scripts/eval/prices.json"), "utf8"));
  const only = process.env.BENCH_ONLY?.split(",");
  const items = spec.items.filter((i: { id: string }) => !only || only.includes(i.id));
  const results = [];

  for (const entry of items) {
    const perPlatform: Record<string, Run[]> = {};
    for (const platform of PLATFORMS) {
      const runs: Run[] = [];
      for (let n = 0; n < 2; n++) {
        usage = { input: 0, output: 0, searches: 0 };
        const t0 = Date.now();
        try {
          const band = (await askingPriceProvider.band(entry.item, platform, entry.market)) as Band;
          runs.push({ band, seconds: (Date.now() - t0) / 1000, inputTokens: usage.input, outputTokens: usage.output, searches: usage.searches });
        } catch (err) {
          runs.push({ band: null, error: String(err).slice(0, 200), seconds: (Date.now() - t0) / 1000, inputTokens: usage.input, outputTokens: usage.output, searches: usage.searches });
        }
      }
      perPlatform[platform] = runs;
      const [a, b] = runs;
      console.log(
        entry.id, platform,
        runs.map((r) => (r.band ? `${r.band.low}-${r.band.high} ${r.band.confidence} (${r.band.comparables.length})` : `ERR`)).join(" | "),
        a.band && b.band ? `agree ${overlap(a.band, b.band).toFixed(2)}` : ""
      );
    }

    const scored = Object.fromEntries(
      PLATFORMS.map((p) => {
        const runs = perPlatform[p];
        const bands = runs.map((r) => r.band).filter((b): b is Band => b !== null);
        const known = entry.known?.[p] as { low: number; high: number } | undefined;
        return [p, {
          runs,
          agreement: bands.length === 2 ? overlap(bands[0], bands[1]) : null,
          width: bands.length ? bands.reduce((s, b) => s + width(b), 0) / bands.length : null,
          comparables: bands.length ? bands.reduce((s, b) => s + b.comparables.length, 0) / bands.length : 0,
          realUrlShare: bands.length
            ? bands.reduce((s, b) => s + b.comparables.filter((c) => realUrl(p, c.url)).length, 0) /
              Math.max(1, bands.reduce((s, b) => s + b.comparables.length, 0))
            : 0,
          confidence: bands.map((b) => b.confidence),
          containsKnown: known ? bands.map((b) => b.low <= (known.low + known.high) / 2 && (known.low + known.high) / 2 <= b.high) : null,
        }];
      })
    );
    results.push({ id: entry.id, market: entry.market, item: entry.item, platforms: scored });
  }

  writeFileSync(
    join(root, "docs/research/price-benchmark.json"),
    JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2) + "\n"
  );
});
