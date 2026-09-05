"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PortalTokenPageProps {
  params: Promise<{ token: string }>;
}

export default function PortalTokenPage({ params }: PortalTokenPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const token = resolvedParams.token || "DF-Q1042";

  useEffect(() => {
    router.replace(`/portal?token=${encodeURIComponent(token)}`);
  }, [router, token]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-600">Loading quotation portal...</p>
      </div>
    </div>
  );
}

