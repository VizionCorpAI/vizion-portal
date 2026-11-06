# vizion-portal

The **VizionAI Portal** is the private site for running VizionAI, at `https://vizionai.iamvisioncorp.org`.
Only the owner and team can log in. The site map is in `vizion-infra/learning/architecture/dashboard.md`.

```
Browser ──> Hostinger (Next.js site, this repo root) ──HTTPS + portal key──> Caddy on the PC
                                                                              └─> vizion-portal-api (api/)
                                                                                   ├─ Postgres AIDB + n8n (role portal_ro, read-only)
                                                                                   └─ n8n / nn / mt5-rest / uptime-kuma health
```

| Part | Where it runs | Code |
|---|---|---|
| Site | Hostinger Node.js app, deployed from this GitHub repo | `app/`, `components/`, `lib/` |
| Portal API | Docker container `vizion-portal-api` on the PC, at `portal-api.vizionai.iamvisioncorp.org` | `api/` |

## Status (v0.1, 2026-11-05)
- Login (owner, signed session cookie, throttled), a sidebar with all 9 pages, and a chat side panel (stub).
- **Overview** shows live data: services, trading today, failed n8n runs, alerts, the approval queue, the 24 h activity feed and the client strip.
- The other 8 pages are placeholders that list their planned sections.
- The API is read-only. Actions (approve, re-run, pause EA) are not enabled yet.

## Secrets
They live in Infisical: `vizion-infrastructure` › `prod` › `/platform/portal`. Nothing is committed.

| Key | Used by |
|---|---|
| `PORTAL_API_KEY` | site and API (Bearer token on every request) |
| `PORTAL_DB_PASSWORD` | API (Postgres role `portal_ro`) |
| `PORTAL_SESSION_SECRET` | site (signs session cookies) |
| `PORTAL_OWNER_EMAIL`, `PORTAL_OWNER_PASSWORD` | site login |

The site reads these at runtime through a machine identity. On Hostinger, set **only** these environment variables:
`INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`, `PORTAL_API_URL` (see `.env.example`).
Create a dedicated Infisical machine identity (for example `portal-site`) with read access to `/platform/portal` only.

## Go-live
1. **API on the PC** (run once with your `infisical login` session): `scripts\Setup-PortalApi.ps1 -GoLive`.
   It creates any missing secrets, sets up `portal_ro`, registers `/platform/portal` in `stack.paths.json`,
   starts the container and switches Caddy from 503 to `reverse_proxy`.
2. **Site on Hostinger:** go to Websites › vizionai.iamvisioncorp.org › Node.js › connect GitHub repo `VizionCorpAI/vizion-portal`,
   branch `main`. Use build command `npm run build` and start command `npm start`, with Node 20 or newer. Then set the env vars above.
3. Check from outside the LAN, because hairpin tests through the AT&T gateway are unreliable.

## Local dev
```
npm install
# set PORTAL_API_URL, PORTAL_API_KEY, PORTAL_SESSION_SECRET, PORTAL_OWNER_EMAIL, PORTAL_OWNER_PASSWORD in your shell
npm run dev        # http://localhost:3100
```
