"use client";

import { use, Suspense } from "react";
import { CustomerNegotiationPortal } from "../../components/CustomerNegotiationPortal";

interface PortalTrailsPageProps {
  params: Promise<{ id: string }>;
}

function PortalTrailsContent({ params }: PortalTrailsPageProps) {
  const resolvedParams = use(params);
  const quoteId = resolvedParams?.id || "";

  return <CustomerNegotiationPortal initialToken={quoteId} initialTab="trails" />;
}

export default function PortalTrailsPage({ params }: PortalTrailsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs font-semibold text-slate-600">
          Loading quotation trails and discussion...
        </div>
      }
    >
      <PortalTrailsContent params={params} />
    </Suspense>
  );
}
