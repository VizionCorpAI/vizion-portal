"use server";

import { getSession } from "@/lib/session";
import { portalPost } from "@/lib/portal-api";

export type RevealResult = { value?: string; error?: string };

// Owner only. The API records who revealed what; the value is never stored or logged here.
export async function revealSecret(slug: string, loginId: number): Promise<RevealResult> {
  const session = await getSession();
  if (!session || session.role !== "owner") return { error: "Only the owner can reveal secrets." };
  if (!/^[a-z0-9-]+$/.test(slug) || !Number.isInteger(loginId)) return { error: "Bad request." };
  const r = await portalPost<{ value: string }>(`/v1/clients/${slug}/logins/${loginId}/reveal`, session.email);
  return r.ok ? { value: r.data.value } : { error: r.reason };
}
