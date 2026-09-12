import { describe, expect, it } from "vitest";
import type { Generation, Score } from "./langfuse";
import type { Account, HistoryRow, Note } from "./supabase";
import {
  costStats,
  dayKey,
  feedbackStats,
  healthStats,
  isListing,
  labelFor,
  marketChecks,
  people,
  percentile,
  photoStats,
  rangeFor,
  recentEvents,
  rejectionOf,
  speedStats,
  bucketise,
  waits,
  summary,
  type DashboardData,
} from "./metrics";

const OWNER = "00000000-0000-0000-0000-000000000001";
const FRIEND = "00000000-0000-0000-0000-000000000002";

function account(over: Partial<Account>): Account {
  return {
    id: FRIEND,
    email: "sam@example.com",
    hidesEmail: false,
    firstName: null,
    lastName: null,
    createdAt: "2026-09-10T10:00:00.000Z",
    lastSignInAt: null,
    market: "GB",
    enabledPlatforms: ["vinted", "depop"],
    preferredPlatform: "vinted",
    sellerNotes: [],
    readsUsed: 1,
    readsLimit: 10,
    searchesUsed: 0,
    searchesLimit: 3,
    isOwner: false,
    ...over,
  };
}

function gen(over: Partial<Generation>): Generation {
  const name = over.name ?? "analyse";
  return {
    id: Math.random().toString(36).slice(2),
    traceId: over.traceId ?? Math.random().toString(36).slice(2),
    projectId: "p",
    name,
    route: name.startsWith("valuate") ? "valuate" : (name as Generation["route"]),
    platform: name.startsWith("valuate:") ? name.slice(8) : null,
    startTime: "2026-09-11T12:00:00.000Z",
    endTime: null,
    level: "DEFAULT",
    statusMessage: "",
    environment: "production",
    model: "claude-sonnet-5",
    userId: FRIEND,
    sessionId: "S1",
    latency: 5,
    usage: { input: 100, output: 10, total: 110 },
    cost: { input: 0.01, output: 0.001, total: 0.011 },
    ...over,
  };
}

function data(over: Partial<DashboardData> = {}): DashboardData {
  return {
    range: rangeFor("30d", new Date("2026-09-11T20:00:00.000Z")),
    includeOwner: false,
    fetchedAt: "2026-09-11T20:00:00.000Z",
    projectId: "p",
    generations: [],
    scores: [],
    accounts: [account({}), account({ id: OWNER, email: "owner@example.com", readsLimit: null, searchesLimit: null, isOwner: true })],
    history: [],
    notes: [],
    ...over,
  };
}

describe("rangeFor", () => {
  it("defaults to 30 days and counts today as a day", () => {
    const r = rangeFor(undefined, new Date("2026-09-11T20:00:00.000Z"));
    expect(r.key).toBe("30d");
    expect(r.from?.toISOString()).toBe("2026-08-13T00:00:00.000Z");
  });
  it("all has no start", () => {
    expect(rangeFor("all").from).toBeNull();
  });
});

describe("dayKey", () => {
  it("buckets by London time, not UTC", () => {
    // 23:30 UTC in British Summer Time is 00:30 the next day.
    expect(dayKey("2026-09-10T23:30:00.000Z")).toBe("2026-09-11");
  });
});

describe("classification", () => {
  it("a rejected analyse is not a listing", () => {
    const g = gen({ output: { rejected: "not_clothing" } });
    expect(rejectionOf(g)).toBe("not_clothing");
    expect(isListing(g)).toBe(false);
  });
  it("an errored analyse is not a listing", () => {
    expect(isListing(gen({ level: "ERROR" }))).toBe(false);
  });
  it("one market check per trace, however many platforms", () => {
    const checks = marketChecks([
      gen({ name: "valuate:vinted", traceId: "T", cost: { input: 0, output: 0, total: 0.2 }, latency: 40 }),
      gen({ name: "valuate:depop", traceId: "T", cost: { input: 0, output: 0, total: 0.1 }, latency: 90 }),
      gen({ name: "valuate:ebay", traceId: "U", cost: { input: 0, output: 0, total: 0.15 } }),
    ]);
    expect(checks).toHaveLength(2);
    const t = checks.find((c) => c.traceId === "T")!;
    expect(t.cost).toBeCloseTo(0.3);
    expect(t.latency).toBe(90);
    expect(t.platforms.sort()).toEqual(["depop", "vinted"]);
  });
});

