import { CHIPS } from "@/lib/chip-vocab";
import type { Platform } from "@/lib/types";
import type { Generation, Route, Score } from "./langfuse";
import type { Account, HistoryRow, Note } from "./supabase";

/**
 * Pure aggregation over what the dashboard fetched. Nothing in here touches
 * the network, so every number on the page can be unit-tested with fixtures.
 *
 * Vocabulary (CONTEXT.md): a *listing* is one successful analyse; a *market
 * check* is one valuate trace (however many platforms it fanned out to); a
 * *rejection* is an analyse that stopped because the photos were not
 * clothing, or were inappropriate, or the model declined.
 */

export type RangeKey = "7d" | "30d" | "90d" | "all";

export interface Range {
  key: RangeKey;
  /** Inclusive start, or null for everything. */
  from: Date | null;
  label: string;
}

export function rangeFor(key: string | undefined, now = new Date()): Range {
  const days: Record<RangeKey, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };
  const k: RangeKey = key && key in days ? (key as RangeKey) : "30d";
  const n = days[k];
  const labels: Record<RangeKey, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" };
  if (n === null) return { key: k, from: null, label: labels[k] };
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - (n - 1));
  from.setUTCHours(0, 0, 0, 0);
  return { key: k, from, label: labels[k] };
}

export interface DashboardData {
  range: Range;
  includeOwner: boolean;
  fetchedAt: string;
  projectId: string | null;
  generations: Generation[];
  scores: Score[];
  accounts: Account[];
  history: HistoryRow[];
  notes: Note[];
}

// ── Time ───────────────────────────────────────────────────────────────────

const TZ = "Europe/London";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });

