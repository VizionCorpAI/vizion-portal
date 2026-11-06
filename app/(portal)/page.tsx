import Link from "next/link";
import { Activity, AlertTriangle, Bell, ArrowRight, Bot, CandlestickChart, KeyRound, Server, Workflow } from "lucide-react";
import { portalGet, isErr, type Overview } from "@/lib/portal-api";
import { Badge, Card, CardTitle, Chip, Dot, Unavailable, type Tone } from "@/components/ui";
import { cn, money, timeAgo } from "@/lib/utils";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const KIND_TONE: Record<string, Tone> = { trade: "muted", heal: "good", post: "muted", submission: "warn" };

export default async function OverviewPage() {
  const res = await portalGet<Overview>("/v1/overview");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-muted">What needs you right now</p>
        </div>
        {res.ok ? (
          <span className="flex items-center gap-2 text-xs text-muted">
            <Dot tone="good" pulse /> Live · updated {timeAgo(res.data.generated_at)}
          </span>
        ) : (
          <Badge tone="bad">{res.reason}</Badge>
        )}
      </header>

      {!res.ok ? <Offline reason={res.reason} /> : <Live d={res.data} />}
    </div>
  );
}

function Offline({ reason }: { reason: string }) {
  return (
    <Card hue="orange" className="border-bad/40">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-bad" />
        <div>
          <div className="font-medium">{reason === "PC offline" ? "The PC is offline" : "Live data unavailable"}</div>
          <p className="mt-1 text-sm text-muted">
            {reason === "PC offline"
              ? "The portal is up, but the Portal API on the VizionAI PC isn't answering. Live tiles come back when the PC does."
              : reason}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Live({ d }: { d: Overview }) {
  return (
    <>
      {/* Status tiles */}
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ServicesTile s={d.services} />
        <TradingTile t={d.trading} />
        <WorkflowsTile w={d.workflows} />
        <AlertsTile a={d.alerts} />
        <Card hue="volt">
          <div className="flex items-center justify-between">
            <CardTitle href="/ops">Secrets rotation</CardTitle>
            <Chip icon={KeyRound} />
          </div>
          <div className="stat mt-3 text-3xl font-semibold text-muted">–</div>
          <p className="mt-1 text-xs text-muted">Not connected yet (Infisical metadata)</p>
        </Card>
      </div>

      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Needs your attention */}
        <Card hue="magenta" className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <CardTitle>Needs your attention</CardTitle>
            <Chip icon={Bell} />
          </div>
          {isErr(d.attention) ? (
            <Unavailable what="Approval queue" />
          ) : (
            <>
              <div className="stat mt-3 text-3xl font-semibold text-magenta">{d.attention.total}</div>
              <ul className="mt-3 divide-y divide-line">
                {d.attention.items.map((i) => (
                  <li key={i.key}>
                    <Link href={i.href} className="flex items-center justify-between py-2 text-sm hover:text-accent">
                      <span className={cn(!i.count && "text-muted")}>{i.label}</span>
                      <Badge tone={i.count ? "warn" : "muted"}>{i.count ?? "–"}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* Activity feed */}
        <Card hue="purple" className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>Activity · last 24 h</CardTitle>
            <Chip icon={Activity} />
          </div>
          {isErr(d.activity) ? (
            <Unavailable what="Activity" />
          ) : d.activity.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing in the last 24 hours.</p>
          ) : (
            <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto pr-1">
              {d.activity.map((a, i) => (
                <li key={i} className="flex items-center gap-3 py-2 text-sm">
                  <Badge tone={a.kind === "trade" ? (a.text.includes("closed -") ? "bad" : "good") : KIND_TONE[a.kind] ?? "muted"}>
                    {a.kind}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate">{a.text}</span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Client strip */}
      <Card hue="cyan">
        <div className="flex items-center justify-between">
          <CardTitle href="/clients">Clients</CardTitle>
          <Link href="/clients" className="flex items-center gap-1 text-xs text-muted hover:text-ink">
            All clients <ArrowRight className="size-3" />
          </Link>
        </div>
        {isErr(d.clients) ? (
          <Unavailable what="Clients" />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {d.clients.map((c) => (
              <li key={c.client_key} className="grid grid-cols-2 gap-2 py-2.5 text-sm sm:grid-cols-4">
                <span className="font-medium">{c.client_key}</span>
                <span className="text-muted">
                  Latest post {timeAgo(c.last_post_at)}
                  {c.last_post_status && <> · {c.last_post_status}</>}
                </span>
                <span className="text-muted">{c.leads_7d} leads (7 d)</span>
                <span className={c.dms_waiting ? "text-warn" : "text-muted"}>{c.dms_waiting} DMs waiting</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ServicesTile({ s }: { s: Overview["services"] }) {
  return (
    <Card hue="cyan">
      <div className="flex items-center justify-between">
        <CardTitle href="/ops">Services</CardTitle>
        <Chip icon={Server} />
      </div>
      {isErr(s) ? (
        <Unavailable what="Services" />
      ) : (
        <>
          <div className={cn("stat mt-3 text-3xl font-semibold", s.up === s.total ? "text-good" : "text-warn")}>
            {s.up}/{s.total}
          </div>
          <ul className="mt-2 space-y-1">
            {s.checks.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-xs">
                <Dot tone={c.ok ? "good" : "bad"} />
                <span className={c.ok ? "text-muted" : "text-bad"}>{c.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function TradingTile({ t }: { t: Overview["trading"] }) {
  return (
    <Card hue="magenta">
      <div className="flex items-center justify-between">
        <CardTitle href="/finances">Trading today</CardTitle>
        <Chip icon={CandlestickChart} />
      </div>
      {isErr(t) ? (
        <Unavailable what="Trading" />
      ) : (
        <>
          <div className={cn("stat mt-3 text-3xl font-semibold", t.pnl > 0 ? "text-good" : t.pnl < 0 ? "text-bad" : "")}>
            {money(t.pnl)}
          </div>
          <p className="mt-1 text-xs text-muted">
            {t.trades} trades · {t.wins}W / {t.losses}L · {t.open} open
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Bot className="size-3.5 text-muted" />
            <Badge tone={t.ea_active ? "good" : "muted"}>{t.ea_active ? "EA active" : "EA idle"}</Badge>
            <span className="text-muted">last {timeAgo(t.last_trade_at)}</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            AI gate 24 h: {t.gate_24h.YES ?? 0} yes · {t.gate_24h.MAYBE ?? 0} maybe · {t.gate_24h.NO ?? 0} no
          </p>
        </>
      )}
    </Card>
  );
}

function WorkflowsTile({ w }: { w: Overview["workflows"] }) {
  return (
    <Card hue="blue">
      <div className="flex items-center justify-between">
        <CardTitle href="/ops">Failed runs · 24 h</CardTitle>
        <Chip icon={Workflow} />
      </div>
      {isErr(w) ? (
        <Unavailable what="Workflows" />
      ) : (
        <>
          <div className={cn("stat mt-3 text-3xl font-semibold", w.failed_24h ? "text-bad" : "text-good")}>{w.failed_24h}</div>
          <p className="mt-1 text-xs text-muted">
            {w.success_24h.toLocaleString()} ok · {w.active}/{w.total} active
          </p>
          <ul className="mt-2 space-y-1">
            {w.top_failing.slice(0, 4).map((f) => (
              <li key={f.name} className="flex justify-between gap-2 text-xs">
                <span className="truncate text-muted">{f.name}</span>
                <span className="text-bad">{f.failures}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function AlertsTile({ a }: { a: Overview["alerts"] }) {
  return (
    <Card hue="orange">
      <div className="flex items-center justify-between">
        <CardTitle href="/ops">Open alerts · 24 h</CardTitle>
        <Chip icon={AlertTriangle} />
      </div>
      {isErr(a) ? (
        <Unavailable what="Alerts" />
      ) : (
        <>
          <div className={cn("stat mt-3 text-3xl font-semibold", a.errors_24h ? "text-bad" : "text-good")}>{a.errors_24h}</div>
          <p className="mt-1 text-xs text-muted">errors · {a.warnings_24h} warnings</p>
          <ul className="mt-2 space-y-1">
            {a.recent.slice(0, 4).map((r) => (
              <li key={r.id} className="flex justify-between gap-2 text-xs">
                <span className="truncate text-muted">
                  {r.workspace_key}: {r.title}
                </span>
                <span className="shrink-0 text-muted">{timeAgo(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
