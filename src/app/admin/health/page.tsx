import { healthStats, photoStats, speedStats, WEEKDAYS } from "@/lib/dashboard/metrics";
import { Card, Heatmap, Stat } from "../_components/charts";
import { ago, num, pct, seconds, when } from "../_components/format";
import { pageData } from "../_components/load";
import { qs, Shell, TraceLink, type Query } from "../_components/Shell";

export const dynamic = "force-dynamic";

export default async function Health({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const h = healthStats(data);
  const ph = photoStats(data);
  const sp = speedStats(data);
  const read = sp.tasks.find((t) => t.task === "read");
  const check = sp.tasks.find((t) => t.task === "check");
  const rejected = ph.rejections.reduce((s, r) => s + r.count, 0);

  return (
    <Shell tab="health" q={q} data={data} badges={badges}>
      <h1>Is it working</h1>
      <p>Failures and when they use it. How long each task takes has its own tab, <a href={`/admin/speed${qs(q)}`}>Speed</a>; the two waits here are the headline.</p>

      <div className="kpis">
        <Stat label="Failed calls" value={num(h.errors)} hint={h.errorRate === null ? "no calls" : `${pct(h.errors, h.calls)} of ${h.calls}`} tone={h.errors ? "bad" : "good"} />
        <Stat label="Rejected photo sets" value={num(rejected)} hint="deliberate stops, not failures" />
        <Stat label="Read, typical" value={seconds(read?.p50)} hint={`slowest in 20: ${seconds(read?.p95)}`} tone={read?.p95 && read.p95 > read.target ? "warn" : undefined} />
        <Stat label="Market check, typical" value={seconds(check?.p50)} hint={`slowest in 20: ${seconds(check?.p95)}`} tone={check?.p95 && check.p95 > check.target ? "warn" : undefined} />
        <Stat label="Last trace" value={ago(h.lastTrace)} hint={h.lastTrace ? when(h.lastTrace) : "nothing yet"} />
      </div>

      <div className="grid">
        <Card title="When people use it" sub="Listings and market checks by weekday and hour, London time" span="c12">
          <Heatmap heat={h.heat} weekdays={WEEKDAYS} />
        </Card>
      </div>

      <div className="grid">
        <Card title="Failures" sub="Every model call that errored. Each one handed the unit back." span="c12">
          {h.errorList.length === 0 ? (
            <p className="empty">Nothing failed in this range</p>
          ) : (
            <div className="tablewrap">
              <table className="t">
                <thead><tr><th>When</th><th>Call</th><th>Who</th><th>Message</th><th></th></tr></thead>
                <tbody>
                  {h.errorList.map((e, i) => (
                    <tr key={i}>
                      <td className="dim">{when(e.at)}</td>
                      <td>{e.route}</td>
                      <td>{e.who}</td>
                      <td className="wrap">{e.message}</td>
                      <td><TraceLink projectId={data.projectId} traceId={e.traceId} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="sub">
        Reading Langfuse environment <code>{process.env.DASHBOARD_LANGFUSE_ENVIRONMENT ?? "production"}</code>
        {h.environments.length ? ` (${h.environments.map((e) => `${e.label}: ${e.count}`).join(", ")})` : ""} · data cached for a minute per range · fetched {when(data.fetchedAt)}.
      </p>
    </Shell>
  );
}
