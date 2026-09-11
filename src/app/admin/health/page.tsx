import { healthStats, photoStats, WEEKDAYS } from "@/lib/dashboard/metrics";
import { Card, Heatmap, Stat } from "../_components/charts";
import { ago, num, pct, seconds, when } from "../_components/format";
import { pageData } from "../_components/load";
import { Shell, TraceLink, type Query } from "../_components/Shell";

export const dynamic = "force-dynamic";

const ROUTE_LABEL = { analyse: "Listing (analyse)", valuate: "Market check (valuate)", format: "Switch (format)", refine: "Chips (refine)" } as const;

export default async function Health({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const h = healthStats(data);
  const ph = photoStats(data);
  const analyse = h.latency.find((l) => l.route === "analyse");
  const valuate = h.latency.find((l) => l.route === "valuate");
  const rejected = ph.rejections.reduce((s, r) => s + r.count, 0);

  return (
    <Shell tab="health" q={q} data={data} badges={badges}>
      <h1>Is it working</h1>
      <p>Failures, how long people wait, and when they use it. Latency is per model call: a market check waits on the slowest of its platforms, and the read shows its title at about two seconds regardless of the total.</p>

      <div className="kpis">
        <Stat label="Failed calls" value={num(h.errors)} hint={h.errorRate === null ? "no calls" : `${pct(h.errors, h.calls)} of ${h.calls}`} tone={h.errors ? "bad" : "good"} />
        <Stat label="Rejected photo sets" value={num(rejected)} hint="deliberate stops, not failures" />
        <Stat label="Read, typical" value={seconds(analyse?.p50)} hint={`p95 ${seconds(analyse?.p95)}`} tone={analyse?.p95 && analyse.p95 > 20 ? "warn" : undefined} />
        <Stat label="Market check, typical" value={seconds(valuate?.p50)} hint={`p95 ${seconds(valuate?.p95)} per platform`} tone={valuate?.p95 && valuate.p95 > 120 ? "warn" : undefined} />
        <Stat label="Last trace" value={ago(h.lastTrace)} hint={h.lastTrace ? when(h.lastTrace) : "nothing yet"} />
      </div>

      <div className="grid">
        <Card title="How long each call takes" sub="Seconds, per model call" span="c6">
          <div className="tablewrap">
            <table className="t">
              <thead><tr><th>Call</th><th className="num">Calls</th><th className="num">p50</th><th className="num">p95</th><th className="num">Slowest</th><th className="num">Failed</th></tr></thead>
              <tbody>
                {h.latency.map((l) => (
                  <tr key={l.route}>
                    <td>{ROUTE_LABEL[l.route]}</td>
                    <td className="num">{l.n}</td>
                    <td className="num">{seconds(l.p50)}</td>
                    <td className="num">{seconds(l.p95)}</td>
                    <td className="num">{seconds(l.max)}</td>
                    <td className="num">{l.errors ? <span className="pill bad">{l.errors}</span> : <span className="dim">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="When people use it" sub="Listings and market checks by weekday and hour, London time" span="c6">
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
