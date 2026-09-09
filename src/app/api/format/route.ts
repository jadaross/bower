import { withAuth } from "@/lib/auth";
import { formatListing } from "@/lib/llm/format";
import type { Listing, Platform, Tone } from "@/lib/types";

export const runtime = "nodejs";

interface RequestBody {
  listing: Listing;
  platform: Platform;
  tone: Tone;
}

export const POST = withAuth(async (request) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { listing, platform, tone } = body;
  if (!listing || !platform || !tone) {
    return Response.json(
      { error: "listing, platform, and tone are required" },
      { status: 400 }
    );
  }

  try {
    let traceId: string | undefined;
    const result = await formatListing({ listing, platform, tone, onTraceId: (id) => { traceId = id; } });
    return Response.json({ ...result, trace_id: traceId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Format request failed: ${message}` }, { status: 500 });
  }
});
