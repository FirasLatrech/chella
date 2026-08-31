import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/*
 * Auth guard, layer 1 (edge): bounce requests without a session cookie
 * before anything renders. This only checks cookie PRESENCE — the cookie is
 * validated against the database by requireAuth() in the pages themselves,
 * so a forged cookie gets past the proxy but never past a page.
 *
 * Next 16: this file replaces the deprecated middleware.ts convention.
 */

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("chelaa_session");

  if (PUBLIC_PATHS.has(pathname)) {
    // No presence-based redirect away from /login: a STALE cookie would loop
    // forever (/login → / → requireAuth → /login → …). The login page itself
    // sends validated sessions home via useMe.
    return NextResponse.next();
  }

  if (!hasSession) {
    const login = new URL("/login", request.url);
    // Send them back where they were headed after signing in.
    if (pathname !== "/") {
      login.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|icon\\.svg|favicon\\.ico|images/).*)",
  ],
};
