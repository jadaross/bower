import { daily, recentEvents, summary, costStats, feedbackStats } from "@/lib/dashboard/metrics";
import { Card, Columns, Stat } from "./_components/charts";
import { money, num, pct, when } from "./_components/format";
import { pageData } from "./_components/load";
import { Shell, TraceLink, qs, type Query } from "./_components/Shell";

export const dynamic = "force-dynamic";

const ICON: Record<string, string> = {
  listing: "✎", rejection: "⊘", check: "£", format: "⇄", refine: "✧", "thumbs-up": "👍", "thumbs-down": "👎",
  copied: "⎘", note: "✉", signup: "＋", error: "!",
};

export default async function Overview({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const s = summary(data);
  const days = daily(data);
  const cost = costStats(data);
  const fb = feedbackStats(data);
  const events = recentEvents(data, 14);
  const thumbsTotal = s.thumbsUp + s.thumbsDown;

  return (
    <Shell tab="overview" q={q} data={data} badges={badges}>
      <h1>How it&rsquo;s going</h1>
      <p>{data.range.label}, {data.includeOwner ? "including your own account" : "your account left out"}. Spend is what Langfuse priced the model calls at, in US dollars.</p>

      <div className="kpis">
        <Stat label="People with an account" value={num(s.accounts)} hint={s.newAccounts ? `+${s.newAccounts} in this range` : "none new in this range"} />
        <Stat label="Used it in this range" value={num(s.activePeople)} hint={s.neverWrote ? `${s.neverWrote} signed up and never wrote a listing` : "everyone has written at least one"} tone={s.neverWrote ? "warn" : undefined} />
        <Stat label="Listings written" value={num(s.listings)} hint={s.rejections ? `${s.rejections} photo set${s.rejections === 1 ? "" : "s"} rejected` : "no rejections"} />
        <Stat label="Market checks" value={num(s.checks)} hint={s.listings ? `${pct(fb.journey[3].count, s.listings)} of listings went on to one` : undefined} />
        <Stat label="Spend" value={money(s.spend)} hint={cost.perListingAllIn !== null ? `${money(cost.perListingAllIn)} per listing, all in` : undefined} />
        <Stat label="Thumbs up" value={thumbsTotal ? pct(s.thumbsUp, thumbsTotal) : "—"} hint={thumbsTotal ? `${s.thumbsUp} up · ${s.thumbsDown} down` : "no thumbs yet"} tone={s.thumbsDown > s.thumbsUp ? "bad" : s.thumbsUp ? "good" : undefined} />
        <Stat label="Copied" value={s.listings ? pct(fb.copiedListings, s.listings) : "—"} hint="listings where something was copied" />
      </div>

      <div className="grid">
        <Card title="Activity by day" sub="Listings written and market checks run, London time" span="c8">
          <Columns
            days={days.map((d) => d.day)}
            series={[
              { key: "listings", label: "Listings", color: "--s1", values: days.map((d) => d.listings) },
              { key: "checks", label: "Market checks", color: "--s2", values: days.map((d) => d.checks) },
            ]}
            extra={(i) => `${days[i].activePeople} ${days[i].activePeople === 1 ? "person" : "people"}${days[i].signups ? ` · ${days[i].signups} signed up` : ""}`}
          />
        </Card>
        <Card title="Worth a look" span="c4">
          <div className="callouts" style={{ gridTemplateColumns: "1fr" }}>
            <a href={`/admin/feedback${qs(q)}`} className={`callout${s.thumbsDown ? " alert" : ""}`}>
              <div className="n">{s.thumbsDown}</div><p>thumbs down — each one links to the listing it was about</p>
            </a>
            <a href={`/admin/feedback${qs(q)}`} className={`callout${s.notes ? " alert" : ""}`}>
              <div className="n">{s.notes}</div><p>typed notes from testers</p>
            </a>
            <a href={`/admin/health${qs(q)}`} className={`callout${s.errors ? " alert" : ""}`}>
              <div className="n">{s.errors}</div><p>failed model calls (each one refunded a unit)</p>
            </a>
            <a href={`/admin/people${qs(q)}`} className="callout">
              <div className="n">{s.neverWrote}</div><p>people who signed up but never wrote a listing</p>
            </a>
          </div>
        </Card>
      </div>

      <div className="grid">
        <Card title="Spend by day" sub="All four calls, priced by Langfuse" span="c6">
          <Columns
            days={days.map((d) => d.day)}
            series={[{ key: "cost", label: "Spend", color: "--s1", values: days.map((d) => Number(d.cost.toFixed(4))) }]}
            format={(v) => money(v)}
            integer={false}
            height={140}
          />
        </Card>
        <Card title="Latest" sub="Newest first. The trace link opens the exact model call in Langfuse." span="c6">
          {events.length === 0 ? (
            <p className="empty">Nothing has happened in this range</p>
          ) : (
            <ul className="feed">
              {events.map((e, i) => (
                <li key={i}>
                  <time title={e.at}>{when(e.at)}</time>
                  <span className="ico" title={e.kind}>{ICON[e.kind]}</span>
                  <span><span className="who">{e.who}</span> <span className="what">{e.what}</span></span>
                  <TraceLink projectId={data.projectId} traceId={e.traceId} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
