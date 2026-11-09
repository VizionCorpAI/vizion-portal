// VizionAI Portal API: read-only live data for the portal site on Hostinger.
// Contract: vizion-infra/stack/caddy/README.md, section "Portal API".
//   - every request needs the portal key (Authorization: Bearer <key> or X-Portal-Key)
//   - read-only Postgres role; no direct writes
//   - never returns secret values
//   - talks to services by their compose names on vizion-net
import http from "node:http";
import crypto from "node:crypto";
import pg from "pg";

const PORT = Number(process.env.PORT || 3000);
const TZ = process.env.PORTAL_TZ || "America/Phoenix";
const KEY = process.env.PORTAL_API_KEY || "";
const CACHE_MS = Number(process.env.PORTAL_CACHE_MS || 15000);

if (KEY.length < 32) {
  console.error("PORTAL_API_KEY missing or shorter than 32 chars; refusing to start");
  process.exit(1);
}

const dbConfig = (database) => ({
  host: process.env.PORTAL_DB_HOST || "vizion-postgres",
  port: Number(process.env.PORTAL_DB_PORT || 5432),
  user: process.env.PORTAL_DB_USER || "portal_ro",
  password: process.env.PORTAL_DB_PASSWORD,
  database,
  max: 4,
  idleTimeoutMillis: 30000,
  statement_timeout: 5000,
  application_name: "vizion-portal-api",
});
const aidb = new pg.Pool(dbConfig(process.env.PORTAL_AIDB || "AIDB"));
const n8ndb = new pg.Pool(dbConfig(process.env.PORTAL_N8N_DB || "n8n"));
for (const p of [aidb, n8ndb]) p.on("error", (e) => console.error("pg pool:", e.message));

const SERVICES = JSON.parse(
  process.env.PORTAL_SERVICES ||
    JSON.stringify([
      { key: "n8n", name: "n8n", url: "http://vizion-n8n:5678/healthz" },
      { key: "nn", name: "Neural net", url: "http://vizion-nn:8000/health" },
      { key: "mt5", name: "MT5 REST", url: "http://vizion-mt5-rest:18900/health" },
      { key: "kuma", name: "Uptime Kuma", url: "http://vizion-uptime-kuma:3001/" },
      { key: "nocodb", name: "NocoDB", url: "http://vizion-nocodb:8080/api/v1/health" },
    ]),
);

// ---------- helpers ----------
const keyDigest = crypto.createHash("sha256").update(KEY).digest();
function authorized(req) {
  const h = req.headers["authorization"] || "";
  const given = (h.startsWith("Bearer ") ? h.slice(7) : req.headers["x-portal-key"]) || "";
  const d = crypto.createHash("sha256").update(String(given)).digest();
  return crypto.timingSafeEqual(d, keyDigest);
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(json);
}

// Each section runs on its own; one failing query yields {error} instead of failing the page.
async function section(name, fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(`[${name}]`, e.message);
    return { error: `${name} unavailable` };
  }
}

async function probe(svc) {
  const t0 = Date.now();
  try {
    const r = await fetch(svc.url, { signal: AbortSignal.timeout(5000), redirect: "manual" });
    return { key: svc.key, name: svc.name, ok: r.status < 500, status: r.status, ms: Date.now() - t0 };
  } catch (e) {
    return { key: svc.key, name: svc.name, ok: false, status: null, ms: Date.now() - t0, detail: e.cause?.code || e.name };
  }
}

const num = (v) => (v == null ? null : Number(v));

// Local midnight in PORTAL_TZ, expressed as a naive UTC timestamp (trade_* columns are naive UTC).
const DAY_START_UTC = `((date_trunc('day', now() at time zone $1) at time zone $1) at time zone 'UTC')`;

// ---------- sections ----------
async function services() {
  const checks = await Promise.all(SERVICES.map(probe));
  const t0 = Date.now();
  let pgOk = false;
  try {
    await aidb.query("select 1");
    pgOk = true;
  } catch {}
  checks.unshift({ key: "postgres", name: "Postgres", ok: pgOk, status: null, ms: Date.now() - t0 });
  return { up: checks.filter((c) => c.ok).length, total: checks.length, checks };
}

