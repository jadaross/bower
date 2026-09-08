import type { Confidence, Platform, PriceBand, Recommendation, Valuation } from "@/lib/types";
import { netPrice, platformMetadata } from "@/platforms";

/**
 * Picks the Enabled Platform to post on.
 *
 * The ranking signal is the Price Band weighted by how readily the item sells
 * there — deliberately NOT net-after-fees. Vinted charges sellers 0% against
 * Depop's 0% (its UK seller fee was removed in Mar 2024) and eBay's 13.25%, so
 * ranking on net would skew toward the fee-free platforms every
 * single time and this function would be a constant with a paragraph attached.
 * Fees are applied afterwards, for display only. See ADR-0004.
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
export function recommend(valuation: Valuation): Recommendation | null {
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
    net: Math.round(netPrice(listAt, winnerId)),
    currency: winner.currency,
    reasoning: explain(winnerId, winner, ranked.slice(1)),
    // Runners-up include the unevidenced bands, so the user can still see
    // them — they just cannot win.
    runnersUp: [...ranked.slice(1), ...all.filter((e) => !entries.includes(e))].map(([id, band]) => ({
      platform: id,
      listAt: midpoint(band),
      net: Math.round(netPrice(midpoint(band), id)),
    })),
  };
}

function explain(
  winnerId: Platform,
  winner: PriceBand,
  rest: Array<[Platform, PriceBand]>
): string {
  const name = platformMetadata[winnerId].name;
  const listAt = midpoint(winner);
  const fee = platformMetadata[winnerId].feePct;
  const feeNote = fee === 0 ? "and takes no seller fee" : `less its ${platformMetadata[winnerId].feeLabel} fee`;

  if (rest.length === 0) return `${name} is the only platform with a usable valuation.`;

  const [runnerUpId, runnerUp] = rest[0];
  const runnerUpName = platformMetadata[runnerUpId].name;
  const diff = listAt - midpoint(runnerUp);

  if (diff > 0) {
    return `Similar items are listed around £${listAt} on ${name} — about £${diff} above ${runnerUpName} — ${feeNote}.`;
  }
  if (winner.sell_likelihood !== runnerUp.sell_likelihood) {
    return `${name} lists around £${listAt}, and this kind of item moves more readily there than on ${runnerUpName} — ${feeNote}.`;
  }
  return `${name} lists around £${listAt}, on par with ${runnerUpName}, ${feeNote}.`;
}
