"use client";

import { useCurrentOrg } from "@/lib/query";

export function AdminFooter() {
  const { data: currentOrg } = useCurrentOrg();
  const orgName = currentOrg?.name;

  return (
    <footer className="border-t border-slate-200/80 bg-white py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">DealFlow360</span>
          {orgName ? (
            <>
              <span>&bull;</span>
              <span className="text-slate-600 font-medium">{orgName}</span>
            </>
          ) : null}
        </div>
        <div className="text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} DealFlow360
        </div>
      </div>
    </footer>
  );
}
