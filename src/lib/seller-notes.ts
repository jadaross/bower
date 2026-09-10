import type { Platform } from "@/lib/types";

/**
 * The things a listing may say about the seller rather than the garment.
 * None of them can be seen in a photo, so the model may only write the ones
 * the user has switched on in their profile. Stored on `profiles.seller_notes`
 * (migration 0008); the vocabulary here and the check constraint there must
 * agree.
 *
 * One phrasing per platform, in that platform's register, so the prompt is
 * handed a sentence and not a concept to improvise on.
 */
export type SellerNote = "smoke_free" | "pet_free" | "posts_next_day" | "bundles";

export const SELLER_NOTES: readonly SellerNote[] = ["smoke_free", "pet_free", "posts_next_day", "bundles"];

export class InvalidSellerNotes extends Error {}

export function validateSellerNotes(input: unknown): SellerNote[] {
  if (!Array.isArray(input)) throw new InvalidSellerNotes("seller_notes must be a list");
  const unknown = input.filter((n) => !SELLER_NOTES.includes(n as SellerNote));
  if (unknown.length > 0) throw new InvalidSellerNotes(`Unknown seller note: ${unknown.join(", ")}`);
  // Deduplicated, in the canonical order, so the stored list says what it means.
  return SELLER_NOTES.filter((n) => input.includes(n));
}

const PHRASING: Record<Platform, Record<SellerNote, string>> = {
  vinted: {
    smoke_free: "From a smoke-free home.",
    pet_free: "Pet-free home.",
    posts_next_day: "Posted within a day.",
    bundles: "Happy to bundle.",
  },
  depop: {
    smoke_free: "smoke free home",
    pet_free: "pet free home",
    posts_next_day: "ships next day",
    bundles: "bundle for a discount",
  },
  ebay: {
    smoke_free: "From a smoke-free home.",
    pet_free: "From a pet-free home.",
    posts_next_day: "Dispatched within 1 working day.",
    bundles: "Happy to combine postage on multiple items.",
  },
};

/**
 * The closing line for a platform, or "" when nothing is switched on. Smoke
 * and pets fold into one sentence where the register allows, because two
 * separate lines about the seller's house is the thing that reads as padding.
 */
export function sellerNotesLine(notes: readonly SellerNote[], platform: Platform): string {
  const on = SELLER_NOTES.filter((n) => notes.includes(n));
  if (on.length === 0) return "";
  const p = PHRASING[platform];
  const parts: string[] = [];
  if (on.includes("smoke_free") && on.includes("pet_free")) {
    parts.push(
      platform === "depop" ? "smoke and pet free home" : "From a smoke-free, pet-free home."
    );
  } else {
    if (on.includes("smoke_free")) parts.push(p.smoke_free);
    if (on.includes("pet_free")) parts.push(p.pet_free);
  }
  if (on.includes("posts_next_day")) parts.push(p.posts_next_day);
  if (on.includes("bundles")) parts.push(p.bundles);
  return platform === "depop" ? parts.join(", ") : parts.join(" ");
}

/**
 * The prompt fragment. Empty notes produce an explicit "say nothing", because
 * the default prompts already forbid inventing these and the reminder costs
 * nothing.
 */
export function sellerNotesPrompt(notes: readonly SellerNote[], platform: Platform): string {
  const line = sellerNotesLine(notes, platform);
  if (!line) {
    return "SELLER NOTES: none. Say nothing about the seller's home, pets, postage speed or bundles.";
  }
  return `SELLER NOTES (true, supplied by the seller; the ONLY things you may say about the seller): end the description with exactly this, as its own last line, word for word: "${line}"`;
}
