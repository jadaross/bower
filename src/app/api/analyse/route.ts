import { withAuth } from "@/lib/auth";
import { allowanceExhausted, refundAllowance, spendAllowance } from "@/lib/allowance";
import { analyseListingStream } from "@/lib/llm/analyse";
import { toStringStreamResponse } from "@/lib/streaming-text";
import type { Platform, Tone } from "@/lib/types";

export const runtime = "nodejs";
// The web-search valuation and the image read can run long; allow the max.
export const maxDuration = 300;

interface RequestBody {
  images: string[];
  platform?: Platform;
  tone: Tone;
}

/**
 * Wraps the model's stream so a failure part-way through hands the unit back.
 * A read the user never received must not cost them anything — the same rule
 * valuate applies, but the failure here can surface after headers have gone.
 */
function refundOnError(input: ReadableStream<string>, userId: string): ReadableStream<string> {
  const reader = input.getReader();
  return new ReadableStream<string>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (err) {
        await refundAllowance(userId);
        controller.error(err);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
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

  const { images, platform, tone = "casual" } = body;
  if (!Array.isArray(images) || images.length === 0) {
    return Response.json({ error: "No images provided" }, { status: 400 });
  }
  if (images.length > 20) {
    return Response.json({ error: "Maximum 20 images allowed per listing" }, { status: 400 });
  }

  // A read costs one unit, the same as a search. Reserved before the model is
  // called, so two reads racing on one account cannot both spend the last unit,
  // and only after validation, so a malformed request costs nothing.
  let spend;
  try {
    spend = await spendAllowance(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
  if (!spend.allowed) return allowanceExhausted(spend);

  let stream: ReadableStream<string>;
  try {
    stream = analyseListingStream({ photos: images, tone, platform });
  } catch (err) {
    await refundAllowance(user.id);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }

  return toStringStreamResponse(refundOnError(stream, user.id));
});
