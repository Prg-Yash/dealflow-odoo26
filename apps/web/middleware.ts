import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRoleRedirect, type UserRole } from "./lib/roles";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const isDashboard = pathname.startsWith("/dashboard");
  const isProfile = pathname.startsWith("/profile");
  const isProtected = isDashboard || isProfile;

  // Paths that are only for unauthenticated users
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Check for Better Auth token OR our demo fallback token
  const hasBetterAuth = request.cookies.has("better-auth.session_token") || request.cookies.has("__Secure-better-auth.session_token");
  const demoRole = request.cookies.get("demo_role")?.value as UserRole | undefined;

  const isAuthenticated = hasBetterAuth || !!demoRole;

  // If user is trying to access a protected route without being authenticated
  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is trying to access login/register while ALREADY authenticated
  if (isAuthPage && isAuthenticated) {
    const role = demoRole || "sales_rep"; // Default if we only have better auth but no explicit role cookie yet
    const url = request.nextUrl.clone();
    url.pathname = getRoleRedirect(role);
    return NextResponse.redirect(url);
  }

  // If user is accessing a dashboard, ensure they are accessing THEIR dashboard
  if (isDashboard && demoRole) {
    const allowedPath = getRoleRedirect(demoRole);
    // Let's do a strict check for the base path of the dashboard
    // e.g., if allowedPath is /dashboard/sale-ref, they can't access /dashboard/admin
    
    // We get the second segment, e.g. "admin", "manager", "sale-ref", "finance"
    const pathSegment = pathname.split("/")[2]; 
    const allowedSegment = allowedPath.split("/")[2];

    if (pathSegment && allowedSegment && pathSegment !== allowedSegment) {
      // User is accessing a dashboard route that doesn't belong to them!
      const url = request.nextUrl.clone();
      url.pathname = allowedPath;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