/** "2026-09-11" in London time — the day a friend would say they used it. */
export function dayKey(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function hourOf(iso: string): number {
  return Number(hourFmt.format(new Date(iso))) % 24;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function weekdayOf(iso: string): number {
  return WEEKDAYS.indexOf(weekdayFmt.format(new Date(iso)));
}

/** Every day key from the range start (or the earliest event) to today. */
export function dayKeys(data: DashboardData): string[] {
  const now = new Date(data.fetchedAt);
  let start: Date;
  if (data.range.from) start = data.range.from;
  else {
    const stamps = [
      ...data.generations.map((g) => g.startTime),
      ...data.accounts.map((a) => a.createdAt),
      ...data.history.map((h) => h.createdAt),
    ].sort();
    start = stamps[0] ? new Date(stamps[0]) : now;
  }
  const keys: string[] = [];
  const cursor = new Date(start);
  const last = dayKey(now.toISOString());
  for (let i = 0; i < 400; i++) {
    const k = dayKey(cursor.toISOString());
    keys.push(k);
    if (k === last) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

// ── Classification ─────────────────────────────────────────────────────────

export type RejectReason = "not_clothing" | "explicit" | "unsafe" | "refused";

function outputObject(g: Generation): Record<string, unknown> | null {
  return g.output && typeof g.output === "object" ? (g.output as Record<string, unknown>) : null;
}
function inputObject(g: Generation): Record<string, unknown> | null {
  return g.input && typeof g.input === "object" && !Array.isArray(g.input) ? (g.input as Record<string, unknown>) : null;
}

export function rejectionOf(g: Generation): RejectReason | null {
  const out = outputObject(g);
  const r = out?.rejected;
  return typeof r === "string" ? (r as RejectReason) : null;
}

export function isError(g: Generation): boolean {
  return g.level === "ERROR";
}

/** A listing written: an analyse that finished and was not a rejection. */
export function isListing(g: Generation): boolean {
  return g.route === "analyse" && !isError(g) && rejectionOf(g) === null;
}

export function photoCountOf(g: Generation): number | null {
  const v = inputObject(g)?.photoCount;
  return typeof v === "number" ? v : null;
}

export function toneOf(g: Generation): string | null {
  const v = inputObject(g)?.tone;
  return typeof v === "string" ? v : null;
}

export function platformAskedOf(g: Generation): string | null {
  const v = inputObject(g)?.platform;
  return typeof v === "string" ? v : null;
}

/** Whether the model saw a care/brand label in the photos. */
export function hadTagPhoto(g: Generation): boolean | null {
  const pa = outputObject(g)?.photo_analysis;
  if (pa && typeof pa === "object" && "has_tag_photo" in pa) {
    const v = (pa as { has_tag_photo?: unknown }).has_tag_photo;
    return typeof v === "boolean" ? v : null;
  }
  return null;
}

/** Which Refinement Chips a refine call carried, matched by instruction text. */
export function chipsOf(g: Generation): string[] {
  const text = typeof g.input === "string" ? g.input : JSON.stringify(g.input ?? "");
  return CHIPS.filter((c) => text.includes(c.instruction.slice(0, 40))).map((c) => c.label);
}

/** Market checks: one per valuate trace, whatever it fanned out to. */
export interface MarketCheck {
  traceId: string;
  userId: string | null;
  sessionId: string | null;
  startTime: string;
  cost: number;
  latency: number;
  platforms: string[];
  errored: boolean;
}

export function marketChecks(gens: Generation[]): MarketCheck[] {
  const byTrace = new Map<string, MarketCheck>();
  for (const g of gens) {
    if (g.route !== "valuate") continue;
    const c = byTrace.get(g.traceId) ?? {
      traceId: g.traceId,
      userId: g.userId,
      sessionId: g.sessionId,
      startTime: g.startTime,
      cost: 0,
      latency: 0,
      platforms: [],
      errored: false,
    };
    c.cost += g.cost.total;
    c.latency = Math.max(c.latency, g.latency ?? 0);
    if (g.platform && !c.platforms.includes(g.platform)) c.platforms.push(g.platform);
    if (isError(g)) c.errored = true;
    if (g.startTime < c.startTime) c.startTime = g.startTime;
    byTrace.set(g.traceId, c);
  }
  return [...byTrace.values()].sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
}

// ── People ─────────────────────────────────────────────────────────────────

export function labelFor(accounts: Account[], userId: string | null): string {
  if (!userId) return "unknown";
  const a = accounts.find((x) => x.id === userId);
  if (!a) return `deleted · ${userId.slice(0, 6)}`;
  if (a.isOwner) return "you";
  if (a.firstName) return [a.firstName, a.lastName].filter(Boolean).join(" ");
  if (!a.email) return `no email · ${userId.slice(0, 6)}`;
  if (a.hidesEmail) return `hidden email · ${a.email.split("@")[0].slice(0, 8)}`;
  return a.email.split("@")[0];
}

export interface PersonRow {
  account: Account;
  label: string;
  listings: number;
  rejections: number;
  checks: number;
  formats: number;
  refines: number;
  thumbsUp: number;
  thumbsDown: number;
  copied: number;
  notes: number;
  cost: number;
  activeDays: string[];
  lastActive: string | null;
}

export function people(data: DashboardData): PersonRow[] {
  const gensByUser = groupBy(data.generations, (g) => g.userId ?? "");
  const traceUser = new Map(data.generations.map((g) => [g.traceId, g.userId]));
  const scoresByUser = groupBy(data.scores, (s) => (s.traceId && traceUser.get(s.traceId)) || "");
  const notesByUser = groupBy(data.notes, (n) => n.userId);
  const checksByUser = groupBy(marketChecks(data.generations), (c) => c.userId ?? "");
  const historyByUser = groupBy(data.history, (h) => h.userId);

  return data.accounts
    .filter((a) => data.includeOwner || !a.isOwner)
    .map((a) => {
      const gens = gensByUser.get(a.id) ?? [];
      const scores = scoresByUser.get(a.id) ?? [];
      const hist = historyByUser.get(a.id) ?? [];
      const stamps = [...gens.map((g) => g.startTime), ...hist.map((h) => h.createdAt)];
      const days = [...new Set(stamps.map(dayKey))].sort();
      const last = stamps.sort().at(-1) ?? null;
      return {
        account: a,
        label: labelFor(data.accounts, a.id),
        // From the history table, not Langfuse traces — see `summary()`.
        listings: hist.length,
        rejections: gens.filter((g) => rejectionOf(g) !== null).length,
        checks: (checksByUser.get(a.id) ?? []).length,
        formats: gens.filter((g) => g.route === "format").length,
        refines: gens.filter((g) => g.route === "refine").length,
        thumbsUp: scores.filter((s) => s.name === "thumbs" && isTrue(s.value)).length,
        thumbsDown: scores.filter((s) => s.name === "thumbs" && !isTrue(s.value)).length,
        copied: scores.filter((s) => s.name === "copied").length,
        notes: (notesByUser.get(a.id) ?? []).length,
        cost: gens.reduce((s, g) => s + g.cost.total, 0),
        activeDays: days,
        lastActive: latest(last, a.lastSignInAt),
      };
    })
    .sort((x, y) => (y.lastActive ?? "") < (x.lastActive ?? "") ? -1 : 1);
}

function latest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function isTrue(v: Score["value"]): boolean {
  return v === true || v === 1 || v === "true" || v === "1";
}

// ── Overview ───────────────────────────────────────────────────────────────

export interface Summary {
  accounts: number;
  newAccounts: number;
  activePeople: number;
  listings: number;
  rejections: number;
  checks: number;
  spend: number;
  thumbsUp: number;
  thumbsDown: number;
  copied: number;
  notes: number;
  errors: number;
  neverWrote: number;
}

export function summary(data: DashboardData): Summary {
  const accounts = data.accounts.filter((a) => data.includeOwner || !a.isOwner);
  const from = data.range.from?.toISOString() ?? "";
  const rows = people(data);
  const everWrote = new Set(data.history.map((h) => h.userId));
  return {
    accounts: accounts.length,
    newAccounts: accounts.filter((a) => a.createdAt >= from).length,
    activePeople: new Set([...data.generations.map((g) => g.userId), ...data.history.map((h) => h.userId)].filter(Boolean)).size,
    // From the history table, not Langfuse traces: a listing is written (and
    // the allowance spent) whether or not its trace made it to Langfuse, so
    // this is the count that can never fall behind reality (see the Items page).
    listings: data.history.length,
    rejections: data.generations.filter((g) => rejectionOf(g) !== null).length,
    checks: marketChecks(data.generations).length,
    spend: data.generations.reduce((s, g) => s + g.cost.total, 0),
    thumbsUp: rows.reduce((s, r) => s + r.thumbsUp, 0),
    thumbsDown: rows.reduce((s, r) => s + r.thumbsDown, 0),
    copied: rows.reduce((s, r) => s + r.copied, 0),
    notes: data.notes.length,
    errors: data.generations.filter(isError).length,
    neverWrote: accounts.filter((a) => !everWrote.has(a.id)).length,
  };
}

export interface DayRow {
  day: string;
  listings: number;
  checks: number;
  formats: number;
  refines: number;
  rejections: number;
  cost: number;
  costByRoute: Record<Route, number>;
  activePeople: number;
  signups: number;
}

export function daily(data: DashboardData): DayRow[] {
  const rows = new Map<string, DayRow>();
  for (const day of dayKeys(data)) {
    rows.set(day, {
      day,
      listings: 0,
      checks: 0,
      formats: 0,
      refines: 0,
      rejections: 0,
      cost: 0,
      costByRoute: { analyse: 0, valuate: 0, format: 0, refine: 0 },
      activePeople: 0,
      signups: 0,
    });
  }
  const peopleByDay = new Map<string, Set<string>>();
  for (const g of data.generations) {
    const r = rows.get(dayKey(g.startTime));
    if (!r) continue;
    if (rejectionOf(g) !== null) r.rejections++;
    if (g.route === "format") r.formats++;
    if (g.route === "refine") r.refines++;
    r.cost += g.cost.total;
    r.costByRoute[g.route] += g.cost.total;
    if (g.userId) {
      const set = peopleByDay.get(r.day) ?? new Set<string>();
      set.add(g.userId);
      peopleByDay.set(r.day, set);
    }
  }
  // From the history table, not Langfuse traces — see `summary()`.
  for (const h of data.history) {
    const r = rows.get(dayKey(h.createdAt));
    if (!r) continue;
    r.listings++;
    const set = peopleByDay.get(r.day) ?? new Set<string>();
    set.add(h.userId);
    peopleByDay.set(r.day, set);
  }
  for (const c of marketChecks(data.generations)) {
    const r = rows.get(dayKey(c.startTime));
    if (r) r.checks++;
  }
  for (const a of data.accounts) {
    if (!data.includeOwner && a.isOwner) continue;
    const r = rows.get(dayKey(a.createdAt));
    if (r) r.signups++;
  }
  for (const [day, set] of peopleByDay) {
    const r = rows.get(day);
    if (r) r.activePeople = set.size;
  }
  return [...rows.values()];
}

export interface Event {
  at: string;
  kind: "listing" | "rejection" | "check" | "format" | "refine" | "thumbs-up" | "thumbs-down" | "copied" | "note" | "signup" | "error";
  who: string;
  what: string;
  traceId: string | null;
}

export function recentEvents(data: DashboardData, limit = 20): Event[] {
  const title = titleBySession(data);
  const traceGen = new Map(data.generations.map((g) => [g.traceId, g]));
  // A listing's own trace, when Langfuse actually got a copy of it \u2014 see `summary()`.
  const analyseTraceBySession = new Map(
    data.generations.filter((g) => g.route === "analyse").map((g) => [g.sessionId, g.traceId])
  );
  const who = (id: string | null) => labelFor(data.accounts, id);
  const item = (sessionId: string | null, fallback: string) => {
    const t = title.get(sessionId ?? "");
    return t ? `\u201c${t}\u201d` : fallback;
  };
  const events: Event[] = [];
  for (const g of data.generations) {
    if (g.route === "valuate") continue; // one event per check, below
    const rej = rejectionOf(g);
    if (isError(g)) events.push({ at: g.startTime, kind: "error", who: who(g.userId), what: `hit an error in ${g.route}: ${g.statusMessage || "no message"}`, traceId: g.traceId });
    else if (rej) events.push({ at: g.startTime, kind: "rejection", who: who(g.userId), what: `sent photos bower rejected (${rej.replace("_", " ")})`, traceId: g.traceId });
    else if (g.route === "format") events.push({ at: g.startTime, kind: "format", who: who(g.userId), what: `switched platform or tone on ${item(g.sessionId, "a listing")}`, traceId: g.traceId });
    else if (g.route === "refine") events.push({ at: g.startTime, kind: "refine", who: who(g.userId), what: `tapped ${chipsOf(g).join(", ") || "a chip"} on ${item(g.sessionId, "a listing")}`, traceId: g.traceId });
  }
  // From the history table, not Langfuse traces, so a listing whose trace
  // never made it to Langfuse still shows up here (see `summary()`). Its
  // trace link only resolves when one actually exists.
  for (const h of data.history) {
    events.push({ at: h.createdAt, kind: "listing", who: who(h.userId), what: `wrote \u201c${h.title}\u201d`, traceId: (h.sessionId && analyseTraceBySession.get(h.sessionId)) ?? null });
  }
  for (const c of marketChecks(data.generations)) {
    events.push({ at: c.startTime, kind: "check", who: who(c.userId), what: `checked the market on ${c.platforms.join(", ")} for ${item(c.sessionId, "an item")}`, traceId: c.traceId });
  }
  for (const s of data.scores) {
    const g = s.traceId ? traceGen.get(s.traceId) : undefined;
    if (!g) continue;
    if (s.name === "thumbs") events.push({ at: s.timestamp, kind: isTrue(s.value) ? "thumbs-up" : "thumbs-down", who: who(g.userId), what: `gave a thumbs ${isTrue(s.value) ? "up" : "down"} on ${item(g.sessionId, "a listing")}`, traceId: s.traceId });
    else if (s.name === "copied") events.push({ at: s.timestamp, kind: "copied", who: who(g.userId), what: `copied from ${item(g.sessionId, "a listing")}`, traceId: s.traceId });
  }
  for (const n of data.notes) events.push({ at: n.createdAt, kind: "note", who: who(n.userId), what: `wrote: \u201c${n.message}\u201d`, traceId: n.traceId });
  for (const a of data.accounts) {
    if (!data.includeOwner && a.isOwner) continue;
    if (data.range.from && a.createdAt < data.range.from.toISOString()) continue;
    events.push({ at: a.createdAt, kind: "signup", who: labelFor(data.accounts, a.id), what: "signed up", traceId: null });
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

export function titleBySession(data: DashboardData): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of data.history) if (h.sessionId) m.set(h.sessionId, h.title);
  return m;
}

// ── Items & photos ─────────────────────────────────────────────────────────

export interface Count {
  label: string;
  count: number;
}

export function countBy<T>(items: T[], key: (t: T) => string | null | undefined, top = 10): Count[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, top);
}

export interface PhotoStats {
  /** Listings with an analyse trace in Langfuse — a subset of the true total
   * (`data.history.length`, shown on the Items page) when a trace is missing. */
  listings: number;
  avgPhotos: number | null;
  distribution: Count[]; // 1..5
  withTagPhoto: number;
  tagKnown: number;
  rejections: Count[];
  platformAsked: Count[];
  tone: Count[];
}

export function photoStats(data: DashboardData): PhotoStats {
  const analyses = data.generations.filter((g) => g.route === "analyse" && !isError(g));
  const listings = analyses.filter(isListing);
  const counts = listings.map(photoCountOf).filter((n): n is number => n !== null);
  const dist = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, count: counts.filter((c) => c === n).length }));
  const tags = listings.map(hadTagPhoto).filter((v): v is boolean => v !== null);
  return {
    listings: listings.length,
    avgPhotos: counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : null,
    distribution: dist,
    withTagPhoto: tags.filter(Boolean).length,
    tagKnown: tags.length,
    rejections: countBy(analyses, (g) => rejectionOf(g)?.replace("_", " ")),
    platformAsked: countBy(listings, platformAskedOf),
    tone: countBy(listings, toneOf),
  };
}

