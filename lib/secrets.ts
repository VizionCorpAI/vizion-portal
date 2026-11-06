import "server-only";

// Secrets: an env var wins (local dev); otherwise fetched from Infisical with the app's
// machine identity. On Hostinger the environment holds ONLY the INFISICAL_* identity.
const DOMAIN = process.env.INFISICAL_DOMAIN || "https://app.infisical.com";
const TTL_MS = 5 * 60 * 1000;

let token: { value: string; exp: number } | null = null;
const cache = new Map<string, { value: string; exp: number }>();

async function accessToken(): Promise<string> {
  if (token && token.exp > Date.now()) return token.value;
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Infisical identity not configured");
  const r = await fetch(`${DOMAIN}/api/v1/auth/universal-auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Infisical login failed (${r.status})`);
  const j = (await r.json()) as { accessToken: string; expiresIn: number };
  token = { value: j.accessToken, exp: Date.now() + Math.max(60, j.expiresIn - 60) * 1000 };
  return token.value;
}

export async function getSecret(name: string): Promise<string> {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;
  const hit = cache.get(name);
  if (hit && hit.exp > Date.now()) return hit.value;

  const qs = new URLSearchParams({
    workspaceId: process.env.INFISICAL_PROJECT_ID || "",
    environment: process.env.INFISICAL_ENV || "prod",
    secretPath: process.env.INFISICAL_SECRET_PATH || "/platform/portal",
  });
  const r = await fetch(`${DOMAIN}/api/v3/secrets/raw/${encodeURIComponent(name)}?${qs}`, {
    headers: { authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Secret ${name} unavailable (${r.status})`);
  const j = (await r.json()) as { secret: { secretValue: string } };
  cache.set(name, { value: j.secret.secretValue, exp: Date.now() + TTL_MS });
  return j.secret.secretValue;
}
