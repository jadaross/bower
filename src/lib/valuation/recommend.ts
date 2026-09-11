import type { Confidence, Platform, PriceBand, Recommendation, Valuation } from "@/lib/types";
import { netPrice, platformMetadata, presence } from "@/platforms";
import { money, type Market } from "@/lib/markets";

/**
 * Picks the Enabled Platform to post on.
 *
 * The ranking signal is the Price Band weighted by how readily the item sells
 * there — deliberately NOT net-after-fees. When eBay still charged private
 * sellers 13.25% against Vinted's and Depop's 0%, ranking on net would have
 * skewed toward the fee-free platforms every single time and this function
 * would have been a constant with a paragraph attached. Fees are applied
 * afterwards, for display only, and today every platform bower knows takes
 * nothing from a private seller in either Market. See ADR-0004.
 */

const LIKELIHOOD_WEIGHT: Record<Confidence, number> = {
  high: 1,
  medium: 0.8,
  low: 0.6,
};

/** Confidence breaks ties: between two equal scores, prefer the surer band. */
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

export function midpoint(band: PriceBand): number {
  return Math.round((band.low + band.high) / 2);
}

export function score(band: PriceBand): number {
  return midpoint(band) * LIKELIHOOD_WEIGHT[band.sell_likelihood];
}

/**
 * A band with no Comparables behind it is a guess, however confident it
 * sounds. It may still be reported to the user — a wide low-confidence range
 * is a useful answer — but it must not win a Recommendation while some other
 * platform has actual evidence. Observed live: a 0-comparable Depop band of
 * £35–60 outranked a 5-comparable Vinted band of £15–35 and would have sent
 * the user to the wrong place.
 */
function evidenced([, band]: [Platform, PriceBand]): boolean {
  return band.comparables.length > 0;
}

/**
 * Returns null when there is nothing to choose between — a single Enabled
 * Platform means no comparison work runs at all, by design.
 */
export function recommend(valuation: Valuation, market: Market): Recommendation | null {
  const all = Object.entries(valuation.perPlatform) as Array<[Platform, PriceBand]>;
  if (all.length < 2) return null;

  // Rank among platforms that found comparables; fall back to the rest only
  // when nothing found any.
  const withEvidence = all.filter(evidenced);
  const entries = withEvidence.length > 0 ? withEvidence : all;

  const ranked = [...entries].sort(([aId, a], [bId, b]) => {
    const byScore = score(b) - score(a);
    if (byScore !== 0) return byScore;
    const byConfidence = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (byConfidence !== 0) return byConfidence;
    // Last resort, so the answer is at least stable across identical inputs.
    return aId.localeCompare(bId);
  });

  const [winnerId, winner] = ranked[0];
  const listAt = midpoint(winner);

  return {
    platform: winnerId,
    listAt,
    net: Math.round(netPrice(listAt, winnerId, market)),
    currency: winner.currency,
    reasoning: explain(winnerId, winner, ranked.slice(1), market),
    // Runners-up include the unevidenced bands, so the user can still see
    // them — they just cannot win.
    runnersUp: [...ranked.slice(1), ...all.filter((e) => !entries.includes(e))].map(([id, band]) => ({
      platform: id,
      listAt: midpoint(band),
      net: Math.round(netPrice(midpoint(band), id, market)),
    })),
  };
}

function explain(
  winnerId: Platform,
  winner: PriceBand,
  rest: Array<[Platform, PriceBand]>,
  market: Market
): string {
  // The headline already says the price and the platform ("£50 on Depop"),
  // so this only says why — never restating either.
  const listAt = midpoint(winner);
  const here = presence(winnerId, market);
  const feeNote = here.feePct === 0 ? "and takes no seller fee" : `less its ${here.feeLabel} fee`;

  if (rest.length === 0) return "The only platform with listings to go on.";

  const [runnerUpId, runnerUp] = rest[0];
  const runnerUpName = platformMetadata[runnerUpId].name;
  const diff = listAt - midpoint(runnerUp);

  if (diff > 0) {
    return `Listed about ${money(diff, market)} above ${runnerUpName}, ${feeNote}.`;
  }
  if (winner.sell_likelihood !== runnerUp.sell_likelihood) {
    return `Listed on par with ${runnerUpName}, but this kind of item moves more readily here, ${feeNote}.`;
  }
  return `Listed on par with ${runnerUpName}, ${feeNote}.`;
}
