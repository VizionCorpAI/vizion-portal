import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { ChatPanel } from "@/components/chat-panel";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  if (!session) {
    const path = (await headers()).get("x-pathname") || "/";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return (
    <div className="min-h-screen">
      <Sidebar email={session.email} />
      {/* menu is folded by default (portal button top left), so pages use the full width */}
      <main className="min-w-0 px-10 pt-24 pb-10 lg:pt-6">{children}</main>
      <ChatPanel />
    </div>
  );
}
