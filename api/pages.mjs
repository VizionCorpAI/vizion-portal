// Portal pages: each workspace's live data for its place in the site map
// (vizion-infra/learning/architecture/dashboard.md). Read-only, like the rest of the API.
//
// GET /v1/pages/<slug> -> { slug, generated_at, sections: Section[] }
// Section kinds (rendered generically by the site):
//   stats { title, items: [{ label, value, tone?, hint? }] }      tone: good | warn | bad | muted
//   table { title, note?, columns: [{ key, label, align? }], rows: [...], empty? }
//   bars  { title, note?, diverging?, unit?, points: [{ label, value }] }
//   note  { title, text, tone? }
// Every section runs on its own: a failing query becomes { kind: "note", tone: "bad" } for that
// section only, never a failed page.

const n = (v) => (v == null ? null : Number(v));
const money = (v) => (v == null ? null : Math.round(Number(v) * 100) / 100);

async function safe(title, fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(`[page:${title}]`, e.message);
    return { kind: "note", title, tone: "bad", text: `${title} unavailable` };
  }
}

const table = (title, columns, rows, extra = {}) => ({ kind: "table", title, columns, rows, ...extra });
const col = (key, label, align) => ({ key, label, ...(align ? { align } : {}) });

// Daily series with every day present (gaps = 0), oldest first.
function daily(rows, days, tz) {
  const out = [];
  const byDay = new Map(rows.map((r) => [String(r.day).slice(0, 10), Number(r.v)]));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  for (let i = days - 1; i >= 0; i--) {
    const d = fmt.format(new Date(Date.now() - i * 864e5));
    out.push({ label: d, value: byDay.get(d) ?? 0 });
  }
  return out;
}

