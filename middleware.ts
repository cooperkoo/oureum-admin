import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";

  // 如果是 user 子域名，跳转到 /user
  if (host.startsWith("user.")) {
    return NextResponse.rewrite(new URL("/user", req.url));
  }

  // 如果是 admin 子域名，默认进 admin dashboard
  if (host.startsWith("admin.")) {
    return NextResponse.rewrite(new URL("/", req.url));
  }

  return NextResponse.next();
}