import { withAuth } from "@/lib/auth";
import { userClient } from "@/lib/supabase";
import { recordScore } from "@/lib/observability";
import { PLATFORM_IDS } from "@/platforms";
import type { Platform } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Typed feedback. Stored as the caller in `feedback_notes` (RLS scopes the
 * row to them), and, when the note is about a listing on screen, also
 * attached to that listing's Langfuse trace as a comment so it sits next to
 * the output it describes.
 */
interface Body {
  message?: unknown;
  screen?: unknown;
  session_id?: unknown;
  platform?: unknown;
  trace_id?: unknown;
}

const MAX_LENGTH = 2000;

export const POST = withAuth(async (request, user) => {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return Response.json({ error: "message is required" }, { status: 400 });
  if (message.length > MAX_LENGTH) {
    return Response.json({ error: `message must be ${MAX_LENGTH} characters or fewer` }, { status: 400 });
  }

  const text = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 200 ? v : null);
  const platform =
    typeof body.platform === "string" && PLATFORM_IDS.includes(body.platform as Platform)
      ? (body.platform as Platform)
      : null;
  const traceId = text(body.trace_id);

  const { error } = await userClient(user.token).from("feedback_notes").insert({
    user_id: user.id,
    message,
    screen: text(body.screen),
    session_id: text(body.session_id),
    platform,
    trace_id: traceId,
  });
  if (error) return Response.json({ error: `Could not save feedback: ${error.message}` }, { status: 500 });

  if (traceId) {
    recordScore({ traceId, name: "note", value: 1, dataType: "NUMERIC", comment: message });
  }

  return Response.json({ ok: true });
});
