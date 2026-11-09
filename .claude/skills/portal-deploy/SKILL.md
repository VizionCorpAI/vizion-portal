---
name: portal-deploy
description: Deploy portal changes: commit on main, scripts/auto_deploy.sh (secret scan, push, API rebuild, Telegram), then check GitHub Actions. Use for /portal-deploy.
---

# /portal-deploy
1. `cd C:/vizionai/WORKSPACES/vizion-portal && git status`; commit the change on `main`. Do NOT build locally (no `npm install`,
   no `.next`; disk is tight): GitHub Actions `ci` (typecheck + build + API image) and `secret-scan` test every push.
2. `bash scripts/auto_deploy.sh` (automatic gates, no approval step): infisical secret scan of unpushed commits -> push ->
   API container rebuilt if `api/` changed (`--api` forces) -> AIDB `platform_release` -> Telegram message to the owner.
3. `gh run list -R VizionCorpAI/vizion-portal -L 2` until both are green; Hostinger rebuilds the site from `main`.
   A red `ci` run: fix and push again.

## Rules (all VizionAI commands)
- Read-only unless this command says it changes something; any change needs the owner's explicit yes first.
- Never print, paste or log secret values; Infisical is the only secret store (key names are fine).
- Git Bash: `export MSYS_NO_PATHCONV=1` before docker commands with container paths.
- Report in plain words: answer first, then a short table, then the recommended next step.
