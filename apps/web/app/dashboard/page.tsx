"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole, getRoleRedirect } from "../../lib/roles";

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    const role = getStoredRole();
    router.replace(getRoleRedirect(role));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-xs text-slate-400">
      Loading your workspace dashboard...
    </div>
  );
}
