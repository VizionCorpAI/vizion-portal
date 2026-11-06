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
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col neon-rail">
      <div className="px-5 py-5">
        <div className="neon-text text-[10px] tracking-[0.35em] text-accent">VIZIONAI</div>
        <div className="bg-gradient-to-r from-accent via-purple to-magenta bg-clip-text text-lg font-semibold text-transparent">Portal</div>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-panel-2 hover:text-ink",
                active && "bg-gradient-to-r from-purple/25 to-transparent text-ink shadow-[inset_2px_0_0] shadow-magenta",
              )}
            >
              <Icon className={cn("size-4", active && "neon-text text-accent")} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line px-4 py-3 text-xs text-muted">
        <div className="truncate">{email}</div>
        <form action={logout}>
          <button className="mt-2 flex items-center gap-2 hover:text-ink">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
