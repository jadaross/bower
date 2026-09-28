import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { migratedDb, newUser } from "@/test/pg";

/**
 * The counting for Plus and the listing pack lives in SQL (ADR-0010), so it is
 * tested against a real Postgres with every migration applied.
 */

let db: PGlite;
beforeAll(async () => {
  db = await migratedDb();
}, 30_000);

interface Spend {
  allowed: boolean;
  allowance_used: number;
  allowance_limit: number | null;
  source: string | null;
}

async function spend(user: string, kind: "read" | "search"): Promise<Spend> {
  const { rows } = await db.query<Spend>("select * from public.spend_allowance($1, $2)", [user, kind]);
  return rows[0];
}

async function refund(user: string, kind: "read" | "search", source?: string) {
  if (source) await db.query("select public.refund_allowance($1, $2, $3)", [user, kind, source]);
  else await db.query("select public.refund_allowance($1, $2)", [user, kind]);
}

async function profile(user: string) {
  const { rows } = await db.query<{
    reads_used: number;
    searches_used: number;
    pack_listings: number;
    plus_expires_at: Date | null;
  }>("select reads_used, searches_used, pack_listings, plus_expires_at from public.profiles where id = $1", [user]);
  return rows[0];
}

async function set(user: string, sql: string, params: unknown[] = []) {
  await db.query(`update public.profiles set ${sql} where id = $1`, [user, ...params]);
}

interface Tx {
  user?: string | null;
  id?: string;
  original?: string;
  kind: "plus" | "pack";
  purchased?: string;
  expires?: string | null;
  revoked?: string | null;
}

async function apply(tx: Tx): Promise<string | null> {
  const id = tx.id ?? crypto.randomUUID();
  const { rows } = await db.query<{ apply_transaction: string | null }>(
    "select public.apply_transaction($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [
      tx.user ?? null,
      id,
      tx.original ?? id,
      tx.kind === "plus" ? "bower.plus.monthly" : "bower.listings.10",
      tx.kind,
      "Sandbox",
      tx.purchased ?? new Date().toISOString(),
      tx.expires ?? null,
      tx.revoked ?? null,
      "signed.jws.payload",
    ]
  );
  return rows[0].apply_transaction;
}

const inAMonth = () => new Date(Date.now() + 30 * 864e5).toISOString();
const yesterday = () => new Date(Date.now() - 864e5).toISOString();

describe("spending listings: the month's free ones, then the pack", () => {
  it("spends free listings first and says so", async () => {
    const u = await newUser(db);
    await set(u, "pack_listings = 10");
    const s = await spend(u, "read");
    expect(s).toMatchObject({ allowed: true, allowance_used: 1, source: "monthly" });
    expect((await profile(u)).pack_listings).toBe(10);
  });

  it("spends the pack once the free ones are gone", async () => {
    const u = await newUser(db);
    await set(u, "reads_used = reads_limit, pack_listings = 2");
    const s = await spend(u, "read");
    expect(s).toMatchObject({ allowed: true, source: "pack" });
    expect(await profile(u)).toMatchObject({ pack_listings: 1 });
  });

  it("refuses when both are gone", async () => {
    const u = await newUser(db);
    await set(u, "reads_used = reads_limit, pack_listings = 0");
    expect(await spend(u, "read")).toMatchObject({ allowed: false, source: null });
  });

  it("hands a refunded pack listing back to the pack, not the month", async () => {
    const u = await newUser(db);
    await set(u, "reads_used = reads_limit, pack_listings = 3");
    await spend(u, "read");
    await refund(u, "read", "pack");
    const p = await profile(u);
    expect(p.pack_listings).toBe(3);
  });

  it("refunds to the month when no source is named, as older code does", async () => {
    const u = await newUser(db);
    await spend(u, "read");
    await refund(u, "read");
    expect((await profile(u)).reads_used).toBe(0);
  });

  it("never spends the pack on a market check", async () => {
    const u = await newUser(db);
    await set(u, "searches_used = searches_limit, pack_listings = 5");
    expect(await spend(u, "search")).toMatchObject({ allowed: false });
    expect((await profile(u)).pack_listings).toBe(5);
  });

  it("gives the month back before touching the pack when the month rolls over", async () => {
    const u = await newUser(db);
    await set(u, "reads_used = reads_limit, pack_listings = 4, allowance_period_start = now() - interval '2 months'");
    expect(await spend(u, "read")).toMatchObject({ allowed: true, allowance_used: 1, source: "monthly" });
    expect((await profile(u)).pack_listings).toBe(4);
  });
});

