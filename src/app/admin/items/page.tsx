import { itemStats, labelFor, marketStats, photoStats } from "@/lib/dashboard/metrics";
import { Bars, Card, Stat } from "../_components/charts";
import { gbp, num, pct, when } from "../_components/format";
import { pageData } from "../_components/load";
import { Shell, type Query } from "../_components/Shell";

export const dynamic = "force-dynamic";

export default async function Items({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const ph = photoStats(data);
  const it = itemStats(data);
  const mk = marketStats(data);
  const rejected = ph.rejections.reduce((s, r) => s + r.count, 0);

  return (
    <Shell tab="items" q={q} data={data} badges={badges}>
      <h1>What they&rsquo;re photographing</h1>
      <p>How many photos go into a listing, what gets rejected, and what the clothes actually are — brands, types, condition and what bower estimated for them. Items come from the text-only history; photos are never stored, so the counts are all that remains of them.</p>

      <div className="kpis">
        <Stat label="Listings written" value={num(it.rows.length)} />
        <Stat label="Photos per listing" value={ph.avgPhotos === null ? "—" : ph.avgPhotos.toFixed(1)} hint="of a possible 5" />
        <Stat label="With a label photo" value={ph.tagKnown ? pct(ph.withTagPhoto, ph.tagKnown) : "—"} hint="the model saw a care or brand tag" tone={ph.tagKnown && ph.withTagPhoto / ph.tagKnown < 0.3 ? "warn" : undefined} />
        <Stat label="Rejected" value={num(rejected)} hint={rejected ? ph.rejections.map((r) => `${r.count} ${r.label}`).join(" · ") : "nothing that was not clothing"} tone={rejected ? "warn" : undefined} />
        <Stat label="Typical estimate" value={gbp(it.medianEstimate)} hint="median of the photo-only price band midpoint" />
      </div>

      <div className="grid">
        <Card title="Photos per listing" sub="More photos means a better read; the app suggests four angles" span="c4">
          <Bars items={ph.distribution.map((d) => ({ label: `${d.label} photo${d.label === "1" ? "" : "s"}`, count: d.count }))} of={ph.listings} />
        </Card>
        <Card title="Written for" sub="The Preferred Platform at the time, and the tone asked for" span="c4">
          <Bars items={ph.platformAsked} of={ph.listings} />
          <div style={{ height: 12 }} />
          <Bars items={ph.tone} of={ph.listings} color="--s3" />
        </Card>
        <Card title="Rejections" sub="Photo sets bower would not write for. Each one refunded the listing." span="c4">
          <Bars items={ph.rejections} color="--s2" empty="Every photo set was clothing" />
        </Card>
      </div>

      <div className="grid">
        <Card title="Clothing types" span="c4"><Bars items={it.types} of={it.rows.length} /></Card>
        <Card title="Brands" sub="As read from the label or guessed from the garment" span="c4"><Bars items={it.brands} of={it.rows.length} /></Card>
        <Card title="Condition" span="c4"><Bars items={it.conditions} of={it.rows.length} /></Card>
      </div>
      <div className="grid">
        <Card title="Category" span="c4"><Bars items={it.categories} of={it.rows.length} /></Card>
        <Card title="Colour" span="c4"><Bars items={it.colours} of={it.rows.length} /></Card>
        <Card title="Photo-only estimate" sub="Midpoint of the band bower guessed before any search" span="c4"><Bars items={it.priceBands} of={it.rows.length} /></Card>
      </div>

      <h1 style={{ fontSize: 26, marginTop: 24 }}>Market checks</h1>
      <p>What the live search found. Confidence is how sure the model was of the band; sell likelihood is how readily that kind of item moves.</p>
      <div className="kpis">
        <Stat label="Checks run" value={num(mk.checks)} />
        <Stat label="Items with a band" value={num(mk.checkedItems.length)} />
        <Stat label="Estimate inside the band" value={mk.estimateInsideBand.known ? pct(mk.estimateInsideBand.inside, mk.estimateInsideBand.known) : "—"} hint="photo-only estimate overlapped the market band on the recommended platform" />
        <Stat label="Comparables per band" value={mk.comparablesPerBand === null ? "—" : mk.comparablesPerBand.toFixed(1)} hint="live listings the search actually found" tone={mk.comparablesPerBand !== null && mk.comparablesPerBand < 2 ? "warn" : undefined} />
      </div>
      <div className="grid">
        {Object.entries(mk.confidence).map(([p, counts]) => (
          <Card key={p} title={`Confidence on ${p}`} span="c3">
            <Bars items={counts} of={counts.reduce((s, c) => s + c.count, 0)} color="--s2" />
          </Card>
        ))}
        <Card title="Recommended platform" sub="Which platform the check said to post on" span="c3">
          <Bars items={mk.recommended} of={mk.checkedItems.length} color="--s4" empty="No recommendations yet — they need two or more platforms enabled" />
        </Card>
        <Card title="Sell likelihood" sub="Across every band" span="c3">
          <Bars items={mk.likelihood} of={mk.likelihood.reduce((s, c) => s + c.count, 0)} color="--s3" />
        </Card>
      </div>

      <div className="grid">
        <Card title="Every item" sub="Newest first, from the text-only history. Listing counts above come from Langfuse traces, so an item written before tracing was on, or from a device on a development build, appears here and not there." kicker={`${it.rows.length} items`} span="c12">
          {it.rows.length === 0 ? (
            <p className="empty">Nothing written in this range</p>
          ) : (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr><th>When</th><th>Who</th><th>Item</th><th>Brand</th><th>Type</th><th>Condition</th><th>Size</th><th className="num">Estimate</th><th className="num">Market band</th><th>Recommended</th></tr>
                </thead>
                <tbody>
                  {it.rows.map((r) => {
                    const rec = r.valuation?.recommendation?.platform ?? (r.valuation ? (Object.keys(r.valuation.perPlatform)[0] as keyof typeof r.valuation.perPlatform) : undefined);
                    const band = rec && r.valuation ? r.valuation.perPlatform[rec] : undefined;
                    return (
                      <tr key={r.id}>
                        <td className="dim nw" title={r.createdAt}>{when(r.createdAt)}</td>
                        <td>{labelFor(data.accounts, r.userId)}</td>
                        <td className="wrap">{r.title}</td>
                        <td>{r.brand}</td>
                        <td className="dim">{r.clothingType}</td>
                        <td className="dim">{r.condition}</td>
                        <td className="dim">{r.size ?? "—"}</td>
                        <td className="num">{r.priceMin !== null && r.priceMax !== null ? `${gbp(r.priceMin)}–${gbp(r.priceMax)}` : "—"}</td>
                        <td className="num">{band ? `${gbp(band.low)}–${gbp(band.high)}` : <span className="dim">not checked</span>}</td>
                        <td className="dim">{rec ? `${rec}${band ? ` · ${band.confidence} confidence` : ""}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
