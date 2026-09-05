"use client";

import { use } from "react";
import { CustomerNegotiationPortal } from "../../../../../portal/components/CustomerNegotiationPortal";
import { useDashboardAuth } from "../../../../layout";

export default function CustomerQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useDashboardAuth();

  return (
    <div className="w-full h-full -mx-4 sm:-mx-6 -my-6 md:-my-8 relative">
      <CustomerNegotiationPortal 
        initialToken={id} 
        customerEmail={user?.email || ""} 
        hideNav={true}
        hideCatalogLink={true}
      />
    </div>
  );
}
