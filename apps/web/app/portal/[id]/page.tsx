"use client";

import { use, Suspense } from "react";
import { CustomerNegotiationPortal } from "../components/CustomerNegotiationPortal";

interface PortalIdPageProps {
  params: Promise<{ id: string }>;
}

function PortalIdContent({ params }: PortalIdPageProps) {
  const resolvedParams = use(params);
  const quoteId = resolvedParams?.id || "";

  return <CustomerNegotiationPortal initialToken={quoteId} initialTab="quotation" />;
}

export default function PortalIdPage({ params }: PortalIdPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs font-semibold text-slate-600">
          Loading quotation portal...
        </div>
      }
    >
      <PortalIdContent params={params} />
    </Suspense>
  );
}
