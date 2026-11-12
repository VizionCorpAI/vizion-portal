"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Bot, Loader2, MessageSquare, RotateCcw, Sparkles, TerminalSquare, X } from "lucide-react";
import { loadChat, sendChat } from "@/app/(portal)/chat-actions";
import type { ChatAgent, ChatHistory, ChatMessage } from "@/lib/portal-api";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

// Chat side panel on every page. Two brains, same guardrails (asks before changing anything):
//   Workspace agent = n8n Platform Master, the same agent Telegram talks to (fast, ~5-20 s).
//   Claude Code     = full Claude Code session on the PC via the host runner (skills, files, slash commands; slower).
// Messages go through the Portal API (/v1/chat) and the reply is polled until it lands.

const AGENTS: { key: ChatAgent; label: string; hint: string; icon: typeof Bot }[] = [
  { key: "workspace", label: "Workspace agent", hint: "Platform Master, same as Telegram", icon: Bot },
  { key: "claude", label: "Claude Code", hint: "Full Claude Code on the PC", icon: TerminalSquare },
];
const SUGGESTIONS = ["/status", "Catch me up on today", "Why did trading lose today?", "What needs me right now?"];
const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" });

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [agent, setAgent] = useState<ChatAgent>("workspace");
  const [text, setText] = useState("");
  const [hist, setHist] = useState<ChatHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const path = usePathname();
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const pending = hist?.messages.some((m) => m.status === "queued" || m.status === "running") ?? false;

  const refresh = useCallback(async () => {
    const r = await loadChat();
    if (r.ok) { setHist(r.data); setError(null); } else setError(r.reason);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("vp-chat-agent");
    if (saved === "claude" || saved === "workspace") setAgent(saved);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) { refresh(); setTimeout(() => input.current?.focus(), 250); } }, [open, refresh]);

  // poll fast while a reply is pending, slowly otherwise (only while open)
  useEffect(() => {
    if (!open) return;
    const t = setInterval(refresh, pending ? 2500 : 20000);
    return () => clearInterval(t);
  }, [open, pending, refresh]);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [hist?.messages.length, pending, open]);

  const pick = (a: ChatAgent) => { setAgent(a); localStorage.setItem("vp-chat-agent", a); };

  async function submit(value = text) {
    const v = value.trim();
    if (!v || sending) return;
    setSending(true); setError(null);
    const r = await sendChat(v, path, agent);
    setSending(false);
    if (!r.ok) { setError(r.reason); return; }
    setText("");
    await refresh();
  }

  const msgs = hist?.messages ?? [];
  const claudeOffline = agent === "claude" && hist && !hist.runner_online;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open chat (Ctrl+K)"
        className="chat-fab fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
        <Sparkles className="size-4" /> Ask VizionAI
      </button>
      <div onClick={() => setOpen(false)}
        className={cn("fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside aria-hidden={!open}
        className={cn("chat-sheet fixed top-0 right-0 z-50 flex h-screen w-full max-w-[30rem] flex-col transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
          open ? "translate-x-0" : "translate-x-full")}>
        <header className="border-b border-line px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow">VizionAI</div>
              <div className="font-display text-2xl text-ink">Concierge</div>
              <div className="mt-0.5 text-xs text-muted">Looking at <span className="text-ink/80">{path}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => submit("/new")} title="Start a fresh conversation" className="icon-btn"><RotateCcw className="size-4" /></button>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="icon-btn"><X className="size-4" /></button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-bg/50 p-1">
            {AGENTS.map((a) => (
              <button key={a.key} onClick={() => pick(a.key)} title={a.hint}
                className={cn("flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  agent === a.key ? "seg-on" : "text-muted hover:text-ink")}>
                <a.icon className="size-3.5" /> {a.label}
              </button>
            ))}
          </div>
          {claudeOffline && (
            <p className="mt-2 text-xs text-warn">The Claude Code runner on the PC isn&apos;t running, so messages will wait until it starts.</p>
          )}
        </header>

        <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">
          {msgs.length === 0 && !error && (
            <div className="mt-6 text-center">
              <MessageSquare className="mx-auto size-8 text-accent/70" strokeWidth={1.5} />
              <p className="font-display mt-3 text-xl text-ink">How can I help?</p>
              <p className="mt-1 text-xs text-muted">I know which page you&apos;re on, and I ask before changing anything.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => submit(s)} className="pill">{s}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m) => <Exchange key={m.id} m={m} />)}
          {error && <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">{error}</p>}
        </div>

        <footer className="border-t border-line p-4">
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="composer flex items-end gap-2 rounded-2xl p-2">
            <textarea ref={input} value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={8000}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder={agent === "claude" ? "Ask Claude Code… (/status, /briefing, files, fixes)" : "Ask the workspace agent…"}
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted/70" />
            <button disabled={!text.trim() || sending} aria-label="Send" className="send-btn grid size-9 shrink-0 place-items-center rounded-xl disabled:opacity-40">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.4} />}
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted/80">Enter to send · Shift+Enter for a new line · Ctrl+K to toggle</p>
        </footer>
      </aside>
    </>
  );
}

function Exchange({ m }: { m: ChatMessage }) {
  const waiting = m.status === "queued" || m.status === "running";
  if (m.text.trim().toLowerCase() === "/new" || m.text.trim().toLowerCase() === "/reset")
    return <div className="text-center text-[11px] tracking-wide text-muted uppercase">· fresh conversation ·</div>;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="bubble-me max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap">{m.text}</div>
      </div>
      <div className="flex gap-3">
        <span className="avatar grid size-7 shrink-0 place-items-center rounded-full">
          {m.agent === "claude" ? <TerminalSquare className="size-3.5" /> : <Bot className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] text-muted">
            {m.agent === "claude" ? "Claude Code" : "Workspace agent"} · {fmt.format(new Date(m.finished_at || m.created_at))}
          </div>
          {waiting ? (
            <div className="flex items-center gap-2 text-muted">
              <span className="typing"><i /><i /><i /></span>
              {m.status === "queued" ? "Queued…" : "Working on it…"}
            </div>
          ) : m.status === "error" ? (
            <p className="text-bad">{m.error || "Something went wrong."}</p>
          ) : (
            <div className="text-ink/90"><Markdown text={m.reply || "(no reply)"} /></div>
          )}
        </div>
      </div>
    </div>
  );
}
