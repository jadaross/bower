import { userClient } from "@/lib/supabase";
import { PLATFORM_IDS, platformsIn } from "@/platforms";
import type { Platform } from "@/lib/types";
import type { AllowanceState } from "@/lib/allowance";
import { SELLER_NOTES, type SellerNote } from "@/lib/seller-notes";
import { DEFAULT_MARKET, MARKETS, isMarket, type Market } from "@/lib/markets";

/**
 * A user's Enabled Platforms and their meter.
 *
 * Enabled Platforms live server-side rather than on the device because both
 * the Valuation and the meter read them (ADR-0006) — and because a client that
 * could pass its own platform list could ask for work it had not enabled.
 *
 * Every query here runs through `userClient`, so RLS and the column grants are
 * doing the enforcing: the read can only ever return the caller's own row, and
 * the write is physically incapable of touching the meter.
 */

export interface Profile {
  /** Where the seller sells: which country's platforms, in which currency. See `markets.ts`. */
  market: Market;
  enabledPlatforms: Platform[];
  /** Which Enabled Platform listings are written for first. Always one of `enabledPlatforms`. */
  preferredPlatform: Platform;
  /** Opt-in facts about the seller a listing may state. See `seller-notes.ts`. */
  sellerNotes: SellerNote[];
  /** Generations this month. */
  allowance: AllowanceState;
  /** Deep researches this month. */
  searches: AllowanceState;
}

interface ProfileRow {
  market: string | null;
  enabled_platforms: Platform[];
  preferred_platform: Platform;
  seller_notes: string[] | null;
  reads_used: number;
  reads_limit: number | null;
  searches_used: number;
  searches_limit: number | null;
  allowance_period_start: string;
}

const SELECT =
  "market, enabled_platforms, preferred_platform, seller_notes, reads_used, reads_limit, searches_used, searches_limit, allowance_period_start";

function toProfile(row: ProfileRow): Profile {
  const periodStart = new Date(row.allowance_period_start);
  // The period is a calendar month, matching `date_trunc('month', now())` in
  // the migration — the meter's period boundary is defined there, not here.
  const resets = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1)
  );
  return {
    market: isMarket(row.market) ? row.market : DEFAULT_MARKET,
    enabledPlatforms: row.enabled_platforms,
    preferredPlatform: row.preferred_platform,
    sellerNotes: SELLER_NOTES.filter((n) => (row.seller_notes ?? []).includes(n)),
    allowance: { used: row.reads_used, limit: row.reads_limit, resetsAt: resets.toISOString() },
    searches: { used: row.searches_used, limit: row.searches_limit, resetsAt: resets.toISOString() },
  };
}

export async function getProfile(token: string): Promise<Profile> {
  const { data, error } = await userClient(token)
    .from("profiles")
    .select(SELECT)
    .single();

  if (error) throw new Error(`Could not read profile: ${error.message}`);
  return toProfile(data as ProfileRow);
}

/** The caller's Enabled Platforms — what the Valuation is allowed to value. */
export async function getEnabledPlatforms(token: string): Promise<Platform[]> {
  return (await getProfile(token)).enabledPlatforms;
}

/** What the Valuation needs from the profile: which platforms, in which Market. */
export async function getValuationScope(token: string): Promise<{ platforms: Platform[]; market: Market }> {
  const p = await getProfile(token);
  return { platforms: p.enabledPlatforms, market: p.market };
}

/** What the listing prompts need from the profile. */
export async function getListingContext(token: string): Promise<{ sellerNotes: SellerNote[]; market: Market }> {
  const p = await getProfile(token);
  return { sellerNotes: p.sellerNotes, market: p.market };
}

export class InvalidPlatformSet extends Error {}

/**
 * Validates here as well as in the database. The `enabled_platforms_not_empty`
 * and `platforms_available_in_market` check constraints are the real
 * guarantee — this exists so the caller gets a sentence explaining the
 * problem instead of a Postgres constraint name.
 */
