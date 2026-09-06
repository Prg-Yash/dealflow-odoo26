"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNav } from "@repo/ui";
import { useSession } from "@/lib/auth-client";
import { useCurrentOrg } from "@/lib/query";
import { useDashboardAuth } from "../layout";

export function AdminHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: currentOrg } = useCurrentOrg();
  const { signOut } = useDashboardAuth();

  const adminName = session?.user?.name || "Administrator";
  const adminEmail = session?.user?.email || "";
  const adminInitials = adminName
    ? adminName
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  const orgName = currentOrg?.name || "";

  return (
    <AdminNav
      currentPath={pathname}
      adminName={adminName}
      adminEmail={adminEmail}
      adminInitials={adminInitials}
      orgName={orgName}
      onSignOut={signOut}
      linkComponent={Link as any}
    />
  );
}

