import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRoleRedirect, type UserRole } from "./lib/roles";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Path Classifications
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/");
  const isPortalLogin = pathname === "/portal/login";
  const isProfile = pathname.startsWith("/profile");
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    isPortalLogin;

  // 2. Authentication Tokens / Cookies
  const hasBetterAuth =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");
  const demoRole = request.cookies.get("demo_role")?.value as UserRole | undefined;
  const hasTokenQuery = searchParams.has("token") && (searchParams.get("token")?.trim().length || 0) > 0;

  const isAuthenticated = hasBetterAuth || !!demoRole;

  // 3. Unauthenticated Access Protection
  // If attempting to access internal dashboards or profile without credentials -> Redirect to /login
  if ((isDashboard || isProfile) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If attempting to access /portal without being logged in and without a token -> Redirect to /portal/login
  if (isPortal && !isPortalLogin && !isAuthenticated && !hasTokenQuery) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    return NextResponse.redirect(url);
  }

  // 4. Authenticated User accessing Auth Pages -> Redirect to their respective home
  if (isAuthPage && isAuthenticated && !hasTokenQuery) {
    const role = demoRole || "customer";
    const url = request.nextUrl.clone();
    url.pathname = getRoleRedirect(role);
    return NextResponse.redirect(url);
  }

  // 5. Strict Role-Based Access Control (RBAC) & Route Isolation
  if (demoRole) {
    // ── ROLE: CUSTOMER ──
    // Customers can ONLY access /portal, /portal/*, /profile. They are strictly FORBIDDEN from all internal dashboards!
    if (demoRole === "customer") {
      if (isDashboard) {
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return NextResponse.redirect(url);
      }
    }

    // ── ROLE: INTERNAL STAFF (Sales Rep, Sales Manager, Finance, Admin) ──
    // Internal staff cannot access /portal as a customer unless reviewing a specific quote via ?token=...
    if (demoRole !== "customer") {
      if (isPortal && !isPortalLogin && !hasTokenQuery) {
        const url = request.nextUrl.clone();
        url.pathname = getRoleRedirect(demoRole);
        return NextResponse.redirect(url);
      }

      // Enforce correct internal dashboard view per staff role
      if (isDashboard) {
        const targetDashboard = getRoleRedirect(demoRole);
        const currentSegment = pathname.split("/")[2]; // e.g. "admin", "manager", "sale-ref", "finance"
        const allowedSegment = targetDashboard.split("/")[2];

        // If visiting base /dashboard or a dashboard belonging to another role
        if (!currentSegment || (allowedSegment && currentSegment !== allowedSegment)) {
          const url = request.nextUrl.clone();
          url.pathname = targetDashboard;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
