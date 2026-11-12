-- 2026-11-12: portal chat -> Claude Code. The site (owner session) posts through vizion-portal-api; the host runner
-- (vizion-infra/stack/telegram-claude/runner.py, same one as Telegram) runs Claude Code and writes the reply here.
-- AIDB. Run as the stack superuser: psql -d AIDB -f 008_portal_chat_2026-11-12.sql
create table if not exists portal_chat_queue (
  id          bigserial primary key,
  user_email  text not null,
  page        text,
  text        text not null check (length(text) between 1 and 8000),
  status      text not null default 'queued' check (status in ('queued','running','done','error')),
  session_id  text,
  reply       text,
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists ix_pcq_status on portal_chat_queue (status, id);
create index if not exists ix_pcq_user on portal_chat_queue (user_email, id desc);

-- runner heartbeat, so the site can say "PC runner offline" instead of waiting forever
create table if not exists portal_runner_heartbeat (
  name    text primary key,
  seen_at timestamptz not null default now()
);

-- portal_ro stays read-only by default; the API opens an explicit READ WRITE transaction for this one insert
grant select on portal_chat_queue, portal_runner_heartbeat to portal_ro;
grant insert (user_email, page, text) on portal_chat_queue to portal_ro;
grant usage on sequence portal_chat_queue_id_seq to portal_ro;

-- which brain answers: 'workspace' = n8n Platform Master (same agent as Telegram, n8n workflow "Portal Chat"),
-- 'claude' = Claude Code via the host runner
alter table portal_chat_queue add column if not exists agent text not null default 'workspace' check (agent in ('workspace','claude'));
grant insert (agent) on portal_chat_queue to portal_ro;
