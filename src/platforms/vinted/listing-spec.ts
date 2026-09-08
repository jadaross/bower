import type { PlatformListing } from "@/lib/types";
import type { ChipId } from "@/lib/chip-vocab";
import type { PlatformListingSpec } from "../types";

const promptFragment = `Format for Vinted. Vinted has NO hashtag-based ranking and NO documented title-length limit — its search matches keywords against the catalog plus the structured fields, so correct fields matter more than clever prose. Keep the "hashtags" array to AT MOST a few (0-6) genuinely relevant terms (e.g. #workwear, #vintage) — never a second brand name, and never a brand other than the one in the Brand field (Vinted's Catalogue Rules forbid it anywhere in the listing).

TITLE: Brand + item type + key descriptor (colour/material/style) + size. Sentence case (capitalise first word and proper nouns only). Aim for ~40-60 characters so it is not truncated in the grid. No emojis, no hashtags, no second brand. Do NOT use empty filler words Vinted discourages ("nice", "pretty", "lovely", "gorgeous", "stunning").

DESCRIPTION: facts over adjectives, 3-5 short lines, each on its own line with a blank line between. MUST state the size. SHOULD include measurements (pit-to-pit, length, sleeve in cm) whenever the source provides them — Vinted expects them. State condition honestly using Vinted's own flaw vocabulary where relevant (marks, stains, holes, rips, fraying, pilling, fading, odours) and say if the home is smoke-free. End with a short bundle invite such as "Bundle with my other items to save on postage." Do NOT tell the buyer there are "no fees" — buyers pay a mandatory fee at checkout. Do NOT suggest outfit pairings or styling ideas; keep to fabric, fit, condition, and key details.

VOICE: plain, honest, lightly personal — like a tidy person selling from their own wardrobe, not a shop or a marketer. Open on the item (brand + type + colour), then condition/history, then material and at least one measurement (bullet the facts with dashes). One short personal reason for selling is welcome if it fits ("no longer fits", "only worn once", "wardrobe clear-out") — never a paragraph about it. Optionally close with ONE functional line: a bundle invite ("happy to bundle to save on postage"), "any questions just ask", or "from a smoke-free home" — only if it is true or provided. 3-5 short sentences; sentence fragments and dash-bullets are fine. At most one emoji, at the very end, optional.`;

const fieldsSchema = `Return these fields in the "fields" array, in this order. Use the EXACT label strings and pick values from the allowed sets:

- { "label": "Category", "value": "<cascade like 'Women > Clothing > Outerwear > Coats & jackets' or 'Men > Clothing > Tops > T-shirts & vests'>", "hint": "Pick the most specific path that fits" }
- { "label": "Brand", "value": "<brand name, or 'Unbranded'>" }
- { "label": "Size", "value": "<UK or EU size that matches the item, e.g. 'M', 'UK 10', 'EU 38'>" }
- { "label": "Condition", "value": "<MUST be one of: New with tags | New without tags | Very good | Good | Satisfactory>" }
- { "label": "Colour", "value": "<one of: Black | Brown | White | Grey | Beige | Pink | Purple | Red | Orange | Yellow | Green | Blue | Multi>" }
- { "label": "Material", "value": "<one of: Cotton | Polyester | Wool | Leather | Denim | Linen | Silk | Synthetic | Cashmere | Nylon | Viscose | Blend | Other>" }
- { "label": "Parcel size", "value": "<MUST be one of: Small | Medium | Large>", "hint": "Small: tops, accessories. Medium: jeans, dresses, jumpers. Large: coats, boots, bulky items." }`;

const REQUIRED_LABELS = [
  "Category",
  "Brand",
  "Size",
  "Condition",
  "Colour",
  "Material",
  "Parcel size",
] as const;

const relevantChips: ChipId[] = [
  "shorter",
  "longer",
  "casual",
  "serious",
  "measurements",
  "condition",
  "vintage",
];

function validate(listing: PlatformListing): string[] {
  const errors: string[] = [];
  const fields = listing.fields ?? [];
  for (const label of REQUIRED_LABELS) {
    const f = fields.find((x) => x.label === label);
    if (!f || !f.value.trim()) errors.push(`Missing "${label}"`);
  }
  return errors;
}

export const listingSpec: PlatformListingSpec = {
  promptFragment,
  fieldsSchema,
  relevantChips,
  validate,
};
