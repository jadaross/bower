/**
 * Read-side Langfuse client for the owner's dashboard. Talks to the public
 * REST API directly (Basic auth with the project keys) rather than the tracing
 * SDK, which only writes. Every generation bower makes is a Langfuse
 * GENERATION observation named after its route — `analyse`, `format`,
 * `refine`, `valuate:<platform>` — carrying the model, token usage, the cost
 * Langfuse computed from its price table, latency, the user and the item's
 * session id. Feedback arrives as scores on the trace (`copied`, `thumbs`,
 * `manual-edit`, `opened-platform`, `refine-requested`, `note`).
 */

export type Route = "analyse" | "valuate" | "format" | "refine";

export interface Generation {
  id: string;
  traceId: string;
  projectId: string;
  name: string;
  route: Route;
  /** For `valuate:<platform>`, the platform; otherwise null. */
  platform: string | null;
  startTime: string;
  endTime: string | null;
  level: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage: string;
  environment: string;
  model: string | null;
  userId: string | null;
  sessionId: string | null;
  latency: number | null;
  usage: { input: number; output: number; total: number };
  cost: { input: number; output: number; total: number };
  /** Only populated when fetched with `io` — see `fetchGenerations`. */
  input?: unknown;
  output?: unknown;
}

export interface Score {
  id: string;
  name: string;
  value: number | boolean | string;
  dataType: string;
  timestamp: string;
  comment: string | null;
  traceId: string | null;
  environment: string;
}

export function langfuseConfigured(): boolean {
  return !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

function baseUrl(): string {
  return (process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com").replace(/\/$/, "");
}

function authHeader(): string {
  const pair = `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`;
  return `Basic ${Buffer.from(pair).toString("base64")}`;
}

/** A link to the trace in the Langfuse UI, so a number on the dashboard can be chased to its source. */
export function traceUrl(projectId: string | null, traceId: string): string | null {
  if (!projectId) return null;
  return `${baseUrl()}/project/${projectId}/traces/${traceId}`;
}

async function get<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: authHeader() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Langfuse ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

/** Follow `meta.cursor` until it runs out or `max` items are in hand. */
async function paginate<T>(
  path: string,
  params: Record<string, string | undefined>,
  max: number
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await get<{ data: T[]; meta?: { cursor?: string | null } }>(path, { ...params, cursor });
    out.push(...page.data);
    cursor = page.meta?.cursor ?? undefined;
  } while (cursor && out.length < max);
  return out;
}

function routeOf(name: string): Route {
  if (name.startsWith("valuate")) return "valuate";
  if (name === "format" || name === "refine" || name === "analyse") return name;
  return "analyse";
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function parseIO(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

interface RawObservation {
  id: string;
  traceId: string;
  projectId: string;
  name: string | null;
  startTime: string;
  endTime: string | null;
  level: Generation["level"];
  statusMessage: string | null;
  environment: string;
  model: string | null;
  userId: string | null;
  sessionId: string | null;
  latency: number | null;
  usageDetails?: Record<string, number>;
  costDetails?: Record<string, number>;
  totalCost?: number | null;
  input?: unknown;
  output?: unknown;
}

function toGeneration(o: RawObservation, io: boolean): Generation {
  const name = o.name ?? "";
  const usage = o.usageDetails ?? {};
  const cost = o.costDetails ?? {};
  return {
    id: o.id,
    traceId: o.traceId,
    projectId: o.projectId,
    name,
    route: routeOf(name),
    platform: name.startsWith("valuate:") ? name.slice("valuate:".length) : null,
    startTime: o.startTime,
    endTime: o.endTime,
    level: o.level ?? "DEFAULT",
    statusMessage: o.statusMessage ?? "",
    environment: o.environment,
    model: o.model,
    userId: o.userId,
    sessionId: o.sessionId,
    latency: typeof o.latency === "number" ? o.latency : null,
    usage: { input: num(usage.input), output: num(usage.output), total: num(usage.total) || num(usage.input) + num(usage.output) },
    cost: { input: num(cost.input), output: num(cost.output), total: num(cost.total) || num(o.totalCost) },
    ...(io ? { input: parseIO(o.input), output: parseIO(o.output) } : {}),
  };
}

export interface GenerationQuery {
  /** ISO datetime; omit for everything. */
  from?: string;
  environment: string;
  /** Exact observation name, e.g. "analyse". */
  name?: string;
  /** Fetch input/output too. Costly for format/refine, whose inputs are whole prompts. */
  io?: boolean;
  max?: number;
}

export async function fetchGenerations(q: GenerationQuery): Promise<Generation[]> {
  const fields = ["core", "basic", "model", "usage", "metrics", q.io ? "io" : null].filter(Boolean).join(",");
  const raw = await paginate<RawObservation>(
    "/api/public/v2/observations",
    {
      type: "GENERATION",
      environment: q.environment,
      fromStartTime: q.from,
      name: q.name,
      fields,
      limit: "1000",
    },
    q.max ?? 5000
  );
  return raw.map((o) => toGeneration(o, !!q.io));
}

interface RawScore {
  id: string;
  name: string;
  value: number | boolean | string;
  dataType: string;
  timestamp: string;
  environment: string;
  comment?: string | null;
  subject?: { kind: string; id: string; traceId?: string };
}

export async function fetchScores(q: { from?: string; environment: string; max?: number }): Promise<Score[]> {
  const raw = await paginate<RawScore>(
    "/api/public/v3/scores",
    { environment: q.environment, fromTimestamp: q.from, fields: "details,subject", limit: "100" },
    q.max ?? 5000
  );
  return raw.map((s) => ({
    id: s.id,
    name: s.name,
    value: s.value,
    dataType: s.dataType,
    timestamp: s.timestamp,
    comment: s.comment ?? null,
    traceId: s.subject?.kind === "trace" ? s.subject.id : s.subject?.traceId ?? null,
    environment: s.environment,
  }));
}
