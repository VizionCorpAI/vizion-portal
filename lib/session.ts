import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSecret } from "./secrets";

import { SESSION_COOKIE } from "./session-cookie";
export { SESSION_COOKIE };
const MAX_AGE_S = 7 * 24 * 3600;

export type Session = { email: string; role: "owner" | "team" };

const key = async () => new TextEncoder().encode(await getSecret("PORTAL_SESSION_SECRET"));

export async function createSession(s: Session) {
  const jwt = await new SignJWT({ role: s.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.email)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(await key());
  (await cookies()).set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function getSession(): Promise<Session | null> {
  const jwt = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, await key(), { algorithms: ["HS256"] });
    return { email: String(payload.sub), role: payload.role === "owner" ? "owner" : "team" };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
