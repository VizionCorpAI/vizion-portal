-- Indexes for the portal's workspace pages (2026-11-09). Run as the stack superuser on AIDB.
-- Error/critical alerts per day over 14 days scanned the whole alert_event table (300k rows).
create index if not exists alert_event_errors_created_idx
  on alert_event (created_at desc) where severity in ('error', 'critical');
