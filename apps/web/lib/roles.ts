export type UserRole = "sales_rep" | "manager" | "finance" | "admin" | "customer";

export interface RoleConfig {
  id: UserRole;
  label: string;
  title: string;
  description: string;
  defaultEmail: string;
  defaultName: string;
  defaultOrg: string;
  targetPath: string; // "/dashboard" for internal, "/portal" for customer
  badgeVariant: "default" | "success" | "warning" | "error" | "info";
}

export const ROLES: Record<UserRole, RoleConfig> = {
  sales_rep: {
    id: "sales_rep",
    label: "Sales Rep",
    title: "Account Executive / Sales Rep",
    description: "Quotations, deals pipeline, pricing rules & customer negotiations",
    defaultEmail: "rep@dealflow360.com",
    defaultName: "Sarah Jenkins",
    defaultOrg: "Acme Cloud Division",
    targetPath: "/dashboard",
    badgeVariant: "info",
  },
  manager: {
    id: "manager",
    label: "Sales Manager",
    title: "Regional Sales Director",
    description: "Discount tier approvals, quota pacing, deal health & anomalies",
    defaultEmail: "manager@dealflow360.com",
    defaultName: "Marcus Vance",
    defaultOrg: "DealFlow360 HQ",
    targetPath: "/dashboard",
    badgeVariant: "warning",
  },
  finance: {
    id: "finance",
    label: "Finance",
    title: "Billing & Revenue Operations",
    description: "Invoice reconciliations, recurring billing, contracts & fulfillment",
    defaultEmail: "finance@dealflow360.com",
    defaultName: "Elena Rostova",
    defaultOrg: "FinOps Global",
    targetPath: "/dashboard",
    badgeVariant: "success",
  },
  admin: {
    id: "admin",
    label: "System Admin",
    title: "Platform Administrator",
    description: "Organization hierarchy, rule engines, catalogs & access control",
    defaultEmail: "admin@dealflow360.com",
    defaultName: "David Chen",
    defaultOrg: "DealFlow360 Enterprise",
    targetPath: "/dashboard",
    badgeVariant: "default",
  },
  customer: {
    id: "customer",
    label: "Customer / Buyer",
    title: "Procurement Lead (Customer)",
    description: "Client proposal review, redlining, negotiation portal & sign-off",
    defaultEmail: "customer@acme.com",
    defaultName: "Alex Rivera",
    defaultOrg: "Acme Technologies Inc.",
    targetPath: "/portal",
    badgeVariant: "info",
  },
};

export const ALL_ROLES = Object.values(ROLES);

const STORAGE_KEY = "df360_user_role";

export function getStoredRole(): UserRole {
  if (typeof window === "undefined") return "sales_rep";
  const stored = localStorage.getItem(STORAGE_KEY) as UserRole | null;
  return stored && ROLES[stored] ? stored : "sales_rep";
}

export function setStoredRole(role: UserRole): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, role);
  }
}

export function inferRoleFromEmail(email: string): UserRole {
  const e = email.toLowerCase().trim();
  if (e.includes("admin")) return "admin";
  if (e.includes("manager")) return "manager";
  if (e.includes("finance")) return "finance";
  if (e.includes("customer") || e.includes("buyer") || e.includes("acme") || e.includes("client")) {
    return "customer";
  }
  return "sales_rep";
}

export function getRoleRedirect(role: UserRole): string {
  return role === "customer" ? "/portal" : "/dashboard";
}
