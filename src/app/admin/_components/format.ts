const TZ = "Europe/London";

/** Langfuse costs are in US dollars, so that is what the dashboard shows. */
export function money(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (v === 0) return "$0";
  if (v >= 100) return `$${Math.round(v).toLocaleString("en-GB")}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(4)}`;
}

export function gbp(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `£${Number.isInteger(v) ? v : v.toFixed(0)}`;
}

export function num(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function compact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return `${v}`;
}

export function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export function seconds(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v >= 10 ? `${Math.round(v)}s` : `${v.toFixed(1)}s`;
}

export function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return `${day} ${time}`;
}

export function dateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso));
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 14) return `${Math.floor(s / 86400)}d ago`;
  return dateOnly(iso);
}

/** "2026-09-11" → "11 Sep" for an axis. */
export function dayLabel(key: string): string {
  const [, m, d] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}
