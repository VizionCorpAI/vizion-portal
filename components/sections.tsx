import type { Cell, PageSection } from "@/lib/portal-api";
import { Badge, Card, CardTitle, HUES, type Tone } from "@/components/ui";
import { cn } from "@/lib/utils";

// Renders the generic sections a workspace page returns (api/pages.mjs). Server component.

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const fmtTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" });
const fmtNum = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
// Axis ticks: in full under 10,000, compact (10K) on an axis that reaches it.
const fmtTick = (v: number, big: boolean) =>
  big ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v) : fmtNum.format(Math.round(v));

function CellView({ v }: { v: Cell }) {
  if (v == null || v === "") return <span className="text-muted">–</span>;
  if (typeof v === "number") return <span className="tabular-nums">{fmtNum.format(v)}</span>;
  if (typeof v === "boolean") return <span>{v ? "yes" : "no"}</span>;
  if (/^https?:\/\//.test(v))
    return (
      <a href={v} target="_blank" rel="noreferrer" className="text-accent hover:underline">
        open
      </a>
    );
  if (ISO.test(v)) return <span className="whitespace-nowrap">{fmtTime.format(new Date(v))}</span>;
  if (/^error/i.test(v) || v === "failing") return <span className="text-bad">{v}</span>;
  return <span>{v}</span>;
}

function Stats({ s }: { s: Extract<PageSection, { kind: "stats" }> }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {s.items.map((it) => (
        <div key={it.label} className="rounded-lg bg-panel-2/60 p-3">
          <div className="text-xs text-muted">{it.label}</div>
          <div className="mt-1 flex items-center gap-2 text-xl font-semibold">
            {it.tone && it.tone !== "muted" ? <Badge tone={it.tone}>{String(it.value ?? "–")}</Badge> : <CellView v={it.value} />}
          </div>
          {it.hint && <div className="mt-1 text-xs text-muted">{it.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function Table({ s }: { s: Extract<PageSection, { kind: "table" }> }) {
  if (!s.rows.length) return <p className="mt-3 text-sm text-muted">{s.empty || "Nothing yet."}</p>;
  return (
    <div className="mt-3 max-h-[28rem] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-panel text-left text-xs text-muted">
          <tr>
            {s.columns.map((c) => (
              <th key={c.key} className={cn("px-2 py-1.5 font-medium", c.align === "right" && "text-right")}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {s.rows.map((r, i) => (
            <tr key={i}>
              {s.columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-1.5 align-top", c.align === "right" && "text-right")}>
                  <CellView v={r[c.key] ?? null} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Columns per day. Validated on the panel surface (#0f0d1f): blue #3987e5 / red #e66767 pass the
// lightness, chroma, CVD (ΔE 19.2) and 3:1 contrast checks. Bars <= 24px, 4px rounded data end,
// square at the baseline, 2px surface gap; per-bar hover title + a table view.
const POS = "#3987e5";
const NEG = "#e66767";

function barPath(x: number, w: number, y0: number, y1: number) {
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return "";
  const r = Math.min(4, w / 2, h);
  if (y1 < y0) // grows up: rounded top
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`;
  return `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 - r} V${y0} Z`;
}

function Bars({ s }: { s: Extract<PageSection, { kind: "bars" }> }) {
  const W = 640, H = 160, PAD_L = 44, PAD_B = 18, PAD_T = 8;
  const vals = s.points.map((p) => p.value);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const span = max - min || 1;
  const plotH = H - PAD_T - PAD_B;
  const y = (v: number) => PAD_T + ((max - v) / span) * plotH;
  const slot = (W - PAD_L) / Math.max(1, s.points.length);
  const bw = Math.max(2, Math.min(24, slot - 2));
  const zero = y(0);
  const total = vals.reduce((a, b) => a + b, 0);
  const big = Math.max(Math.abs(max), Math.abs(min)) >= 10000;
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label={`${s.title}: total ${fmtNum.format(total)}`}>
        <line x1={PAD_L} x2={W} y1={zero} y2={zero} stroke="var(--color-line)" strokeWidth={1} />
        <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">{fmtTick(max, big)}</text>
        {min < 0 && <text x={PAD_L - 6} y={H - PAD_B} textAnchor="end" fontSize={10} fill="var(--color-muted)">{fmtTick(min, big)}</text>}
        <text x={PAD_L - 6} y={zero + 3} textAnchor="end" fontSize={10} fill="var(--color-muted)">0</text>
        {s.points.map((p, i) => {
          const x = PAD_L + i * slot + (slot - bw) / 2;
          const d = barPath(x, bw, zero, y(p.value));
          return (
            <g key={p.label}>
              <rect x={PAD_L + i * slot} y={PAD_T} width={slot} height={plotH} fill="transparent">
                <title>{`${p.label}: ${fmtNum.format(p.value)}${s.unit || ""}`}</title>
              </rect>
              {d && <path d={d} fill={s.diverging && p.value < 0 ? NEG : POS} pointerEvents="none" />}
            </g>
          );
        })}
        <text x={PAD_L} y={H - 4} fontSize={10} fill="var(--color-muted)">{s.points[0]?.label.slice(5)}</text>
        <text x={W} y={H - 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">{s.points.at(-1)?.label.slice(5)}</text>
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted">
        {s.diverging ? (
          <>
            <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: POS }} /> gain</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: NEG }} /> loss</span>
          </>
        ) : null}
        <span>Total {fmtNum.format(total)}{s.unit || ""}</span>
        <details className="ml-auto">
          <summary className="cursor-pointer hover:text-ink">Show table</summary>
          <table className="mt-2 text-xs">
            <tbody>
              {s.points.map((p) => (
                <tr key={p.label}><td className="pr-4">{p.label}</td><td className="text-right tabular-nums">{fmtNum.format(p.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}

const NOTE_TONE: Record<Tone, string> = { good: "border-good/40", warn: "border-warn/40", bad: "border-bad/40", muted: "" };

export function Sections({ sections }: { sections: PageSection[] }) {
  return (
    <div className="stagger grid grid-cols-1 gap-4 xl:grid-cols-2">
      {sections.map((s, i) => {
        const wide = s.kind === "table" && s.columns.length > 4;
        return (
          <Card key={`${s.title}-${i}`} hue={HUES[i % HUES.length]} className={cn(wide && "xl:col-span-2", s.kind === "note" && NOTE_TONE[s.tone ?? "muted"])}>
            <CardTitle>{s.title}</CardTitle>
            {s.kind === "stats" && <Stats s={s} />}
            {s.kind === "table" && <Table s={s} />}
            {s.kind === "bars" && <Bars s={s} />}
            {s.kind === "note" && <p className={cn("mt-2 text-sm", s.tone === "bad" ? "text-bad" : "text-muted")}>{s.text}</p>}
            {(s.kind === "table" || s.kind === "bars") && s.note && <p className="mt-2 text-xs text-muted">{s.note}</p>}
          </Card>
        );
      })}
    </div>
  );
}
