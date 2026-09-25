import { withAuth } from "@/lib/auth";
import { getProfile, profileWire } from "@/lib/profile";
import { claimFor, PurchaseRejected, recordTransaction, verifyTransaction } from "@/lib/purchases";

export const runtime = "nodejs";

/**
 * A purchase from the app: StoreKit 2's `jwsRepresentation`, sent before the
 * app finishes the transaction. Verified against Apple's signature, checked
 * against the caller, recorded once however often it is sent, and answered
 * with the profile so the meters on screen move at once.
 */
export const POST = withAuth(async (request, user) => {
  let transaction: unknown;
  try {
    ({ transaction } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof transaction !== "string" || transaction.length === 0 || transaction.length > 20_000) {
    return Response.json({ error: "transaction must be a signed StoreKit transaction" }, { status: 400 });
  }

  try {
    const tx = await verifyTransaction(transaction);
    claimFor(tx, user.id);
    const owner = await recordTransaction(tx, user.id);
    if (owner !== user.id) {
      return Response.json(
        { error: "That purchase belongs to another bower account", code: "purchase_elsewhere" },
        { status: 409 }
      );
    }
    return Response.json(profileWire(await getProfile(user.token)));
  } catch (err) {
    if (err instanceof PurchaseRejected) {
      return Response.json({ error: err.message, code: "purchase_rejected" }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});