// ------------------------------------------------------------------ dashboards
async function dashboards({ aidb, n8ndb, tz }) {
  return Promise.all([
    safe("Trading P/L per day (30 days)", async () => {
      const { rows } = await aidb.query(
        `select (closed_at at time zone 'UTC' at time zone $1)::date::text as day, sum(pnl) v
           from trade_executions where pnl is not null and closed_at > now() - interval '30 days' group by 1`, [tz]);
      return { kind: "bars", title: "Trading P/L per day (30 days)", diverging: true, unit: "",
        note: "Closed trades on the Deriv demo account, by close day.", points: daily(rows, 30, tz).map((p) => ({ ...p, value: money(p.value) })) };
    }),
    safe("Setup performance (30 days)", async () => {
      const { rows } = await aidb.query(
        `select split_part(coalesce(nullif(raw_response->>'setup',''),'auto'), ' | ', 2) <> '' as re,
                coalesce(nullif(split_part(raw_response->>'setup', ' | ', 2), ''), coalesce(nullif(raw_response->>'setup',''),'auto')) as setup,
                count(*) trades, round(100.0 * avg((pnl > 0)::int), 0) win_pct, round(sum(pnl), 2) net
           from trade_executions where pnl is not null and pnl <> 0 and closed_at > now() - interval '30 days'
          group by 1, 2 order by net`);
      return table("Setup performance (30 days)",
        [col("setup", "Setup"), col("kind", "Entry"), col("trades", "Trades", "right"), col("win_pct", "Win %", "right"), col("net", "Net", "right")],
        rows.map((r) => ({ setup: r.setup, kind: r.re ? "re-entry" : "first", trades: n(r.trades), win_pct: n(r.win_pct), net: money(r.net) })),
        { note: "Setups are upgraded from this record, never removed (EA v7.20)." });
    }),
    safe("AI gate decisions (7 days)", async () => {
      const { rows } = await aidb.query(
        `select decision, count(*) c, count(*) filter (where reason ilike 'probation%') prob
           from ai_gate_decision where ts > now() - interval '7 days' group by 1`);
      const get = (d) => n(rows.find((r) => r.decision === d)?.c) ?? 0;
      return { kind: "stats", title: "AI gate decisions (7 days)", items: [
        { label: "YES", value: get("YES"), tone: "good" }, { label: "MAYBE", value: get("MAYBE"), tone: "warn" },
        { label: "NO", value: get("NO"), tone: "bad" },
        { label: "On probation", value: rows.reduce((a, r) => a + Number(r.prob), 0), hint: "losing record: traded at x0.25" }] };
    }),
    safe("Workflow runs per day (14 days)", async () => {
      const { rows } = await n8ndb.query(
        `select ("stoppedAt" at time zone $1)::date::text as day, count(*) v from execution_entity
          where "stoppedAt" > now() - interval '14 days' and "stoppedAt" is not null and "deletedAt" is null group by 1`, [tz]);
      return { kind: "bars", title: "Workflow runs per day (14 days)", note: "n8n keeps only a few days of run history, so older days are empty.", points: daily(rows, 14, tz) };
    }),
    safe("Failed workflow runs per day (14 days)", async () => {
      const { rows } = await n8ndb.query(
        `select ("stoppedAt" at time zone $1)::date::text as day, count(*) v from execution_entity
          where "stoppedAt" > now() - interval '14 days' and "stoppedAt" is not null and "deletedAt" is null and status in ('error','crashed') group by 1`, [tz]);
      return { kind: "bars", title: "Failed workflow runs per day (14 days)", note: "n8n keeps only a few days of run history, so older days are empty.", points: daily(rows, 14, tz) };
    }),
    safe("Error alerts per day (14 days)", async () => {
      const { rows } = await aidb.query(
        `select (created_at at time zone $1)::date::text as day, count(*) v from alert_event
          where created_at > now() - interval '14 days' and severity in ('error','critical') group by 1`, [tz]);
      return { kind: "bars", title: "Error alerts per day (14 days)", points: daily(rows, 14, tz) };
    }),
    safe("Leads by source", async () => {
      const { rows } = await aidb.query(
        `select coalesce(client_key,'-') client, coalesce(lead_source,'-') source, count(*) c, max(created_at) last
           from social_leads group by 1, 2 order by 3 desc`);
      return table("Leads by source", [col("client", "Client"), col("source", "Source"), col("c", "Leads", "right"), col("last", "Latest")],
        rows.map((r) => ({ ...r, c: n(r.c) })));
    }),
    safe("Neural net models", async () => {
      const { rows } = await aidb.query(
        `select version, status, model_kind, n_rows, created_at from nn_model_version order by created_at desc limit 6`);
      return table("Neural net models", [col("version", "Version"), col("status", "Status"), col("model_kind", "Kind"), col("n_rows", "Rows", "right"), col("created_at", "Trained")],
        rows.map((r) => ({ ...r, n_rows: n(r.n_rows) })));
    }),
    safe("Opportunities found", async () => {
      const { rows } = await aidb.query(`select kind, status, count(*) c from research_opportunity group by 1, 2 order by 1, 3 desc`);
      return table("Opportunities found", [col("kind", "Kind"), col("status", "Status"), col("c", "Count", "right")], rows.map((r) => ({ ...r, c: n(r.c) })));
    }),
  ]);
}

