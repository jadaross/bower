import { daily, people, summary } from "@/lib/dashboard/metrics";
import { Card, Columns, Meter, Stat } from "../_components/charts";
import { ago, dateOnly, money, num } from "../_components/format";
import { pageData } from "../_components/load";
import { Shell, type Query } from "../_components/Shell";

export const dynamic = "force-dynamic";

export default async function People({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const s = summary(data);
  const rows = people(data);
  const days = daily(data);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const active7 = rows.filter((r) => r.lastActive && r.lastActive >= weekAgo && r.listings + r.checks > 0).length;
  const cameBack = rows.filter((r) => r.activeDays.length >= 2).length;
  const wrote = rows.filter((r) => r.listings > 0).length;

  return (
    <Shell tab="people" q={q} data={data} badges={badges}>
      <h1>Who&rsquo;s using it</h1>
      <p>Everyone with an account, newest activity first. Names are the part of the email before the @; &ldquo;hidden email&rdquo; is Apple&rsquo;s Hide My Email relay, so that person chose not to share it.</p>

      <div className="kpis">
        <Stat label="Accounts" value={num(s.accounts)} hint={`${s.newAccounts} joined in this range`} />
        <Stat label="Wrote a listing" value={num(wrote)} hint={`of ${s.accounts} accounts`} />
        <Stat label="Active in the last 7 days" value={num(active7)} hint="wrote or checked something" />
        <Stat label="Came back" value={num(cameBack)} hint="used it on two or more days" tone={cameBack ? "good" : undefined} />
        <Stat label="Never wrote one" value={num(s.neverWrote)} hint="signed up, then stopped" tone={s.neverWrote ? "warn" : undefined} />
      </div>

      <div className="grid">
        <Card title="Sign-ups and people active by day" span="c12">
          <Columns
            days={days.map((d) => d.day)}
            stacked={false}
            series={[
              { key: "active", label: "People active", color: "--s1", values: days.map((d) => d.activePeople) },
              { key: "signups", label: "Signed up", color: "--s4", values: days.map((d) => d.signups) },
            ]}
            height={130}
          />
        </Card>
      </div>

      <div className="grid">
        <Card title="Everyone" sub="Meters are this calendar month, not the range. Spend and counts are the range." span="c12">
          {rows.length === 0 ? (
            <p className="empty">No accounts yet</p>
          ) : (
            <div className="tablewrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Joined</th>
                    <th>Last active</th>
                    <th className="num">Listings</th>
                    <th className="num">Checks</th>
                    <th className="num">Switches</th>
                    <th className="num">Refines</th>
                    <th className="num">👍 / 👎</th>
                    <th className="num">Copied</th>
                    <th className="num">Notes</th>
                    <th className="num">Days</th>
                    <th className="num">Spend</th>
                    <th>Listings meter</th>
                    <th>Checks meter</th>
                    <th>Market</th>
                    <th>Sells on</th>
                    <th>Seller notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.account.id}>
                      <td>
                        {r.label}
                        {r.account.hidesEmail && <span className="pill" style={{ marginLeft: 6 }}>relay</span>}
                        {r.account.isOwner && <span className="pill" style={{ marginLeft: 6 }}>owner</span>}
                      </td>
                      <td className="dim" title={r.account.createdAt}>{dateOnly(r.account.createdAt)}</td>
                      <td className="dim" title={r.lastActive ?? ""}>{ago(r.lastActive)}</td>
                      <td className="num">{r.listings}{r.rejections ? <span className="dim"> +{r.rejections}⊘</span> : null}</td>
                      <td className="num">{r.checks}</td>
                      <td className="num">{r.formats}</td>
                      <td className="num">{r.refines}</td>
                      <td className="num">{r.thumbsUp} / {r.thumbsDown}</td>
                      <td className="num">{r.copied}</td>
                      <td className="num">{r.notes}</td>
                      <td className="num">{r.activeDays.length}</td>
                      <td className="num">{money(r.cost)}</td>
                      <td><Meter used={r.account.readsUsed} limit={r.account.readsLimit} /></td>
                      <td><Meter used={r.account.searchesUsed} limit={r.account.searchesLimit} /></td>
                      <td className="dim">{r.account.market}</td>
                      <td className="dim">
                        {r.account.enabledPlatforms.map((p) => (
                          <span key={p} style={{ fontWeight: p === r.account.preferredPlatform ? 600 : 400, color: p === r.account.preferredPlatform ? "var(--text)" : undefined, marginRight: 6 }}>{p}</span>
                        ))}
                      </td>
                      <td className="dim">{r.account.sellerNotes.length ? r.account.sellerNotes.map((n) => n.replace(/_/g, " ")).join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="sub" style={{ marginTop: 10 }}>Bold platform is the Preferred Platform. &ldquo;+2⊘&rdquo; beside listings means two photo sets were rejected. Switches are platform or tone changes (a <code>format</code> call).</p>
        </Card>
      </div>
    </Shell>
  );
}
