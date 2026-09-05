"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerPortalLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#ff5e3a] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-600">Redirecting to unified sign in...</p>
      </div>
    </div>
  );
}
