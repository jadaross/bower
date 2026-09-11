import { withAuth } from "@/lib/auth";
import { recordScore, type ScoreDataType } from "@/lib/observability";

export const runtime = "nodejs";

/**
 * Records a client feedback signal as a Langfuse score on a trace the client
 * was handed (the `trace_id` returned by analyse/format/refine). The name is
 * validated against an allow-list so a client cannot write arbitrary score
 * names; the value/dataType are fixed per signal. Best-effort — the score is
 * flushed by the request-end flush; a scoring failure never fails the request.
 */
const SIGNALS: Record<string, { value: number; dataType: ScoreDataType }> = {
  // Named by source, not meaning (skill guidance).
  copied: { value: 1, dataType: "NUMERIC" },       // positive: the user kept it
  "opened-platform": { value: 1, dataType: "NUMERIC" }, // positive: went to post it
  "manual-edit": { value: 1, dataType: "NUMERIC" }, // negative: the user reworked it
  thumbs: { value: 1, dataType: "BOOLEAN" },         // explicit; value overridden below
};

interface Body {
  trace_id?: unknown;
  name?: unknown;
  /** Only read for `thumbs`: 1 = up, 0 = down. */
  value?: unknown;
  comment?: unknown;
}

export const POST = withAuth(async (request) => {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const traceId = typeof body.trace_id === "string" ? body.trace_id : "";
  const name = typeof body.name === "string" ? body.name : "";
  const signal = SIGNALS[name];
  if (!traceId || !signal) {
    return Response.json(
      { error: "trace_id and a known feedback name are required" },
      { status: 400 }
    );
  }

  const value = name === "thumbs" && body.value === 0 ? 0 : signal.value;
  recordScore({
    traceId,
    name,
    value,
    dataType: signal.dataType,
    comment: typeof body.comment === "string" ? body.comment : undefined,
  });

  return Response.json({ ok: true });
});