async function trading() {
  const { rows: [t] } = await aidb.query(
    `select count(*)                                         as trades,
            count(*) filter (where closed_at is not null)    as closed,
            count(*) filter (where pnl > 0)                  as wins,
            count(*) filter (where pnl < 0)                  as losses,
            coalesce(sum(pnl), 0)                            as pnl,
            max(created_at)                                  as last_trade_at
       from trade_executions
      where created_at >= ${DAY_START_UTC}`,
    [TZ],
  );
  const { rows: [o] } = await aidb.query(
    `select count(*) as open from trade_executions
      where closed_at is null and created_at > now() at time zone 'UTC' - interval '7 days'`,
  );
  const { rows: gate } = await aidb.query(
    `select decision, count(*)::int as n from ai_gate_decision
      where ts > now() at time zone 'UTC' - interval '24 hours' group by 1`,
  );
  const { rows: [last] } = await aidb.query(
    `select max(created_at) at time zone 'UTC' as at from trade_executions`,
  );
  const lastAt = last.at ? new Date(last.at) : null;
  return {
    date_tz: TZ,
    trades: num(t.trades),
    closed: num(t.closed),
    open: num(o.open),
    wins: num(t.wins),
    losses: num(t.losses),
    pnl: Math.round(Number(t.pnl) * 100) / 100,
    last_trade_at: lastAt?.toISOString() ?? null,
    // "EA active" is inferred: a trade in the last 2 hours. The EA itself is not queryable from here.
    ea_active: lastAt ? Date.now() - lastAt.getTime() < 2 * 3600 * 1000 : false,
    gate_24h: Object.fromEntries(gate.map((g) => [g.decision, g.n])),
  };
}

async function workflows() {
  const { rows: [c] } = await n8ndb.query(
    `select count(*) filter (where status in ('error','crashed')) as failed,
            count(*) filter (where status = 'success')            as ok
       from execution_entity where "startedAt" > now() - interval '24 hours'`,
  );
  const { rows: [w] } = await n8ndb.query(
    `select count(*) filter (where active) as active, count(*) as total from workflow_entity`,
  );
  const { rows: top } = await n8ndb.query(
    `select w.name, count(*)::int as failures, max(e."startedAt") as last_at
       from execution_entity e join workflow_entity w on w.id = e."workflowId"
      where e.status in ('error','crashed') and e."startedAt" > now() - interval '24 hours'
      group by w.name order by failures desc limit 6`,
  );
  return { failed_24h: num(c.failed), success_24h: num(c.ok), active: num(w.active), total: num(w.total), top_failing: top };
}

async function alerts() {
  const { rows: [c] } = await aidb.query(
    `select count(*) filter (where severity in ('error','critical')) as errors,
            count(*) filter (where severity = 'warn')             as warnings
       from alert_event where created_at > now() - interval '24 hours'`,
  );
  const { rows: recent } = await aidb.query(
    `select id, workspace_key, source, severity, left(title, 140) as title, created_at
       from alert_event where severity in ('error','critical','warn')
      order by id desc limit 8`,
  );
  return { errors_24h: num(c.errors), warnings_24h: num(c.warnings), recent };
}

async function attention() {
  const q = async (sql) => num((await aidb.query(sql)).rows[0].n);
  const [io_reviews, io_submissions, content, dms, platform_tasks] = await Promise.all([
    q(`select count(*) as n from io_review where coalesce(review_state,'pending') in ('pending','requested','in_review')`),
    q(`select count(*) as n from io_submission where submission_state in ('awaiting_approval','pending_approval','draft')`),
    q(`select count(*) as n from mkt_scheduled_posts where status in ('pending_approval','draft','review')`),
    q(`select count(*) as n from mkt_dm_messages where replied_at is null and coalesce(is_from_page,false) = false`),
    q(`select count(*) as n from platform_task where status in ('needs_approval','awaiting_approval')`),
  ]);
  const items = [
    { key: "io_reviews", label: "I/O reviews", count: io_reviews, href: "/io" },
    { key: "io_submissions", label: "Submissions awaiting approval", count: io_submissions, href: "/io" },
    { key: "content", label: "Content awaiting approval", count: content, href: "/clients" },
    { key: "dms", label: "DMs & comments waiting on you", count: dms, href: "/clients" },
    { key: "platform_tasks", label: "Platform tasks for approval", count: platform_tasks, href: "/ops" },
  ];
  return { total: items.reduce((s, i) => s + (i.count || 0), 0), items };
}

async function activity() {
  const { rows: a } = await aidb.query(
    `(select 'trade' as kind,
             symbol || ' ' || direction || ' closed ' ||
               case when pnl >= 0 then '+' else '' end || round(pnl, 2) as text,
             (closed_at at time zone 'UTC') as at
        from trade_executions
       where closed_at > now() at time zone 'UTC' - interval '24 hours'
       order by closed_at desc limit 8)
     union all
     (select 'heal', a.action_type || case when r.ok then ' ok' else ' failed' end, r.finished_at
        from maint_action_run r join maint_action a on a.id = r.action_id
       where r.finished_at > now() - interval '24 hours'
       order by r.finished_at desc limit 8)
     union all
     (select 'post', coalesce(client_key,'') || ': ' || left(coalesce(topic, caption, 'post'), 80),
             (published_at at time zone $1)
        from mkt_scheduled_posts
       where published_at > (now() at time zone $1) - interval '24 hours'
       order by published_at desc limit 8)
     union all
     (select 'submission', coalesce(submission_kind,'submission') || ' to ' || coalesce(destination,'?'), submitted_at
        from io_submission
       where submitted_at > now() - interval '24 hours'
       order by submitted_at desc limit 8)`,
    [TZ],
  );
  return a.sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 20);
}

