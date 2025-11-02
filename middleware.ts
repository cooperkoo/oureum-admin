// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side gate using a lightweight cookie set on sign-in.
 * - If not signed in (no "ou_admin=1"), requests to "/" (and other admin pages)
 *   are rewritten to "/signin" (no visible redirect).
 * - If signed in and visiting "/signin", rewrite to "/" to avoid seeing the sign-in page again.
 * - Keeps user subdomain mapping sample (optional).
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = (req.headers.get("host") || "").toLowerCase();
  const path = url.pathname;

  // Read cookie written by saveAdminSession()
  const isAdmin = req.cookies.get("ou_admin")?.value === "1";

  // Optional: subdomain routing examples
  if (host.startsWith("user.")) {
    if (!path.startsWith("/user")) {
      url.pathname = "/user";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // For admin.* or main domain we treat "/" as admin dashboard entry.
  const isAdminHost = host.startsWith("admin.");

  // Public routes that should always pass through
  const publicPaths = new Set<string>([
    "/signin",
  ]);

  const isApi = path.startsWith("/api/");
  const isPublic = publicPaths.has(path);

  // Never interfere with API/static
  if (isApi) return NextResponse.next();

  // If signed in and heading to /signin, just show dashboard
  if (isAdmin && path === "/signin") {
    url.pathname = "/";
    return NextResponse.rewrite(url);
  }

  // If not signed in:
  // - On admin subdomain: rewrite everything except public routes to /signin
  // - On root domain: at least rewrite "/" to /signin (you can add more paths as needed)
  if (!isAdmin) {
    if (isAdminHost) {
      if (!isPublic) {
        url.pathname = "/signin";
        return NextResponse.rewrite(url);
      }
    } else {
      // Root domain rule: land on /signin instead of dashboard flash
      if (path === "/") {
        url.pathname = "/signin";
        return NextResponse.rewrite(url);
      }
    }
  }

  return NextResponse.next();
}

// Exclude static assets and Next internals to avoid unnecessary work.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/).*)",
  ],
};