describe("labelFor", () => {
  it("names people by email, marks relays and the owner", () => {
    const accounts = [
      account({}),
      account({ id: OWNER, isOwner: true }),
      account({ id: "r", email: "abc123xyz@privaterelay.appleid.com", hidesEmail: true }),
    ];
    expect(labelFor(accounts, FRIEND)).toBe("sam");
    expect(labelFor(accounts, OWNER)).toBe("you");
    expect(labelFor(accounts, "r")).toBe("hidden email · abc123xy");
    expect(labelFor(accounts, "gone-000000")).toMatch(/^deleted/);
  });

  it("prefers the full name from 'introduce yourself' over the email", () => {
    const accounts = [account({ firstName: "Jada", lastName: "Ross" })];
    expect(labelFor(accounts, FRIEND)).toBe("Jada Ross");
  });

  it("falls back to just the first name when there is no last name yet", () => {
    const accounts = [account({ firstName: "Jada", lastName: null })];
    expect(labelFor(accounts, FRIEND)).toBe("Jada");
  });
});

const HISTORY_ROW: HistoryRow = {
  id: "h1",
  userId: FRIEND,
  createdAt: "2026-09-11T12:00:00.000Z",
  sessionId: "S1",
  brand: "Nike",
  clothingType: "Hoodie",
  title: "Nike hoodie",
  colourPrimary: null,
  size: null,
  condition: "Good",
  priceMin: null,
  priceMax: null,
  preferredPlatform: "vinted",
  mainCategory: null,
  gender: null,
  valuation: null,
};

describe("summary and people", () => {
  const d = data({
    generations: [
      gen({ traceId: "A", input: { photoCount: 3, tone: "casual", platform: "vinted" } }),
      gen({ traceId: "B", output: { rejected: "explicit" } }),
      gen({ name: "valuate:vinted", traceId: "C" }),
      gen({ name: "format", traceId: "D" }),
    ],
    scores: [
      { id: "1", name: "thumbs", value: true, dataType: "BOOLEAN", timestamp: "2026-09-11T12:01:00.000Z", comment: null, traceId: "A", environment: "production" },
      { id: "2", name: "copied", value: 1, dataType: "NUMERIC", timestamp: "2026-09-11T12:02:00.000Z", comment: null, traceId: "D", environment: "production" },
    ] satisfies Score[],
    history: [HISTORY_ROW],
  });

  it("counts listings, rejections, checks and signals", () => {
    const s = summary(d);
    expect(s.accounts).toBe(1); // owner left out
    expect(s.listings).toBe(1);
    expect(s.rejections).toBe(1);
    expect(s.checks).toBe(1);
    expect(s.thumbsUp).toBe(1);
    expect(s.copied).toBe(1);
    expect(s.neverWrote).toBe(0);
  });

  it("rolls up per person", () => {
    const rows = people(d);
    expect(rows).toHaveLength(1);
    expect(rows[0].listings).toBe(1);
    expect(rows[0].rejections).toBe(1);
    expect(rows[0].formats).toBe(1);
    expect(rows[0].thumbsUp).toBe(1);
    expect(rows[0].activeDays).toEqual(["2026-09-11"]);
  });

  it("includes the owner only when asked", () => {
    expect(people({ ...d, includeOwner: true })).toHaveLength(2);
  });

  it("flags people who signed up and never wrote", () => {
    expect(summary(data({ generations: [] })).neverWrote).toBe(1);
  });

  it("counts a listing whose analyse trace never reached Langfuse", () => {
    // The write (allowance spend + history row) is the ground truth; the
    // Langfuse trace is best-effort and can go missing (e.g. a cold start).
    // Only a later valuate trace exists here, same as the real incident.
    const untraced = data({
      generations: [gen({ name: "valuate:vinted", traceId: "C", sessionId: "S9" })],
      history: [{ ...HISTORY_ROW, sessionId: "S9" }],
    });
    expect(summary(untraced).listings).toBe(1);
    expect(people(untraced)[0].listings).toBe(1);
    expect(recentEvents(untraced).some((e) => e.kind === "listing")).toBe(true);
  });
});