// ------------------------------------------------------------------ finances
async function finances({ aidb }) {
  return Promise.all([
    safe("Trading", async () => {
      const { rows: [r] } = await aidb.query(
        `select sum(pnl) filter (where closed_at >= date_trunc('day', now())) today,
                sum(pnl) filter (where closed_at > now() - interval '7 days') d7,
                sum(pnl) filter (where closed_at > now() - interval '30 days') d30,
                count(*) filter (where pnl is null and closed_at is null) open,
                max(coalesce(closed_at, opened_at)) last_at
           from trade_executions`);
      const tone = (v) => (v == null ? "muted" : v >= 0 ? "good" : "bad");
      return { kind: "stats", title: "Trading (Deriv demo)", items: [
        { label: "Today", value: money(r.today) ?? 0, tone: tone(n(r.today)) },
        { label: "7 days", value: money(r.d7) ?? 0, tone: tone(n(r.d7)) },
        { label: "30 days", value: money(r.d30) ?? 0, tone: tone(n(r.d30)) },
        { label: "Open trades", value: n(r.open) ?? 0, hint: r.last_at ? `last activity ${new Date(r.last_at).toISOString().slice(0, 16).replace("T", " ")} UTC` : "" }] };
    }),
    safe("Setups on probation", async () => {
      const { rows } = await aidb.query(`select symbol, dir, setup, n, win_pct, net from v_trade_autoblock order by net`);
      return table("Setups on probation", [col("symbol", "Symbol"), col("dir", "Side"), col("setup", "Setup"), col("n", "Trades", "right"), col("win_pct", "Win %", "right"), col("net", "Net", "right")],
        rows.map((r) => ({ ...r, setup: r.setup === "*" ? "all setups" : r.setup, n: n(r.n), win_pct: n(r.win_pct), net: money(r.net) })),
        { note: "Losing 30-day record: the gateway still lets the AI decide, at x0.25 size.", empty: "No setup is on probation." });
    }),
    safe("Manual trade policy", async () => {
      const { rows } = await aidb.query(`select symbol, dir, setup, action, reason, until from learn_trade_policy where until is null or until > now() order by created_at desc`);
      return table("Manual trade policy", [col("symbol", "Symbol"), col("dir", "Side"), col("setup", "Setup"), col("action", "Action"), col("reason", "Reason"), col("until", "Until")],
        rows, { empty: "No manual allow or block rules." });
    }),
    safe("AI model prices", async () => {
      const { rows } = await aidb.query(`select display_name, tier, cost_per_input_mtok, cost_per_output_mtok from model_cost_rules where is_active order by cost_per_output_mtok desc`);
      return table("AI model prices (per million tokens)", [col("display_name", "Model"), col("tier", "Tier"), col("cost_per_input_mtok", "Input $", "right"), col("cost_per_output_mtok", "Output $", "right")],
        rows.map((r) => ({ ...r, cost_per_input_mtok: n(r.cost_per_input_mtok), cost_per_output_mtok: n(r.cost_per_output_mtok) })),
        { note: "Usage is not logged yet (model_usage_log is empty), so spend can't be shown." });
    }),
    { kind: "note", title: "Revenue, costs and payments", tone: "warn",
      text: "Not tracked anywhere yet (open decision in the site map: new AIDB tables edited in the portal)." },
  ]);
}

