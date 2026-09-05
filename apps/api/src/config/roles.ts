import { UserRole } from "@repo/db";

export type Permission =
  // Admin & Org
  | "org:manage"
  | "org:view"
  | "warehouse:manage"
  | "warehouse:view"
  | "members:invite"
  | "members:manage"
  | "analytics:platform"
  // Sales Rep
  | "quote:create"
  | "quote:edit_draft"
  | "quote:apply_discount"
  | "quote:view_upsell"
  | "quote:track_fulfillment"
  | "portal:respond_negotiation"
  // Sales Manager
  | "approval:tier1_review"
  | "approval:tier1_act"
  | "config:discount_tiers"
  | "config:approval_chains"
  | "deal_health:monitor"
  | "reps:manage"
  // Finance & Operations
  | "approval:tier2_high_risk"
  | "fulfillment:split_manage"
  | "fulfillment:backorder_manage"
  | "billing:recurring_reconcile"
  | "billing:credit_notes"
  // Customer Portal
  | "portal:view_quote"
  | "portal:request_changes"
  | "portal:counter_discount"
  | "portal:confirm_terms";

/**
 * Mapped permissions for each user role in DealFlow360
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    "org:manage",
    "org:view",
    "warehouse:manage",
    "warehouse:view",
    "members:invite",
    "members:manage",
    "analytics:platform",
    "quote:create",
    "quote:edit_draft",
    "approval:tier1_review",
    "approval:tier1_act",
    "approval:tier2_high_risk",
    "config:discount_tiers",
    "config:approval_chains",
    "deal_health:monitor",
    "fulfillment:split_manage",
    "fulfillment:backorder_manage",
    "billing:recurring_reconcile",
    "billing:credit_notes",
  ],
  [UserRole.SALES_REP]: [
    "org:view",
    "warehouse:view",
    "quote:create",
    "quote:edit_draft",
    "quote:apply_discount",
    "quote:view_upsell",
    "quote:track_fulfillment",
    "portal:respond_negotiation",
  ],
  [UserRole.SALES_MANAGER]: [
    "org:view",
    "warehouse:view",
    "reps:manage",
    "approval:tier1_review",
    "approval:tier1_act",
    "config:discount_tiers",
    "config:approval_chains",
    "deal_health:monitor",
    "quote:create",
    "quote:edit_draft",
  ],
  [UserRole.FINANCE_OPS]: [
    "org:view",
    "warehouse:view",
    "warehouse:manage",
    "approval:tier2_high_risk",
    "fulfillment:split_manage",
    "fulfillment:backorder_manage",
    "billing:recurring_reconcile",
    "billing:credit_notes",
    "deal_health:monitor",
  ],
  [UserRole.CUSTOMER]: [
    "portal:view_quote",
    "portal:request_changes",
    "portal:counter_discount",
    "portal:confirm_terms",
  ],
};

/**
 * Human-readable tasks and operational capabilities per role from the DealFlow360 specification
 */
export const ROLE_TASKS: Record<UserRole, { title: string; tasks: string[] }> = {
  [UserRole.ADMIN]: {
    title: "Administrator",
    tasks: [
      "Manage organizations, currency, and global workspace settings",
      "Create and manage fulfillment warehouses and shipping weights",
      "Invite members, assign roles, and manage team roster",
      "Manage backend setup: products, price lists, discount tiers, and subscription plans",
      "View platform-wide analytics and performance reports",
    ],
  },
  [UserRole.SALES_REP]: {
    title: "Sales Representative",
    tasks: [
      "Build live quotations across Hardware, Services, and Subscriptions",
      "Apply line-level and order-level discounts within assigned ceilings",
      "Review live upsell and cross-sell suggestions with margin delta indicators",
      "Track approval status and fulfillment progress in real time",
      "Collaborate and respond to customer requests in negotiation portal",
    ],
  },
  [UserRole.SALES_MANAGER]: {
    title: "Sales Manager / Approver",
    tasks: [
      "Review and approve or reject quotations exceeding standard discount ceilings (Tier 1)",
      "Configure discount tiers, customer tier margins, and approval chains",
      "Monitor deal health dashboard for stalled quotes and discount anomalies",
      "Supervise and guide sales representatives across the deal pipeline",
    ],
  },
  [UserRole.FINANCE_OPS]: {
    title: "Finance / Operations User",
    tasks: [
      "Handle Tier 2 high-risk discount and pricing escalation approvals",
      "Manage warehouse fulfillment splits, stock allocations, and backorders",
      "Reconcile hybrid billing: one-time hardware vs recurring subscription schedules",
      "Handle subscription cancellations, mid-cycle prorations, and credit notes",
    ],
  },
  [UserRole.CUSTOMER]: {
    title: "Customer (Portal User)",
    tasks: [
      "Access interactive live quotations via secure negotiation portal",
      "Request line-level modifications and ask real-time questions",
      "Propose counter-discounts for sales rep and manager consideration",
      "Accept and electronically confirm final order terms",
    ],
  },
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}
