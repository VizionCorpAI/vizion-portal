-- What is live, written by the release scripts themselves (2026-11-09), so the portal never shows a stale version.
--   ea      vizion-trading/scripts/sync_ea.sh  (version from profitgtx.mq5 #property version, build-NNNN tag)
--   portal  vizion-portal/scripts/auto_deploy.sh (after a push to GitHub; Hostinger rebuilds from main)
create table if not exists platform_release (
  component   text primary key,
  version     text,
  build       text,
  commit      text,
  note        text,
  released_at timestamptz not null default now()
);
grant select on platform_release to portal_ro;