// ------------------------------------------------------------------ input / output
async function io({ aidb }) {
  return Promise.all([
    safe("Pipeline", async () => {
      const { rows: [r] } = await aidb.query(
        `select (select count(*) from io_item where status = 'new' and item_type <> 'email') inbox,
                (select count(*) from io_item where item_type = 'email' and created_at > now() - interval '7 days') emails_7d,
                (select count(*) from io_review where review_state not in ('approved','rejected')) reviews,
                (select count(*) from io_artifact) drafts,
                (select count(*) from io_submission) submissions`);
      return { kind: "stats", title: "Pipeline", items: [
        { label: "Inbox", value: n(r.inbox) }, { label: "Emails (7 days)", value: n(r.emails_7d) },
        { label: "Open reviews", value: n(r.reviews), tone: n(r.reviews) ? "warn" : "muted" },
        { label: "Drafts", value: n(r.drafts) }, { label: "Submissions", value: n(r.submissions) }] };
    }),
    safe("Lanes", async () => {
      const { rows } = await aidb.query(
        `select l.lane, l.enabled, l.daily_submit_cap, coalesce(t.sent_today, 0) sent_today, l.notes
           from io_lane_control l left join io_lane_submissions_today t on t.lane = l.lane order by l.lane = '*' desc, l.lane`);
      return table("Lanes (kill switch and daily caps)", [col("lane", "Lane"), col("enabled", "On"), col("sent_today", "Sent today", "right"), col("daily_submit_cap", "Cap", "right"), col("notes", "")],
        rows.map((r) => ({ ...r, lane: r.lane === "*" ? "all (global switch)" : r.lane, enabled: r.enabled ? "yes" : "no", sent_today: n(r.sent_today) })));
    }),
    safe("Applicants", async () => {
      const { rows } = await aidb.query(`select display_name, kind, relationship, active, drive_home, drive_folder_id is not null drive from io_applicant order by active desc, display_name`);
      return table("Applicants", [col("display_name", "Name"), col("kind", "Kind"), col("relationship", "Relationship"), col("active", "Active"), col("drive", "Drive folders")],
        rows.map((r) => ({ ...r, active: r.active ? "yes" : "no", drive: r.drive ? "ready" : "created when needed" })));
    }),
    safe("Mailboxes", async () => {
      const { rows } = await aidb.query(
        `select m.client_slug, c.name, m.enabled, m.last_ok_at, m.last_error, m.captured_total, m.calendar_ok_at, m.calendar_error, m.store_events
           from io_mailbox m left join portal_client c on c.slug = m.client_slug order by 1`);
      return table("Client mailboxes and calendars", [col("name", "Client"), col("mail", "Mail"), col("captured_total", "Captured", "right"), col("calendar", "Calendar"), col("store", "Events stored")],
        rows.map((r) => ({ name: r.name || r.client_slug, mail: !r.enabled ? "off" : r.last_error ? `error: ${r.last_error}` : r.last_ok_at ? "ok" : "not checked",
          captured_total: n(r.captured_total), calendar: r.calendar_error ? `error: ${r.calendar_error}` : r.calendar_ok_at ? "ok" : "not checked",
          store: r.store_events ? "yes (Personal page)" : "campaigns only" })),
        { note: "Add a client: Infisical accounts keys + calendar share, then a row in io_mailbox." });
    }),
    safe("Inbox", async () => {
      const { rows } = await aidb.query(
        `select i.created_at, i.item_type, i.status, left(i.summary, 90) summary, array_to_string(i.tags, ', ') tags
           from io_item i order by i.created_at desc limit 25`);
      return table("Latest items", [col("created_at", "When"), col("item_type", "Type"), col("status", "Status"), col("summary", "Summary"), col("tags", "Tags")], rows);
    }),
    safe("Reviews", async () => {
      const { rows } = await aidb.query(`select r.created_at, r.reviewer, r.review_state, left(i.summary, 80) item from io_review r left join io_item i on i.id = r.item_id order by r.created_at desc limit 20`);
      return table("Reviews", [col("created_at", "When"), col("reviewer", "Reviewer"), col("review_state", "State"), col("item", "Item")], rows, { empty: "No reviews." });
    }),
    safe("Submissions", async () => {
      const { rows } = await aidb.query(`select submitted_at, submission_kind, destination, submission_state, left(result_text, 80) result from io_submission order by coalesce(submitted_at, created_at) desc limit 20`);
      return table("Submissions", [col("submitted_at", "When"), col("submission_kind", "Kind"), col("destination", "Where"), col("submission_state", "State"), col("result", "Result")], rows, { empty: "Nothing submitted yet." });
    }),
    safe("Actions log", async () => {
      const { rows } = await aidb.query(`select created_at, action_type, target_workspace, action_status, left(notes, 80) notes from io_action order by created_at desc limit 20`);
      return table("Actions log", [col("created_at", "When"), col("action_type", "Action"), col("target_workspace", "Workspace"), col("action_status", "Status"), col("notes", "Notes")], rows, { empty: "No actions yet." });
    }),
  ]);
}

