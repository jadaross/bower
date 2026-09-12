import { speedStats, type Task } from "@/lib/dashboard/metrics";
import { Bars, Card, Lines, Stat } from "../_components/charts";
import { num, pct, seconds, when } from "../_components/format";
import { pageData } from "../_components/load";
import { Shell, TraceLink, type Query } from "../_components/Shell";

export const dynamic = "force-dynamic";

/** Axis ticks are whole seconds; "0.0s" on an axis is noise. */
const axis = (v: number) => `${Math.round(v)}s`;

/** The same hue per task as the Cost tab gives its call, so a colour means one thing across tabs. */
const TASK_COLOR: Record<Task, string> = { read: "--s1", check: "--s2", switch: "--s3", chips: "--s4" };

export default async function Speed({ searchParams }: { searchParams: Promise<Query> }) {
  const { q, data, badges } = await pageData(searchParams);
  const s = speedStats(data);
  const days = s.byDay.map((d) => d.day);
  const read = s.tasks.find((t) => t.task === "read")!;
  const check = s.tasks.find((t) => t.task === "check")!;
  const trend = (task: Task) =>
    [
      { key: "p50", label: "Typical", color: TASK_COLOR[task], values: s.byDay.map((d) => d.typical[task]) },
      { key: "p95", label: "Slowest in 20", color: TASK_COLOR[task], values: s.byDay.map((d) => d.slow[task]), dashed: true },
    ];

  return (
    <Shell tab="speed" q={q} data={data} badges={badges}>
      <h1>How long it takes</h1>
      <p>
        One wait per task, as a person feels it: a market check is timed to its slowest platform, a rejected read stops early and is left out, and failures never finish so are counted on Health instead.
        &ldquo;Typical&rdquo; is the median; &ldquo;slowest in 20&rdquo; is the 95th percentile. The read shows its title at about two seconds however long the whole takes.
      </p>

      <div className="kpis">
        {s.tasks.map((t) => (
          <Stat
            key={t.task}
            label={`${t.label}, typical`}
            value={seconds(t.p50)}
            hint={t.n ? `slowest in 20: ${seconds(t.p95)} · ${t.over ? `${t.over} past ${t.target}s` : `none past ${t.target}s`}` : "none yet"}
            tone={t.over ? (t.p95 !== null && t.p95 > t.target ? "bad" : "warn") : t.n ? "good" : undefined}
          />
        ))}
      </div>

      <div className="grid">
        <Card title="The read, by day" sub="Seconds from photos to a written listing" kicker={`${num(read.n)} reads`} span="c6">
          {read.n ? <Lines days={days} series={trend("read")} format={axis} target={{ value: read.target, label: `${read.target}s` }} /> : <p className="empty">No reads in this range</p>}
        </Card>
        <Card title="A market check, by day" sub="Seconds until every enabled platform has answered" kicker={`${num(check.n)} checks`} span="c6">
          {check.n ? <Lines days={days} series={trend("check")} format={axis} target={{ value: check.target, label: `${check.target}s` }} /> : <p className="empty">No market checks in this range</p>}
        </Card>
      </div>

      <div className="grid">
        <Card title="Every task" sub="What each one is, how many, and where the waits fall" span="c12">
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>What it is</th>
                  <th className="num">Waits</th>
                  <th className="num">Typical</th>
                  <th className="num">Slowest in 20</th>
                  <th className="num">Slowest</th>
                  <th className="num">Past target</th>
                  <th>Spread</th>
                </tr>
              </thead>
              <tbody>
                {s.tasks.map((t) => (
                  <tr key={t.task}>
                    <td className="nw"><i className="dot" style={{ background: `var(${TASK_COLOR[t.task]})` }} />{t.label}</td>
                    <td className="dim">{t.what}</td>
                    <td className="num">{t.n}</td>
                    <td className="num">{seconds(t.p50)}</td>
                    <td className="num">{seconds(t.p95)}</td>
                    <td className="num">{seconds(t.max)}</td>
                    <td className="num">{t.over ? <span className="pill warn">{t.over} over {t.target}s</span> : <span className="dim">0 over {t.target}s</span>}</td>
                    <td className="spread">
                      <Spread buckets={t.buckets} color={TASK_COLOR[t.task]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid">
        <Card title="Inside a market check" sub="Each platform's own wait, and how often it was the one everyone waited for" kicker={s.checks ? `${num(s.checks)} checks` : undefined} span="c6">
          {s.checkByPlatform.length === 0 ? (
            <p className="empty">No market checks in this range</p>
          ) : (
            <div className="tablewrap">
              <table className="t">
                <thead><tr><th>Platform</th><th className="num">Calls</th><th className="num">Typical</th><th className="num">Slowest in 20</th><th className="num">Held the check up</th></tr></thead>
                <tbody>
                  {s.checkByPlatform.map((p) => (
                    <tr key={p.platform}>
                      <td>{p.platform}</td>
                      <td className="num">{p.n}</td>
                      <td className="num">{seconds(p.p50)}</td>
                      <td className="num">{seconds(p.p95)}</td>
                      <td className="num">{p.heldUp ? `${p.heldUp} · ${pct(p.heldUp, s.checks)}` : <span className="dim">never</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="The read, by how many photos" sub="Whether five photos cost more waiting than one" span="c6">
          {s.readByPhotos.length === 0 ? (
            <p className="empty">No reads in this range</p>
          ) : (
            <Bars
              items={s.readByPhotos.map((r) => ({ label: `${r.photos} photo${r.photos === 1 ? "" : "s"}`, count: r.p50 ?? 0, hint: `${r.n} read${r.n === 1 ? "" : "s"}, slowest in 20 ${seconds(r.p95)}` }))}
              format={(v) => seconds(v)}
              color={TASK_COLOR.read}
            />
          )}
        </Card>
      </div>

      <div className="grid">
        <Card title="The longest waits" sub="The twelve slowest tasks in the range, each with its trace" span="c12">
          {s.slowest.length === 0 ? (
            <p className="empty">Nothing in this range</p>
          ) : (
            <div className="tablewrap">
              <table className="t">
                <thead><tr><th>When</th><th>Task</th><th>Who</th><th className="num">Waited</th><th>Held up by</th><th></th></tr></thead>
                <tbody>
                  {s.slowest.map((w) => {
                    const t = s.tasks.find((x) => x.task === w.task)!;
                    return (
                      <tr key={w.traceId + w.task + w.at}>
                        <td className="dim nw">{when(w.at)}</td>
                        <td className="nw"><i className="dot" style={{ background: `var(${TASK_COLOR[w.task]})` }} />{t.label}</td>
                        <td>{w.who}</td>
                        <td className="num">{w.seconds > t.target ? <span className="pill warn">{seconds(w.seconds)}</span> : seconds(w.seconds)}</td>
                        <td className="dim">{w.detail ?? ""}</td>
                        <td><TraceLink projectId={data.projectId} traceId={w.traceId} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="sub">
        Latency is what Langfuse recorded for each model call, start to end, so it includes the model&rsquo;s own queueing but not the phone&rsquo;s upload. The targets (20s for a read, 120s for a check, 15s for a switch or chips) are the dashboard&rsquo;s own line, not a promise the app makes.
      </p>
    </Shell>
  );
}

/** A tiny histogram: one bar per bucket, the tallest bucket full height, labels in the tooltip. */
function Spread({ buckets, color }: { buckets: { label: string; count: number }[]; color: string }) {
  const max = Math.max(...buckets.map((b) => b.count), 0);
  if (max === 0) return <span className="dim">—</span>;
  return (
    <span className="spread-bars">
      {buckets.map((b) => (
        <span key={b.label} className="b" title={`${b.label}: ${b.count}`}>
          <span style={{ height: `${Math.max(b.count ? 8 : 0, (b.count / max) * 100)}%`, background: `var(${color})` }} />
        </span>
      ))}
    </span>
  );
}
