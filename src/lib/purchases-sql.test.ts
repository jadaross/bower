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
  it("shows listings and market checks as unlimited", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, searches_used = 3", [inAMonth()]);
    expect(await spend(u, "read")).toMatchObject({ allowed: true, allowance_limit: null, source: "plus" });
    expect(await spend(u, "search")).toMatchObject({ allowed: true, allowance_limit: null, source: "plus" });
  });

  it("stops market checks at the fair-use ceiling of 50", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, searches_used = 49", [inAMonth()]);
    expect(await spend(u, "search")).toMatchObject({ allowed: true });
    expect(await spend(u, "search")).toMatchObject({ allowed: false });
  });

  it("stops at the fair-use ceiling of 150 listings, then spends the pack", async () => {
    const u = await newUser(db);
    await set(u, "plus_expires_at = $2, reads_used = 150, pack_listings = 1", [inAMonth()]);
    expect(await spend(u, "read")).toMatchObject({ allowed: true, source: "pack" });
    expect(await spend(u, "read")).toMatchObject({ allowed: false });
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
