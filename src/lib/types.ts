export type Platform = "vinted" | "depop" | "ebay";
export type Tone = "casual" | "professional";

export interface TagData {
  brand: string | null;
  size: string | null;
  size_system: string | null;
  fabric_composition: string | null;
  country_of_manufacture: string | null;
  care_instructions: string | null;
  rn_number: string | null;
  style_number: string | null;
  barcode_visible: boolean;
}

export type Condition = "New with tags" | "Excellent" | "Good" | "Fair";

/** The platform-agnostic description of an item. See CONTEXT.md — "Neutral Listing". */
export interface Listing {
  brand: string;
  clothing_type: string;
  colour_primary: string;
  colour_secondary: string | null;
  condition: Condition;
  size: string;
  material: string;
  title: string;
  description: string;
  hashtags: string[];
  price_min: number;
  price_max: number;
  price_reasoning: string;
  gender?: "women" | "men" | "kids" | "unisex";
  main_category?: string;
  subcategory?: string;
  /**
   * Present only when analyse was asked for a platform: the dropdown values
   * for that platform's form, so the first listing needs no format call.
   */
  fields?: ListingField[];
}

/**
 * A single dropdown / form field on a platform's listing form, rendered as a
 * copyable label + value pair so the user can paste it into the platform app.
 */
export interface ListingField {
  /** Human label exactly as it appears on the platform's form ("Parcel size", "Department"). */
  label: string;
  /** The value the user should select or paste. */
  value: string;
  /** Optional short hint explaining why this value was chosen. */
  hint?: string;
}

/** A Neutral Listing rewritten for one platform. See CONTEXT.md — "Platform-formatted Listing". */
export interface PlatformListing {
  title: string;
  description: string;
  hashtags: string[];
  fields?: ListingField[];
}

/**
 * The read. The `listing` streams first — and its `title` is the very first
 * field — so the client can show the title the moment it arrives (~2s, the
 * image-reading floor) instead of waiting for `tag_data` to stream. The tag
 * OCR follows. There is no photo quality section: nothing displayed it, and it
 * cost a third of the output.
 */
/**
 * What the photos are of, judged before anything else is written. Only
 * "clothing" earns a listing; the rest stop the read before it costs anything.
 * Streamed as the very first field so the server can cut the stream at once.
 */
export type AnalysisSubject = "clothing" | "not_clothing" | "explicit" | "unsafe";
export const ANALYSIS_SUBJECTS: readonly AnalysisSubject[] = ["clothing", "not_clothing", "explicit", "unsafe"];

export interface AnalysisResult {
  subject?: AnalysisSubject;
  tag_data: TagData;
  listing: Listing;
}

// ─── Valuation ─────────────────────────────────────────────────────
// See CONTEXT.md for the vocabulary and docs/adr/0004 + 0005 for why this
// shape is what it is. In short: asking prices, never sold prices; a band
// per platform, never a single number; and an interface a paid comps feed
// could sit behind without any caller noticing.

/** How much the Comparables agree. Low is a real answer, not a failure. */
export type Confidence = "low" | "medium" | "high";

/**
 * The subset of a Neutral Listing a Valuation actually needs. Deliberately
 * narrower than `Listing` so Scout can value an item it has only glanced at.
 */
export interface ValuationItem {
  brand: string;
  clothing_type: string;
  size: string;
  condition: Condition;
  colour_primary?: string;
  material?: string;
}

/** A currently-listed item similar enough to inform value. An ASKING price. */
export interface Comparable {
  title: string;
  /** What the seller is asking today — not what anything sold for. */
  price: number;
  currency: string;
  platform: Platform | "other";
  url?: string;
}

/** A low-to-high range for one platform. Never collapse this to one number. */
export interface PriceBand {
  low: number;
  high: number;
  currency: string;
  confidence: Confidence;
  /**
   * How readily this kind of item moves on this platform. Distinct from
   * `confidence`, which is about how sure we are of the price — an item can
   * have a well-established price and still sell slowly.
   */
  sell_likelihood: Confidence;
  comparables: Comparable[];
  /** One sentence a UI can show verbatim. Says "listed at", never "sells for". */
  reasoning: string;
}

/** The answer to "what is this item worth?" — one band per Enabled Platform. */
export interface Valuation {
  perPlatform: Partial<Record<Platform, PriceBand>>;
  /** The search phrasing used, exposed so a user can sanity-check the result. */
  query: string;
}

/**
 * Which Enabled Platform to post on. Only exists when more than one platform
 * is enabled — with one there is nothing to choose between, and no comparison
 * work runs at all. See ADR-0004.
 */
export interface Recommendation {
  platform: Platform;
  /** Midpoint of the winning band — what to actually ask. */
  listAt: number;
  /** Take-home after that platform's fee. Applied after ranking, never as the ranking signal. */
  net: number;
  currency: string;
  reasoning: string;
  runnersUp: Array<{ platform: Platform; listAt: number; net: number }>;
}
