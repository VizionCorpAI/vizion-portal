"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSecret } from "@/lib/secrets";
import { createSession, destroySession } from "@/lib/session";

// Simple in-memory throttle: 8 attempts per IP per 15 minutes.
const attempts = new Map<string, { n: number; reset: number }>();
function throttled(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.reset < now) {
    attempts.set(ip, { n: 1, reset: now + 15 * 60 * 1000 });
    return false;
  }
  a.n += 1;
  return a.n > 8;
}

const same = (a: string, b: string) => {
  const da = crypto.createHash("sha256").update(a).digest();
  const db = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(da, db);
};

export type LoginState = { error?: string };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (throttled(ip)) return { error: "Too many attempts. Try again in 15 minutes." };

  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  let ownerEmail: string, ownerPassword: string;
  try {
    [ownerEmail, ownerPassword] = await Promise.all([
      getSecret("PORTAL_OWNER_EMAIL"),
      getSecret("PORTAL_OWNER_PASSWORD"),
    ]);
  } catch {
    return { error: "Login is not configured yet (secrets unavailable)." };
  }

  const emailOk = same(email, ownerEmail.trim().toLowerCase());
  const passOk = same(password, ownerPassword);
  if (!(emailOk && passOk)) return { error: "Wrong email or password." };

  await createSession({ email, role: "owner" });
  const next = String(form.get("next") || "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
