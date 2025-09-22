import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();

  // user.<your-domain> → /user
  if (host.startsWith("user.")) {
    const url = req.nextUrl.clone();
    // 把任何路径都重写到 /user（避免根路径不触发问题）
    if (!url.pathname.startsWith("/user")) {
      url.pathname = "/user";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // admin.<your-domain> → /（后台仪表盘）
  if (host.startsWith("admin.")) {
    const url = req.nextUrl.clone();
    if (url.pathname === "/user") {
      // 防止在 admin 子域误进用户页
      url.pathname = "/";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 其他域名：放行
  return NextResponse.next();
}

// 让中间件覆盖除静态资源外的大多数路径（更保险）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};