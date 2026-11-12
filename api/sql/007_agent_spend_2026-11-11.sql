-- 2026-11-11: AI spend on the Finances page (replaces the retired n8n "Daily Cost Report").
-- n8n database. Cost metadata only: never userMessage, timeline, error or attachments.
-- Run as the stack superuser: psql -d n8n -f 007_agent_spend_2026-11-11.sql
GRANT SELECT (id, status, model, source, "totalTokens", cost, "createdAt") ON agent_execution TO portal_ro;