export interface ItemStats {
  brands: Count[];
  types: Count[];
  conditions: Count[];
  categories: Count[];
  genders: Count[];
  colours: Count[];
  priceBands: Count[];
  medianEstimate: number | null;
  rows: HistoryRow[];
}

export function itemStats(data: DashboardData): ItemStats {
  const rows = data.history;
  const mids = rows
    .filter((r) => r.priceMin !== null && r.priceMax !== null)
    .map((r) => ((r.priceMin as number) + (r.priceMax as number)) / 2)
    .sort((a, b) => a - b);
  const bands = [
    ["under £10", 0, 10],
    ["£10–20", 10, 20],
    ["£20–40", 20, 40],
    ["£40–80", 40, 80],
    ["£80+", 80, Infinity],
  ] as const;
  return {
    brands: countBy(rows, (r) => (r.brand && r.brand.toLowerCase() !== "unknown" ? r.brand : "Unknown / unbranded")),
    types: countBy(rows, (r) => r.clothingType),
    conditions: countBy(rows, (r) => r.condition),
    categories: countBy(rows, (r) => r.mainCategory),
    genders: countBy(rows, (r) => r.gender),
    colours: countBy(rows, (r) => r.colourPrimary),
    priceBands: bands.map(([label, lo, hi]) => ({ label, count: mids.filter((m) => m >= lo && m < hi).length })),
    medianEstimate: mids.length ? mids[Math.floor(mids.length / 2)] : null,
    rows,
  };
}