async function clients() {
  const { rows } = await aidb.query(
    `with keys as (
       select distinct client_key from mkt_scheduled_posts where client_key is not null
       union select distinct client_key from social_posts where client_key is not null
     )
     select k.client_key,
            (select max(coalesce(published_at, created_at)) from mkt_scheduled_posts p where p.client_key = k.client_key) as last_post_at,
            (select status from mkt_scheduled_posts p where p.client_key = k.client_key order by id desc limit 1)         as last_post_status,
            (select count(*) from mkt_dm_messages d where d.client_key = k.client_key and d.replied_at is null)           as dms_waiting,
            (select count(*) from social_comments c where c.client_key = k.client_key and c.is_lead
                and c.created_at > now() - interval '7 days')                                                          as leads_7d
       from keys k order by 1`,
  );
  return rows.map((r) => ({ ...r, dms_waiting: num(r.dms_waiting), leads_7d: num(r.leads_7d) }));
}

// ---------- routes ----------
let cache = { at: 0, body: null };
async function overview() {
  if (cache.body && Date.now() - cache.at < CACHE_MS) return cache.body;
  const [svc, trd, wf, al, att, act, cl] = await Promise.all([
    section("services", services),
    section("trading", trading),
    section("workflows", workflows),
    section("alerts", alerts),
    section("attention", attention),
    section("activity", activity),
    section("clients", clients),
  ]);
  const body = {
    generated_at: new Date().toISOString(),
    services: svc,
    trading: trd,
    workflows: wf,
    alerts: al,
    attention: att,
    activity: act,
    clients: cl,
  };
  cache = { at: Date.now(), body };
  return body;
}

// ---------- clients ----------
async function clientList() {
  const { rows } = await aidb.query(
    `select c.slug, c.name, c.kind, c.status, c.client_key,
            (select url from portal_client_site s where s.client_id = c.id order by is_primary desc, id limit 1) as primary_url,
            (select count(*)::int from portal_client_site s where s.client_id = c.id)  as sites,
            (select count(*)::int from portal_client_login l where l.client_id = c.id) as logins,
            (select count(*)::int from portal_client_login l where l.client_id = c.id and l.status <> 'ok') as logins_attention,
            -- per-client mailbox + calendar (IO io_mailbox): null = not set up
            (select case when not m.enabled then 'off'
                         when m.last_error is not null or m.calendar_error is not null then 'error'
                         else 'ok' end
               from io_mailbox m where m.client_slug = c.slug)                                as mailbox
       from portal_client c order by c.kind desc, c.name`,
  );
  return rows;
}

async function clientDetail(slug) {
  const { rows: [c] } = await aidb.query(
    `select id, slug, name, kind, status, client_key, contact_name, contact_email, contact_phone, notes, updated_at
       from portal_client where slug = $1`,
    [slug],
  );
  if (!c) return null;
  const [sites, logins] = await Promise.all([
    aidb.query(`select id, url, label, platform, hosting_ref, is_primary, notes
                  from portal_client_site where client_id = $1 order by is_primary desc, label`, [c.id]),
    // never the secret itself: only whether one is linked
    aidb.query(`select id, label, service, kind, login_url, username, status, notes,
                       (secret_path is not null and secret_key is not null) as has_secret,
                       secret_path, secret_key
                  from portal_client_login where client_id = $1 order by label`, [c.id]),
  ]);
  const key = c.client_key || slug.toUpperCase();
  const [mail, leads] = await Promise.all([
    // health only: the mailbox address and app password stay in Infisical
    aidb.query(`select m.enabled, m.last_ok_at, m.last_error, m.last_error_at, m.captured_total::int as captured_total,
                       m.calendar_ok_at, m.calendar_error, m.calendar_error_at,
                       (select count(*)::int from io_source s where s.source_kind = 'email'
                           and s.source_ref like 'email:' || m.client_slug || ':%' and s.created_at > now() - interval '7 days') as emails_7d,
                       (select count(*)::int from mkt_campaigns k where k.calendar_event_id like m.client_slug || ':%'
                           and k.status = 'planned' and k.start_date >= current_date)                                       as campaigns_upcoming
                  from io_mailbox m where m.client_slug = $1`, [slug]),
    aidb.query(`select id, name, email, lead_source, status, notes, created_at
                  from social_leads where client_key = $1 order by created_at desc limit 10`, [key]),
  ]);
  const { id, ...client } = c;
  return { ...client, sites: sites.rows, logins: logins.rows, mail: mail.rows[0] || null, leads: leads.rows };
}

