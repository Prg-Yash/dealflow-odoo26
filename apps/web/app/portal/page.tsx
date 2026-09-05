"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerNegotiationPortal } from "./components/CustomerNegotiationPortal";

function PortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "DF-Q1042";

  return <CustomerNegotiationPortal initialToken={token} />;
}

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070A0F] flex items-center justify-center text-xs font-mono text-emerald-400">
          Decrypting customer quotation portal...
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