export function validatePlatformSet(input: unknown, market: Market = DEFAULT_MARKET): Platform[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new InvalidPlatformSet("At least one platform must stay enabled");
  }
  const unknown = input.filter((p) => !PLATFORM_IDS.includes(p as Platform));
  if (unknown.length > 0) {
    throw new InvalidPlatformSet(`Unknown platform: ${unknown.join(", ")}`);
  }
  const elsewhere = input.filter((p) => !platformsIn(market).includes(p as Platform));
  if (elsewhere.length > 0) {
    throw new InvalidPlatformSet(`${elsewhere.join(", ")} is not available in ${MARKETS[market].name}`);
  }
  // Deduplicated so the stored set says what it means; order follows the
  // platform registry rather than however the client happened to send it.
  return PLATFORM_IDS.filter((p) => input.includes(p));
}

/**
 * `userId` narrows the UPDATE to one row explicitly. RLS would already scope it
 * to the caller — this is belt and braces, and it keeps the statement from
 * being a full-table update if a policy is ever loosened.
 */
export async function setEnabledPlatforms(
  token: string,
  userId: string,
  platforms: Platform[],
  preferred?: Platform
): Promise<Profile> {
  // The database refuses a preferred platform that is not enabled, so when the
  // caller disables the one they prefer the preference has to move in the same
  // statement. First enabled wins unless the caller named another.
  const nextPreferred =
    preferred && platforms.includes(preferred)
      ? preferred
      : (await getProfile(token)).preferredPlatform;
  const update = {
    enabled_platforms: platforms,
    preferred_platform: platforms.includes(nextPreferred) ? nextPreferred : platforms[0],
  };

  const { data, error } = await userClient(token)
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .select(SELECT)
    .single();

  if (error) throw new Error(`Could not update enabled platforms: ${error.message}`);
  return toProfile(data as ProfileRow);
}

/**
 * Moves the seller to another Market. Platforms that do not operate there are
 * dropped from the Enabled set (Vinted, on a move to Australia) and the
 * preference follows; with nothing left, every platform in the new Market is
 * enabled, so the seller is never left with an empty set. One statement, so
 * the `platforms_available_in_market` constraint holds throughout.
 */
export async function setMarket(token: string, userId: string, market: Market): Promise<Profile> {
  const current = await getProfile(token);
  const available = platformsIn(market);
  const kept = current.enabledPlatforms.filter((p) => available.includes(p));
  const platforms = kept.length > 0 ? kept : [...available];
  const preferred = platforms.includes(current.preferredPlatform) ? current.preferredPlatform : platforms[0];

  const { data, error } = await userClient(token)
    .from("profiles")
    .update({ market, enabled_platforms: platforms, preferred_platform: preferred })
    .eq("id", userId)
    .select(SELECT)
    .single();

  if (error) throw new Error(`Could not update market: ${error.message}`);
  return toProfile(data as ProfileRow);
}

export class InvalidPreferredPlatform extends Error {}

export function validatePreferredPlatform(input: unknown, enabled: Platform[]): Platform {
  if (typeof input !== "string" || !PLATFORM_IDS.includes(input as Platform)) {
    throw new InvalidPreferredPlatform(`Unknown platform: ${String(input)}`);
  }
  if (!enabled.includes(input as Platform)) {
    throw new InvalidPreferredPlatform(`${input} is not an enabled platform`);
  }
  return input as Platform;
}

export async function setPreferredPlatform(
  token: string,
  userId: string,
  preferred: Platform
): Promise<Profile> {
  const { data, error } = await userClient(token)
    .from("profiles")
    .update({ preferred_platform: preferred })
    .eq("id", userId)
    .select(SELECT)
    .single();

  if (error) throw new Error(`Could not update preferred platform: ${error.message}`);
  return toProfile(data as ProfileRow);
}

export async function setSellerNotes(
  token: string,
  userId: string,
  notes: SellerNote[]
): Promise<Profile> {
  const { data, error } = await userClient(token)
    .from("profiles")
    .update({ seller_notes: notes })
    .eq("id", userId)
    .select(SELECT)
    .single();

  if (error) throw new Error(`Could not update seller notes: ${error.message}`);
  return toProfile(data as ProfileRow);
}

/** The caller's seller notes, for the listing prompts. Empty when none are on. */
export async function getSellerNotes(token: string): Promise<SellerNote[]> {
  return (await getProfile(token)).sellerNotes;
}