// Reveal: reads ONE Infisical key that a login row points at, with the portal's own
// read-only identity, and appends an audit row. Nothing is cached.
const INF = process.env.INFISICAL_DOMAIN || "https://app.infisical.com";
// portal_client_login.secret_project stores the project name; Infisical wants the id
const INF_PROJECTS = {
  "vizion-business": "f67a6490-4cc1-489d-a6eb-98fe995b0539",
  "vizion-infrastructure": "918f6641-7111-4c80-b08a-46321c6b81ab",
};
async function infisicalToken() {
  const clientId = process.env.PORTAL_INFISICAL_CLIENT_ID;
  const clientSecret = process.env.PORTAL_INFISICAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const r = await fetch(`${INF}/api/v1/auth/universal-auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`infisical login ${r.status}`);
  return (await r.json()).accessToken;
}

async function reveal(slug, loginId, by) {
  const { rows: [l] } = await aidb.query(
    `select l.id, l.secret_project, l.secret_env, l.secret_path, l.secret_key
       from portal_client_login l join portal_client c on c.id = l.client_id
      where c.slug = $1 and l.id = $2`,
    [slug, loginId],
  );
  if (!l) return { status: 404, body: { error: "login not found" } };
  if (!l.secret_path || !l.secret_key) return { status: 409, body: { error: "no secret linked to this login yet" } };

  let ok = false, value = null, status = 200, error;
  try {
    const token = await infisicalToken();
    if (!token) {
      status = 503; error = "reveal is not configured on the Portal API";
    } else {
      const workspaceId = INF_PROJECTS[l.secret_project] ?? l.secret_project;
      const qs = new URLSearchParams({ workspaceId,environment: l.secret_env, secretPath: l.secret_path });
      const r = await fetch(`${INF}/api/v3/secrets/raw/${encodeURIComponent(l.secret_key)}?${qs}`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) { value = (await r.json()).secret.secretValue; ok = true; }
      else { status = r.status === 404 ? 404 : 502; error = r.status === 404 ? "secret not found in Infisical" : "Infisical error"; }
      fetch(`${INF}/api/v1/auth/token/revoke`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessToken: token }),
      }).catch(() => {});
    }
  } catch (e) {
    console.error("[reveal]", e.message);
    status = 502; error = "Infisical unreachable";
  }

  // audit (the role is read-only by default; this one insert is explicitly read-write)
  const c = await aidb.connect();
  try {
    await c.query("BEGIN READ WRITE");
    await c.query(`insert into portal_reveal_log (login_id, revealed_by, ok) values ($1, $2, $3)`, [l.id, by, ok]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    console.error("[reveal audit]", e.message);
    // no audit, no secret
    return { status: 500, body: { error: "could not record the reveal; not shown" } };
  } finally {
    c.release();
  }
  console.log(`[reveal] login=${l.id} by=${by} ok=${ok}`);
  return ok ? { status: 200, body: { value } } : { status, body: { error } };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, { ok: true });
  if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
  try {
    // the only non-GET route: reveal one linked secret, audited
    const rv = url.pathname.match(/^\/v1\/clients\/([a-z0-9-]+)\/logins\/(\d+)\/reveal$/);
    if (rv && req.method === "POST") {
      const by = String(req.headers["x-portal-user"] || "").slice(0, 200);
      if (!by) return send(res, 400, { error: "x-portal-user required" });
      const r = await reveal(rv[1], Number(rv[2]), by);
      return send(res, r.status, r.body);
    }
    if (req.method !== "GET") return send(res, 405, { error: "read-only API" });
    if (url.pathname === "/v1/health") return send(res, 200, { ok: true, time: new Date().toISOString() });
    if (url.pathname === "/v1/overview") return send(res, 200, await overview());
    if (url.pathname === "/v1/clients") return send(res, 200, await clientList());
    const cm = url.pathname.match(/^\/v1\/clients\/([a-z0-9-]+)$/);
    if (cm) {
      const d = await clientDetail(cm[1]);
      return d ? send(res, 200, d) : send(res, 404, { error: "client not found" });
    }
    return send(res, 404, { error: "not found" });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, () => console.log(`vizion-portal-api listening on :${PORT}`));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(() => process.exit(0)));