export interface MarketStats {
  checks: number;
  checkedItems: HistoryRow[];
  confidence: Record<string, Count[]>; // platform -> low/medium/high
  likelihood: Count[];
  recommended: Count[];
  /** How often the photo-only estimate overlapped the market band on the recommended platform. */
  estimateInsideBand: { inside: number; known: number };
  comparablesPerBand: number | null;
}

export function marketStats(data: DashboardData): MarketStats {
  const checked = data.history.filter((h) => h.valuation);
  const conf: Record<string, Count[]> = {};
  const likelihood = new Map<string, number>();
  let comps = 0;
  let bands = 0;
  let inside = 0;
  let known = 0;
  for (const h of checked) {
    const v = h.valuation!;
    for (const [p, band] of Object.entries(v.perPlatform)) {
      if (!band) continue;
      conf[p] ??= ["low", "medium", "high"].map((l) => ({ label: l, count: 0 }));
      const c = conf[p].find((x) => x.label === band.confidence);
      if (c) c.count++;
      likelihood.set(band.sell_likelihood, (likelihood.get(band.sell_likelihood) ?? 0) + 1);
      comps += band.comparables?.length ?? 0;
      bands++;
    }
    const rec = v.recommendation?.platform ?? (Object.keys(v.perPlatform)[0] as Platform | undefined);
    const band = rec ? v.perPlatform[rec] : undefined;
    if (band && h.priceMin !== null && h.priceMax !== null) {
      known++;
      if (h.priceMax >= band.low && h.priceMin <= band.high) inside++;
    }
  }
  return {
    checks: marketChecks(data.generations).length,
    checkedItems: checked,
    confidence: conf,
    likelihood: ["low", "medium", "high"].map((l) => ({ label: l, count: likelihood.get(l) ?? 0 })),
    recommended: countBy(checked, (h) => h.valuation?.recommendation?.platform ?? null),
    estimateInsideBand: { inside, known },
    comparablesPerBand: bands ? comps / bands : null,
  };
}

