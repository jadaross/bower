import type { PlatformListing } from "@/lib/types";
import type { ChipId } from "@/lib/chip-vocab";
import type { PlatformListingSpec } from "../types";

const promptFragment = `Format for Depop. Depop has NO separate title field — the listing is one description of up to 1000 characters, and its FIRST LINE is what shows in the feed, so treat line 1 as a keyword-dense pseudo-title: 3-5 plain words a buyer would type (brand, garment, colour or fit) + size. Aesthetic words (y2k, grunge, cottagecore) go AFTER the first line, never in it; Depop's own sellers' training says they do not help the title. Put the value you would use as a title into BOTH the "title" field (for bower's own UI) and as the opening line of "description".

TONE: casual and style-led for a Gen-Z audience — light emoji use is welcome, and era/aesthetic framing ("y2k", "streetwear", "grunge", "vintage", "workwear") is expected. Keep it genuine, not salesy.

DESCRIPTION STRUCTURE: line 1 pseudo-title -> fit/measurements (pit-to-pit, length if available) -> honest condition note -> hashtags on the last line. State condition in words that match the structured Condition field.

HASHTAGS: put them in the "hashtags" array. MAXIMUM 5, each with a # prefix and each genuinely relevant — mix garment type + brand + style/era (e.g. #carhartt #detroitjacket #workwear #vintage #streetwear). Fewer relevant tags beat five padded ones. Never tag a brand the item is not. Hashtags add nothing beyond the same word in the first line; use them for genuine extra search terms, and at most 2 may be brands. Keep the hashtags consistent with the Style/Age/Source fields.

Make Offer is on every listing (buyers expect ~15% off), so the copy may gently welcome offers.

VOICE: casual and friendly, like texting a mate about something cool you found. Keep the honest core (measurements first, buyers refuse to buy without them, then condition and any flaws) but lead with style — era and aesthetic words are welcome where accurate (y2k, vintage, oversized, grunge, streetwear). One personal line at the end is fine ("just don't fit me"). Offers go through Make Offer, so never write "dm me". Never write "rare" or "deadstock" unless the source says so; never claim smoke-free, pet-free or washed. Emoji are fine in moderation. Genuine, not salesy.`;

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