describe("Plus", () => {
  it("shows listings as unlimited and market checks as 50 a month", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, searches_used = 3", [inAMonth()]);
    expect(await spend(u, "read")).toMatchObject({ allowed: true, allowance_limit: null, source: "plus" });
    expect(await spend(u, "search")).toMatchObject({ allowed: true, allowance_limit: 50, source: "plus" });
  });

  // Jada, 28 Sep: "unlimited" has to mean it (ASA, ACCC, FTC), so a person
  // writing listings is never stopped; only a bot's pace is.
  it("never stops a person writing listings, however many in a month", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, reads_used = 500", [inAMonth()]);
    expect(await spend(u, "read")).toMatchObject({ allowed: true, source: "plus" });
  });

  it("slows a bot down at 60 listings in an hour, and lets it go again an hour on", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, plus_hour_start = now(), plus_hour_count = 60", [inAMonth()]);
    expect(await spend(u, "read")).toMatchObject({ allowed: false, source: "rate_limited" });
    await set(u, "plus_hour_start = now() - interval '61 minutes'");
    expect(await spend(u, "read")).toMatchObject({ allowed: true, source: "plus" });
  });

  it("stops market checks at the fair-use ceiling of 50", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, searches_used = 49", [inAMonth()]);
    expect(await spend(u, "search")).toMatchObject({ allowed: true });
    expect(await spend(u, "search")).toMatchObject({ allowed: false });
  });

  // Unlimited while it lasts, but a refusal has to name the real ceiling, or
  // the app keeps reading "unlimited" and offers a button that always fails.
  it("names the market-check ceiling when it refuses", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, searches_used = 50", [inAMonth()]);
    expect(await spend(u, "search")).toMatchObject({ allowed: false, allowance_limit: 50 });
  });

  it("keeps a bought pack untouched while Plus is on", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, reads_used = 300, pack_listings = 4", [inAMonth()]);
    expect(await spend(u, "read")).toMatchObject({ allowed: true, source: "plus" });
    expect((await profile(u)).pack_listings).toBe(4);
  });

  it("goes back to the free numbers once it has expired", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, reads_used = reads_limit", [yesterday()]);
    expect(await spend(u, "read")).toMatchObject({ allowed: false });
  });

  it("never lowers an account that already has more, such as the owner's", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, reads_limit = null, searches_limit = null, searches_used = 40", [inAMonth()]);
    expect(await spend(u, "search")).toMatchObject({ allowed: true, allowance_limit: null });
    expect(await spend(u, "read")).toMatchObject({ allowed: true, allowance_limit: null });
  });
});

