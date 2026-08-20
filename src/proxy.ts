import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

// Paths that require admin role
const ADMIN_ONLY_PATHS = ["/reports", "/settings"];

// Paths that are always public (no session required)
const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Decode session cookie
  const token = request.cookies.get("session")?.value;
  const session = await decrypt(token);

  // No session → redirect to /login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Counter trying to access admin-only paths → redirect to home
  if (session.role === "counter" && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
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
