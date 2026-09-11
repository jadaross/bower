import { costStats, daily, summary } from "@/lib/dashboard/metrics";
import { Bars, Card, Columns, Stat } from "../_components/charts";
import { compact, money, num } from "../_components/format";
import { pageData } from "../_components/load";
import { Shell, type Query } from "../_components/Shell";

export const dynamic = "force-dynamic";

const ROUTE_COLOR = { analyse: "--s1", valuate: "--s2", format: "--s3", refine: "--s4" } as const;
const ROUTE_LABEL = { analyse: "Listing (analyse)", valuate: "Market check (valuate)", format: "Switch (format)", refine: "Chips (refine)" } as const;

export default async function Cost({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const c = costStats(data);
  const s = summary(data);
  const days = daily(data);

  return (
    <Shell tab="cost" q={q} data={data} badges={badges}>
      <h1>What it costs</h1>
      <p>Priced by Langfuse from each call&rsquo;s token usage, in US dollars. A listing is one Sonnet call over the photos; a market check is one Sonnet call with web search per Enabled Platform, which is where nearly all the money goes.</p>

      <div className="kpis">
        <Stat label="Spend in range" value={money(c.spend)} hero hint={`${num(data.generations.length)} model calls`} />
        <Stat label="Per listing, all in" value={money(c.perListingAllIn)} hint="the read plus every switch, chip and check on that item" />
        <Stat label="Per listing, the read alone" value={money(c.perListingRead)} />
        <Stat label="Per market check" value={money(c.perCheck)} hint="all platforms in the one check" />
        <Stat label="Per active person" value={money(c.perActivePerson)} hint={`${s.activePeople} people spent something`} />
        <Stat label="Monthly run rate" value={money(c.monthlyRunRate)} hint="this range's daily average × 30" />
        <Stat label="A full meter" value={money(c.fullMeter)} hint="10 listings + 3 checks, at today's averages" tone="warn" />
      </div>

      <div className="grid">
        <Card title="Spend by day and call" span="c8">
          <Columns
            days={days.map((d) => d.day)}
            series={(["analyse", "valuate", "format", "refine"] as const).map((r) => ({
              key: r, label: ROUTE_LABEL[r], color: ROUTE_COLOR[r], values: days.map((d) => Number(d.costByRoute[r].toFixed(4))),
            }))}
            format={(v) => money(v)}
            integer={false}
          />
        </Card>
        <Card title="By model" span="c4">
          <Bars items={c.byModel.map((m) => ({ label: m.label.replace("claude-", ""), count: m.count }))} format={(v) => money(v)} of={c.spend} />
          <div style={{ height: 16 }} />
          <div className="kicker">Tokens</div>
          <p style={{ margin: "4px 0 0" }}>{compact(c.inputTokens)} in · {compact(c.outputTokens)} out</p>
          <p className="sub" style={{ margin: "2px 0 0" }}>Market checks carry the search results back in as input, which is why input dwarfs output.</p>
        </Card>
      </div>

      <div className="grid">
        <Card title="By call" sub="Where the money goes and what each one costs on average" span="c7">
          <div className="tablewrap">
            <table className="t">
              <thead><tr><th>Call</th><th>Model</th><th className="num">Calls</th><th className="num">Spend</th><th className="num">Share</th><th className="num">Avg</th><th className="num">Tokens in</th><th className="num">Tokens out</th></tr></thead>
              <tbody>
                {c.byRoute.map((r) => (
                  <tr key={r.route}>
                    <td><span className="dot" style={{ background: `var(${ROUTE_COLOR[r.route]})` }} />{ROUTE_LABEL[r.route]}</td>
                    <td className="dim">{r.model.replace("claude-", "")}</td>
                    <td className="num">{r.calls}</td>
                    <td className="num">{money(r.cost)}</td>
                    <td className="num">{c.spend ? `${Math.round((r.cost / c.spend) * 100)}%` : "—"}</td>
                    <td className="num">{r.calls ? money(r.avg) : "—"}</td>
                    <td className="num">{compact(r.inputTokens)}</td>
                    <td className="num">{compact(r.outputTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Who costs the most" sub="In this range" span="c5">
          <Bars items={c.topPeople.map((p) => ({ label: p.label, count: p.cost, hint: `${p.listings} listings, ${p.checks} checks` }))} format={(v) => money(v)} of={c.spend} empty="Nobody has spent anything yet" />
        </Card>
      </div>
    </Shell>
  );
}
