import { withAuth } from "@/lib/auth";
import { clearHistory, listHistory } from "@/lib/history";

export const runtime = "nodejs";

/**
 * The caller's item history, newest first. Read as the caller, so RLS scopes
 * it to their own rows. `limit` (1–100) and `before` (an ISO created_at
 * cursor) page it.
 */
export const GET = withAuth(async (request, user) => {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const before = url.searchParams.get("before") ?? undefined;
  try {
    const items = await listHistory(user.token, {
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
      before,
    });
    return Response.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});

/** Clears the caller's history. Text only was ever kept, so nothing else to remove. */
export const DELETE = withAuth(async (_request, user) => {
  try {
    await clearHistory(user.token, user.id);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});
