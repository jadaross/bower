import { serviceClient } from "@/lib/supabase";

/**
 * The Allowance meter. See ADR-0007 — metered from day one, though nothing is
 * charged yet, because metering is the expensive half to retrofit.
 *
 * The counting itself lives in Postgres (`spend_allowance`), not here. Two
 * valuations racing on one account would otherwise both read the same last
 * remaining unit and both spend it; a single SQL statement makes Postgres
 * re-check the limit after taking the row lock. This module is only the
 * translation between that function and an HTTP response.
 */

/** The two meters: a generation ("read") and a market check ("search"). */
export type AllowanceKind = "read" | "search";

export interface AllowanceState {
  used: number;
  /** Per month. Null means no limit (the owner's account). */
  limit: number | null;
  /** When the period rolls over and the meter goes back to zero. ISO-8601. */
  resetsAt: string;
}

export interface SpendResult extends AllowanceState {
  allowed: boolean;
}

interface AllowanceRow {
  allowed: boolean;
  allowance_used: number;
  allowance_limit: number | null;
  resets_at: string;
}

/**
 * Reserves one unit. Call this BEFORE the work, not after: reserving is what
 * makes the race safe. A caller whose work then fails must call `refund`.
 */
export async function spendAllowance(userId: string, kind: AllowanceKind): Promise<SpendResult> {
  const { data, error } = await serviceClient().rpc("spend_allowance", { p_user_id: userId, p_kind: kind });

  if (error) throw new Error(`Allowance check failed: ${error.message}`);

  // No rows means no profile — a verified user should always have one, so this
  // is a broken invariant rather than an exhausted Allowance, and must not be
  // reported to the client as "you have run out".
  //
  // Cast because the client is untyped: there are no generated database types
  // in the repo, so `rpc` cannot know this function's return shape. The shape
  // is pinned by `supabase/migrations/0011_two_meters.sql`.
  const row = (data as AllowanceRow[] | null)?.[0];
  if (!row) throw new Error(`No profile for user ${userId}`);

  return {
    allowed: row.allowed,
    used: row.allowance_used,
    limit: row.allowance_limit,
    resetsAt: row.resets_at,
  };
}

/**
 * Hands back a reserved unit after the work failed. Best-effort: a failure to
 * refund must not turn a failed valuation into a second error for the caller,
 * so it is logged rather than thrown. The worst case is one unit lost.
 */
export async function refundAllowance(userId: string, kind: AllowanceKind): Promise<void> {
  const { error } = await serviceClient().rpc("refund_allowance", { p_user_id: userId, p_kind: kind });
  if (error) console.error(`Failed to refund an Allowance unit for ${userId}: ${error.message}`);
}

/** 402 with everything the client needs to explain the wall it just hit. */
export function allowanceExhausted(state: AllowanceState, kind: AllowanceKind): Response {
  return Response.json(
    {
      error: kind === "read"
        ? "Your generations for this month are used up"
        : "Your market checks for this month are used up",
      code: "allowance_exhausted",
      kind,
      allowance: { used: state.used, limit: state.limit, resets_at: state.resetsAt },
    },
    { status: 402 }
  );
}
