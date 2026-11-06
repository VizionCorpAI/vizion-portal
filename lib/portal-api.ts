import "server-only";
import { getSecret } from "./secrets";

const BASE = process.env.PORTAL_API_URL || "https://portal-api.vizionai.iamvisioncorp.org";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; reason: string };

export async function portalGet<T>(path: string): Promise<ApiResult<T>> {
  try {
    const r = await fetch(`${BASE}${path}`, {
      headers: { authorization: `Bearer ${await getSecret("PORTAL_API_KEY")}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 502 || r.status === 503 || r.status === 504) return { ok: false, reason: "PC offline" };
    if (!r.ok) return { ok: false, reason: `Portal API error ${r.status}` };
    return { ok: true, data: (await r.json()) as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: /secret|infisical/i.test(msg) ? msg : "PC offline" };
  }
}

type Maybe<T> = T | { error: string };

export type Overview = {
  generated_at: string;
  services: Maybe<{
    up: number;
    total: number;
    checks: { key: string; name: string; ok: boolean; ms: number; detail?: string }[];
  }>;
  trading: Maybe<{
    date_tz: string;
    trades: number;
    closed: number;
    open: number;
    wins: number;
    losses: number;
    pnl: number;
    last_trade_at: string | null;
    ea_active: boolean;
    gate_24h: Record<string, number>;
  }>;
  workflows: Maybe<{
    failed_24h: number;
    success_24h: number;
    active: number;
    total: number;
    top_failing: { name: string; failures: number; last_at: string }[];
  }>;
  alerts: Maybe<{
    errors_24h: number;
    warnings_24h: number;
    recent: { id: string; workspace_key: string; source: string; severity: string; title: string; created_at: string }[];
  }>;
  attention: Maybe<{ total: number; items: { key: string; label: string; count: number | null; href: string }[] }>;
  activity: Maybe<{ kind: string; text: string; at: string }[]>;
  clients: Maybe<
    { client_key: string; last_post_at: string | null; last_post_status: string | null; dms_waiting: number; leads_7d: number }[]
  >;
};

export const isErr = (v: unknown): v is { error: string } =>
  !!v && typeof v === "object" && !Array.isArray(v) && "error" in v;
