"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CustomerNegotiationPortal } from "./components/CustomerNegotiationPortal";
import { getStoredRole } from "../../lib/roles";

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. If explicit token is in URL, authorize
    if (urlToken && urlToken.trim().length > 0) {
      setIsAuthorized(true);
      return;
    }

    // 2. Check customer authenticated session / role
    const role = getStoredRole();
    const hasCustomerCookie = typeof document !== "undefined" && document.cookie.includes("demo_role=customer");

    if (role === "customer" || hasCustomerCookie) {
      setIsAuthorized(true);
      return;
    }

    // 3. Unauthenticated -> Redirect to login
    setIsAuthorized(false);
    router.replace("/portal/login");
  }, [urlToken, router]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ff5e3a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Verifying customer authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <CustomerNegotiationPortal initialToken={urlToken || "current"} />;
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
