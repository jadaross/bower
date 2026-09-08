import { allowanceExhausted, refundAllowance, spendAllowance } from "@/lib/allowance";
import { withAuth } from "@/lib/auth";
import { getEnabledPlatforms } from "@/lib/profile";
import { recommend, valuate } from "@/lib/valuation";
import type { ValuationItem } from "@/lib/types";

export const runtime = "nodejs";
// The web-search valuation and the image read can run long; allow the max.
export const maxDuration = 300;

interface RequestBody {
  item: ValuationItem;
}

export const POST = withAuth(async (request, user) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { item } = body;
  if (!item || !item.brand || !item.clothing_type || !item.size || !item.condition) {
    return Response.json(
      { error: "item requires brand, clothing_type, size and condition" },
      { status: 400 }
    );
  }

  // The Enabled Platforms come from the caller's profile, not from the request
  // body (#10). A client that could name its own platforms could ask for work
  // it had not enabled — and the meter charges one unit however many platforms
  // that turns out to be.
  let platforms;
  try {
    platforms = await getEnabledPlatforms(user.token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
  if (platforms.length === 0) {
    return Response.json({ error: "No platforms are enabled" }, { status: 400 });
  }

  // Reserved before the work rather than counted after it: two valuations
  // racing on one account must not both spend the last unit. Validation
  // failures above cost nothing because they never get this far.
  let spend;
  try {
    spend = await spendAllowance(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
  if (!spend.allowed) return allowanceExhausted(spend);

  try {
    const valuation = await valuate(item, platforms);
    // Null with a single Enabled Platform — there is nothing to choose
    // between, and no comparison work runs. See ADR-0004.
    return Response.json({
      ...valuation,
      recommendation: recommend(valuation),
      allowance: { used: spend.used, limit: spend.limit, resets_at: spend.resetsAt },
    });
  } catch (err) {
    // A valuation that failed must not cost the user anything (#9).
    await refundAllowance(user.id);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Valuation failed: ${message}` }, { status: 500 });
  }
});
