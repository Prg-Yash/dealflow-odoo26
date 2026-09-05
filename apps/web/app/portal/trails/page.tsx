"use client";

import { Suspense } from "react";
import { CustomerNegotiationPortal } from "../components/CustomerNegotiationPortal";

export default function GeneralPortalTrailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs font-semibold text-slate-600">
          Loading quotation trails and discussion...
        </div>
      }
    >
      <CustomerNegotiationPortal initialToken="current" initialTab="trails" />
    </Suspense>
  );
}
