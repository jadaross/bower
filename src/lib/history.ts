import type { Listing, Platform, Recommendation, Valuation } from "@/lib/types";
import { userClient } from "@/lib/supabase";

/**
 * Text-only item history (no images). Written as the caller, so RLS scopes
 * every row to its owner. Writes are **best-effort**: a history failure must
 * never break the analyse/valuate request that triggered it — the user's work
 * matters more than the record of it.
 *
 * One item's journey is correlated by `session_id` (the `x-bower-session`
 * header, the same id that groups its Langfuse traces): analyse inserts the
 * row, valuate updates that row.
 */

/** A stored history row, as the client reads it. */
export interface HistoryItem {
  id: string;
  created_at: string;
  session_id: string | null;
  brand: string;
  clothing_type: string;
  title: string;
  colour_primary: string | null;
  size: string | null;
  condition: string;
  price_min: number | null;
  price_max: number | null;
  preferred_platform: Platform | null;
  /** The full Neutral Listing as first seen; null on older rows. */
  listing: Listing | null;
  valuation: StoredValuation | null;
}

/** What the `valuation` column holds once a price search has run. */
export interface StoredValuation {
  perPlatform: Valuation["perPlatform"];
  query: string;
  recommendation: Recommendation | null;
}

const TABLE = "item_history";

/** Record an analysed item. Best-effort. */
export async function recordItem(
  token: string,
  params: { userId: string; sessionId?: string; listing: Listing; preferredPlatform?: Platform }
): Promise<void> {
  const { userId, sessionId, listing, preferredPlatform } = params;
  try {
    const { error } = await userClient(token)
      .from(TABLE)
      .insert({
        // The row's owner. RLS checks auth.uid() = user_id, and the column is
        // NOT NULL — without this every insert failed and no history was kept.
        user_id: userId,
        session_id: sessionId ?? null,
        brand: listing.brand,
        clothing_type: listing.clothing_type,
        title: listing.title,
        colour_primary: listing.colour_primary,
        size: listing.size,
        condition: listing.condition,
        price_min: listing.price_min,
        price_max: listing.price_max,
        preferred_platform: preferredPlatform ?? null,
        // The whole Neutral Listing, so the detail view can show it as first seen.
        listing,
      });
    if (error) console.warn("[history] recordItem failed:", error.message);
  } catch (err) {
    console.warn("[history] recordItem threw:", err);
  }
}

/** Attach a Valuation to the item for this session. Best-effort; no-op without a session. */
export async function recordValuation(
  token: string,
  sessionId: string | undefined,
  valuation: StoredValuation
): Promise<void> {
  if (!sessionId) return;
  try {
    const { error } = await userClient(token)
      .from(TABLE)
      .update({ valuation })
      .eq("session_id", sessionId);
    if (error) console.warn("[history] recordValuation failed:", error.message);
  } catch (err) {
    console.warn("[history] recordValuation threw:", err);
  }
}

/** The caller's history, newest first. Scoped to them by RLS. */
export async function listHistory(
  token: string,
  opts: { limit?: number; before?: string } = {}
): Promise<HistoryItem[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  let query = userClient(token)
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.before) query = query.lt("created_at", opts.before);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as HistoryItem[];
}

/**
 * Clears the caller's whole history. As the caller, so RLS and the delete
 * policy (migration 0012) scope it to their own rows; `userId` narrows it
 * again explicitly, belt and braces, as the profile writes do.
 */
export async function clearHistory(token: string, userId: string): Promise<void> {
  const { error } = await userClient(token).from(TABLE).delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}
