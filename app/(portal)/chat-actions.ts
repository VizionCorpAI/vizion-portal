"use server";

import { getSession } from "@/lib/session";
import { portalJson, type ApiResult, type ChatAgent, type ChatHistory } from "@/lib/portal-api";

// Chat panel -> Portal API (/v1/chat). Owner only: the agents behind it can act on the PC (after confirmation).

async function owner() {
  const s = await getSession();
  return s && s.role === "owner" ? s : null;
}

export async function sendChat(text: string, page: string, agent: ChatAgent): Promise<ApiResult<{ id: number }>> {
  const s = await owner();
  if (!s) return { ok: false, reason: "Only the owner can use the chat." };
  const t = text.trim();
  if (!t) return { ok: false, reason: "Type a message first." };
  return portalJson<{ id: number }>("/v1/chat", s.email, { text: t.slice(0, 8000), page: page.slice(0, 200), agent });
}

export async function loadChat(): Promise<ApiResult<ChatHistory>> {
  const s = await owner();
  if (!s) return { ok: false, reason: "Only the owner can use the chat." };
  return portalJson<ChatHistory>("/v1/chat", s.email);
}
