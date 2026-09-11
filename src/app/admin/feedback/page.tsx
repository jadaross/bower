import { feedbackStats, summary } from "@/lib/dashboard/metrics";
import { Bars, Card, Stat } from "../_components/charts";
import { num, pct, when } from "../_components/format";
import { pageData } from "../_components/load";
import { Shell, TraceLink, type Query } from "../_components/Shell";

export const dynamic = "force-dynamic";

export default async function Feedback({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const fb = feedbackStats(data);
  const s = summary(data);
  const thumbs = fb.thumbsUp + fb.thumbsDown;

  return (
    <Shell tab="feedback" q={q} data={data} badges={badges}>
      <h1>What they think</h1>
      <p>Two kinds of signal. The explicit ones — thumbs and typed notes — and the quiet ones: copying a listing means they kept it, opening the platform means they went to post it, editing it by hand means it was not quite right.</p>

      <div className="kpis">
        <Stat label="Thumbs up" value={thumbs ? pct(fb.thumbsUp, thumbs) : "—"} hint={thumbs ? `${fb.thumbsUp} up, ${fb.thumbsDown} down` : "no thumbs yet"} tone={thumbs ? (fb.thumbsDown > fb.thumbsUp ? "bad" : "good") : undefined} />
        <Stat label="Kept the listing" value={s.listings ? pct(fb.copiedListings, s.listings) : "—"} hint={`${fb.copiedListings} of ${s.listings} listings had something copied`} />
        <Stat label="Went to post it" value={num(fb.opened)} hint="opened the platform from bower" />
        <Stat label="Edited by hand" value={num(fb.manualEdits)} hint={s.listings ? `${pct(fb.manualEdits, s.listings)} of listings` : undefined} tone={fb.manualEdits ? "warn" : undefined} />
        <Stat label="Chip rounds" value={num(fb.refineRounds)} hint={fb.refineRounds ? `on ${fb.refinedListings} listing${fb.refinedListings === 1 ? "" : "s"}` : "no chips tapped"} />
        <Stat label="Notes" value={num(fb.notes.length)} hint="typed feedback, below" tone={fb.notes.length ? "warn" : undefined} />
      </div>

      <div className="grid">
        <Card title="Did they keep it?" sub="Of the listings written in this range" span="c4">
          <Bars items={fb.funnel.map((f) => ({ label: f.label, count: f.count }))} of={fb.funnel[0].count} />
        </Card>
        <Card title="What they did with a listing" sub="Each listing can do several of these" span="c4">
          <Bars items={fb.journey.map((f) => ({ label: f.label, count: f.count }))} of={fb.journey[0].count} color="--s3" />
        </Card>
        <Card title="Chips tapped" sub="Which Refinement Chips people reach for" span="c4">
          <Bars items={fb.chips} of={fb.refineRounds} color="--s4" empty="No chips tapped yet" />
        </Card>
      </div>

      <div className="grid">
        <Card title="By platform" sub="Signals against the platform the listing was written for" span="c12">
          {fb.byPlatform.length === 0 ? (
            <p className="empty">No listings in this range</p>
          ) : (
            <div className="tablewrap">
              <table className="t">
                <thead><tr><th>Platform</th><th className="num">Listings</th><th className="num">Kept</th><th className="num">👍</th><th className="num">👎</th><th className="num">Edited by hand</th><th className="num">Went to post</th></tr></thead>
                <tbody>
                  {fb.byPlatform.map((r) => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td className="num">{r.listings}</td>
                      <td className="num">{r.copied} <span className="dim">({pct(r.copied, r.listings)})</span></td>
                      <td className="num">{r.thumbsUp}</td>
                      <td className="num">{r.thumbsDown}</td>
                      <td className="num">{r.manualEdits}</td>
                      <td className="num">{r.opened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid">
        <Card title="Notes" sub="Typed feedback, newest first, with where it was written from" span="c6">
          {fb.notes.length === 0 ? (
            <p className="empty">Nobody has written a note yet</p>
          ) : (
            fb.notes.map((n) => (
              <div key={n.id}>
                <blockquote className="note">{n.message}</blockquote>
                <p className="notemeta">
                  <b>{n.who}</b> · {when(n.createdAt)}
                  {n.screen ? ` · from ${n.screen}` : ""}
                  {n.platform ? ` · ${n.platform}` : ""}
                  {n.title ? ` · “${n.title}”` : ""}
                  {n.traceId && <> · <TraceLink projectId={data.projectId} traceId={n.traceId} /></>}
                </p>
              </div>
            ))
          )}
        </Card>
        <Card title="Thumbs down and hand edits" sub="The listings people did not like as written. Open the trace to read what bower wrote." span="c6">
          {fb.thumbsDownList.length + fb.manualEditList.length === 0 ? (
            <p className="empty">Nothing flagged in this range</p>
          ) : (
            <div className="tablewrap">
              <table className="t">
                <thead><tr><th>When</th><th>Who</th><th>Signal</th><th>Listing</th><th></th></tr></thead>
                <tbody>
                  {[...fb.thumbsDownList.map((f) => ({ ...f, signal: "👎" })), ...fb.manualEditList.map((f) => ({ ...f, signal: "edited" }))]
                    .sort((a, b) => (a.at < b.at ? 1 : -1))
                    .map((f, i) => (
                      <tr key={i}>
                        <td className="dim">{when(f.at)}</td>
                        <td>{f.who}</td>
                        <td><span className={`pill ${f.signal === "👎" ? "bad" : "warn"}`}>{f.signal}</span></td>
                        <td className="wrap">{f.title}{f.platform ? <span className="dim"> · {f.platform}</span> : null}{f.comment ? <div className="dim">“{f.comment}”</div> : null}</td>
                        <td><TraceLink projectId={data.projectId} traceId={f.traceId} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
