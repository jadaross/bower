import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * The dashboard is for one person, so it is gated by one password
 * (`DASHBOARD_PASSWORD`). A correct password sets a cookie holding an HMAC of
 * a fixed message under that password — never the password itself — and every
 * page checks the cookie before it loads anything. With no password
 * configured the dashboard does not exist: `requireAdmin` sends every visit to
 * the sign-in page, which says so.
 */

export const COOKIE = "bower_admin";
const MESSAGE = "bower-admin-session-v1";
const MAX_AGE = 60 * 60 * 24 * 30;

function password(): string | null {
  return process.env.DASHBOARD_PASSWORD || null;
}

export function dashboardConfigured(): boolean {
  return password() !== null;
}

function token(): string | null {
  const p = password();
  return p ? createHmac("sha256", p).update(MESSAGE).digest("hex") : null;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function isAdmin(): Promise<boolean> {
  const expected = token();
  if (!expected) return false;
  const got = (await cookies()).get(COOKIE)?.value;
  return !!got && safeEqual(got, expected);
}

/** Call first in every dashboard page. Layouts render in parallel with pages, so a layout cannot gate them. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** True when the password matched; the caller sets the cookie. */
export function checkPassword(candidate: string): boolean {
  const p = password();
  return !!p && safeEqual(candidate, p);
}

export async function setAdminCookie(): Promise<void> {
  const t = token();
  if (!t) return;
  (await cookies()).set(COOKIE, t, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}
