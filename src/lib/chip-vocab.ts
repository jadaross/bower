// Chip vocabulary shared with the iOS app (FeedbackChip in ios/Bower/Models.swift).
// Both clients send the same `instruction` strings to /api/refine.

export type ChipId =
  | "shorter"
  | "longer"
  | "casual"
  | "serious"
  | "measurements"
  | "hashtags"
  | "condition"
  | "vintage";

export const CHIPS: { id: ChipId; label: string; instruction: string }[] = [
  { id: "shorter",      label: "Shorter",            instruction: "Rewrite shorter — cut to the essentials, drop filler." },
  { id: "longer",       label: "More detail",        instruction: "Add more useful detail without padding or repetition." },
  { id: "casual",       label: "More casual",        instruction: "Make it more casual and conversational — natural, friendly, not corporate." },
  { id: "serious",      label: "Less serious",       instruction: "Tone down the emojis and fashion-speak; keep it plain and honest." },
  { id: "measurements", label: "+ Measurements",     instruction: 'Add a measurements line for the seller to complete, laid flat, in cm, suited to the garment (e.g. "Pit to pit __ cm, length __ cm, sleeve __ cm"; waist and inseam for trousers). Only if not already present. Never invent a number.' },
  { id: "hashtags",     label: "+ Hashtags",         instruction: "Expand the hashtags/keywords array with relevant search terms (no duplicates). Respect the platform cap (Depop 5, at most 2 brands; eBay none)." },
  { id: "condition",    label: "Stress condition",   instruction: 'Move the condition to the first or second line and make it concrete using only what the listing already says: name the flaws it mentions in plain words (mark, stain, hole, pilling, fading) or, if it mentions none, say "no marks or damage that I can see". Do not add new claims such as "no smells" or "lining intact".' },
  { id: "vintage",      label: "More vintage feel",  instruction: 'Lean into the vintage angle only if the brand, tag or style already supports it; name the decade, never write "rare" or "deadstock".' },
];

export function instructionsFor(chipIds: Iterable<ChipId>): string[] {
  const set = new Set(chipIds);
  return CHIPS.filter((c) => set.has(c.id)).map((c) => c.instruction);
}
