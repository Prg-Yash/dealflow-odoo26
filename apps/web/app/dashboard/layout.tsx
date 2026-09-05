"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { authClient } from "../../lib/auth-client";
import {
  type UserRole,
  inferRoleFromEmail,
  getRoleRedirect,
  setStoredRole,
} from "../../lib/roles";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "FINANCE_OPS" | "CUSTOMER";
  emailVerified?: boolean;
  image?: string | null;
  organizationId?: string | null;
  organization?: {
    id: string;
    name: string;
    currency: string;
    slug?: string;
  } | null;
}

export interface DashboardAuthContextType {
  user: AuthenticatedUser | null;
  role: UserRole;
  dbRole: string;
  organization: AuthenticatedUser["organization"] | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const DashboardAuthContext = createContext<DashboardAuthContextType | null>(null);

export function useDashboardAuth(): DashboardAuthContextType {
  const context = useContext(DashboardAuthContext);
  if (!context) {
    throw new Error("useDashboardAuth must be used within a DashboardLayout");
  }
  return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [authStatus, setAuthStatus] = useState<
    "loading" | "authenticated" | "unauthorized" | "redirecting"
  >("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [role, setRole] = useState<UserRole>("sales_rep");
  const [dbRole, setDbRole] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>(
    "Authenticating session..."
  );

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("df360_user_role");
        document.cookie =
          "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      await authClient.signOut();
    } catch {
      // Graceful signout fallback
    } finally {
      router.replace("/login");
    }
  };

  const verifyAuthentication = async () => {
    try {
      setStatusMessage("Checking active Better Auth session...");

      // 1. Better Auth Session Extraction
      const sessionResult = await authClient.getSession().catch(() => null);
      const sessionUser = sessionResult?.data?.user;

      if (!sessionUser || !sessionUser.email) {
        // No active session: Clear stale demo cookies & redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("df360_user_role");
          document.cookie =
            "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        setAuthStatus("unauthorized");
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      setStatusMessage("Verifying user permissions and role in database...");

      // 2. Query Live Database Role via /api/auth/me
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: "include",
      }).catch(() => null);

      if (!meResponse || !meResponse.ok) {
        // API session check failed -> User credentials invalid or revoked
        if (typeof window !== "undefined") {
          localStorage.removeItem("df360_user_role");
          document.cookie =
            "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        setAuthStatus("unauthorized");
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const meData = await meResponse.json();
      const verifiedUser: AuthenticatedUser = meData.user;
      const rawDbRole = verifiedUser.role; // "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "FINANCE_OPS" | "CUSTOMER"

      // 3. Customer Role Isolation: Customers cannot access internal dashboards
      if (rawDbRole === "CUSTOMER") {
        setAuthStatus("redirecting");
        router.replace("/portal");
        return;
      }

      // 4. Map DB Role to Workspace UserRole
      let mappedRole: UserRole = "sales_rep";
      if (rawDbRole === "ADMIN") mappedRole = "admin";
      else if (rawDbRole === "SALES_MANAGER") mappedRole = "manager";
      else if (rawDbRole === "SALES_REP") mappedRole = "sales_rep";
      else if (rawDbRole === "FINANCE_OPS") mappedRole = "finance";
      else mappedRole = inferRoleFromEmail(verifiedUser.email);

      // Persist verified role state for workspace UI
      setStoredRole(mappedRole);
      if (typeof document !== "undefined") {
        document.cookie = `demo_role=${mappedRole}; path=/; max-age=86400; SameSite=Lax`;
      }

      setUser(verifiedUser);
      setRole(mappedRole);
      setDbRole(rawDbRole);

      // 5. Enforce Sub-Path RBAC
      if (pathname === "/dashboard" || pathname === "/dashboard/") {
        // Base /dashboard redirects to user's authorized role view
        setAuthStatus("redirecting");
        router.replace(getRoleRedirect(mappedRole));
        return;
      }

      // Check specific dashboard route authorization
      if (pathname.startsWith("/dashboard/admin")) {
        if (mappedRole !== "admin") {
          setAuthStatus("redirecting");
          router.replace(getRoleRedirect(mappedRole));
          return;
        }
      } else if (pathname.startsWith("/dashboard/manager")) {
        if (mappedRole !== "manager" && mappedRole !== "admin") {
          setAuthStatus("redirecting");
          router.replace(getRoleRedirect(mappedRole));
          return;
        }
      } else if (pathname.startsWith("/dashboard/finance")) {
        if (mappedRole !== "finance" && mappedRole !== "admin") {
          setAuthStatus("redirecting");
          router.replace(getRoleRedirect(mappedRole));
          return;
        }
      } else if (pathname.startsWith("/dashboard/sale-ref")) {
        if (
          mappedRole !== "sales_rep" &&
          mappedRole !== "manager" &&
          mappedRole !== "admin"
        ) {
          setAuthStatus("redirecting");
          router.replace(getRoleRedirect(mappedRole));
          return;
        }
      }

      // All checks passed! Authorize full dashboard rendering
      setAuthStatus("authenticated");
    } catch (err) {
      console.error("Dashboard auth verification error:", err);
      setAuthStatus("unauthorized");
      router.replace("/login");
    }
  };

  useEffect(() => {
    verifyAuthentication();
  }, [pathname]);

  const contextValue = useMemo<DashboardAuthContextType>(
    () => ({
      user,
      role,
      dbRole,
      organization: user?.organization || null,
      signOut: handleSignOut,
      refreshAuth: verifyAuthentication,
    }),
    [user, role, dbRole]
  );

  // 1. Loading & Verifying Screen (Zero UI Leakage)
  if (authStatus === "loading" || authStatus === "redirecting") {
    return (
      <div className="min-h-screen w-full bg-[#0a0f1d] flex flex-col items-center justify-center p-4 antialiased">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
          {/* Brand Logo Monogram */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ff5e3a] to-[#ff8f6b] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-[#ff5e3a]/25">
              DF
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center">
              <Lock size={12} className="text-[#ff5e3a]" />
            </div>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight mb-1">
            DealFlow 360 Workspace
          </h2>
          <p className="text-xs text-slate-400 mb-6 max-w-xs">
            {statusMessage}
          </p>

          {/* Spinner and Status Bar */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-300 text-xs font-medium">
            <Loader2 size={14} className="text-[#ff5e3a] animate-spin" />
            <span>Verifying database permissions...</span>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/60 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Multi-Tenant Role-Based Access Control</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthorized Screen (Clean Redirect in progress)
  if (authStatus === "unauthorized") {
    return null;
  }

  // 3. Authenticated: Render Child Dashboard Views
  return (
    <DashboardAuthContext.Provider value={contextValue}>
      {children}
    </DashboardAuthContext.Provider>
  );
}
