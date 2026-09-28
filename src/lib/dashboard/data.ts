import { fetchGenerations, fetchScores, langfuseConfigured, type Generation } from "./langfuse";
import { fetchAccounts, fetchHistory, fetchNotes } from "./supabase";
import { forMarket, isAccountId, rangeFor, type DashboardData } from "./metrics";

/**
 * One load for a dashboard page: everything from Supabase and Langfuse for
 * the range, filtered to the app's production traces and (by default) to
 * everyone but the owner, so the owner's own testing does not drown out what
 * the testers are doing. Cached in-process for a minute per (range, owner)
 * pair, because every tab reads the same data and a page load must not cost
 * six Langfuse round-trips each time.
 */

const ENVIRONMENT = process.env.DASHBOARD_LANGFUSE_ENVIRONMENT ?? "production";
const TTL_MS = 60_000;

const cache = new Map<string, { at: number; data: Promise<DashboardData> }>();

export interface LoadOptions {
  range?: string;
  includeOwner?: boolean;
  fresh?: boolean;
  /** One country (a Market id), or all when absent. Applied after the cache. */
  market?: string;
}

export async function loadDashboard(opts: LoadOptions = {}): Promise<DashboardData> {
  return forMarket(await loadAll(opts), opts.market);
}

function loadAll(opts: LoadOptions): Promise<DashboardData> {
  const key = `${opts.range ?? "30d"}:${opts.includeOwner ? "me" : "friends"}`;
  const hit = cache.get(key);
  if (hit && !opts.fresh && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = load(opts).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: Date.now(), data });
  return data;
}

async function load(opts: LoadOptions): Promise<DashboardData> {
  const now = new Date();
  const range = rangeFor(opts.range, now);
  const from = range.from?.toISOString();
  const includeOwner = !!opts.includeOwner;

  const [accounts, history, notes, generations, scores] = await Promise.all([
    fetchAccounts(),
    fetchHistory(),
    fetchNotes(),
    langfuseConfigured() ? loadGenerations(from) : Promise.resolve([] as Generation[]),
    langfuseConfigured() ? fetchScores({ from, environment: ENVIRONMENT }) : Promise.resolve([]),
  ]);

  const owners = new Set(accounts.filter((a) => a.isOwner).map((a) => a.id));
  const keep = (userId: string | null) => includeOwner || !userId || !owners.has(userId);
  // An audit run once traced under made-up user ids; they are not people.
  const person = (userId: string | null) => !userId || isAccountId(userId);
  const inRange = (iso: string) => !from || iso >= from;

  const gens = generations.filter((g) => keep(g.userId) && person(g.userId));
  const traceIds = new Set(gens.map((g) => g.traceId));

  return {
    range,
    includeOwner,
    fetchedAt: now.toISOString(),
    projectId: generations[0]?.projectId ?? null,
    generations: gens,
    scores: scores.filter((s) => s.traceId && traceIds.has(s.traceId)),
    accounts,
    history: history.filter((h) => keep(h.userId) && inRange(h.createdAt)),
    notes: notes.filter((n) => keep(n.userId) && inRange(n.createdAt)),
  };
}

/**
 * Generations without their input/output, plus the three routes whose io the
 * dashboard reads: analyse (photo count, tone, platform, rejection reason),
 * refine (which chips) and link (whether the page could be read). Format's io is a whole prompt per call and is
 * never read, so it is never fetched.
 */
async function loadGenerations(from: string | undefined): Promise<Generation[]> {
  const [all, analyse, refine, link] = await Promise.all([
    fetchGenerations({ from, environment: ENVIRONMENT }),
    fetchGenerations({ from, environment: ENVIRONMENT, name: "analyse", io: true }),
    fetchGenerations({ from, environment: ENVIRONMENT, name: "refine", io: true }),
    // Small: the URL in, the page's facts (and `found`) out.
    fetchGenerations({ from, environment: ENVIRONMENT, name: "link", io: true }),
  ]);
  const io = new Map([...analyse, ...refine, ...link].map((g) => [g.id, g]));
  return all.map((g) => {
    const rich = io.get(g.id);
    return rich ? { ...g, input: rich.input, output: rich.output } : g;
  });
}
