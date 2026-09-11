import type { ReactNode } from "react";
import { signOut } from "../login/actions";
import type { DashboardData } from "@/lib/dashboard/metrics";
import { ago } from "./format";

export interface Query {
  range?: string;
  me?: string;
  fresh?: string;
}

export const TABS = [
  { id: "overview", href: "/admin", label: "Overview" },
  { id: "people", href: "/admin/people", label: "People" },
  { id: "items", href: "/admin/items", label: "Items & photos" },
  { id: "feedback", href: "/admin/feedback", label: "Feedback" },
  { id: "cost", href: "/admin/cost", label: "Cost" },
  { id: "health", href: "/admin/health", label: "Health" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/** Keep the range and owner toggle across tabs. */
export function qs(q: Query, over: Partial<Query> = {}): string {
  const merged = { range: q.range, me: q.me, ...over };
  const parts = Object.entries(merged).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export function Shell({ tab, q, data, badges = {}, children }: { tab: TabId; q: Query; data: DashboardData; badges?: Partial<Record<TabId, { n: number; alert?: boolean }>>; children: ReactNode }) {
  const ranges = [
    ["7d", "7d"],
    ["30d", "30d"],
    ["90d", "90d"],
    ["all", "all"],
  ] as const;
  const me = q.me === "1";
  return (
    <>
      <div className="topbar">
        <a href={`/admin${qs(q)}`} className="wordmark" style={{ textDecoration: "none" }}>bower<b>.</b><small>dashboard</small></a>
        <span className="spacer" />
        <nav className="seg" aria-label="Range">
          {ranges.map(([k, label]) => (
            <a key={k} className={data.range.key === k ? "on" : ""} href={`${TABS.find((t) => t.id === tab)!.href}${qs(q, { range: k })}`}>{label}</a>
          ))}
        </nav>
        <nav className="seg" aria-label="Whose activity">
          <a className={me ? "" : "on"} href={`${TABS.find((t) => t.id === tab)!.href}${qs(q, { me: undefined })}`}>friends</a>
          <a className={me ? "on" : ""} href={`${TABS.find((t) => t.id === tab)!.href}${qs(q, { me: "1" })}`}>+ you</a>
        </nav>
        <a className="linkbtn" title="Bypass the one-minute cache" href={`${TABS.find((t) => t.id === tab)!.href}${qs(q, { fresh: "1" })}`}>
          refreshed {ago(data.fetchedAt)}
        </a>
        <form action={signOut}><button type="submit">sign out</button></form>
      </div>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => {
          const b = badges[t.id];
          return (
            <a key={t.id} href={`${t.href}${qs(q)}`} className={t.id === tab ? "on" : ""}>
              {t.label}
              {b && b.n > 0 && <span className={`n${b.alert ? " alert" : ""}`}>{b.n}</span>}
            </a>
          );
        })}
      </nav>
      <main className="page">{children}</main>
    </>
  );
}

export function TraceLink({ projectId, traceId, label = "trace ↗" }: { projectId: string | null; traceId: string | null; label?: string }) {
  if (!traceId || !projectId) return null;
  const base = (process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com").replace(/\/$/, "");
  return <a className="tr" href={`${base}/project/${projectId}/traces/${traceId}`} target="_blank" rel="noreferrer">{label}</a>;
}
