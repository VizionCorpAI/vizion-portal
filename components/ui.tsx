import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-xl border border-line bg-panel p-5", className)}>{children}</section>;
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
  good: "bg-good/15 text-good",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
  muted: "bg-panel-2 text-muted",
};

export function Badge({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", TONE[tone])}>{children}</span>;
}

export function Dot({ tone }: { tone: Tone }) {
  const c = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", muted: "bg-muted" }[tone];
  return <span className={cn("inline-block size-2 rounded-full", c)} />;
}

export function Unavailable({ what }: { what: string }) {
  return <p className="mt-3 text-sm text-muted">{what} unavailable right now.</p>;
}
