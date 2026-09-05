"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CustomerNegotiationPortal } from "./components/CustomerNegotiationPortal";
import { getStoredRole } from "../../lib/roles";
import { authClient } from "../../lib/auth-client";

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");
  const urlTab = searchParams.get("tab");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [resolvedToken, setResolvedToken] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");

  const initialTab: "quotation" | "trails" | "profile" =
    urlTab === "trails" || urlTab === "messages"
      ? "trails"
      : urlTab === "profile"
      ? "profile"
      : "quotation";

  useEffect(() => {
    async function checkAuth() {
      // 1. Check Better Auth session for a customer role
      try {
        const { data: session } = await authClient.getSession();
        if (session?.user?.email) {
          const email = session.user.email;
          setCustomerEmail(email);
          // If logged in via session, use token from URL or derive from session
          const tok = urlToken?.trim() || "current";
          setResolvedToken(tok);
          setIsAuthorized(true);

          // Clean URL: remove token from address bar for security if present
          if (urlToken) {
            window.history.replaceState(
              {},
              "",
              `/portal${urlTab ? `?tab=${encodeURIComponent(urlTab)}` : ""}`
            );
          }
          return;
        }
      } catch {
        // Session not available
      }

      // 2. If explicit token is in URL (customer entered it via portal/login), authorize
      if (urlToken && urlToken.trim().length > 0) {
        setResolvedToken(urlToken.trim());
        setIsAuthorized(true);

        // Clean token from URL after reading it
        window.history.replaceState(
          {},
          "",
          `/portal${urlTab ? `?tab=${encodeURIComponent(urlTab)}` : ""}`
        );
        return;
      }

      // 3. Check demo_role cookie (fallback for session-less token-based auth)
      const role = getStoredRole();
      const hasCustomerCookie =
        typeof document !== "undefined" && document.cookie.includes("demo_role=customer");

      if (role === "customer" || hasCustomerCookie) {
        setResolvedToken("current");
        setIsAuthorized(true);
        return;
      }

      // 4. Unauthenticated -> Redirect to unified /login
      setIsAuthorized(false);
      router.replace("/login");
    }

    checkAuth();
  }, [urlToken, urlTab, router]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ff5e3a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">
            Verifying customer authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <CustomerNegotiationPortal
      initialToken={resolvedToken || "current"}
      initialTab={initialTab}
      customerEmail={customerEmail}
    />
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs font-semibold text-slate-600">
          Loading customer portal...
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
