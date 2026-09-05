import type { Metadata } from "next";
import { AdminHeader } from "./admin-header";
import { AdminFooter } from "./admin-footer";

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

      {/* Dynamic Admin Footer */}
      <AdminFooter />
    </div>
  );
}

