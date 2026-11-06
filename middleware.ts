import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Cheap gate only: no cookie -> login. The real check (signature, expiry) runs in the
// (portal) layout on the Node runtime, where secrets are available.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  const h = new Headers(req.headers);
  h.set("x-pathname", pathname + search);
  return NextResponse.next({ request: { headers: h } });
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
