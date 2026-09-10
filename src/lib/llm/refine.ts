import type { Platform, PlatformListing } from "@/lib/types";
import { sellerNotesPrompt, type SellerNote } from "@/lib/seller-notes";
import { platformListingSpec, platformMetadata } from "@/platforms";
import { MODELS } from "./client";
import { createStructured } from "./structured";
import { platformListingSchema } from "./schemas";
import { recordScore } from "@/lib/observability";

export interface RefineInput {
  platform: Platform;
  listing: PlatformListing;
  instructions: string[];
  /** The seller's opt-in notes, read from their profile, never the body. */
  sellerNotes?: SellerNote[];
  /** Receives the Langfuse trace id so the client can attach feedback (#42). */
  onTraceId?: (traceId: string) => void;
}

function buildPrompt({ platform, listing, instructions, sellerNotes = [] }: RefineInput): string {
  return `You are a secondhand fashion listing specialist. Refine an existing ${platformMetadata[platform].name} listing based on user feedback.

${platformListingSpec[platform].promptFragment}

${sellerNotesPrompt(sellerNotes, platform)}

Current listing:
${JSON.stringify(listing, null, 2)}

Apply these refinements (do them all, in order):
${instructions.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Rules:
- Apply every refinement above. If two refinements conflict, the later one wins.
- Keep all factual details accurate; only change style, length, and format.
- Never use an em dash (—). Use a comma, a full stop, or a hyphen instead.
- Do not add claims about the seller (smoke-free, pet-free, washed, dispatch speed) beyond the SELLER NOTES line above, or label data (country of manufacture, care instructions, RN/style numbers), unless the refinement instruction supplies that fact in its own words.
- Do not add "rare", "deadstock" or an era unless the current listing already supports it.
- Do NOT invent new information (no measurements unless asked; no condition claims that weren't in the source).
- Respect platform format rules (title length, hashtag conventions).
- "fields": return the EXACT SAME array that came in unless a refinement instruction specifically changes a structured value (e.g. an instruction like "set condition to Pre-owned – Fair"). Do not rewrite labels or values gratuitously.`;
}

export async function refineListing(input: RefineInput): Promise<PlatformListing> {
  let traceId: string | undefined;
  const parsed = await createStructured<PlatformListing>(
    {
      model: MODELS.refine,
      max_tokens: 1536,
      messages: [{ role: "user", content: buildPrompt(input) }],
    },
    platformListingSchema,
    "refine",
    (id) => {
      traceId = id;
      input.onTraceId?.(id);
    }
  );
  if (!parsed.title || !parsed.description) {
    throw new Error("Refined PlatformListing missing title or description");
  }
  parsed.hashtags = parsed.hashtags ?? [];
  // Implicit negative signal: the listing needed rework. Value = how many
  // nudge chips were applied this round. Named by source, not meaning.
  if (traceId) {
    recordScore({ traceId, name: "refine-requested", value: input.instructions.length, dataType: "NUMERIC" });
  }
  return parsed;
}
