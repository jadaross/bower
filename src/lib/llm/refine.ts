import type { Platform, PlatformListing } from "@/lib/types";
import { platformListingSpec, platformMetadata } from "@/platforms";
import { MODELS, anthropicClient } from "./client";
import { parseJsonObject } from "./analyse-parse";

export interface RefineInput {
  platform: Platform;
  listing: PlatformListing;
  instructions: string[];
}

function buildPrompt({ platform, listing, instructions }: RefineInput): string {
  return `You are a secondhand fashion listing specialist. Refine an existing ${platformMetadata[platform].name} listing based on user feedback.

${platformListingSpec[platform].promptFragment}

Current listing:
${JSON.stringify(listing, null, 2)}

Apply these refinements (do them all, in order):
${instructions.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Return ONLY a valid JSON object — no markdown code fences, no explanation text, just raw JSON:

{
  "title": "",
  "description": "",
  "hashtags": [],
  "fields": [
    { "label": "", "value": "", "hint": "" }
  ]
}

Rules:
- Apply every refinement above. If two refinements conflict, the later one wins.
- Keep all factual details accurate — only change style, length, and format.
- Do NOT invent new information (no measurements unless asked; no condition claims that weren't in the source).
- Respect platform format rules (title length, hashtag conventions).
- "fields": return the EXACT SAME array that came in unless a refinement instruction specifically changes a structured value (e.g. an instruction like "set condition to Pre-owned – Fair"). Do not rewrite labels or values gratuitously.`;
}

export async function refineListing(input: RefineInput): Promise<PlatformListing> {
  const client = anthropicClient();
  const message = await client.messages.create({
    model: MODELS.refine,
    max_tokens: 1536,
    messages: [{ role: "user", content: buildPrompt(input) }],
  });
  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJsonObject(text) as PlatformListing;
  if (!parsed.title || !parsed.description) {
    throw new Error("Refined PlatformListing missing title or description");
  }
  parsed.hashtags = parsed.hashtags ?? [];
  return parsed;
}
