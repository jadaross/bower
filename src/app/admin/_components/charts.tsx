import type { ReactNode } from "react";
import { dayLabel } from "./format";

/**
 * Server-rendered SVG and CSS charts. No client script: hover is a native
 * <title> tooltip plus a CSS highlight, and every chart carries a table view
 * in a <details> so nothing is readable by colour alone.
 */

export interface Series {
  key: string;
  label: string;
  /** A CSS variable name, e.g. "--s1". */
  color: string;
  values: number[];
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

interface ColumnsProps {
  days: string[];
  series: Series[];
  stacked?: boolean;
  format?: (v: number) => string;
  height?: number;
  /** Optional per-day tooltip suffix (e.g. cost breakdown). */
  extra?: (i: number) => string;
  /** Counts get whole-number ticks; money does not. */
  integer?: boolean;
}

/** Daily columns, one series or stacked. Bars stay ≤ 24px with a 2px surface gap. */
export function Columns({ days, series, stacked = true, format = (v) => `${v}`, height = 160, extra, integer = true }: ColumnsProps) {
  const W = 720;
  const padL = 34;
  const padR = 6;
  const padT = 8;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = height - padT - padB;
  const n = Math.max(days.length, 1);
  const totals = days.map((_, i) => (stacked ? series.reduce((s, x) => s + (x.values[i] ?? 0), 0) : Math.max(...series.map((x) => x.values[i] ?? 0))));
  const max = integer ? Math.max(2, niceMax(Math.max(...totals, 0))) : niceMax(Math.max(...totals, 0));
  const slot = plotW / n;
  const barW = Math.min(24, Math.max(3, slot - 3));
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max].filter((t) => !integer || Number.isInteger(t));
  const labelEvery = Math.ceil(n / 8);
  const single = series.length === 1;

  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Daily columns">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {days.map((day, i) => {
          const x = padL + slot * i + (slot - barW) / 2;
          let acc = 0;
          const tip = `${dayLabel(day)}\n${series.map((s) => `${s.label}: ${format(s.values[i] ?? 0)}`).join("\n")}${extra ? `\n${extra(i)}` : ""}`;
          return (
            <g key={day} className="slot">
              <title>{tip}</title>
              <rect x={padL + slot * i} y={padT} width={slot} height={plotH} fill="transparent" />
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                if (v <= 0) return null;
                const top = stacked ? y(acc + v) : y(v);
                const bottom = stacked ? y(acc) : y(0);
                const h = Math.max(0, bottom - top - (stacked && acc > 0 ? 2 : 0));
                const isTop = stacked ? si === series.length - 1 || series.slice(si + 1).every((t) => (t.values[i] ?? 0) <= 0) : true;
                acc += v;
                const r = isTop ? 4 : 0;
                const bx = stacked ? x : x + (barW / series.length) * si;
                const bw = stacked ? barW : barW / series.length - 1;
                const path = `M${bx},${top + h} V${top + r} a${r},${r} 0 0 1 ${r},-${r} H${bx + bw - r} a${r},${r} 0 0 1 ${r},${r} V${top + h} Z`;
                return <path key={s.key} className="mark" d={path} fill={`var(${s.color})`} />;
              })}
              {totals[i] > 0 && <text className="cap" x={x + barW / 2} y={y(totals[i]) - 4} textAnchor="middle">{format(totals[i])}</text>}
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle">{dayLabel(day)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {!single && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.key}><i style={{ background: `var(${s.color})` }} />{s.label}</span>
          ))}
        </div>
      )}
      <details className="tableview">
        <summary>Table</summary>
        <div className="tablewrap">
          <table className="t">
            <thead><tr><th>Day</th>{series.map((s) => <th key={s.key} className="num">{s.label}</th>)}</tr></thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}><td>{dayLabel(d)}</td>{series.map((s) => <td key={s.key} className="num">{format(s.values[i] ?? 0)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

interface BarsProps {
  items: { label: string; count: number; hint?: string }[];
  format?: (v: number) => string;
  /** Show each bar as a share of this total, alongside the value. */
  of?: number;
  color?: string;
  empty?: string;
}

/** Horizontal bars for a ranked or ordinal list. One hue; the label carries identity. */
export function Bars({ items, format = (v) => `${v}`, of, color = "--s1", empty = "Nothing yet" }: BarsProps) {
  const max = Math.max(...items.map((i) => i.count), 0);
  if (!items.length || max === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="bars">
      {items.map((it) => (
        <div key={it.label} style={{ display: "contents" }}>
          <span className="l" title={it.label}>{it.label}</span>
          <span className="track" title={`${it.label}: ${format(it.count)}`}>
            <span className="fill" style={{ width: `${(it.count / max) * 100}%`, background: `var(${color})` }} />
          </span>
          <span className="v"><b>{format(it.count)}</b>{of ? ` · ${Math.round((it.count / of) * 100)}%` : ""}{it.hint ? ` · ${it.hint}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

/** A meter for a ratio against a limit. The unfilled track is a lighter step of the same ramp. */
export function Meter({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) return <span className="meter"><span>{used} · no limit</span></span>;
  const share = limit ? used / limit : 0;
  const cls = share >= 1 ? "fill full" : share >= 0.7 ? "fill warn" : "fill";
  return (
    <span className="meter" title={`${used} of ${limit} used this month`}>
      <span className="track"><span className={cls} style={{ width: `${Math.min(100, share * 100)}%` }} /></span>
      <span>{used}/{limit}</span>
    </span>
  );
}

/** Weekday × hour, London time. Sequential blue: darker is busier. */
export function Heatmap({ heat, weekdays }: { heat: number[][]; weekdays: string[] }) {
  const max = Math.max(...heat.flat(), 0);
  const level = (v: number) => (v === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((v / max) * 4)));
  return (
    <div>
      <div className="heat">
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="h">{h % 6 === 0 ? `${h}` : ""}</span>)}
        {heat.map((row, d) => (
          <div key={d} style={{ display: "contents" }}>
            <span>{weekdays[d]}</span>
            {row.map((v, h) => (
              <span key={h} className="cell" data-l={level(v)} title={`${weekdays[d]} ${String(h).padStart(2, "0")}:00 — ${v}`} />
            ))}
          </div>
        ))}
      </div>
      {max === 0 && <p className="empty">No activity in this range</p>}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => <span key={i.label}><i style={{ background: `var(${i.color})` }} />{i.label}</span>)}
    </div>
  );
}

export function Card({ title, sub, kicker, span = "", children }: { title: string; sub?: string; kicker?: ReactNode; span?: string; children: ReactNode }) {
  return (
    <section className={`card ${span}`}>
      <header><h2>{title}</h2>{kicker && <span className="kicker">{kicker}</span>}</header>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, hint, tone, hero }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode; tone?: "good" | "bad" | "warn"; hero?: boolean }) {
  return (
    <div className={`stat${hero ? " hero" : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}{unit && <small>{unit}</small>}</div>
      {hint && <div className={`hint${tone ? ` ${tone}` : ""}`}>{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