describe("photoStats", () => {
  it("reads photo counts and tag photos from the analyse io", () => {
    const p = photoStats(
      data({
        generations: [
          gen({ input: { photoCount: 2 }, output: { photo_analysis: { has_tag_photo: true } } }),
          gen({ input: { photoCount: 4 }, output: { photo_analysis: { has_tag_photo: false } } }),
          gen({ input: { photoCount: 1 }, output: { rejected: "not_clothing" } }),
        ],
      })
    );
    expect(p.listings).toBe(2);
    expect(p.avgPhotos).toBe(3);
    expect(p.distribution.map((x) => x.count)).toEqual([0, 1, 0, 1, 0]);
    expect(p.withTagPhoto).toBe(1);
    expect(p.rejections).toEqual([{ label: "not clothing", count: 1 }]);
  });
});

describe("feedbackStats", () => {
  it("counts copies per listing, not per tap, and builds the funnel", () => {
    const d = data({
      generations: [gen({ traceId: "A", sessionId: "S1" }), gen({ traceId: "B", sessionId: "S2" }), gen({ name: "refine", traceId: "R", sessionId: "S1" })],
      scores: [
        { id: "1", name: "copied", value: 1, dataType: "NUMERIC", timestamp: "t", comment: null, traceId: "A", environment: "production" },
        { id: "2", name: "copied", value: 1, dataType: "NUMERIC", timestamp: "t", comment: null, traceId: "A", environment: "production" },
        { id: "3", name: "thumbs", value: false, dataType: "BOOLEAN", timestamp: "t", comment: "too long", traceId: "B", environment: "production" },
      ],
      history: [{ id: "h", userId: FRIEND, createdAt: "t", sessionId: "S2", brand: "Nike", clothingType: "Hoodie", title: "Nike hoodie", colourPrimary: null, size: null, condition: "Good", priceMin: 10, priceMax: 20, preferredPlatform: "vinted", mainCategory: null, gender: null, valuation: null } satisfies HistoryRow],
    });
    const f = feedbackStats(d);
    expect(f.copied).toBe(2);
    expect(f.copiedListings).toBe(1);
    expect(f.funnel.map((x) => x.count)).toEqual([2, 1, 0]);
    expect(f.journey.find((j) => j.label === "Refined with chips")?.count).toBe(1);
    expect(f.thumbsDownList).toHaveLength(1);
    expect(f.thumbsDownList[0].title).toBe("Nike hoodie");
    expect(f.thumbsDownList[0].comment).toBe("too long");
  });

  it("carries notes with who wrote them", () => {
    const note: Note = { id: "n", userId: FRIEND, createdAt: "t", message: "price was off", screen: "listing", sessionId: null, platform: "vinted", traceId: null };
    expect(feedbackStats(data({ notes: [note] })).notes[0].who).toBe("sam");
  });
});

