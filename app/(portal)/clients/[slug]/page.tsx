import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { portalGet, type ClientDetail } from "@/lib/portal-api";
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
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/clients" className="flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft className="size-3" /> Clients
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{c.name}</h1>
        <Badge tone={STATUS_TONE[c.status] ?? "muted"}>{c.status}</Badge>
        <Badge>{c.kind === "internal" ? "Internal" : "Client"}</Badge>
      </header>

      {/* Summary */}
      <Card>
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
      <Card>
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

      {/* Logins */}
      <Card>
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

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-muted">{k}</dt>
      <dd className={v ? "" : "text-muted"}>{v || "–"}</dd>
    </div>
  );
}
