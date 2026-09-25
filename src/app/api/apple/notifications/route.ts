import { PurchaseRejected, recordTransaction, verifyNotification, verifyTransaction } from "@/lib/purchases";

export const runtime = "nodejs";

/**
 * App Store Server Notifications V2: renewals, expiries, refunds and
 * revocations, and a first purchase if it lands before the app reports it.
 *
 * The one route without `withAuth` (ADR-0011): Apple is the caller and has no
 * bower session. The signed payload is the authentication; nothing is read
 * from it until it has verified against Apple's root certificate.
 *
 * Apple retries anything that is not a 2xx, so a payload that verified but
 * names no account we know is still answered 200: retrying will not change it.
 */
export async function POST(request: Request): Promise<Response> {
  let signedPayload: unknown;
  try {
    ({ signedPayload } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof signedPayload !== "string") {
    return Response.json({ error: "signedPayload is required" }, { status: 400 });
  }

  try {
    const notification = await verifyNotification(signedPayload);
    const signedTransaction = notification.data?.signedTransactionInfo;
    if (!signedTransaction) return new Response(null, { status: 200 });

    const tx = await verifyTransaction(signedTransaction);
    const owner = await recordTransaction(tx, tx.appAccountToken);
    if (!owner) {
      console.warn(
        `App Store notification ${notification.notificationType} for transaction ${tx.transactionId} matched no account`
      );
    }
    return new Response(null, { status: 200 });
  } catch (err) {
    if (err instanceof PurchaseRejected) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`App Store notification failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
}
