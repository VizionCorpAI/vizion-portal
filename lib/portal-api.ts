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

export async function portalPost<T>(path: string, user: string): Promise<ApiResult<T> & { status?: number }> {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${await getSecret("PORTAL_API_KEY")}`, "x-portal-user": user },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const body = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) return { ok: false, reason: body.error || `Portal API error ${r.status}`, status: r.status };
    return { ok: true, data: body };
  } catch {
    return { ok: false, reason: "PC offline" };
  }
}

export type ClientSummary = {
  slug: string; name: string; kind: "internal" | "client"; status: string; client_key: string | null;
  primary_url: string | null; sites: number; logins: number; logins_attention: number;
  mailbox: "ok" | "error" | "off" | null;
};

export type ClientMail = {
  enabled: boolean; last_ok_at: string | null; last_error: string | null; last_error_at: string | null;
  captured_total: number; calendar_ok_at: string | null; calendar_error: string | null; calendar_error_at: string | null;
  emails_7d: number; campaigns_upcoming: number;
};

export type ClientLead = {
  id: number; name: string | null; email: string | null; lead_source: string | null; status: string | null;
  notes: string | null; created_at: string;
};

export type ClientDetail = {
  slug: string; name: string; kind: "internal" | "client"; status: string; client_key: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null; notes: string | null;
  updated_at: string;
  sites: { id: number; url: string; label: string | null; platform: string | null; hosting_ref: string | null; is_primary: boolean; notes: string | null }[];
  logins: {
    id: number; label: string; service: string | null; kind: string; login_url: string | null; username: string | null;
    status: "ok" | "expired" | "missing" | "unknown"; notes: string | null; has_secret: boolean;
    secret_path: string | null; secret_key: string | null;
  }[];
  mail: ClientMail | null;
  leads: ClientLead[];
};

// Workspace pages (/v1/pages/<slug>, api/pages.mjs): generic sections the site renders as-is.
export type Cell = string | number | boolean | null;
export type PageSection =
  | { kind: "stats"; title: string; items: { label: string; value: Cell; tone?: "good" | "warn" | "bad" | "muted"; hint?: string }[] }
  | { kind: "table"; title: string; note?: string; empty?: string; columns: { key: string; label: string; align?: "right" }[]; rows: Record<string, Cell>[] }
  | { kind: "bars"; title: string; note?: string; diverging?: boolean; unit?: string; points: { label: string; value: number }[] }
  | { kind: "note"; title: string; text: string; tone?: "good" | "warn" | "bad" | "muted" };
export type PageData = { slug: string; generated_at: string; sections: PageSection[] };
