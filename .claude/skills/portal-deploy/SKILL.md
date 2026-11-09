---
name: portal-deploy
description: Deploy portal changes: commit, push to GitHub (VizionCorpAI/vizion-portal main) so Hostinger rebuilds, then verify. Publishes: asks first. Use for /portal-deploy.
---

# /portal-deploy
1. `cd C:/vizionai/WORKSPACES/vizion-portal && git status`; `npm run build` must pass locally (do not leave a dev server running;
   delete `.next` afterwards to save space).
2. Owner yes, then commit and `git push origin main` (never push secrets; check the diff for keys/tokens first).
3. Hostinger builds from the GitHub repo (Websites > vizionai.iamvisioncorp.org > Node.js). Poll the live site until the change shows.
4. API changes (`api/`) need the container rebuilt on the PC: /stack-restart portal-api.

## Rules (all VizionAI commands)
- Read-only unless this command says it changes something; any change needs the owner's explicit yes first.
- Never print, paste or log secret values; Infisical is the only secret store (key names are fine).
- Git Bash: `export MSYS_NO_PATHCONV=1` before docker commands with container paths.
- Report in plain words: answer first, then a short table, then the recommended next step.