describe("apply_transaction", () => {
  it("adds 10 listings for a pack, once, however often it is replayed", async () => {
    const u = await newUser(db);
    const id = crypto.randomUUID();
    expect(await apply({ user: u, id, kind: "pack" })).toBe(u);
    await apply({ user: u, id, kind: "pack" });
    expect((await profile(u)).pack_listings).toBe(10);
  });

  it("takes a refunded pack back, never below zero", async () => {
    const u = await newUser(db);
    const id = crypto.randomUUID();
    await apply({ user: u, id, kind: "pack" });
    await set(u, "pack_listings = 4");
    await apply({ user: u, id, kind: "pack", revoked: new Date().toISOString() });
    expect((await profile(u)).pack_listings).toBe(0);
    await apply({ user: u, id, kind: "pack", revoked: new Date().toISOString() });
    expect((await profile(u)).pack_listings).toBe(0);
  });

  it("switches Plus on until the subscription expires", async () => {
    const u = await newUser(db);
    const expires = inAMonth();
    await apply({ user: u, kind: "plus", expires });
    expect((await profile(u)).plus_expires_at?.toISOString()).toBe(new Date(expires).toISOString());
  });

  it("extends Plus on renewal, found by the original transaction with no user given", async () => {
    const u = await newUser(db);
    const original = crypto.randomUUID();
    await apply({ user: u, id: original, original, kind: "plus", expires: yesterday() });
    const later = inAMonth();
    expect(await apply({ user: null, original, kind: "plus", expires: later })).toBe(u);
    expect((await profile(u)).plus_expires_at?.toISOString()).toBe(new Date(later).toISOString());
  });

  it("switches Plus off when the subscription is refunded", async () => {
    const u = await newUser(db);
    const id = crypto.randomUUID();
    await apply({ user: u, id, kind: "plus", expires: inAMonth() });
    await apply({ user: u, id, kind: "plus", expires: inAMonth(), revoked: new Date().toISOString() });
    expect((await profile(u)).plus_expires_at).toBeNull();
  });

  it("returns no user for a renewal it has never seen the start of", async () => {
    expect(await apply({ user: null, kind: "plus", expires: inAMonth() })).toBeNull();
  });

  it("keeps a transaction with the account it was first recorded against", async () => {
    const a = await newUser(db);
    const b = await newUser(db);
    const id = crypto.randomUUID();
    await apply({ user: a, id, kind: "pack" });
    expect(await apply({ user: b, id, kind: "pack" })).toBe(a);
    expect((await profile(b)).pack_listings).toBe(0);
  });

  it("goes with the account when it is deleted", async () => {
    const u = await newUser(db);
    await apply({ user: u, kind: "pack" });
    await db.query("delete from auth.users where id = $1", [u]);
    const { rows } = await db.query("select 1 from public.purchases where user_id = $1", [u]);
    expect(rows).toHaveLength(0);
  });
});

describe("valuation_cache", () => {
  it("exists, and is closed to signed-in users", async () => {
    const { rows } = await db.query<{ can: boolean }>(
      "select has_table_privilege('authenticated', 'public.valuation_cache', 'select') as can"
    );
    expect(rows[0].can).toBe(false);
  });
});

// #79: a rejected read is refunded, but only so often, so a loop of
// non-clothing photos cannot buy unlimited model time.
describe("refund_rejection", () => {
  async function reject(user: string, source = "monthly"): Promise<boolean> {
    const { rows } = await db.query<{ refund_rejection: boolean }>("select public.refund_rejection($1, $2)", [user, source]);
    return rows[0].refund_rejection;
  }

  it("refunds the first ten rejections of a day, then stops", async () => {
    const u = await newUser(db);
    await set(u, "reads_limit = 20");
    for (let i = 0; i < 11; i++) await spend(u, "read");
    const refunded = [];
    for (let i = 0; i < 11; i++) refunded.push(await reject(u));
    expect(refunded.filter(Boolean)).toHaveLength(10);
    expect(refunded[10]).toBe(false);
    expect((await profile(u)).reads_used).toBe(1);
  });

  it("starts counting again the next day", async () => {
    const u = await newUser(db);
    await set(u, "rejections_refunded = 10, rejections_day = current_date - 1, reads_used = 1");
    expect(await reject(u)).toBe(true);
    expect((await profile(u)).reads_used).toBe(0);
  });

  it("hands a pack listing back to the pack", async () => {
    const u = await newUser(db);
    await set(u, "pack_listings = 2");
    expect(await reject(u, "pack")).toBe(true);
    expect((await profile(u)).pack_listings).toBe(3);
  });
});

// #76: prepared now, applied on launch day. Proven here so the day holds no surprises.
describe("the launch-day free tier", () => {
  it("moves free accounts and new ones to 5 and 1, and leaves the owner unlimited", async () => {
    const { readFileSync } = await import("node:fs");
    const free = await newUser(db);
    const owner = await newUser(db);
    await set(owner, "reads_limit = null, searches_limit = null");
    await db.exec(readFileSync("docs/app-store/launch-day-free-tier.sql", "utf8"));
    const limits = async (id: string) =>
      (await db.query<{ reads_limit: number | null; searches_limit: number | null }>(
        "select reads_limit, searches_limit from public.profiles where id = $1", [id])).rows[0];
    expect(await limits(free)).toEqual({ reads_limit: 5, searches_limit: 1 });
    expect(await limits(owner)).toEqual({ reads_limit: null, searches_limit: null });
    expect(await limits(await newUser(db))).toEqual({ reads_limit: 5, searches_limit: 1 });
  });
});
