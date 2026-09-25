import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * A throwaway Postgres (PGlite, in-process) with every migration applied, for
 * testing the SQL that does the counting. Supabase's `auth` schema and roles
 * are stood in for with the few pieces the migrations touch.
 */
export async function migratedDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  const dir = join(process.cwd(), "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  return db;
}

/** A signed-up user: the auth row, and the profile its trigger makes. */
export async function newUser(db: PGlite, id = crypto.randomUUID()): Promise<string> {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.com`]);
  return id;
}
