import type { Listing, Platform, PlatformListing, Tone } from "@/lib/types";
import { sellerNotesPrompt, type SellerNote } from "@/lib/seller-notes";
import { platformListingSpec, platformMetadata } from "@/platforms";
import { MODELS } from "./client";
import { createStructured } from "./structured";
import { platformListingSchema } from "./schemas";

export interface FormatInput {
  listing: Listing;
  platform: Platform;
  tone: Tone;
  /** The seller's opt-in notes, read from their profile, never the body. */
  sellerNotes?: SellerNote[];
  /** Receives the Langfuse trace id so the client can attach feedback (#42). */
  onTraceId?: (traceId: string) => void;
}

// Applies to every platform. The line between "a person who writes well" and
// "AI" on these marketplaces is facts + honesty + plain language — see
// docs/research/seller-voice.md.
const VOICE_CORE = `VOICE — non-negotiable, all platforms:
- Every sentence must carry information: a measurement, a condition note, a fit note, a material, or a genuine reason for selling. If a sentence only conveys vibe, cut it — that is what reads as AI-written.
- Never use empty praise ("nice", "pretty", "good", "gorgeous", "stunning", "beautiful", "lovely", "timeless") or retail/marketing clichés ("elevate your wardrobe", "must-have", "perfect addition to any collection", "effortlessly chic", "transitions from day to night", "exude", "look no further", "grab this beauty", "elevate your style", "artisanal", "curated", "statement piece", "wardrobe staple", "prepare to fall in love"). Buyers do not search for these and they mark a listing as fake.
- Do not oversell or contradict the condition. If there is a flaw, name it plainly; if you are unsure, be modest, not glowing.
- Never invent a number. No measurement, weight, year or count that is not in the source listing. If the source has no measurements, write nothing about measurements; do not estimate "approximately".
- Shorter wins. On every platform buyers call long descriptions "a wall of text" and skip the listing. If it can be a fragment, make it a fragment.
- Never state anything about the seller's home or habits: no "smoke-free", "pet-free", "washed before sending", "posted next day". The source listing does not know these. A false smoke-free line is the complaint buyers make most.
- Never copy label data into the copy: no "Made in China", no RN or style numbers, no care instructions. Country of manufacture only when it is a known selling point for that brand (Made in USA workwear, Made in England boots, Made in Italy designer).
- Use British English and British terms throughout: colour, grey, jumper, trainers, dungarees, postage (not "shipping"), £ (not "$"). Sizes in UK format.
- Do not stack adjectives. One descriptor anchored to a fact ("cosy oversized knit") is fine; three bare ones are not.
- Never use an em dash (—). Use a comma, a full stop, or a hyphen instead.`;

// Tone is the user's dial on top of the platform's own voice above — it nudges
// warmer or plainer, it does not override the platform register.
const TONE_HINT: Record<Tone, string> = {
  casual:
    "Tone dial: lean to the warmer, more personal end of this platform's voice — contractions, a lighter touch — without adding fluff or breaking any rule above.",
  professional:
    "Tone dial: lean to the plainer, more formal end of this platform's voice — measurements, condition, fabric and fit first; concise; no slang — without stripping the platform's character where it has one.",
};

function buildPrompt({ listing, platform, tone, sellerNotes = [] }: FormatInput): string {
  const spec = platformListingSpec[platform];
  // A listing that came from analyse may carry the Preferred Platform's form
  // fields. They are not source material for another platform's form.
  const { fields: _fields, ...source } = listing;
  return `You are a secondhand fashion listing specialist. Reformat the following clothing listing for ${platformMetadata[platform].name}.

${spec.promptFragment}

${VOICE_CORE}

${TONE_HINT[tone]}

${sellerNotesPrompt(sellerNotes, platform)}

Source listing (neutral format):
${JSON.stringify(source, null, 2)}

Rules for title / description / hashtags:
- title: adapt to platform requirements (max chars, format conventions)
- description: rewrite for platform audience and length requirements
- hashtags: format correctly for platform (with/without # prefix, count)
- Keep all factual details accurate — only change style, length, and format
- Do NOT invent new information

Rules for fields (these are the dropdowns/inputs the seller picks on the ${platformMetadata[platform].name} listing form):
${spec.fieldsSchema}

For every field:
- "value" MUST come from the allowed list when one is given (don't paraphrase).
- "hint" is optional — only include it when the rationale is non-obvious.
- If the source listing genuinely lacks the info, pick the best safe default (e.g. "Unbranded" if no brand) rather than leaving the value empty.`;
}

export async function formatListing(input: FormatInput): Promise<PlatformListing> {
  const parsed = await createStructured<PlatformListing>(
    {
      model: MODELS.format,
      max_tokens: 1536,
      messages: [{ role: "user", content: buildPrompt(input) }],
    },
    platformListingSchema,
    "format",
    input.onTraceId
  );
  if (!parsed.title || !parsed.description) {
    throw new Error("PlatformListing missing title or description");
  }
  parsed.hashtags = parsed.hashtags ?? [];
  return parsed;
}
