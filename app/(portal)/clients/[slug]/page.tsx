import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Mail } from "lucide-react";
import { portalGet, type ClientDetail, type ClientMail } from "@/lib/portal-api";
import { Badge, Card, CardTitle, type Tone } from "@/components/ui";
import { RevealButton } from "./reveal-button";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, Tone> = {
  active: "good", prospect: "warn", unconfirmed: "warn", paused: "muted", former: "muted",
};
const LOGIN_TONE: Record<string, Tone> = { ok: "good", expired: "bad", missing: "warn", unknown: "muted" };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug };
}

export default async function ClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/.test(slug)) notFound();
  const res = await portalGet<ClientDetail>(`/v1/clients/${slug}`);
  if (!res.ok && res.reason.includes("404")) notFound();
  if (!res.ok) return <Card className="border-bad/40 text-sm">{res.reason}</Card>;
  const c = res.data;

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <Link href="/clients" className="flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft className="size-3" /> Clients
      </Link>
      <header className="page-head">
        <h1 className="text-2xl font-semibold">{c.name}</h1>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[c.status] ?? "muted"}>{c.status}</Badge>
          <Badge>{c.kind === "internal" ? "Internal" : "Client"}</Badge>
        </div>
      </header>

      {/* Summary */}
      <Card hue="cyan">
        <CardTitle>Summary</CardTitle>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Contact" v={c.contact_name} />
          <Row k="Email" v={c.contact_email} />
          <Row k="Phone" v={c.contact_phone} />
          <Row k="Marketing key" v={c.client_key} />
        </dl>
        {c.notes && <p className="mt-3 text-sm text-muted">{c.notes}</p>}
      </Card>

      {/* Sites */}
      <Card hue="magenta">
        <CardTitle>Sites</CardTitle>
        {c.sites.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No sites yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {c.sites.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium hover:text-accent">
                  {s.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                </a>
                {s.is_primary && <Badge tone="good">primary</Badge>}
                {s.platform && <Badge>{s.platform}</Badge>}
                <span className="text-muted">{s.label}</span>
                {s.notes && <span className="w-full text-xs text-muted">{s.notes}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Mail & calendar (IO per-client mailbox) */}
      <Card hue="cyan">
        <CardTitle>Mail &amp; calendar</CardTitle>
        <MailStatus mail={c.mail} />
      </Card>

      {/* Leads */}
      <Card hue="magenta">
        <CardTitle>Recent leads</CardTitle>
        {c.leads.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No leads yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {c.leads.map((l) => (
              <li key={l.id} className="py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.name || l.email || "Unknown"}</span>
                  {l.email && l.name && <span className="text-muted">{l.email}</span>}
                  {l.lead_source && <Badge>{l.lead_source}</Badge>}
                  {l.status && <Badge tone={l.status === "new" ? "warn" : "muted"}>{l.status}</Badge>}
                  <span className="ml-auto text-xs text-muted">{ago(l.created_at)}</span>
                </div>
                {l.notes && <div className="mt-1 text-xs text-muted">{l.notes}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Logins */}
      <Card hue="purple">
        <CardTitle>Logins & credentials</CardTitle>
        <p className="mt-1 text-xs text-muted">
          Secrets live in Infisical. Reveal fetches one value on demand; every reveal is logged.
        </p>
        {c.logins.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No logins yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {c.logins.map((l) => (
              <li key={l.id} className="grid grid-cols-1 gap-2 py-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{l.label}</span>
                    <Badge tone={LOGIN_TONE[l.status] ?? "muted"}>{l.status}</Badge>
                    <Badge>{l.kind}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {l.username && <span>user: {l.username}</span>}
                    {l.login_url && (
                      <a href={l.login_url} target="_blank" rel="noreferrer" className="hover:text-ink">
                        {l.login_url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {l.secret_key && <span className="font-mono">{l.secret_path}/{l.secret_key}</span>}
                  </div>
                  {l.notes && <div className="mt-1 text-xs text-muted">{l.notes}</div>}
                </div>
                {l.has_secret ? (
                  <RevealButton slug={c.slug} loginId={l.id} />
                ) : (
                  <span className="text-xs text-muted">No secret linked</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function MailStatus({ mail }: { mail: ClientMail | null }) {
  if (!mail) {
    return (
      <p className="mt-3 text-sm text-muted">
        Not set up. Add APPLY_EMAIL and an app password in Infisical (
        <span className="font-mono">/marketting/clients/&lt;slug&gt;/accounts</span>), share the calendar with the
        service account, then add the client to <span className="font-mono">io_mailbox</span>.
      </p>
    );
  }
  const lines = [
    { icon: Mail, label: "Mailbox", ok: mail.last_ok_at, err: mail.last_error, errAt: mail.last_error_at,
      extra: `${mail.emails_7d} emails in 7 days · ${mail.captured_total} captured` },
    { icon: CalendarDays, label: "Calendar", ok: mail.calendar_ok_at, err: mail.calendar_error, errAt: mail.calendar_error_at,
      extra: `${mail.campaigns_upcoming} upcoming campaigns` },
  ];
  return (
    <ul className="mt-3 divide-y divide-line">
      {lines.map(({ icon: Icon, label, ok, err, errAt, extra }) => (
        <li key={label} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
          <Icon className="size-4 text-muted" />
          <span className="w-20 font-medium">{label}</span>
          {!mail.enabled ? (
            <Badge tone="muted">off</Badge>
          ) : err ? (
            <Badge tone="bad">error</Badge>
          ) : ok ? (
            <Badge tone="good">ok</Badge>
          ) : (
            <Badge tone="warn">not checked yet</Badge>
          )}
          <span className="text-muted">{ok ? `checked ${ago(ok)}` : ""}</span>
          <span className="text-xs text-muted">{extra}</span>
          {err && <span className="w-full text-xs text-bad">{err}{errAt ? ` (${ago(errAt)})` : ""}</span>}
        </li>
      ))}
    </ul>
  );
}

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-muted">{k}</dt>
      <dd className={v ? "" : "text-muted"}>{v || "–"}</dd>
    </div>
  );
}
