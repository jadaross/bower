import { requireAdmin } from "@/lib/dashboard/auth";
import { loadDashboard } from "@/lib/dashboard/data";
import { summary, type DashboardData } from "@/lib/dashboard/metrics";
import type { Query, TabId } from "./Shell";

/** Gate, load and compute the tab badges — the preamble every page shares. */
export async function pageData(searchParams: Promise<Query>): Promise<{ q: Query; data: DashboardData; badges: Partial<Record<TabId, { n: number; alert?: boolean }>> }> {
  await requireAdmin();
  const q = await searchParams;
  const data = await loadDashboard({ range: q.range, includeOwner: q.me === "1", fresh: q.fresh === "1" });
  const s = summary(data);
  return {
    q,
    data,
    badges: {
      feedback: { n: s.thumbsDown + s.notes, alert: s.thumbsDown + s.notes > 0 },
      health: { n: s.errors, alert: s.errors > 0 },
    },
  };
}
