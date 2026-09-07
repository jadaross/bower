import type { AnalysisResult, Listing, PlatformListing } from "@/lib/types";

export const listing: Listing = {
  brand: "Carhartt",
  clothing_type: "Detroit jacket",
  colour_primary: "Brown",
  colour_secondary: null,
  condition: "Good",
  size: "M",
  material: "Cotton duck canvas",
  title: "Carhartt Detroit Jacket Brown M",
  description: "Classic Carhartt Detroit jacket in brown duck canvas.",
  hashtags: ["carhartt", "workwear", "vintage"],
  price_min: 55,
  price_max: 85,
  price_reasoning: "Comparable Detroit jackets sit in this band.",
  gender: "men",
  main_category: "Jackets",
  subcategory: "Work jackets",
};

export const platformListing: PlatformListing = {
  title: "Carhartt Detroit Jacket — Brown, M",
  description: "Classic brown duck canvas Detroit jacket. Good condition.",
  hashtags: ["#carhartt", "#workwear"],
  fields: [{ label: "Condition", value: "Good" }],
};

export const analysisResult: AnalysisResult = {
  tag_data: {
    brand: "Carhartt",
    size: "M",
    size_system: "US",
    fabric_composition: "100% cotton",
    country_of_manufacture: "Mexico",
    care_instructions: "Machine wash cold",
    rn_number: "14806",
    style_number: "J001",
    barcode_visible: false,
  },
  listing,
};

/**
 * What the server actually puts on the wire: the model's output plus the
 * photo_analysis compatibility section the analyse path fills in for the
 * shipped iOS client. Not typed as AnalysisResult — that type no longer models
 * photo_analysis.
 */
export const analysisResultWire = {
  photo_analysis: {
    scores: [],
    missing_shots: [],
    suggestions: [],
    has_tag_photo: false,
    ready_to_list: true,
  },
  tag_data: analysisResult.tag_data,
  listing: analysisResult.listing,
};

/** A text response in the shape the Anthropic SDK returns. */
export function textMessage(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/** An async-iterable mimicking the SDK's streaming response. */
export function textStream(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) {
        yield { type: "content_block_delta", delta: { type: "text_delta", text } };
      }
    },
  };
}
