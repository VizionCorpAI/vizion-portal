"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass, FileInput, LayoutDashboard, LineChart, LogOut, Server, Settings, User, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";

const ICONS: Record<string, LucideIcon> = {
  "": LayoutDashboard, dashboards: LineChart, clients: Users, finances: Wallet, io: FileInput,
  opportunities: Compass, ops: Server, personal: User, settings: Settings,
};

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col neon-rail">
      <div className="px-6 pt-7 pb-6">
        <div className="eyebrow">VizionAI</div>
        <div className="font-display mt-1 text-[2.1rem] leading-none font-semibold italic text-ink">Portal</div>
        <div className="mt-4 h-px bg-gradient-to-r from-accent/60 via-purple/40 to-transparent" />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((n) => {
          const Icon = ICONS[n.slug];
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-muted transition-all duration-200 hover:bg-panel-2/70 hover:text-ink",
                active && "bg-panel-2 text-ink shadow-[0_1px_0_rgb(255_255_255/.04)_inset,0_8px_20px_-14px_rgb(0_0_0/.9)]",
              )}
            >
              {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent via-purple to-magenta shadow-[0_0_10px] shadow-purple/60" />}
              <Icon className={cn("size-4 transition-colors duration-200 group-hover:text-accent", active && "text-accent")} strokeWidth={1.8} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-3 mb-3 rounded-xl border border-line bg-panel/60 px-4 py-3 text-xs text-muted">
        <div className="truncate text-ink/80">{email}</div>
        <form action={logout}>
          <button className="mt-2 flex items-center gap-2 transition hover:text-accent">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
