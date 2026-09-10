import { withAuth } from "@/lib/auth";
import { refineListing } from "@/lib/llm/refine";
import { getSellerNotes } from "@/lib/profile";
import type { Platform, PlatformListing } from "@/lib/types";

export const runtime = "nodejs";

interface RequestBody {
  platform: Platform;
  listing: PlatformListing;
  instructions: string[];
}

export const POST = withAuth(async (request, user) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { platform, listing, instructions } = body;
  if (!platform || !listing || !Array.isArray(instructions) || instructions.length === 0) {
    return Response.json(
      { error: "platform, listing, and a non-empty instructions[] are required" },
      { status: 400 }
    );
  }

  try {
    let traceId: string | undefined;
    const sellerNotes = await getSellerNotes(user.token).catch(() => []);
    const result = await refineListing({ platform, listing, instructions, sellerNotes, onTraceId: (id) => { traceId = id; } });
    return Response.json({ ...result, trace_id: traceId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Refine request failed: ${message}` }, { status: 500 });
  }
});
