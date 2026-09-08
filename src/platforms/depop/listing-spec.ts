import type { PlatformListing } from "@/lib/types";
import type { ChipId } from "@/lib/chip-vocab";
import type { PlatformListingSpec } from "../types";

const promptFragment = `Format for Depop. Depop has NO separate title field — the listing is one description of up to 1000 characters, and its FIRST LINE is what shows in the feed, so treat line 1 as a keyword-dense pseudo-title: Brand + item type + era/fit + colour + size. Put the value you would use as a title into BOTH the "title" field (for bower's own UI) and as the opening line of "description".

TONE: casual and style-led for a Gen-Z audience — light emoji use is welcome, and era/aesthetic framing ("y2k", "streetwear", "grunge", "vintage", "workwear") is expected. Keep it genuine, not salesy.

DESCRIPTION STRUCTURE: line 1 pseudo-title -> fit/measurements (pit-to-pit, length if available) -> honest condition note -> hashtags on the last line. State condition in words that match the structured Condition field.

HASHTAGS: put them in the "hashtags" array. MAXIMUM 5, each with a # prefix and each genuinely relevant — mix garment type + brand + style/era (e.g. #carhartt #detroitjacket #workwear #vintage #streetwear). Fewer relevant tags beat five padded ones. Never tag a brand the item is not. Keep the hashtags consistent with the Style/Age/Source fields.

Make Offer is on every listing (buyers expect ~15% off), so the copy may gently welcome offers.`;

const fieldsSchema = `Return these fields in the "fields" array, in this order. Use the EXACT label strings and pick values from the allowed sets:

- { "label": "Department", "value": "<one of: Womenswear | Menswear | Kidswear | Unisex>" }
- { "label": "Product type", "value": "<e.g. 'T-shirts', 'Hoodies', 'Jeans', 'Jackets', 'Trainers'>" }
- { "label": "Brand", "value": "<brand or 'Unbranded'>" }
- { "label": "Size", "value": "<UK/EU size>" }
- { "label": "Condition", "value": "<MUST be one of: Brand new | Used – like new | Used – excellent | Used – good | Used – fair>" }
- { "label": "Colour", "value": "<up to 2 colours>" }
- { "label": "Style", "value": "<up to 3 of: Streetwear | Y2K | Vintage | Retro | Sportswear | Workwear | Cottagecore | Grunge | Preppy | Punk | Skater | Minimalist>" }
- { "label": "Age", "value": "<one of: 2020s | 2010s | Y2K | 90s | 80s | 70s | 60s>", "hint": "Only include if item is genuinely vintage. Omit this row entirely if not." }
- { "label": "Source", "value": "<up to 2 of: Vintage | Pre-loved | Reworked>" }`;

const REQUIRED_LABELS = [
  "Department",
  "Product type",
  "Brand",
  "Size",
  "Condition",
  "Colour",
  "Style",
  "Source",
] as const;

const relevantChips: ChipId[] = [
  "shorter",
  "longer",
  "casual",
  "serious",
  "measurements",
  "hashtags",
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
