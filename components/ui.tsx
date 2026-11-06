import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("neon-card rounded-xl border border-line p-5", className)}>{children}</section>;
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

export function Dot({ tone }: { tone: Tone }) {
  const c = { good: "bg-good shadow-[0_0_8px] shadow-good", warn: "bg-warn shadow-[0_0_8px] shadow-warn", bad: "bg-bad shadow-[0_0_8px] shadow-bad", muted: "bg-muted" }[tone];
  return <span className={cn("inline-block size-2 rounded-full", c)} />;
}

export function Unavailable({ what }: { what: string }) {
  return <p className="mt-3 text-sm text-muted">{what} unavailable right now.</p>;
}
