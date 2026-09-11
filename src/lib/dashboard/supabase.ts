import { serviceClient } from "@/lib/supabase";
import type { Platform } from "@/lib/types";
import type { StoredValuation } from "@/lib/history";

/**
 * Read-side Supabase queries for the owner's dashboard. These run as the
 * service role because the dashboard reads *everyone's* rows — the one case
 * the per-user client cannot express. Nothing here writes.
 */

export interface Account {
  id: string;
  email: string | null;
  /** Sign in with Apple's Hide My Email hands us a relay address, not theirs. */
  hidesEmail: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  /** Where they sell: GB or AU. */
  market: string;
  enabledPlatforms: Platform[];
  preferredPlatform: Platform | null;
  sellerNotes: string[];
  readsUsed: number;
  readsLimit: number | null;
  searchesUsed: number;
  searchesLimit: number | null;
  /** A null limit on either meter marks the owner's account (migration 0010/0011). */
  isOwner: boolean;
}

export interface HistoryRow {
  id: string;
  userId: string;
  createdAt: string;
  sessionId: string | null;
  brand: string;
  clothingType: string;
  title: string;
  colourPrimary: string | null;
  size: string | null;
  condition: string;
  priceMin: number | null;
  priceMax: number | null;
  preferredPlatform: Platform | null;
  mainCategory: string | null;
  gender: string | null;
  valuation: StoredValuation | null;
}

export interface Note {
  id: string;
  userId: string;
  createdAt: string;
  message: string;
  screen: string | null;
  sessionId: string | null;
  platform: Platform | null;
  traceId: string | null;
}

export async function fetchAccounts(): Promise<Account[]> {
  const db = serviceClient();
  const [users, profiles] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("profiles").select("*"),
  ]);
  if (users.error) throw new Error(`auth.users: ${users.error.message}`);
  if (profiles.error) throw new Error(`profiles: ${profiles.error.message}`);

  const byId = new Map(profiles.data.map((p) => [p.id as string, p]));
  return users.data.users.map((u) => {
    const p = byId.get(u.id);
    const email = u.email ?? null;
    const readsLimit = p?.reads_limit ?? null;
    const searchesLimit = p?.searches_limit ?? null;
    return {
      id: u.id,
      email,
      hidesEmail: !!email && email.endsWith("@privaterelay.appleid.com"),
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      market: (p?.market as string | undefined) ?? "GB",
      enabledPlatforms: (p?.enabled_platforms ?? []) as Platform[],
      preferredPlatform: (p?.preferred_platform ?? null) as Platform | null,
      sellerNotes: (p?.seller_notes ?? []) as string[],
      readsUsed: p?.reads_used ?? 0,
      readsLimit,
      searchesUsed: p?.searches_used ?? 0,
      searchesLimit,
      isOwner: !!p && (readsLimit === null || searchesLimit === null),
    };
  });
}

export async function fetchHistory(): Promise<HistoryRow[]> {
  const { data, error } = await serviceClient()
    .from("item_history")
    .select(
      "id,user_id,created_at,session_id,brand,clothing_type,title,colour_primary,size,condition,price_min,price_max,preferred_platform,valuation,main_category:listing->>main_category,gender:listing->>gender"
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`item_history: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    createdAt: r.created_at,
    sessionId: r.session_id,
    brand: r.brand,
    clothingType: r.clothing_type,
    title: r.title,
    colourPrimary: r.colour_primary,
    size: r.size,
    condition: r.condition,
    priceMin: r.price_min === null ? null : Number(r.price_min),
    priceMax: r.price_max === null ? null : Number(r.price_max),
    preferredPlatform: r.preferred_platform,
    mainCategory: r.main_category ?? null,
    gender: r.gender ?? null,
    valuation: r.valuation,
  }));
}

export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await serviceClient()
    .from("feedback_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`feedback_notes: ${error.message}`);
  return data.map((n) => ({
    id: n.id,
    userId: n.user_id,
    createdAt: n.created_at,
    message: n.message,
    screen: n.screen,
    sessionId: n.session_id,
    platform: n.platform,
    traceId: n.trace_id,
  }));
}
