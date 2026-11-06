import Link from "next/link";
import { ArrowRight, Globe, KeyRound } from "lucide-react";
import { portalGet, type ClientSummary } from "@/lib/portal-api";
import { Badge, Card, type Tone } from "@/components/ui";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, Tone> = {
  active: "good", prospect: "warn", unconfirmed: "warn", paused: "muted", former: "muted",
};

export default async function ClientsPage() {
  const res = await portalGet<ClientSummary[]>("/v1/clients");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-sm text-muted">Sites, logins and details for every client, including VisionCorp itself</p>
      </header>
      {!res.ok ? (
        <Card className="border-bad/40 text-sm">{res.reason}</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {res.data.map((c) => (
            <Link key={c.slug} href={`/clients/${c.slug}`} className="group">
              <Card className="h-full transition group-hover:border-accent/60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted">{c.kind === "internal" ? "Internal" : "Client"}</div>
                  </div>
                  <Badge tone={STATUS_TONE[c.status] ?? "muted"}>{c.status}</Badge>
                </div>
                {c.primary_url && (
                  <div className="mt-3 truncate text-sm text-accent">{c.primary_url.replace(/^https?:\/\//, "")}</div>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1"><Globe className="size-3.5" /> {c.sites} sites</span>
                  <span className="flex items-center gap-1"><KeyRound className="size-3.5" /> {c.logins} logins</span>
                  {c.logins_attention > 0 && <Badge tone="warn">{c.logins_attention} need attention</Badge>}
                  <ArrowRight className="ml-auto size-3.5 opacity-0 transition group-hover:opacity-100" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
