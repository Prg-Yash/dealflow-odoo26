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
  const [effectiveToken, setEffectiveToken] = useState<string>("DF-Q1042");

  useEffect(() => {
    // 1. Check if token is explicitly supplied in the URL
    if (urlToken && urlToken.trim().length > 0) {
      setEffectiveToken(urlToken.trim());
      setIsAuthorized(true);
      return;
    }

    // 2. Check if user is authenticated as a customer (from login session or stored role)
    const role = getStoredRole();
    const hasCustomerCookie = typeof document !== "undefined" && document.cookie.includes("demo_role=customer");

    if (role === "customer" || hasCustomerCookie) {
      // Authenticated customer default proposal
      setEffectiveToken("DF-Q1042");
      setIsAuthorized(true);
      return;
    }

    // 3. Unauthenticated visitor trying to access /portal randomly -> Redirect to customer login
    setIsAuthorized(false);
    router.replace("/portal/login");
  }, [urlToken, router]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ff5e3a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Verifying secure portal access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <CustomerNegotiationPortal initialToken={effectiveToken} />;
}

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs font-semibold text-slate-600">
          Loading customer quotation portal...
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
