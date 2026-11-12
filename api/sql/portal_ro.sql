-- Read-only Postgres role for vizion-portal-api.
-- Run as the stack superuser, passing the password from Infisical (never commit it):
--   psql -v pw=<password> -f portal_ro.sql   (url-safe value; psql quotes it via :'pw')
-- Idempotent: re-running resets the password and re-applies grants.
SELECT format('CREATE ROLE portal_ro LOGIN PASSWORD %L', :'pw')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_ro') \gexec
ALTER ROLE portal_ro WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'pw';
ALTER ROLE portal_ro SET default_transaction_read_only = on;
ALTER ROLE portal_ro SET statement_timeout = '5s';
ALTER ROLE portal_ro CONNECTION LIMIT 10;
ALTER ROLE portal_ro SET max_parallel_workers_per_gather = 0;  -- 2026-11-09: portal reads stay single-process (slow disk, crash-restarts)

\connect AIDB
GRANT CONNECT ON DATABASE "AIDB" TO portal_ro;
GRANT USAGE ON SCHEMA public TO portal_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO portal_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO portal_ro;

\connect n8n
GRANT CONNECT ON DATABASE n8n TO portal_ro;
GRANT USAGE ON SCHEMA public TO portal_ro;
-- n8n: workflow and execution metadata only, never credentials or settings
GRANT SELECT (id, name, active, "createdAt", "updatedAt") ON workflow_entity TO portal_ro;
GRANT SELECT (id, "workflowId", status, mode, finished, "startedAt", "stoppedAt", "deletedAt") ON execution_entity TO portal_ro;
GRANT SELECT (id, status, model, source, "totalTokens", cost, "createdAt") ON agent_execution TO portal_ro;  -- 2026-11-11: AI spend
-- "deletedAt" (2026-11-09): lets page queries match n8n's partial index on ("stoppedAt", status) WHERE "deletedAt" IS NULL
