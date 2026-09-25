import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { serviceClient } from "@/lib/supabase";
import { APP_APPLE_ID, APPLE_ROOT_CA_G3, BUNDLE_ID, PRODUCTS, type ProductKind } from "@/lib/products";

/**
 * App Store purchases, verified here and never taken on the client's word
 * (ADR-0010, ADR-0011). The app sends StoreKit 2's signed transaction; Apple
 * sends the same kind of thing in its server notifications. Either way the
 * signature is checked against Apple's root certificate before anything is
 * recorded, and the counting happens in SQL (`apply_transaction`).
 */

export class PurchaseRejected extends Error {}

export interface VerifiedTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  kind: ProductKind;
  environment: "Production" | "Sandbox";
  purchasedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  /** The bower user id the app set at purchase, lowercased. Null if bought elsewhere. */
  appAccountToken: string | null;
  signed: string;
}

// Only the two environments Apple signs for real. Xcode and LocalTesting are
// signed by Xcode's own certificate and the library skips verification for
// them, so accepting either would let anyone mint a purchase.
const verifiers: Record<"Production" | "Sandbox", SignedDataVerifier> = {
  Production: new SignedDataVerifier(
    [Buffer.from(APPLE_ROOT_CA_G3, "base64")],
    true,
    Environment.PRODUCTION,
    BUNDLE_ID,
    APP_APPLE_ID
  ),
  Sandbox: new SignedDataVerifier([Buffer.from(APPLE_ROOT_CA_G3, "base64")], true, Environment.SANDBOX, BUNDLE_ID),
};

/**
 * Which verifier to use, read from the payload before it is verified. Safe
 * because the verifier then checks the signature AND that the environment
 * matches; a payload that lies about it fails there.
 */
function claimedEnvironment(jws: string, read: (payload: Record<string, unknown>) => unknown): "Production" | "Sandbox" {
  let payload: Record<string, unknown>;
  try {
    const part = jws.split(".")[1];
    payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw new PurchaseRejected("Not a signed App Store payload");
  }
  const env = read(payload);
  if (env === "Production" || env === "Sandbox") return env;
  throw new PurchaseRejected(`Unsupported App Store environment: ${String(env)}`);
}

function iso(ms: number | undefined): string | null {
  return typeof ms === "number" ? new Date(ms).toISOString() : null;
}

/** Apple's decoded transaction, checked for being bower's and turned into ours. */
export function toVerified(tx: JWSTransactionDecodedPayload, signed: string): VerifiedTransaction {
  if (tx.bundleId !== BUNDLE_ID) throw new PurchaseRejected("That transaction is for another app");
  const kind = tx.productId ? PRODUCTS[tx.productId] : undefined;
  if (!kind) throw new PurchaseRejected(`Unknown product: ${tx.productId}`);
  if (!tx.transactionId || !tx.originalTransactionId || typeof tx.purchaseDate !== "number") {
    throw new PurchaseRejected("That transaction is incomplete");
  }
  const env = tx.environment as string;
  if (env !== "Production" && env !== "Sandbox") throw new PurchaseRejected(`Unsupported App Store environment: ${env}`);
  return {
    transactionId: tx.transactionId,
    originalTransactionId: tx.originalTransactionId,
    productId: tx.productId!,
    kind,
    environment: env,
    purchasedAt: iso(tx.purchaseDate)!,
    expiresAt: iso(tx.expiresDate),
    revokedAt: iso(tx.revocationDate),
    appAccountToken: tx.appAccountToken ? tx.appAccountToken.toLowerCase() : null,
    signed,
  };
}

/** Verifies a StoreKit 2 `jwsRepresentation` (or a notification's `signedTransactionInfo`). */
export async function verifyTransaction(jws: string): Promise<VerifiedTransaction> {
  const env = claimedEnvironment(jws, (p) => p.environment);
  let tx: JWSTransactionDecodedPayload;
  try {
    tx = await verifiers[env].verifyAndDecodeTransaction(jws);
  } catch (err) {
    throw new PurchaseRejected(`That transaction did not verify: ${err instanceof Error ? err.message : String(err)}`);
  }
  return toVerified(tx, jws);
}

/** Verifies an App Store Server Notification V2 `signedPayload`. */
export async function verifyNotification(signedPayload: string): Promise<ResponseBodyV2DecodedPayload> {
  const env = claimedEnvironment(signedPayload, (p) => (p.data as Record<string, unknown> | undefined)?.environment
    ?? (p.summary as Record<string, unknown> | undefined)?.environment);
  try {
    return await verifiers[env].verifyAndDecodeNotification(signedPayload);
  } catch (err) {
    throw new PurchaseRejected(`That notification did not verify: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * The app sets `appAccountToken` to the signed-in user's id at purchase, so a
 * transaction bought from one bower account cannot be sent in by another. One
 * bought outside the app carries no token and goes to whoever sends it.
 */
export function claimFor(tx: VerifiedTransaction, userId: string): void {
  if (tx.appAccountToken && tx.appAccountToken !== userId.toLowerCase()) {
    throw new PurchaseRejected("That purchase belongs to another bower account");
  }
}

/**
 * Records a verified transaction and applies it to the meter, idempotently.
 * Returns the account it now belongs to, or null when none can be found (a
 * renewal for a purchase bower never saw).
 */
export async function recordTransaction(tx: VerifiedTransaction, userId: string | null): Promise<string | null> {
  const { data, error } = await serviceClient().rpc("apply_transaction", {
    p_user_id: userId,
    p_transaction_id: tx.transactionId,
    p_original_transaction_id: tx.originalTransactionId,
    p_product_id: tx.productId,
    p_kind: tx.kind,
    p_environment: tx.environment,
    p_purchased_at: tx.purchasedAt,
    p_expires_at: tx.expiresAt,
    p_revoked_at: tx.revokedAt,
    p_signed: tx.signed,
  });
  if (error) throw new Error(`Could not record the purchase: ${error.message}`);
  return (data as string | null) ?? null;
}
