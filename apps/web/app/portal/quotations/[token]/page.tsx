"use client";

import { use } from "react";
import { CustomerNegotiationPortal } from "../../components/CustomerNegotiationPortal";

interface PortalTokenPageProps {
  params: Promise<{ token: string }>;
}

export default function PortalTokenPage({ params }: PortalTokenPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token || "portal-token-devally-09944bea306b2c0d";

  return <CustomerNegotiationPortal initialToken={token} />;
}
