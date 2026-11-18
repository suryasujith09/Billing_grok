import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

// Paths that require admin role
const ADMIN_ONLY_PATHS = ["/reports", "/settings", "/employees"];

// Paths that are always public (no session required)
const PUBLIC_PATHS = ["/", "/about", "/collections", "/services", "/contact", "/login", "/software/login", "/robots.txt", "/sitemap.xml", "/api/enquiries"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Decode session cookie
  const token = request.cookies.get("session")?.value;
  const session = await decrypt(token);

  // No session → redirect to /login
  if (!session) {
    const loginUrl = new URL("/software/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Counter trying to access admin-only paths → redirect to home
  const isAdminOnlyPath =
    ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p)) ||
    /^\/bookings\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/invoices\/[^/]+\/edit\/?$/.test(pathname);
  if (session.role !== "admin" && isAdminOnlyPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico
     * - public files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)).*)",
  ],
};
