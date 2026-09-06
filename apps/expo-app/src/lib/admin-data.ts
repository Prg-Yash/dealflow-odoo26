// Ported from apps/web/lib/admin-data.ts — same types + mock data, no web deps

export type AdminUserRole = 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' | 'FINANCE_OPS' | 'CUSTOMER';
export type AdminCategoryType = 'HARDWARE' | 'SERVICE' | 'SUBSCRIPTION';
export type AdminEscalationLevel = 'NONE' | 'SALES_MANAGER' | 'SALES_MANAGER_AND_FINANCE';
export type AdminInvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
export type AuditLevel = 'INFO' | 'WARN' | 'CRITICAL';

export interface AdminOrg {
  id: string; name: string; slug: string; currency: string;
  creatorName: string; activeTierCount: number; totalMembers: number; createdAt: string;
}
export interface AdminMember {
  id: string; name: string; email: string; role: AdminUserRole;
  department: string; avatarInitials: string; emailVerified: boolean;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'; joinedAt: string;
  approvalThreshold?: number; targetQuota?: number; managerName?: string;
}
export interface AdminInvitation {
  id: string; email: string; role: AdminUserRole; status: AdminInvitationStatus;
  department: string; invitedBy: string; expiresAt: string;
}
export interface AdminCategory {
  id: string; name: string; type: AdminCategoryType;
  discountCeiling: number; targetMargin: number; productCount: number;
}
export interface AdminProduct {
  id: string; name: string; sku: string; categoryName: string;
  categoryType: AdminCategoryType; basePrice: number; unit: string;
  isActive: boolean; isPromoted: boolean;
}
export interface AdminDiscountRule {
  id: string; name: string;
  minDiscountPercent: number; maxDiscountPercent: number;
  escalationLevel: AdminEscalationLevel;
  description: string; isActive: boolean; dealTriggersCount: number;
}
export interface AdminWarehouse {
  id: string; name: string; code: string; location: string;
  isActive: boolean; totalStockUnits: number; lowStockItemsCount: number;
}
export interface AdminAuditLog {
  id: string; action: string; entity: string; performedBy: string;
  details: string; timestamp: string; level: AuditLevel;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

export const MOCK_ADMIN_ORG: AdminOrg = {
  id: 'org-apex-01', name: 'Apex Enterprise Technologies Inc', slug: 'apex-tech',
  currency: 'USD', creatorName: 'System Administrator',
  activeTierCount: 4, totalMembers: 8, createdAt: '2026-01-15T08:00:00Z',
};

export const MOCK_ADMIN_MEMBERS: AdminMember[] = [
  { id: 'usr-admin-01', name: 'System Administrator', email: 'admin@dealflow360.com', role: 'ADMIN', department: 'Executive Operations', avatarInitials: 'SA', emailVerified: true, status: 'ACTIVE', joinedAt: '2026-01-15' },
  { id: 'usr-mgr-01', name: 'Elena Rostova', email: 'manager.elena@dealflow360.com', role: 'SALES_MANAGER', department: 'Enterprise Solutions', avatarInitials: 'ER', emailVerified: true, status: 'ACTIVE', approvalThreshold: 15, joinedAt: '2026-01-18' },
  { id: 'usr-rep-01', name: 'Alex Rivera', email: 'rep.alex@dealflow360.com', role: 'SALES_REP', department: 'Mid-Market', avatarInitials: 'AR', emailVerified: true, status: 'ACTIVE', targetQuota: 250000, managerName: 'Elena Rostova', joinedAt: '2026-02-01' },
  { id: 'usr-rep-02', name: 'Sarah Chen', email: 'rep.sarah@dealflow360.com', role: 'SALES_REP', department: 'Strategic Enterprise', avatarInitials: 'SC', emailVerified: true, status: 'ACTIVE', targetQuota: 300000, managerName: 'Elena Rostova', joinedAt: '2026-02-05' },
  { id: 'usr-fin-01', name: 'Marcus Vance', email: 'finance.marcus@dealflow360.com', role: 'FINANCE_OPS', department: 'Revenue Ops', avatarInitials: 'MV', emailVerified: true, status: 'ACTIVE', approvalThreshold: 100, joinedAt: '2026-01-20' },
  { id: 'usr-cust-01', name: 'Johnathan Ward', email: 'buyer@acmecorp.com', role: 'CUSTOMER', department: 'Acme Corp Procurement', avatarInitials: 'JW', emailVerified: true, status: 'ACTIVE', joinedAt: '2026-02-15' },
];

export const MOCK_ADMIN_INVITATIONS: AdminInvitation[] = [
  { id: 'inv-1', email: 'david.miller@dealflow360.com', role: 'SALES_REP', status: 'PENDING', department: 'Enterprise Sales', invitedBy: 'System Administrator', expiresAt: '2026-09-12T14:00:00Z' },
  { id: 'inv-2', email: 'clara.oswald@dealflow360.com', role: 'FINANCE_OPS', status: 'PENDING', department: 'Revenue Accounting', invitedBy: 'Marcus Vance', expiresAt: '2026-09-15T09:00:00Z' },
  { id: 'inv-3', email: 'tariq.mansoor@dealflow360.com', role: 'SALES_REP', status: 'REVOKED', department: 'EMEA Expansion', invitedBy: 'Elena Rostova', expiresAt: '2026-08-30T12:00:00Z' },
];

export const MOCK_ADMIN_CATEGORIES: AdminCategory[] = [
  { id: 'cat-hardware', name: 'Hardware & Edge Appliances', type: 'HARDWARE', discountCeiling: 15, targetMargin: 35, productCount: 3 },
  { id: 'cat-services', name: 'Professional Services', type: 'SERVICE', discountCeiling: 10, targetMargin: 60, productCount: 3 },
  { id: 'cat-subs', name: 'Cloud Subscriptions', type: 'SUBSCRIPTION', discountCeiling: 12, targetMargin: 85, productCount: 3 },
];

export const MOCK_ADMIN_PRODUCTS: AdminProduct[] = [
  { id: 'p1', name: 'Enterprise Edge Server 2U', sku: 'HW-SRV-01', categoryName: 'Hardware', categoryType: 'HARDWARE', basePrice: 4500, unit: 'UNIT', isActive: true, isPromoted: true },
  { id: 'p2', name: 'Gigabit Managed Switch 48-Port', sku: 'HW-NET-01', categoryName: 'Hardware', categoryType: 'HARDWARE', basePrice: 1200, unit: 'UNIT', isActive: true, isPromoted: false },
  { id: 'p3', name: 'POS Rugged Industrial Terminal', sku: 'HW-TERM-01', categoryName: 'Hardware', categoryType: 'HARDWARE', basePrice: 850, unit: 'UNIT', isActive: true, isPromoted: false },
  { id: 'p4', name: 'On-Site Deployment & Commissioning', sku: 'SRV-INST-01', categoryName: 'Services', categoryType: 'SERVICE', basePrice: 2500, unit: 'PROJECT', isActive: true, isPromoted: true },
  { id: 'p5', name: 'Legacy ERP Cloud Migration', sku: 'SRV-MIG-01', categoryName: 'Services', categoryType: 'SERVICE', basePrice: 6000, unit: 'PROJECT', isActive: true, isPromoted: false },
  { id: 'p6', name: '24/7 Dedicated Support SLA', sku: 'SRV-SLA-01', categoryName: 'Services', categoryType: 'SERVICE', basePrice: 1800, unit: 'YEAR', isActive: true, isPromoted: true },
  { id: 'p7', name: 'DealFlow 360 Core Platform', sku: 'SUB-CORE-01', categoryName: 'Subscriptions', categoryType: 'SUBSCRIPTION', basePrice: 120, unit: 'USER_MONTH', isActive: true, isPromoted: true },
  { id: 'p8', name: 'AI Deal Governance Add-on', sku: 'SUB-AI-01', categoryName: 'Subscriptions', categoryType: 'SUBSCRIPTION', basePrice: 80, unit: 'USER_MONTH', isActive: true, isPromoted: true },
  { id: 'p9', name: 'Executive Sales Performance Suite', sku: 'SUB-ANLY-01', categoryName: 'Subscriptions', categoryType: 'SUBSCRIPTION', basePrice: 250, unit: 'MONTH', isActive: true, isPromoted: false },
];

export const MOCK_ADMIN_RULES: AdminDiscountRule[] = [
  { id: 'rule-1', name: 'Standard Rep Discretion Ceiling', minDiscountPercent: 0, maxDiscountPercent: 5, escalationLevel: 'NONE', description: 'Discounts up to 5% auto-approved for immediate submission.', isActive: true, dealTriggersCount: 84 },
  { id: 'rule-2', name: 'Sales Manager Review Range', minDiscountPercent: 5.1, maxDiscountPercent: 15, escalationLevel: 'SALES_MANAGER', description: 'Discounts 5.1–15% require Regional Sales Manager approval.', isActive: true, dealTriggersCount: 32 },
  { id: 'rule-3', name: 'Finance & Executive Dual Approval', minDiscountPercent: 15.1, maxDiscountPercent: 100, escalationLevel: 'SALES_MANAGER_AND_FINANCE', description: 'Deep concessions >15% trigger mandatory dual approval.', isActive: true, dealTriggersCount: 11 },
];

export const MOCK_ADMIN_WAREHOUSES: AdminWarehouse[] = [
  { id: 'wh-1', name: 'Main Central Warehouse', code: 'WH-MAIN', location: 'Denver, CO', isActive: true, totalStockUnits: 165, lowStockItemsCount: 0 },
  { id: 'wh-2', name: 'East Coast Logistics Depot', code: 'WH-EAST', location: 'Newark, NJ', isActive: true, totalStockUnits: 58, lowStockItemsCount: 1 },
  { id: 'wh-3', name: 'West Fast-Hub Regional Depot', code: 'WH-WEST', location: 'San Jose, CA', isActive: true, totalStockUnits: 52, lowStockItemsCount: 1 },
];

export const MOCK_ADMIN_AUDIT_LOGS: AdminAuditLog[] = [
  { id: 'log-1', action: 'RULE_THRESHOLD_UPDATE', entity: 'DiscountApprovalRule', performedBy: 'System Administrator', details: 'Adjusted Manager Escalation threshold from 12% to 15% for Q3 margin alignment.', timestamp: '10 mins ago', level: 'INFO' },
  { id: 'log-2', action: 'INVITATION_SENT', entity: 'Invitation', performedBy: 'Marcus Vance', details: 'Issued onboarding invite to clara.oswald@dealflow360.com with role FINANCE_OPS.', timestamp: '45 mins ago', level: 'INFO' },
  { id: 'log-3', action: 'PRICE_OVERRIDE_ALERT', entity: 'Product', performedBy: 'Alex Rivera', details: 'Quotation Q-1044 breached Hardware category ceiling (18% vs 15% cap).', timestamp: '2 hours ago', level: 'WARN' },
  { id: 'log-4', action: 'STOCK_REPLENISHMENT_ORDER', entity: 'StockLevel', performedBy: 'System Worker', details: 'Auto-generated replenishment for HW-SRV-01 at Newark Depot.', timestamp: '5 hours ago', level: 'INFO' },
  { id: 'log-5', action: 'TIER_DISCOUNT_CEILING_MODIFIED', entity: 'CustomerTier', performedBy: 'System Administrator', details: 'Confirmed Platinum Tier discount ceiling at 20.0% for enterprise MSA accounts.', timestamp: '1 day ago', level: 'CRITICAL' },
];
