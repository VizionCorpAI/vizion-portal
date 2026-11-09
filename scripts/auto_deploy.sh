#!/usr/bin/env bash
# auto_deploy.sh : publish the portal. Run by hand, or after every commit once the owner installs the hook
# (see README "Auto deploy"). The gates are automatic, no approval step:
#   1. secret scan of every commit not yet on GitHub (infisical scan, redacted) -> a hit blocks the push
#   2. git push origin main -> Hostinger rebuilds the site from GitHub
#   3. api/ changed (or --api) -> rebuild + recreate the vizion-portal-api container (Infisical-injected, vizion-up)
#   4. record the release in AIDB platform_release and tell the owner on Telegram
set -uo pipefail

cd "$(dirname "$0")/.."
REPO="$PWD"; STACK="$REPO/../vizion-infra/stack"
tg() { bash "$REPO/scripts/notify_telegram.sh" "$1" >/dev/null 2>&1 || echo "telegram send failed"; }
echo "== $(date '+%F %T') portal deploy"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "not on main: skip"; exit 0; }
git fetch -q origin main || { tg "Portal deploy: could not reach GitHub, nothing pushed."; exit 1; }
range="origin/main..HEAD"
force_api="${1:-}"
if [ -z "$(git rev-list $range)" ] && [ "$force_api" != "--api" ]; then echo "nothing to push"; exit 0; fi
api_changed=""
if [ -n "$(git rev-list $range)" ]; then
  if ! command -v infisical >/dev/null 2>&1; then
    tg "Portal deploy BLOCKED: infisical CLI missing, so the secret scan could not run. Nothing was pushed."; exit 1
  fi
  if ! infisical scan --log-opts="$range" --redact --silent --telemetry=false; then
    tg "Portal deploy BLOCKED: the secret scan flagged a commit not yet on GitHub. Nothing was pushed."; exit 1
  fi
  api_changed=$(git diff --name-only $range -- api | head -1)
  subjects=$(git log --format='- %s' $range | head -8)
  git push -q origin main || { tg "Portal deploy: git push failed."; exit 1; }
else
  subjects="- (API rebuild only)"
fi
api_msg=""
if [ -n "$api_changed" ] || [ "$force_api" = "--api" ]; then
  if (cd "$STACK" && powershell -NoProfile -File infisical/vizion-up.ps1 up -d --build portal-api); then api_msg=" API container rebuilt."
  else api_msg=" API container rebuild FAILED."; fi
fi
sha=$(git rev-parse --short HEAD); ver=$(node -p "require('./package.json').version")
MSYS_NO_PATHCONV=1 docker exec -i vizion-postgres psql -q -U VizionAI -d AIDB -v ON_ERROR_STOP=1 >/dev/null <<SQL || echo "release record failed"
insert into platform_release (component, version, commit, note, released_at)
values ('portal', '$ver', '$sha', 'GitHub main; Hostinger rebuilds the site', now())
on conflict (component) do update set version = excluded.version, commit = excluded.commit, note = excluded.note, released_at = now();
SQL
tg "Portal updated ($sha): on GitHub, Hostinger is rebuilding the site.$api_msg
$subjects"
echo "done $sha$api_msg"
