"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";

// Chat side panel on every page. Stub for now: the agent connection (same agent and
// guardrails as the Telegram bridge, via the Portal API) is a later milestone.
export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-bg shadow-lg transition hover:opacity-90"
      >
        <MessageSquare className="size-4" /> Ask VizionAI
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}
      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-line bg-panel shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="font-medium">VizionAI</div>
            <div className="text-xs text-muted">Context: {path}</div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-muted hover:text-ink">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 text-sm text-muted">
          <div className="rounded-lg border border-dashed border-line p-4">
            Chat isn&apos;t connected yet. It will talk to the main VizionAI agent (same agent and guardrails as
            Telegram), know which page you&apos;re on, and run allowlisted actions only after you confirm.
          </div>
        </div>
        <footer className="border-t border-line p-4">
          <input
            disabled
            placeholder="Coming soon…"
            className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm disabled:opacity-50"
          />
        </footer>
      </aside>
    </>
  );
}