// ------------------------------------------------------------------ opportunities
async function opportunities({ aidb }) {
  return Promise.all([
    safe("Found so far", async () => {
      const { rows } = await aidb.query(
        `select kind, count(*) c, count(*) filter (where closes_at >= now()) open, count(*) filter (where first_seen_at > now() - interval '7 days') new7
           from research_opportunity group by 1 order by 2 desc`);
      return { kind: "stats", title: "Found so far", items: rows.map((r) => ({ label: r.kind, value: n(r.c), hint: `${n(r.open)} still open · ${n(r.new7)} new this week` })) };
    }),
    safe("Closing soon", async () => {
      const { rows } = await aidb.query(
        `select closes_at::date closes, kind, left(title, 90) title, left(organization, 40) organization, status, url
           from research_opportunity where closes_at >= now() order by closes_at limit 30`);
      return table("Closing soon", [col("closes", "Closes"), col("kind", "Kind"), col("title", "Title"), col("organization", "Organization"), col("status", "Status"), col("url", "Link")], rows,
        { note: "Apply hands an opportunity to Input / Output (IO lanes).", empty: "Nothing open with a deadline." });
    }),
    safe("Newest", async () => {
      const { rows } = await aidb.query(
        `select first_seen_at, kind, left(title, 90) title, left(organization, 40) organization, url from research_opportunity order by first_seen_at desc limit 20`);
      return table("Newest finds", [col("first_seen_at", "Found"), col("kind", "Kind"), col("title", "Title"), col("organization", "Organization"), col("url", "Link")], rows);
    }),
    safe("Leads", async () => {
      const { rows } = await aidb.query(`select created_at, organization_name, contact_name, lead_type, lead_stage, fit_score from io_business_lead order by created_at desc limit 20`);
      return table("Business leads", [col("created_at", "When"), col("organization_name", "Organization"), col("contact_name", "Contact"), col("lead_type", "Type"), col("lead_stage", "Stage"), col("fit_score", "Fit", "right")],
        rows.map((r) => ({ ...r, fit_score: n(r.fit_score) })), { empty: "No buyer or prime leads yet." });
    }),
    safe("Sources", async () => {
      const { rows } = await aidb.query(`select name, source_type, access_mode, capture_method, status, homepage_url from io_opportunity_source order by status, name`);
      return table("Sources", [col("name", "Source"), col("source_type", "Type"), col("access_mode", "Access"), col("capture_method", "Capture"), col("status", "Status"), col("homepage_url", "Link")], rows);
    }),
  ]);
}

