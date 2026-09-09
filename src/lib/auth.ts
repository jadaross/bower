import { anonClient } from "@/lib/supabase";
import { runWithRequestContext, scheduleFlush } from "@/lib/observability";

/**
 * Bearer-token authentication. See ADR-0006.
 *
 * Token-based rather than cookie-based: the client is a native iOS app holding
 * a Supabase session, not a browser with a cookie jar.
 */

export interface AuthedUser {
  /** The Supabase auth identity. Comes from the verified token, never the client. */
  id: string;
  /** Passed on to `userClient` so downstream queries run under the caller's RLS. */
  token: string;
}

/**
 * Why the failures are distinct (#8): the client has to react differently to
 * each. A missing token means "you were never signed in" — show the sign-in
 * screen. An expired one means "refresh and retry" and should be invisible to
 * the user. A malformed or rejected one means the stored session is corrupt
 * and the right move is to sign out and start again.
 */
export type AuthFailure = "missing_token" | "malformed_token" | "expired_token" | "invalid_token";

const MESSAGES: Record<AuthFailure, string> = {
  missing_token: "Authorization header with a bearer token is required",
  malformed_token: "Bearer token is not a well-formed JWT",
  expired_token: "Bearer token has expired",
  invalid_token: "Bearer token was rejected",
};

export type AuthResult = { user: AuthedUser } | { failure: AuthFailure };

/** The bare token from `Authorization: Bearer <token>`, if there is one. */
function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() || null : null;
}

/**
 * Reads a JWT's claims WITHOUT verifying its signature. Used only to tell
 * "expired" apart from "malformed" before the network round-trip — the
 * claims are never trusted for identity. The user id always comes from
 * Supabase's verification below.
 */
function unverifiedClaims(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    return typeof decoded === "object" && decoded !== null ? decoded : null;
  } catch {
    return null;
  }
}

export async function authenticate(request: Request): Promise<AuthResult> {
  const token = bearerToken(request);
  if (!token) return { failure: "missing_token" };

  const claims = unverifiedClaims(token);
  if (!claims) return { failure: "malformed_token" };
  // Checked locally first so an expired token is reported as expired rather
  // than lumped in with tokens Supabase rejects for any other reason.
  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
    return { failure: "expired_token" };
  }

  // The actual verification: signature, issuer and whether the user still
  // exists are all Supabase's call, not ours.
  const { data, error } = await anonClient().auth.getUser(token);
  if (error || !data?.user) return { failure: "invalid_token" };

  return { user: { id: data.user.id, token } };
}

export function unauthorised(failure: AuthFailure): Response {
  return Response.json({ error: MESSAGES[failure], code: failure }, { status: 401 });
}

export type AuthedHandler = (request: Request, user: AuthedUser) => Promise<Response>;

/**
 * Wraps a route handler so it only ever runs for a verified caller. Applied to
 * every route: metering needs someone to meter (ADR-0007), so there is no such
 * thing as an anonymous request here.
 */
export function withAuth(handler: AuthedHandler): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const result = await authenticate(request);
    if ("failure" in result) return unauthorised(result.failure);
    // Observability (#37): stash the caller + route so nested LLM calls can tag
    // their traces, and flush spans after the response. No-op without keys.
    const route = new URL(request.url).pathname;
    return runWithRequestContext({ userId: result.user.id, route }, async () => {
      const response = await handler(request, result.user);
      scheduleFlush();
      return response;
    });
  };
}