describe("costStats", () => {
  it("prices a listing all-in from everything in its session", () => {
    const c = costStats(
      data({
        generations: [
          gen({ traceId: "A", sessionId: "S1", cost: { input: 0, output: 0, total: 0.02 } }),
          gen({ name: "format", traceId: "F", sessionId: "S1", cost: { input: 0, output: 0, total: 0.005 } }),
          gen({ name: "valuate:vinted", traceId: "V", sessionId: "S1", cost: { input: 0, output: 0, total: 0.2 } }),
        ],
      })
    );
    expect(c.spend).toBeCloseTo(0.225);
    expect(c.perListingRead).toBeCloseTo(0.02);
    expect(c.perListingAllIn).toBeCloseTo(0.225);
    expect(c.perCheck).toBeCloseTo(0.2);
    expect(c.fullMeter).toBeCloseTo(10 * 0.02 + 3 * 0.2);
    expect(c.byRoute.find((r) => r.route === "valuate")?.calls).toBe(1);
  });
});

describe("healthStats", () => {
  it("takes percentiles and lists errors", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([], 50)).toBeNull();
    const h = healthStats(data({ generations: [gen({ latency: 4 }), gen({ latency: 12, level: "ERROR", statusMessage: "overloaded" })] }));
    expect(h.errors).toBe(1);
    expect(h.errorList[0].message).toBe("overloaded");
    expect(h.latency.find((l) => l.route === "analyse")?.p50).toBe(4);
  });
});

describe("speedStats", () => {
  it("buckets waits by the task's edges, with everything past the last edge in one bucket", () => {
    expect(bucketise([1, 5, 7, 40], [5, 10, 15, 20, 30])).toEqual([
      { label: "under 5s", count: 1 },
      { label: "5–10s", count: 2 },
      { label: "10–15s", count: 0 },
      { label: "15–20s", count: 0 },
      { label: "20–30s", count: 0 },
      { label: "over 30s", count: 1 },
    ]);
  });

  it("counts a market check as one wait, the slowest platform, and skips rejections and errors", () => {
    const d = data({
      generations: [
        gen({ latency: 8, input: { photoCount: 3 } }),
        gen({ latency: 14, input: { photoCount: 5 } }),
        gen({ latency: 1, output: { rejected: "not_clothing" } }),
        gen({ latency: 30, level: "ERROR" }),
        gen({ name: "valuate:vinted", traceId: "T1", latency: 40 }),
        gen({ name: "valuate:depop", traceId: "T1", latency: 95 }),
        gen({ name: "valuate:vinted", traceId: "T2", latency: 50 }),
        gen({ name: "valuate:depop", traceId: "T2", latency: 20 }),
        gen({ name: "format", latency: 6 }),
        gen({ name: "refine", latency: 4 }),
      ],
    });
    const all = waits(d);
    expect(all.filter((w) => w.task === "read").map((w) => w.seconds).sort()).toEqual([14, 8]);
    const checks = all.filter((w) => w.task === "check").sort((a, b) => a.seconds - b.seconds);
    expect(checks.map((w) => [w.seconds, w.detail])).toEqual([[50, "vinted"], [95, "depop"]]);

    const s = speedStats(d);
    const read = s.tasks.find((t) => t.task === "read")!;
    expect(read.n).toBe(2);
    expect(read.p50).toBe(8);
    expect(read.max).toBe(14);
    expect(read.over).toBe(0);
    const check = s.tasks.find((t) => t.task === "check")!;
    expect(check.n).toBe(2);
    expect(check.max).toBe(95);
    expect(s.checks).toBe(2);
    expect(s.checkByPlatform.map((p) => [p.platform, p.n, p.heldUp])).toEqual([["vinted", 2, 1], ["depop", 2, 1]]);
    expect(s.readByPhotos.map((r) => [r.photos, r.p50])).toEqual([[3, 8], [5, 14]]);
    expect(s.slowest[0]).toMatchObject({ task: "check", seconds: 95, traceId: "T1" });
    const day = s.byDay.find((r) => r.day === "2026-09-11")!;
    expect(day.typical.read).toBe(8);
    expect(day.slow.check).toBe(95);
    expect(s.byDay.find((r) => r.day === "2026-09-10")!.typical.read).toBeNull();
  });
});