// ── Feedback ───────────────────────────────────────────────────────────────

export interface SignalRow {
  label: string;
  listings: number;
  copied: number;
  thumbsUp: number;
  thumbsDown: number;
  manualEdits: number;
  opened: number;
}

export interface FlaggedListing {
  at: string;
  who: string;
  title: string;
  platform: string | null;
  comment: string | null;
  traceId: string;
}

export interface FeedbackStats {
  thumbsUp: number;
  thumbsDown: number;
  copied: number;
  copiedListings: number;
  opened: number;
  manualEdits: number;
  refineRounds: number;
  /** Distinct listings the chip rounds were on, whether or not written in this range. */
  refinedListings: number;
  chips: Count[];
  byPlatform: SignalRow[];
  thumbsDownList: FlaggedListing[];
  manualEditList: FlaggedListing[];
  notes: (Note & { who: string; title: string })[];
  funnel: { label: string; count: number }[];
  journey: { label: string; count: number }[];
}

export function feedbackStats(data: DashboardData): FeedbackStats {
  const traceGen = new Map(data.generations.map((g) => [g.traceId, g]));
  const title = titleBySession(data);
  const scored = data.scores.filter((s) => s.traceId && traceGen.has(s.traceId));
  const listingTraces = new Set(data.generations.filter(isListing).map((g) => g.traceId));

  // Signals per session, so "copied" counts listings that were kept, not taps.
  const sessionOf = (s: Score) => traceGen.get(s.traceId!)?.sessionId ?? s.traceId!;
  const copiedSessions = new Set(scored.filter((s) => s.name === "copied").map(sessionOf));
  const openedSessions = new Set(scored.filter((s) => s.name === "opened-platform").map(sessionOf));
  const editedSessions = new Set(scored.filter((s) => s.name === "manual-edit").map(sessionOf));
  const listingSessions = new Set(data.generations.filter(isListing).map((g) => g.sessionId ?? g.traceId));
  const formatted = new Set(data.generations.filter((g) => g.route === "format").map((g) => g.sessionId ?? g.traceId));
  const refined = new Set(data.generations.filter((g) => g.route === "refine").map((g) => g.sessionId ?? g.traceId));
  const checked = new Set(marketChecks(data.generations).map((c) => c.sessionId ?? c.traceId));

  const flagged = (name: string): FlaggedListing[] =>
    scored
      .filter((s) => s.name === name && (name !== "thumbs" || !isTrue(s.value)))
      .map((s) => {
        const g = traceGen.get(s.traceId!)!;
        return {
          at: s.timestamp,
          who: labelFor(data.accounts, g.userId),
          title: title.get(g.sessionId ?? "") ?? `${g.route} listing`,
          platform: platformAskedOf(g) ?? g.platform,
          comment: s.comment,
          traceId: s.traceId!,
        };
      })
      .sort((a, b) => (a.at < b.at ? 1 : -1));

  // Which platform a signal was about: the platform the listing was written for.
  const platformOfTrace = (traceId: string) => {
    const g = traceGen.get(traceId);
    return g ? platformAskedOf(g) ?? "neutral" : "unknown";
  };
  const platforms = [...new Set([...listingTraces].map(platformOfTrace))].sort();
  const byPlatform: SignalRow[] = platforms.map((p) => {
    const inP = (s: Score) => platformOfTrace(s.traceId!) === p;
    return {
      label: p,
      listings: [...listingTraces].filter((t) => platformOfTrace(t) === p).length,
      copied: new Set(scored.filter((s) => s.name === "copied" && inP(s)).map(sessionOf)).size,
      thumbsUp: scored.filter((s) => s.name === "thumbs" && isTrue(s.value) && inP(s)).length,
      thumbsDown: scored.filter((s) => s.name === "thumbs" && !isTrue(s.value) && inP(s)).length,
      manualEdits: scored.filter((s) => s.name === "manual-edit" && inP(s)).length,
      opened: scored.filter((s) => s.name === "opened-platform" && inP(s)).length,
    };
  });

  const chipCounts = new Map<string, number>();
  for (const g of data.generations) if (g.route === "refine") for (const c of chipsOf(g)) chipCounts.set(c, (chipCounts.get(c) ?? 0) + 1);

  const listings = listingSessions.size;
  return {
    thumbsUp: scored.filter((s) => s.name === "thumbs" && isTrue(s.value)).length,
    thumbsDown: scored.filter((s) => s.name === "thumbs" && !isTrue(s.value)).length,
    copied: scored.filter((s) => s.name === "copied").length,
    copiedListings: copiedSessions.size,
    opened: openedSessions.size,
    manualEdits: editedSessions.size,
    refineRounds: data.generations.filter((g) => g.route === "refine").length,
    refinedListings: refined.size,
    chips: [...chipCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    byPlatform,
    thumbsDownList: flagged("thumbs"),
    manualEditList: flagged("manual-edit"),
    notes: data.notes.map((n) => ({
      ...n,
      who: labelFor(data.accounts, n.userId),
      title: title.get(n.sessionId ?? "") ?? "",
    })),
    funnel: [
      { label: "Listings written", count: listings },
      { label: "Copied something", count: [...copiedSessions].filter((s) => listingSessions.has(s)).length },
      { label: "Opened the platform", count: [...openedSessions].filter((s) => listingSessions.has(s)).length },
    ],
    journey: [
      { label: "Written", count: listings },
      { label: "Switched platform or tone", count: [...formatted].filter((s) => listingSessions.has(s)).length },
      { label: "Refined with chips", count: [...refined].filter((s) => listingSessions.has(s)).length },
      { label: "Checked the market", count: [...checked].filter((s) => listingSessions.has(s)).length },
      { label: "Edited by hand", count: [...editedSessions].filter((s) => listingSessions.has(s)).length },
    ],
  };
}

// ── Cost ───────────────────────────────────────────────────────────────────

export interface RouteCost {
  route: Route;
  calls: number;
  cost: number;
  avg: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface CostStats {
  spend: number;
  perListingAllIn: number | null;
  perListingRead: number | null;
  perCheck: number | null;
  perActivePerson: number | null;
  /** Spend scaled to a 30-day month from the range's daily average. */
  monthlyRunRate: number | null;
  /** What one person costs if they use their whole meter: 10 listings + 3 checks. */
  fullMeter: number | null;
  byRoute: RouteCost[];
  byModel: Count[];
  topPeople: { label: string; cost: number; listings: number; checks: number }[];
  inputTokens: number;
  outputTokens: number;
}

export function costStats(data: DashboardData): CostStats {
  const gens = data.generations;
  const spend = gens.reduce((s, g) => s + g.cost.total, 0);
  const listings = gens.filter(isListing);
  const checks = marketChecks(gens);
  const routes: Route[] = ["analyse", "valuate", "format", "refine"];
  const byRoute = routes.map((route) => {
    const rs = gens.filter((g) => g.route === route);
    const cost = rs.reduce((s, g) => s + g.cost.total, 0);
    return {
      route,
      calls: rs.length,
      cost,
      avg: rs.length ? cost / rs.length : 0,
      inputTokens: rs.reduce((s, g) => s + g.usage.input, 0),
      outputTokens: rs.reduce((s, g) => s + g.usage.output, 0),
      model: countBy(rs, (g) => g.model, 1)[0]?.label ?? "—",
    };
  });
  const analyseAvg = byRoute.find((r) => r.route === "analyse")?.avg ?? null;
  const checkAvg = checks.length ? checks.reduce((s, c) => s + c.cost, 0) / checks.length : null;
  const days = dayKeys(data).length || 1;
  const rows = people(data).filter((p) => p.cost > 0);
  const listingSessions = new Set(listings.map((g) => g.sessionId).filter(Boolean));
  const sessionSpend = gens.filter((g) => g.sessionId && listingSessions.has(g.sessionId)).reduce((s, g) => s + g.cost.total, 0);
  return {
    spend,
    perListingAllIn: listings.length ? sessionSpend / listings.length : null,
    perListingRead: analyseAvg,
    perCheck: checkAvg,
    perActivePerson: rows.length ? spend / rows.length : null,
    monthlyRunRate: gens.length ? (spend / days) * 30 : null,
    fullMeter: analyseAvg !== null && checkAvg !== null ? 10 * analyseAvg + 3 * checkAvg : null,
    byRoute,
    byModel: gens.reduce<Count[]>((acc, g) => {
      const label = g.model ?? "unknown";
      const c = acc.find((x) => x.label === label);
      if (c) c.count += g.cost.total;
      else acc.push({ label, count: g.cost.total });
      return acc;
    }, []).sort((a, b) => b.count - a.count),
    topPeople: rows
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
      .map((p) => ({ label: p.label, cost: p.cost, listings: p.listings, checks: p.checks })),
    inputTokens: gens.reduce((s, g) => s + g.usage.input, 0),
    outputTokens: gens.reduce((s, g) => s + g.usage.output, 0),
  };
}

// ── Health ─────────────────────────────────────────────────────────────────

export interface LatencyRow {
  route: Route;
  n: number;
  p50: number | null;
  p95: number | null;
  max: number | null;
  errors: number;
}

export interface HealthStats {
  calls: number;
  errors: number;
  errorRate: number | null;
  latency: LatencyRow[];
  errorList: { at: string; route: string; who: string; message: string; traceId: string }[];
  /** [weekday][hour] counts of listings + checks. */
  heat: number[][];
  lastTrace: string | null;
  environments: Count[];
}

export function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function healthStats(data: DashboardData): HealthStats {
  const gens = data.generations;
  const routes: Route[] = ["analyse", "valuate", "format", "refine"];
  const latency = routes.map((route) => {
    const rs = gens.filter((g) => g.route === route);
    const ls = rs.map((g) => g.latency).filter((l): l is number => l !== null).sort((a, b) => a - b);
    return { route, n: rs.length, p50: percentile(ls, 50), p95: percentile(ls, 95), max: ls.at(-1) ?? null, errors: rs.filter(isError).length };
  });
  const heat = WEEKDAYS.map(() => new Array<number>(24).fill(0));
  for (const g of gens) {
    if (!(isListing(g) || g.route === "valuate")) continue;
    heat[weekdayOf(g.startTime)][hourOf(g.startTime)]++;
  }
  const errors = gens.filter(isError);
  return {
    calls: gens.length,
    errors: errors.length,
    errorRate: gens.length ? errors.length / gens.length : null,
    latency,
    errorList: errors
      .map((g) => ({ at: g.startTime, route: g.name, who: labelFor(data.accounts, g.userId), message: g.statusMessage || "no message", traceId: g.traceId }))
      .sort((a, b) => (a.at < b.at ? 1 : -1)),
    heat,
    lastTrace: gens.map((g) => g.startTime).sort().at(-1) ?? null,
    environments: countBy(gens, (g) => g.environment),
  };
}

// ── Speed ──────────────────────────────────────────────────────────────────

/**
 * What a person waits on, rather than what the model did. A market check is
 * one task however many platforms it fanned out to, and its wait is the
 * slowest of them. Rejected reads stop early and errors never finish, so
 * neither counts as a wait.
 */
export type Task = "read" | "check" | "switch" | "chips";

export const TASKS: { task: Task; label: string; what: string; target: number; edges: number[] }[] = [
  { task: "read", label: "The read", what: "photos to a written listing", target: 20, edges: [5, 10, 15, 20, 30] },
  { task: "check", label: "A market check", what: "every enabled platform, the slowest one", target: 120, edges: [30, 60, 90, 120, 180] },
  { task: "switch", label: "A switch", what: "another platform or tone", target: 15, edges: [3, 6, 9, 12, 15] },
  { task: "chips", label: "Chips", what: "a rewrite from the chips tapped", target: 15, edges: [3, 6, 9, 12, 15] },
];

export interface Bucket {
  label: string;
  count: number;
}

export interface TaskSpeed {
  task: Task;
  label: string;
  what: string;
  n: number;
  p50: number | null;
  p95: number | null;
  max: number | null;
  /** Seconds a person should not have to wait beyond. */
  target: number;
  /** How many waits went past the target. */
  over: number;
  buckets: Bucket[];
}

export interface Wait {
  at: string;
  task: Task;
  who: string;
  userId: string | null;
  sessionId: string | null;
  seconds: number;
  traceId: string;
  /** For a check, the platform that held it up. */
  detail: string | null;
}

export interface SpeedStats {
  tasks: TaskSpeed[];
  /** Per day, per task: the typical and the slow wait. Null on days with none. */
  byDay: { day: string; typical: Record<Task, number | null>; slow: Record<Task, number | null> }[];
  /** Per platform in a market check: how long it took, and how often it was the one holding the check up. */
  checkByPlatform: { platform: string; n: number; p50: number | null; p95: number | null; heldUp: number }[];
  checks: number;
  readByPhotos: { photos: number; n: number; p50: number | null; p95: number | null }[];
  slowest: Wait[];
}

function stats(values: number[]): { p50: number | null; p95: number | null; max: number | null } {
  const sorted = [...values].sort((a, b) => a - b);
  return { p50: percentile(sorted, 50), p95: percentile(sorted, 95), max: sorted.at(-1) ?? null };
}

/** Bucket waits by the task's edges; the last bucket is everything past the final edge. */
export function bucketise(values: number[], edges: number[]): Bucket[] {
  const labels = edges.map((e, i) => (i === 0 ? `under ${e}s` : `${edges[i - 1]}–${e}s`)).concat(`over ${edges.at(-1)}s`);
  const counts = new Array<number>(labels.length).fill(0);
  for (const v of values) {
    const i = edges.findIndex((e) => v < e);
    counts[i === -1 ? edges.length : i]++;
  }
  return labels.map((label, i) => ({ label, count: counts[i] }));
}

/** Every wait in the range, one per task instance. */
export function waits(data: DashboardData): Wait[] {
  const out: Wait[] = [];
  const who = (userId: string | null) => labelFor(data.accounts, userId);
  for (const g of data.generations) {
    if (g.route === "valuate" || isError(g) || g.latency === null) continue;
    if (g.route === "analyse" && !isListing(g)) continue;
    const task: Task = g.route === "analyse" ? "read" : g.route === "format" ? "switch" : "chips";
    out.push({ at: g.startTime, task, who: who(g.userId), userId: g.userId, sessionId: g.sessionId, seconds: g.latency, traceId: g.traceId, detail: null });
  }
  const slowestPlatform = new Map<string, { platform: string | null; latency: number }>();
  for (const g of data.generations) {
    if (g.route !== "valuate" || g.latency === null) continue;
    const best = slowestPlatform.get(g.traceId);
    if (!best || best.latency < g.latency) slowestPlatform.set(g.traceId, { platform: g.platform, latency: g.latency });
  }
  for (const c of marketChecks(data.generations)) {
    if (c.errored || c.latency <= 0) continue;
    out.push({ at: c.startTime, task: "check", who: who(c.userId), userId: c.userId, sessionId: c.sessionId, seconds: c.latency, traceId: c.traceId, detail: slowestPlatform.get(c.traceId)?.platform ?? null });
  }
  return out;
}

export function speedStats(data: DashboardData): SpeedStats {
  const all = waits(data);
  const gens = data.generations;

  const tasks = TASKS.map((t) => {
    const secs = all.filter((w) => w.task === t.task).map((w) => w.seconds);
    return { ...t, n: secs.length, ...stats(secs), over: secs.filter((s) => s > t.target).length, buckets: bucketise(secs, t.edges) };
  });

  const days = dayKeys(data);
  const perDay = new Map<string, Record<Task, number[]>>(days.map((d) => [d, { read: [], check: [], switch: [], chips: [] }]));
  for (const w of all) perDay.get(dayKey(w.at))?.[w.task].push(w.seconds);
  const byDay = days.map((day) => {
    const d = perDay.get(day)!;
    const pick = (p: 50 | 95) => (task: Task) => percentile([...d[task]].sort((a, b) => a - b), p);
    const typical = Object.fromEntries(TASKS.map((t) => [t.task, pick(50)(t.task)])) as Record<Task, number | null>;
    const slow = Object.fromEntries(TASKS.map((t) => [t.task, pick(95)(t.task)])) as Record<Task, number | null>;
    return { day, typical, slow };
  });

  const checks = all.filter((w) => w.task === "check");
  const heldUp = countBy(checks, (w) => w.detail, 100);
  const checkByPlatform = [...groupBy(gens.filter((g) => g.route === "valuate" && g.platform && !isError(g) && g.latency !== null), (g) => g.platform!)]
    .map(([platform, gs]) => ({ platform, n: gs.length, ...stats(gs.map((g) => g.latency!)), heldUp: heldUp.find((h) => h.label === platform)?.count ?? 0 }))
    .sort((a, b) => (b.p50 ?? 0) - (a.p50 ?? 0));

  const readByPhotos = [...groupBy(gens.filter((g) => isListing(g) && g.latency !== null && photoCountOf(g) !== null), (g) => String(photoCountOf(g)))]
    .map(([photos, gs]) => ({ photos: Number(photos), n: gs.length, ...stats(gs.map((g) => g.latency!)) }))
    .sort((a, b) => a.photos - b.photos);

  return {
    tasks,
    byDay,
    checkByPlatform,
    checks: checks.length,
    readByPhotos,
    slowest: [...all].sort((a, b) => b.seconds - a.seconds).slice(0, 12),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}
