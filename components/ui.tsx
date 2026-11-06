import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Hue = "cyan" | "blue" | "purple" | "magenta" | "orange" | "volt";
const HUE_VAR: Record<Hue, string> = {
  cyan: "var(--color-accent)", blue: "var(--color-blue)", purple: "var(--color-purple)",
  magenta: "var(--color-magenta)", orange: "var(--color-orange)", volt: "var(--color-volt)",
};
export const HUES: Hue[] = ["cyan", "magenta", "purple", "blue", "orange", "volt"];

export function Card({ className, children, hue = "cyan" }: { className?: string; children: React.ReactNode; hue?: Hue }) {
  return (
    <section
      style={{ "--hue": HUE_VAR[hue] } as React.CSSProperties}
      className={cn("neon-card tile rounded-xl border border-line p-5", className)}
    >
      {children}
    </section>
  );
}

/** Solid icon chip in the card's hue (dark glyph on bright color). */
export function Chip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="chip">
      <Icon className="size-4" strokeWidth={2.4} />
    </span>
  );
}

export function CardTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  const inner = <h2 className="text-xs font-medium tracking-wide text-muted uppercase">{children}</h2>;
  return href ? (
    <Link href={href} className="block hover:[&_h2]:text-ink">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export type Tone = "good" | "warn" | "bad" | "muted";
const TONE: Record<Tone, string> = {
  good: "bg-good/10 text-good ring-1 ring-good/30",
  warn: "bg-warn/10 text-warn ring-1 ring-warn/30",
  bad: "bg-bad/10 text-bad ring-1 ring-bad/40",
  muted: "bg-panel-2 text-muted",
};

export function Badge({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", TONE[tone])}>{children}</span>;
}

export function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  const c = { good: "bg-good shadow-[0_0_8px] shadow-good", warn: "bg-warn shadow-[0_0_8px] shadow-warn", bad: "bg-bad shadow-[0_0_8px] shadow-bad", muted: "bg-muted" }[tone];
  return <span className={cn("inline-block size-2 rounded-full", c, pulse && "live-dot")} />;
}

export function Unavailable({ what }: { what: string }) {
  return <p className="mt-3 text-sm text-muted">{what} unavailable right now.</p>;
}
