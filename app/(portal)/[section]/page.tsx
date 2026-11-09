import { notFound } from "next/navigation";
import { NAV } from "@/lib/nav";
import { portalGet, type PageData } from "@/lib/portal-api";
import { Badge, Card, Dot } from "@/components/ui";
import { Sections } from "@/components/sections";
import { timeAgo } from "@/lib/utils";

// Workspace pages: each one shows its workspace's live data from the Portal API
// (/v1/pages/<slug>, api/pages.mjs). Dynamic on purpose: every request passes the session
// check in the (portal) layout.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: NAV.find((n) => n.slug === section)?.label ?? "Not found" };
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = NAV.find((n) => n.slug === section);
  if (!page || !/^[a-z]+$/.test(section)) notFound();
  const res = await portalGet<PageData>(`/v1/pages/${section}`);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{page.label}</h1>
          <p className="text-sm text-muted">{page.purpose}</p>
        </div>
        {res.ok ? (
          <span className="flex items-center gap-2 text-xs text-muted">
            <Dot tone="good" pulse /> Live · updated {timeAgo(res.data.generated_at)}
          </span>
        ) : (
          <Badge tone="bad">{res.reason}</Badge>
        )}
      </header>

      {res.ok ? (
        <Sections sections={res.data.sections} />
      ) : (
        <>
          <Card className="border-bad/40 text-sm">
            Live data is unavailable ({res.reason}). Planned sections are listed below.
          </Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {page.sections.map((s) => (
              <Card key={s} className="border-dashed">
                <div className="font-medium">{s}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
