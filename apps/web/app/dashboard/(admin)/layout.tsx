import type { Metadata } from "next";
import { AdminHeader } from "./admin-header";

export const metadata: Metadata = {
  title: "Admin Console | DealFlow360",
  description: "Enterprise Governance, Catalog, Pricing Rules & Multi-Tenant Management",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f9f9f9] text-slate-900 flex flex-col antialiased">
      {/* Admin Shell Header */}
      <AdminHeader />

      {/* Main Admin Content Container (with aligned responsive padding) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">DealFlow360</span>
            <span>&bull;</span>
            <span>Enterprise Admin Governance Engine</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px] text-slate-400">Apex Enterprise Technologies (org-apex-01)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Prisma Schema v4.2</span>
            <span>&bull;</span>
            <span>Multi-Tenant Boundary: Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
