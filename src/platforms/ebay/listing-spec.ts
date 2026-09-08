import type { PlatformListing } from "@/lib/types";
import type { ChipId } from "@/lib/chip-vocab";
import type { PlatformListingSpec } from "../types";

const promptFragment = `Format for eBay UK. eBay has NO hashtag field and no emoji — search ("Best Match") is driven by the 80-character title and the item specifics in "fields". Leave the "hashtags" array EMPTY ([]).

TITLE: use as many of the 80 characters as you can with the item's REAL attributes only, ordered Brand -> Department -> Type -> Colour -> Material -> Style/Fit -> Size (add a model number/name if known, e.g. "Detroit"). Do NOT pad with unrelated brand names, "like", "fits", "for", comparisons, question marks, or emojis — eBay's search-manipulation policy forbids them for clothing and can suppress the listing.

DESCRIPTION: factual and complete, roughly 80-200 words. Include brand, model/style name, material, and — whenever the source provides them — laid-flat measurements (pit-to-pit, length, sleeve). Disclose condition specifically and name any flaws with reference to the photos; accurate condition is tied to search visibility and to who pays for a "not as described" return (the seller always does). Close with postage expectations ("sent tracked, dispatched within 1 working day") when appropriate. Real searchable keywords, no hashtags, no flattery in place of detail.

ITEM SPECIFICS: populate every field in the schema below — do not just mention an attribute in prose, MIRROR it into the specific. Brand, Size and Colour are required by eBay and a blank specific makes the listing invisible to that filter.`;

const fieldsSchema = `Return these fields in the "fields" array, in this order. Use the EXACT label strings and pick values from the allowed sets:

- { "label": "Category", "value": "<eBay path, e.g. 'Clothes, Shoes & Accessories > Women > Women's Clothing > Coats, Jackets & Waistcoats'>" }
- { "label": "Department", "value": "<one of: Women | Men | Boys | Girls | Unisex Adult | Unisex Kids>" }
- { "label": "Type", "value": "<specific type like 'Hoodie', 'Denim Jacket', 'Polo Shirt', 'Jeans', 'Midi Dress'>" }
- { "label": "Brand", "value": "<brand or 'Unbranded'>" }
- { "label": "Size", "value": "<size as written on the tag>" }
- { "label": "Size Type", "value": "<one of: Regular | Plus | Petite | Big & Tall | Maternity>" }
- { "label": "Style", "value": "<one or two of: Casual | Smart Casual | Workwear | Streetwear | Vintage | Sportswear | Bohemian | Y2K | Preppy | Grunge>" }
- { "label": "Colour", "value": "<primary colour>" }
- { "label": "Material", "value": "<dominant material from the tag or visible fabric>" }
- { "label": "Condition", "value": "<MUST be one of: New with tags | New without tags | New with imperfections | Pre-owned – Excellent | Pre-owned – Good | Pre-owned – Fair>" }`;

const REQUIRED_LABELS = [
  "Category",
  "Department",
  "Type",
  "Brand",
  "Size",
  "Size Type",
  "Style",
  "Colour",
  "Material",
  "Condition",
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