// ------------------------------------------------------------------ operations
async function ops({ aidb, n8ndb, services }) {
  return Promise.all([
    safe("Services", async () => {
      const s = await services();
      return { kind: "stats", title: "Services", items: s.checks.map((c) => ({ label: c.name, value: c.ok ? "up" : "down", tone: c.ok ? "good" : "bad", hint: `${c.ms} ms` })) };
    }),
    safe("Workflows", async () => {
      const { rows } = await n8ndb.query(
        `select w.name, w.active,
                count(e.id) runs,
                count(e.id) filter (where e.status in ('error','crashed')) failed,
                max(e."startedAt") last_run,
                max(e."startedAt") filter (where e.status in ('error','crashed')) last_failure
           from workflow_entity w left join execution_entity e on e."workflowId" = w.id and e."stoppedAt" > now() - interval '24 hours' and e."stoppedAt" is not null and e."deletedAt" is null
          where w.active group by w.id, w.name, w.active order by failed desc, runs desc`);
      return table("Active workflows (24 h)", [col("name", "Workflow"), col("runs", "Runs", "right"), col("failed", "Failed", "right"), col("last_run", "Last run"), col("last_failure", "Last failure")],
        rows.map((r) => ({ name: r.name, runs: n(r.runs), failed: n(r.failed), last_run: r.last_run, last_failure: r.last_failure })));
    }),
    safe("Queues", async () => {
      const { rows } = await aidb.query(
        `select 'Scheduled jobs' q, status, count(*) c from sched_job where status in ('queued','running','failed') group by 2
         union all select 'Platform tasks', status, count(*) from platform_task group by 2
         union all select 'Maintenance actions', status, count(*) from maint_action group by 2 order by 1, 3 desc`);
      return table("Queues", [col("q", "Queue"), col("status", "Status"), col("c", "Count", "right")], rows.map((r) => ({ ...r, c: n(r.c) })),
        { note: "Many 'running' jobs or 'dispatched' tasks usually means a worker stopped picking them up." });
    }),
    safe("Alerts", async () => {
      const { rows } = await aidb.query(
        `select severity, count(*) c from alert_event where created_at > now() - interval '24 hours' group by 1 order by 2 desc`);
      const { rows: recent } = await aidb.query(
        `select created_at, severity, workspace_key, source, left(title, 60) title, left(body, 90) body from alert_event
          where severity in ('error','critical') order by created_at desc limit 15`);
      return [{ kind: "stats", title: "Alerts (24 h)", items: rows.map((r) => ({ label: r.severity, value: n(r.c), tone: ["error", "critical"].includes(r.severity) ? "bad" : r.severity === "warn" ? "warn" : "muted" })) },
        table("Latest error alerts", [col("created_at", "When"), col("severity", "Severity"), col("workspace_key", "Workspace"), col("source", "Source"), col("title", "Title"), col("body", "Detail")], recent)];
    }),
    safe("Maintenance", async () => {
      const { rows } = await aidb.query(
        `select a.action_type, count(*) runs, count(*) filter (where not r.ok) failed, max(r.finished_at) last
           from maint_action_run r join maint_action a on a.id = r.action_id where r.started_at > now() - interval '7 days'
          group by 1 order by 3 desc, 2 desc`);
      return table("Self-heal actions (7 days)", [col("action_type", "Action"), col("runs", "Runs", "right"), col("failed", "Failed", "right"), col("last", "Last")],
        rows.map((r) => ({ ...r, runs: n(r.runs), failed: n(r.failed) })), { empty: "No maintenance actions ran this week." });
    }),
    safe("Agents", async () => {
      const { rows } = await aidb.query(
        `select name, workspace, role, model, status from agent_registry
         union all select name, 'n8n', purpose, null, status from n8n_agents order by 2, 1`);
      return table("Agents", [col("name", "Agent"), col("workspace", "Workspace"), col("role", "Role"), col("model", "Model"), col("status", "Status")], rows);
    }),
    safe("Security", async () => {
      const { rows } = await aidb.query(
        `select severity, category, count(*) c, max(created_at) last from sec_incident where status = 'open' group by 1, 2 order by 3 desc limit 12`);
      return table("Open security incidents", [col("severity", "Severity"), col("category", "Category"), col("c", "Open", "right"), col("last", "Latest")],
        rows.map((r) => ({ ...r, c: n(r.c) })), { empty: "No open incidents." });
    }),
    safe("Workspaces", async () => {
      const { rows } = await aidb.query(`select workspace_key, branch, dirty, last_commit, created_at from analytics_workspaces_latest_v order by dirty desc, workspace_key`);
      return table("Workspaces (git)", [col("workspace_key", "Workspace"), col("branch", "Branch"), col("dirty", "Uncommitted"), col("last_commit", "Last commit"), col("created_at", "Checked")],
        rows.map((r) => ({ ...r, dirty: Number(r.dirty) ? "yes" : "no" })));
    }),
  ]).then((s) => s.flat());
}

// ------------------------------------------------------------------ personal
async function personal({ aidb, tz }) {
  return Promise.all([
    safe("Calendar", async () => {
      const { rows } = await aidb.query(
        `select starts_at, ends_at, title, location, 'all_day' = any(tags) all_day from personal_calendar_event
          where status = 'confirmed' and coalesce(ends_at, starts_at) >= now() order by starts_at limit 40`);
      const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const fd = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
      return table("Calendar (next 14 days)", [col("when", "When"), col("title", "Event"), col("location", "Where")],
        rows.map((r) => ({ when: r.all_day ? `${fd.format(r.starts_at)} · all day` : f.format(r.starts_at), title: r.title, location: r.location })),
        { note: "Synced hourly from Sahr John II's Google Calendar (Calendar Campaign Sync).", empty: "Nothing on the calendar." });
    }),
    safe("Tasks & Reminders", async () => {
      const { rows } = await aidb.query(
        `select due_at, title, priority, status from personal_task where status not in ('done','cancelled') order by due_at nulls last limit 30`);
      return table("Tasks & reminders", [col("due_at", "Due"), col("title", "Task"), col("priority", "Priority"), col("status", "Status")], rows, { empty: "No open tasks." });
    }),
    safe("Notes", async () => {
      const { rows } = await aidb.query(`select created_at, left(title, 80) title from personal_note order by created_at desc limit 15`);
      return table("Notes", [col("created_at", "When"), col("title", "Note")], rows, { empty: "No notes yet." });
    }),
    safe("Social drafts", async () => {
      const { rows } = await aidb.query(`select created_at, platform, post_state status, left(coalesce(title, body_md), 80) text from personal_social_post order by created_at desc limit 15`);
      return table("Social drafts", [col("created_at", "When"), col("platform", "Platform"), col("status", "Status"), col("text", "Post")], rows, { empty: "No social drafts yet." });
    }),
  ]);
}

