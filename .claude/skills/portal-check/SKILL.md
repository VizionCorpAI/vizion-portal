---
name: portal-check
description: VizionAI Portal health: live site on Hostinger, the portal API on the PC (via Caddy), the local container. Use for /portal-check.
---

# /portal-check
- Site: `curl -s -o /dev/null -w "%{http_code}" -m 20 https://vizionai.iamvisioncorp.org/login` (200 expected).
- API: container `vizion-portal-api` Up (`docker ps`), public route `portal-api.vizionai.iamvisioncorp.org` through Caddy
  (an unauthenticated request should be refused, not time out). Hairpin tests from the LAN through the AT&T gateway are unreliable.
- Secrets used: Infisical vizion-infrastructure `/platform/portal` (names only).
Report which part is down and the likely cause (site build on Hostinger vs API/Caddy on the PC).

## Rules (all VizionAI commands)
- Read-only unless this command says it changes something; any change needs the owner's explicit yes first.
- Never print, paste or log secret values; Infisical is the only secret store (key names are fine).
- Git Bash: `export MSYS_NO_PATHCONV=1` before docker commands with container paths.
- Report in plain words: answer first, then a short table, then the recommended next step.
