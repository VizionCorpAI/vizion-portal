import { notFound } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Badge, Card } from "@/components/ui";

// Placeholder for pages not built yet; each lists its planned sections from the site map.
// Dynamic on purpose: every request passes the session check in the (portal) layout.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: NAV.find((n) => n.slug === section)?.label ?? "Not found" };
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = NAV.find((n) => n.slug === section);
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{page.label}</h1>
          <Badge tone="warn">Planned</Badge>
        </div>
        <p className="text-sm text-muted">{page.purpose}</p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {page.sections.map((s) => (
          <Card key={s} className="border-dashed">
            <div className="font-medium">{s}</div>
            <p className="mt-1 text-xs text-muted">Not built yet</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
