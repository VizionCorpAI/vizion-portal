"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { revealSecret } from "./actions";

const HIDE_AFTER_MS = 30_000;

export function RevealButton({ slug, loginId }: { slug: string; loginId: number }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  // auto-hide so a revealed secret doesn't sit on screen
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(() => setValue(null), HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [value]);

  const doReveal = () =>
    start(async () => {
      setError(null);
      const r = await revealSecret(slug, loginId);
      if (r.value !== undefined) setValue(r.value);
      else setError(r.error ?? "Failed");
    });

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <code className="max-w-xs truncate rounded bg-panel-2 px-2 py-1 font-mono text-xs">{value}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-muted hover:text-ink"
          aria-label="Copy"
        >
          {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
        </button>
        <button onClick={() => setValue(null)} className="text-muted hover:text-ink" aria-label="Hide">
          <EyeOff className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-bad">{error}</span>}
      <button
        onClick={doReveal}
        disabled={pending}
        className="ghost-btn flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent hover:text-accent disabled:opacity-60"
      >
        <Eye className="size-3.5" /> {pending ? "Revealing…" : "Reveal"}
      </button>
    </div>
  );
}
