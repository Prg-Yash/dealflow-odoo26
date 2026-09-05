"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboardAuth } from "./layout";
import { getRoleRedirect } from "../../lib/roles";

export default function DashboardRootPage() {
  const router = useRouter();
  const { role, user } = useDashboardAuth();

  useEffect(() => {
    if (user && role) {
      router.replace(getRoleRedirect(role));
    }
  }, [router, role, user]);

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-xs text-slate-400">
      Loading your workspace dashboard...
    </div>
  );
}
