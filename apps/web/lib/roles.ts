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
    defaultEmail: "rep.alex@dealflow360.com",
    defaultName: "Alex Rivera",
    defaultOrg: "Apex Enterprise Technologies Inc",
    targetPath: "/dashboard",
    badgeVariant: "info",
  },
  manager: {
    id: "manager",
    label: "Sales Manager",
    title: "Regional Sales Director",
    description: "Discount tier approvals, quota pacing, deal health & anomalies",
    defaultEmail: "manager.elena@dealflow360.com",
    defaultName: "Elena Rostova",
    defaultOrg: "Apex Enterprise Technologies Inc",
    targetPath: "/dashboard",
    badgeVariant: "warning",
  },
  finance: {
    id: "finance",
    label: "Finance",
    title: "Billing & Revenue Operations",
    description: "Invoice reconciliations, recurring billing, contracts & fulfillment",
    defaultEmail: "finance.marcus@dealflow360.com",
    defaultName: "Marcus Vance",
    defaultOrg: "Apex Enterprise Technologies Inc",
    targetPath: "/dashboard",
    badgeVariant: "success",
  },
  admin: {
    id: "admin",
    label: "System Admin",
    title: "Platform Administrator",
    description: "Organization hierarchy, rule engines, catalogs & access control",
    defaultEmail: "admin@dealflow360.com",
    defaultName: "System Administrator",
    defaultOrg: "Apex Enterprise Technologies Inc",
    targetPath: "/dashboard",
    badgeVariant: "default",
  },
  customer: {
    id: "customer",
    label: "Customer / Buyer",
    title: "Procurement Lead (Acme Corp)",
    description: "Client proposal review, redlining, negotiation portal & sign-off",
    defaultEmail: "buyer@acmecorp.com",
    defaultName: "Johnathan Ward",
    defaultOrg: "Acme Corporation",
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
  if (
    e === "buyer@acmecorp.com" ||
    e === "customer@acme.com" ||
    e === "procurement@betaindustries.com" ||
    e === "finance@quantumleaplabs.ai" ||
    e.includes("customer") ||
    e.includes("buyer") ||
    e.includes("acme") ||
    e.includes("procurement") ||
    e.includes("quantumleap") ||
    e.includes("client")
  ) {
    return "customer";
  }
  if (e.includes("admin")) return "admin";
  if (e.includes("manager") || e.includes("elena")) return "manager";
  if (e.includes("finance") || e.includes("marcus")) return "finance";
  return "sales_rep";
}

export function getRoleRedirect(role: UserRole): string {
  return role === "customer" ? "/portal" : "/dashboard";
}
