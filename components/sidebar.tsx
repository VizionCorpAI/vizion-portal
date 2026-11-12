"use client";

import { useEffect, useState } from "react";
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

// Folded by default (2026-11-12): a "portal" button (spinning neon ring, glowing core, morphing glyph) sits next to
// the VizionAI Portal wordmark at the top left; it opens the menu as a drawer. Esc, the backdrop or a link closes it.
// Ctrl+B / Cmd+B toggles it (Ctrl+K is the chat).
export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = NAV.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));

  return (
    <>
      {/* brand bar: portal button + wordmark, always visible */}
      <div className={cn("brand-bar fixed top-4 left-5 z-[60] flex items-center gap-3.5 rounded-full py-1 pr-5 pl-1", open && "is-open")}>
        <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu (Ctrl+B)"} aria-expanded={open}
          className={cn("portal-btn", open && "is-open")}>
          <span className="portal-ring" />
          <span className="portal-core" />
          <span className="portal-glyph"><i /><i /><i /></span>
        </button>
        <Link href="/" className="group leading-none">
          <div className="eyebrow">VizionAI</div>
          <div className="font-display mt-0.5 text-[1.55rem] leading-none font-semibold italic text-ink transition-colors group-hover:text-accent">
            Portal
          </div>
        </Link>
        {current && !open && (
          <span className="crumb ml-1 hidden items-center gap-2 rounded-full px-3 py-1 text-xs text-muted sm:flex">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px] shadow-accent" /> {current.label}
          </span>
        )}
      </div>

      <div onClick={() => setOpen(false)}
        className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px] transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")} />

      <aside aria-hidden={!open}
        className={cn("menu-sheet fixed top-0 left-0 z-[55] flex h-screen w-72 flex-col pt-24 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
          open ? "translate-x-0" : "-translate-x-full")}>
        <div className="mx-6 mb-4 h-px bg-gradient-to-r from-accent/60 via-purple/40 to-transparent" />
        <nav className={cn("flex-1 space-y-0.5 overflow-y-auto px-3", open && "menu-open")}>
          {NAV.map((n, i) => {
            const Icon = ICONS[n.slug];
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                tabIndex={open ? 0 : -1}
                style={{ "--i": i } as React.CSSProperties}
                className={cn(
                  "menu-item group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-muted transition-all duration-200 hover:translate-x-1 hover:bg-panel-2/70 hover:text-ink",
                  active && "bg-panel-2 text-ink shadow-[0_1px_0_rgb(255_255_255/.04)_inset,0_8px_20px_-14px_rgb(0_0_0/.9)]",
                )}
              >
                {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent via-purple to-magenta shadow-[0_0_10px] shadow-purple/60" />}
                <Icon className={cn("size-4 transition-transform duration-300 group-hover:scale-110 group-hover:text-accent", active && "text-accent drop-shadow-[0_0_6px_var(--color-accent)]")} strokeWidth={1.8} />
                <span className="flex-1">{n.label}</span>
                <span className="hidden text-[10.5px] text-muted/70 group-hover:inline">{n.purpose}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mx-3 mb-3 rounded-xl border border-line bg-panel/60 px-4 py-3 text-xs text-muted">
          <div className="truncate text-ink/80">{email}</div>
          <form action={logout}>
            <button tabIndex={open ? 0 : -1} className="mt-2 flex items-center gap-2 transition hover:text-accent">
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
