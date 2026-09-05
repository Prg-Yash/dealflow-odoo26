"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CustomerNav } from "@repo/ui";
import { useDashboardAuth } from "../layout";

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useDashboardAuth();
  const pathname = usePathname();
  
  // Determine active tab based on pathname
  let activeTab: "dashboard" | "quotations" | "settings" = "dashboard";
  if (pathname.includes("/quotations")) {
    activeTab = "quotations";
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased flex flex-col pt-16">
      <CustomerNav
        activeTab={activeTab}
        userInitials={user?.name ? user.name.substring(0, 2).toUpperCase() : "CU"}
        userName={user?.name || "Customer"}
        userEmail={user?.email || "buyer@acmecorp.com"}
        roleLabel="Customer"
        onSignOut={signOut}
        linkComponent={Link}
      />
      <main className="flex-1 w-full flex flex-col h-full min-h-[calc(100vh-64px)]">
        {children}
      </main>
    </div>
  );
}