// ------------------------------------------------------------------ settings
// Integration health = how the workflows that use each integration did in the last 24 h (by name).
const INTEGRATIONS = [
  { name: "Google (Gmail, Calendar, Forms, Drive)", match: ["gmail", "google", "calendar", "drive"] },
  { name: "Meta (Facebook, Instagram)", match: ["facebook", "instagram", "comment", "dm monitor", "multi-platform"] },
  { name: "Threads", match: ["threads"] },
  { name: "HubSpot", match: ["hubspot", "lead to deal", "lead capture", "client sync"] },
  { name: "Telegram", match: ["telegram", "briefing", "watchlist", "cost report", "nn_daily"] },
  { name: "MT5 / EA gateway", match: ["ea ai gateway", "trade", "nn_"] },
];
async function settings({ aidb, n8ndb }) {
  return Promise.all([
    safe("Integrations", async () => {
      const { rows } = await n8ndb.query(
        `select lower(w.name) name, count(e.id) runs, count(e.id) filter (where e.status in ('error','crashed')) failed
           from workflow_entity w left join execution_entity e on e."workflowId" = w.id and e."stoppedAt" > now() - interval '24 hours' and e."stoppedAt" is not null and e."deletedAt" is null
          where w.active group by w.id, w.name`);
      return table("Integrations (from the workflows that use them, 24 h)",
        [col("name", "Integration"), col("workflows", "Workflows", "right"), col("runs", "Runs", "right"), col("failed", "Failed", "right"), col("status", "Status")],
        INTEGRATIONS.map((i) => {
          const ws = rows.filter((r) => i.match.some((m) => r.name.includes(m)));
          const runs = ws.reduce((a, r) => a + Number(r.runs), 0), failed = ws.reduce((a, r) => a + Number(r.failed), 0);
          return { name: i.name, workflows: ws.length, runs, failed,
            status: !ws.length ? "no workflows" : !runs ? "idle" : failed === 0 ? "ok" : failed >= runs ? "failing" : "partly failing" };
        }), { note: "Airtable is retired (2026-11-09). Secret values are never shown here." });
    }),
    safe("Mail & calendars", async () => {
      const { rows: [r] } = await aidb.query(
        `select count(*) total, count(*) filter (where last_error is null and last_ok_at is not null) mail_ok,
                count(*) filter (where calendar_error is null and calendar_ok_at is not null) cal_ok from io_mailbox where enabled`);
      return { kind: "stats", title: "Client mailboxes", items: [
        { label: "Mailboxes", value: n(r.total) }, { label: "Mail ok", value: n(r.mail_ok), tone: n(r.mail_ok) === n(r.total) ? "good" : "warn" },
        { label: "Calendars ok", value: n(r.cal_ok), tone: n(r.cal_ok) === n(r.total) ? "good" : "warn" }] };
    }),
    { kind: "note", title: "Users & access", text: "Owner login only (portal v0.1). Team roles come with the write actions." },
    { kind: "note", title: "About", text: "Portal API v0.2 (pages for every workspace) · EA v7.20 on the Deriv demo account · data read live from the PC through the Portal API." },
  ]);
}

export const PAGES = { dashboards, finances, io, opportunities, ops, personal, settings };
