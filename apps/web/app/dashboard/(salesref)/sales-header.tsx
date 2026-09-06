"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalesNav } from "@repo/ui";
import {
  useCurrentOrg,
  useUserOrganizations,
  useCreateOrganization,
  useSwitchOrganization,
} from "@/lib/query";
import { useDashboardAuth } from "../layout";
import { toast } from "sonner";

export interface SalesHeaderProps {
  activeTab?: "dashboard" | "quotations" | "new-quote" | "approvals" | "invoices";
  className?: string;
}

export function SalesHeader({ activeTab = "dashboard", className = "" }: SalesHeaderProps) {
  const router = useRouter();
  const { user, signOut, refreshAuth } = useDashboardAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: userOrgs } = useUserOrganizations();
  const createOrgMutation = useCreateOrganization();
  const switchOrgMutation = useSwitchOrganization();

  const userName = user?.name || "Sales Representative";
  const userInitials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SR";

  const orgName = currentOrg?.name || user?.organization?.name || "Workspace";
  const currentOrgId = currentOrg?.id || user?.organizationId || "";
  const currentRole = user?.role || "SALES_REP";

  const handleSwitchOrg = async (targetOrgId: string) => {
    try {
      const res = await switchOrgMutation.mutateAsync(targetOrgId);
      toast.success(res.message || `Switched active organization to ${res.organization?.name}`);
      await refreshAuth();

      const targetRole = res.role?.toUpperCase() || res.activeRole?.toUpperCase() || res.organization?.userRole?.toUpperCase() || "ADMIN";
      if (targetRole === "ADMIN") {
        router.push("/dashboard/admin");
      } else if (targetRole === "SALES_MANAGER") {
        router.push("/dashboard/manager");
      } else if (targetRole === "FINANCE_OPS") {
        router.push("/dashboard/finance");
      } else {
        router.push("/dashboard/sale-ref");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to switch organization.");
    }
  };

  const handleCreateOrg = async (data: { name: string; slug?: string; currency: string }) => {
    try {
      const res = await createOrgMutation.mutateAsync(data);
      toast.success(res.message || `Organization '${res.organization?.name}' created successfully!`);
      await refreshAuth();
      router.push("/dashboard/admin");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create organization.");
      throw err;
    }
  };

  return (
    <SalesNav
      activeTab={activeTab}
      userName={userName}
      userInitials={userInitials}
      roleLabel={user?.role === "SALES_REP" ? "Sales Representative" : user?.role || "Sales Rep"}
      orgName={orgName}
      currentOrgId={currentOrgId}
      currentRole={currentRole}
      organizations={userOrgs as any}
      onSwitchOrg={handleSwitchOrg}
      onCreateOrg={handleCreateOrg}
      onManageTeam={() => {
        if (user?.role === "ADMIN") {
          router.push("/dashboard/admin/team");
        } else {
          toast.info("Only Organization Admins can manage team members.");
        }
      }}
      onSignOut={signOut}
      linkComponent={Link as any}
      className={className}
    />
  );
}
