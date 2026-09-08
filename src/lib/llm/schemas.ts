/**
 * JSON Schemas for every structured-output boundary, mirroring `types.ts`.
 * Passed to the API as `output_config.format.schema`, which makes the response
 * a guaranteed-valid JSON document of this exact shape — no prose wrapping, no
 * raw control characters, no missing fields, and enums the model cannot step
 * outside. Keep these in step with `types.ts` and with the Swift `Wire.swift`
 * mirror; the enums here are the contract those hard Swift enums decode.
 *
 * Hand-written JSON Schema rather than zod: the SDK accepts a raw
 * `{ type: "json_schema", schema }` and the repo carries no zod today (#35).
 */

type Schema = Record<string, unknown>;

const CONDITION_VALUES = ["New with tags", "Excellent", "Good", "Fair"] as const;
const CONFIDENCE_VALUES = ["low", "medium", "high"] as const;

/** A required string that the model may legitimately return as null. */
const nullableString: Schema = { type: ["string", "null"] };

/** ListingField — a copyable label/value pair, hint optional. */
const listingFieldSchema: Schema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "value"],
  properties: {
    label: { type: "string" },
    value: { type: "string" },
    hint: { type: "string" },
  },
};

/** PlatformListing — the output of format and refine. */
export const platformListingSchema: Schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "hashtags"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    fields: { type: "array", items: listingFieldSchema },
  },
};

/** TagData — the tag/label OCR pass. Every field nullable but `barcode_visible`. */
const tagDataSchema: Schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "brand",
    "size",
    "size_system",
    "fabric_composition",
    "country_of_manufacture",
    "care_instructions",
    "rn_number",
    "style_number",
    "barcode_visible",
  ],
  properties: {
    brand: nullableString,
    size: nullableString,
    size_system: nullableString,
    fabric_composition: nullableString,
    country_of_manufacture: nullableString,
    care_instructions: nullableString,
    rn_number: nullableString,
    style_number: nullableString,
    barcode_visible: { type: "boolean" },
  },
};

/** Listing — the Neutral Listing, carrying the search-free price guess. */
const listingSchema: Schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "brand",
    "clothing_type",
    "colour_primary",
    "colour_secondary",
    "condition",
    "size",
    "material",
    "title",
    "description",
    "hashtags",
    "price_min",
    "price_max",
    "price_reasoning",
  ],
  properties: {
    brand: { type: "string" },
    clothing_type: { type: "string" },
    colour_primary: { type: "string" },
    colour_secondary: nullableString,
    condition: { type: "string", enum: [...CONDITION_VALUES] },
    size: { type: "string" },
    material: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    price_min: { type: "number" },
    price_max: { type: "number" },
    price_reasoning: { type: "string" },
    gender: { type: "string", enum: ["women", "men", "kids", "unisex"] },
    main_category: { type: "string" },
    subcategory: { type: "string" },
    fields: { type: "array", items: listingFieldSchema },
  },
};

/** AnalysisResult — tag OCR first, then the Neutral Listing. */
export const analysisResultSchema: Schema = {
  type: "object",
  additionalProperties: false,
  required: ["tag_data", "listing"],
  properties: {
    tag_data: tagDataSchema,
    listing: listingSchema,
  },
};

/** One Comparable — an ASKING price for a currently-listed item. */
const comparableSchema: Schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "price", "currency", "platform"],
  properties: {
    title: { type: "string" },
    price: { type: "number" },
    currency: { type: "string" },
    platform: { type: "string", enum: ["vinted", "depop", "ebay", "other"] },
    url: { type: "string" },
  },
};

/** PriceBand — one platform's low-to-high range, with its comparables. */
export const priceBandSchema: Schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "low",
    "high",
    "currency",
    "confidence",
    "sell_likelihood",
    "reasoning",
    "comparables",
  ],
  properties: {
    low: { type: "number" },
    high: { type: "number" },
    currency: { type: "string" },
    confidence: { type: "string", enum: [...CONFIDENCE_VALUES] },
    sell_likelihood: { type: "string", enum: [...CONFIDENCE_VALUES] },
    reasoning: { type: "string" },
    comparables: { type: "array", items: comparableSchema },
  },
};
