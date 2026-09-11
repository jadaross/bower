import type { Platform, PlatformListing } from "@/lib/types";
import type { ChipId } from "@/lib/chip-vocab";
import type { Market } from "@/lib/markets";

/** How a platform shows up in one Market: its site there and what it charges. */
export interface MarketPresence {
  feeLabel: string;
  feePct: number;
  webUrl: string;
  /**
   * Hosts the valuation search is confined to. A Price Band for this platform
   * is grounded in this platform's listings and nothing else — a comparable
   * from elsewhere would be shown under the wrong name.
   */
  searchDomains: readonly string[];
  /**
   * What a link to ONE listing looks like here, as opposed to a brand page,
   * a catalogue search or the homepage. Only URLs that match are shown to the
   * user as a listing they can open.
   */
  itemUrl: RegExp;
  /** The same shape, written out for the prompt: "https://…/items/<id>-…". */
  itemUrlExample: string;
  /**
   * Anything the search should know about this site that the domains alone
   * do not say. Appended to the prompt.
   */
  searchNote?: string;
  /**
   * Another market's edition of this platform whose listings are comparables
   * here too, because the platform ships between the two. Searched in
   * parallel with the home site and folded in when home is thin.
   */
  corridor?: {
    market: Market;
    /** Tells that search whose seller it is pricing for, and in what currency. */
    note: string;
    /** Prefixes the merged reasoning when corridor listings shaped the band. */
    reasoningPrefix: string;
  };
}

export interface PlatformMetadata {
  id: Platform;
  name: string;
  audience: string;
  color: string;
  appUrl: string;
  /** Absent for a Market the platform does not operate in. */
  markets: Partial<Record<Market, MarketPresence>>;
}

export interface PlatformListingSpec {
  /** Prompt fragment for analyse/format/refine: "Format for Vinted: …". */
  promptFragment: string;
  /** Per-platform "fields" schema fragment used by the format prompt. */
  fieldsSchema: string;
  /** Refinement chips that are meaningful on this platform. */
  relevantChips: ChipId[];
  /** Returns [] if the listing satisfies platform requirements, else error messages. */
  validate(listing: PlatformListing): string[];
}
