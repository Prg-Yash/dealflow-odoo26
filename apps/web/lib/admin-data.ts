// Data structures and mock data for DealFlow360 Admin Console
// Reference: packages/db/prisma/schema.prisma & packages/db/prisma/seed.ts

export type AdminUserRole = "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "FINANCE_OPS" | "CUSTOMER";
export type AdminCategoryType = "HARDWARE" | "SERVICE" | "SUBSCRIPTION";
export type AdminUnitType = "UNIT" | "HOUR" | "PROJECT" | "MONTH" | "USER_MONTH" | "YEAR" | "PACK";
export type AdminEscalationLevel = "NONE" | "SALES_MANAGER" | "SALES_MANAGER_AND_FINANCE";
export type AdminInvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  currency: string;
  createdById: string;
  creatorName: string;
  activeTierCount: number;
  totalMembers: number;
  createdAt: string;
}

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  department: string;
  avatarInitials: string;
  emailVerified: boolean;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  targetQuota?: number;
  commissionRate?: number;
  approvalThreshold?: number;
  historicalAvgDiscount?: number;
  managerName?: string;
  joinedAt: string;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: AdminUserRole;
  token: string;
  status: AdminInvitationStatus;
  department: string;
  assignedTerritory?: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  type: AdminCategoryType;
  discountCeiling: number; // e.g. 15.0%
  targetMargin: number;    // e.g. 35.0%
  productCount: number;
  description: string;
}

export interface AdminProductVariant {
  id: string;
  attributeName: string;
  attributeValue: string;
  sku: string;
  extraPrice: number;
  costPriceDelta: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryType: AdminCategoryType;
  basePrice: number;
  costPrice: number;
  unit: AdminUnitType;
  taxRate: number;
  isPromoted: boolean;
  isActive: boolean;
  stockOnHand: number;
  stockReserved: number;
  variants?: AdminProductVariant[];
}

export interface AdminDiscountRule {
  id: string;
  name: string;
  minDiscountPercent: number;
  maxDiscountPercent: number;
  minBlendedRiskScore: number;
  maxBlendedRiskScore: number;
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  escalationLevel: AdminEscalationLevel;
  description: string;
  isActive: boolean;
  dealTriggersCount: number;
}

export interface AdminCustomerTier {
  id: string;
  name: string;
  code: string; // "BRONZE", "SILVER", "GOLD", "PLATINUM"
  discountCeiling: number; // e.g. 5, 10, 15, 20%
  customerCount: number;
  description: string;
}

export interface AdminPriceList {
  id: string;
  name: string;
  currency: string;
  tierCode: string;
  tierName: string;
  itemCount: number;
  isDefault: boolean;
  updatedAt: string;
}

export interface AdminWarehouse {
  id: string;
  name: string;
  code: string; // "WH-MAIN", "WH-EAST", "WH-WEST"
  location: string;
  shippingCostWeight: number;
  isActive: boolean;
  totalStockUnits: number;
  totalStockValue: number;
  lowStockItemsCount: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entity: string;
  performedBy: string;
  details: string;
  timestamp: string;
  level: "INFO" | "WARN" | "CRITICAL";
}

// -----------------------------------------------------------------------------
// Seeded Master Data reflecting Prisma Schema & seed.ts
// -----------------------------------------------------------------------------

export const MOCK_ADMIN_ORG: AdminOrg = {
  id: "org-apex-01",
  name: "Apex Enterprise Technologies Inc",
  slug: "apex-tech",
  currency: "INR",
  createdById: "usr-admin-01",
  creatorName: "System Administrator",
  activeTierCount: 4,
  totalMembers: 8,
  createdAt: "2026-01-15T08:00:00Z",
};

export const MOCK_ADMIN_MEMBERS: AdminMember[] = [
  {
    id: "usr-admin-01",
    name: "System Administrator",
    email: "admin@dealflow360.com",
    role: "ADMIN",
    department: "Executive Operations",
    avatarInitials: "SA",
    emailVerified: true,
    status: "ACTIVE",
    joinedAt: "2026-01-15",
  },
  {
    id: "usr-mgr-01",
    name: "Elena Rostova",
    email: "manager.elena@dealflow360.com",
    role: "SALES_MANAGER",
    department: "Enterprise Solutions",
    avatarInitials: "ER",
    emailVerified: true,
    status: "ACTIVE",
    approvalThreshold: 15.0,
    joinedAt: "2026-01-18",
  },
  {
    id: "usr-rep-01",
    name: "Alex Rivera",
    email: "rep.alex@dealflow360.com",
    role: "SALES_REP",
    department: "Mid-Market Commercial",
    avatarInitials: "AR",
    emailVerified: true,
    status: "ACTIVE",
    targetQuota: 250000,
    commissionRate: 8.5,
    historicalAvgDiscount: 6.5,
    managerName: "Elena Rostova",
    joinedAt: "2026-02-01",
  },
  {
    id: "usr-rep-02",
    name: "Sarah Chen",
    email: "rep.sarah@dealflow360.com",
    role: "SALES_REP",
    department: "Strategic Enterprise",
    avatarInitials: "SC",
    emailVerified: true,
    status: "ACTIVE",
    targetQuota: 300000,
    commissionRate: 9.0,
    historicalAvgDiscount: 8.0,
    managerName: "Elena Rostova",
    joinedAt: "2026-02-05",
  },
  {
    id: "usr-fin-01",
    name: "Marcus Vance",
    email: "finance.marcus@dealflow360.com",
    role: "FINANCE_OPS",
    department: "Global Revenue Operations",
    avatarInitials: "MV",
    emailVerified: true,
    status: "ACTIVE",
    approvalThreshold: 100.0,
    joinedAt: "2026-01-20",
  },
];

export const MOCK_ADMIN_INVITATIONS: AdminInvitation[] = [
  {
    id: "inv-rep-david-01",
    email: "david.miller@dealflow360.com",
    role: "SALES_REP",
    token: "invite-token-rep-david-8f72a",
    status: "PENDING",
    department: "Enterprise Sales",
    assignedTerritory: "West Coast Region",
    invitedBy: "System Administrator",
    expiresAt: "2026-09-12T14:00:00Z",
    createdAt: "2026-09-05T10:30:00Z",
  },
  {
    id: "inv-fin-clara-02",
    email: "clara.oswald@dealflow360.com",
    role: "FINANCE_OPS",
    token: "invite-token-fin-clara-3b91c",
    status: "PENDING",
    department: "Revenue Accounting",
    invitedBy: "Marcus Vance",
    expiresAt: "2026-09-15T09:00:00Z",
    createdAt: "2026-09-04T16:15:00Z",
  },
  {
    id: "inv-rep-tariq-03",
    email: "tariq.mansoor@dealflow360.com",
    role: "SALES_REP",
    token: "invite-token-rep-tariq-6c44f",
    status: "REVOKED",
    department: "EMEA Expansion",
    invitedBy: "Elena Rostova",
    expiresAt: "2026-08-30T12:00:00Z",
    createdAt: "2026-08-23T11:00:00Z",
  },
];

export const MOCK_ADMIN_CATEGORIES: AdminCategory[] = [
  {
    id: "cat-hardware",
    name: "Hardware & Edge Appliances",
    slug: "hardware",
    type: "HARDWARE",
    discountCeiling: 15.0,
    targetMargin: 35.0,
    productCount: 3,
    description: "Enterprise rackmount servers, L3 network switches, and POS rugged appliances.",
  },
  {
    id: "cat-services",
    name: "Professional & Deployment Services",
    slug: "services",
    type: "SERVICE",
    discountCeiling: 10.0,
    targetMargin: 60.0,
    productCount: 3,
    description: "Cloud migration, turnkey systems integration, and dedicated 24/7 SLA contracts.",
  },
  {
    id: "cat-subscriptions",
    name: "Cloud Subscriptions & Add-ons",
    slug: "subscriptions",
    type: "SUBSCRIPTION",
    discountCeiling: 12.0,
    targetMargin: 85.0,
    productCount: 3,
    description: "SaaS seat licenses, AI deal governance engine, and executive sales analytics.",
  },
];

export const MOCK_ADMIN_PRODUCTS: AdminProduct[] = [
  {
    id: "prod-hw-01",
    name: "Enterprise Edge Server 2U",
    sku: "HW-SRV-01",
    description: "Dual AMD EPYC, 64GB DDR5 ECC RAM, Hot-swap Redundant Power, 2x 10GbE SFP+",
    categoryId: "cat-hardware",
    categoryName: "Hardware & Edge Appliances",
    categoryType: "HARDWARE",
    basePrice: 4500.0,
    costPrice: 2925.0,
    unit: "UNIT",
    taxRate: 0.08,
    isPromoted: true,
    isActive: true,
    stockOnHand: 45,
    stockReserved: 5,
    variants: [
      { id: "var-1", attributeName: "RAM", attributeValue: "64GB DDR5", sku: "HW-SRV-01-64", extraPrice: 0, costPriceDelta: 0 },
      { id: "var-2", attributeName: "RAM", attributeValue: "128GB DDR5", sku: "HW-SRV-01-128", extraPrice: 850, costPriceDelta: 500 },
    ],
  },
  {
    id: "prod-hw-02",
    name: "Gigabit Managed Switch 48-Port",
    sku: "HW-NET-01",
    description: "L3 Managed Switch, 48x 1GbE RJ45 + 4x 10G SFP+ Uplinks, PoE+ 740W",
    categoryId: "cat-hardware",
    categoryName: "Hardware & Edge Appliances",
    categoryType: "HARDWARE",
    basePrice: 1200.0,
    costPrice: 780.0,
    unit: "UNIT",
    taxRate: 0.08,
    isPromoted: false,
    isActive: true,
    stockOnHand: 95,
    stockReserved: 7,
  },
  {
    id: "prod-hw-03",
    name: "POS Rugged Industrial Terminal",
    sku: "HW-TERM-01",
    description: "IP65 Rated All-in-One Touchscreen Terminal, Barcode & NFC reader integrated",
    categoryId: "cat-hardware",
    categoryName: "Hardware & Edge Appliances",
    categoryType: "HARDWARE",
    basePrice: 850.0,
    costPrice: 550.0,
    unit: "UNIT",
    taxRate: 0.08,
    isPromoted: false,
    isActive: true,
    stockOnHand: 135,
    stockReserved: 10,
  },
  {
    id: "prod-srv-01",
    name: "On-Site Deployment & Commissioning",
    sku: "SRV-INST-01",
    description: "Rack mounting, cable management, firmware update, and high-availability verification",
    categoryId: "cat-services",
    categoryName: "Professional & Deployment Services",
    categoryType: "SERVICE",
    basePrice: 2500.0,
    costPrice: 1000.0,
    unit: "PROJECT",
    taxRate: 0.0,
    isPromoted: true,
    isActive: true,
    stockOnHand: 999,
    stockReserved: 0,
  },
  {
    id: "prod-srv-02",
    name: "Legacy ERP Cloud Migration Service",
    sku: "SRV-MIG-01",
    description: "Full ETL migration of sales history, catalog, customer records, and ledger mapping",
    categoryId: "cat-services",
    categoryName: "Professional & Deployment Services",
    categoryType: "SERVICE",
    basePrice: 6000.0,
    costPrice: 2400.0,
    unit: "PROJECT",
    taxRate: 0.0,
    isPromoted: false,
    isActive: true,
    stockOnHand: 999,
    stockReserved: 0,
  },
  {
    id: "prod-srv-03",
    name: "24/7 Dedicated Support SLA (Annual)",
    sku: "SRV-SLA-01",
    description: "15-minute guaranteed critical incident response, designated solutions engineer",
    categoryId: "cat-services",
    categoryName: "Professional & Deployment Services",
    categoryType: "SERVICE",
    basePrice: 1800.0,
    costPrice: 720.0,
    unit: "YEAR",
    taxRate: 0.0,
    isPromoted: true,
    isActive: true,
    stockOnHand: 999,
    stockReserved: 0,
  },
  {
    id: "prod-sub-01",
    name: "DealFlow 360 Core Platform License",
    sku: "SUB-CORE-01",
    description: "Per-seat monthly license for sales reps, CPQ quotation builder, and workflow routing",
    categoryId: "cat-subscriptions",
    categoryName: "Cloud Subscriptions & Add-ons",
    categoryType: "SUBSCRIPTION",
    basePrice: 120.0,
    costPrice: 18.0,
    unit: "USER_MONTH",
    taxRate: 0.0,
    isPromoted: true,
    isActive: true,
    stockOnHand: 9999,
    stockReserved: 0,
  },
  {
    id: "prod-sub-02",
    name: "AI Deal Governance & Risk Engine Add-on",
    sku: "SUB-AI-01",
    description: "Real-time margin anomaly detection, predictive approval routing, and upsell ranker",
    categoryId: "cat-subscriptions",
    categoryName: "Cloud Subscriptions & Add-ons",
    categoryType: "SUBSCRIPTION",
    basePrice: 80.0,
    costPrice: 12.0,
    unit: "USER_MONTH",
    taxRate: 0.0,
    isPromoted: true,
    isActive: true,
    stockOnHand: 9999,
    stockReserved: 0,
  },
  {
    id: "prod-sub-03",
    name: "Executive Sales Performance Suite",
    sku: "SUB-ANLY-01",
    description: "Pipeline velocity tracking, rep quota attribution, and automated exportable reports",
    categoryId: "cat-subscriptions",
    categoryName: "Cloud Subscriptions & Add-ons",
    categoryType: "SUBSCRIPTION",
    basePrice: 250.0,
    costPrice: 35.0,
    unit: "MONTH",
    taxRate: 0.0,
    isPromoted: false,
    isActive: true,
    stockOnHand: 9999,
    stockReserved: 0,
  },
];

export const MOCK_ADMIN_RULES: AdminDiscountRule[] = [
  {
    id: "rule-rep-discretion",
    name: "Standard Rep Discretion Ceiling",
    minDiscountPercent: 0.0,
    maxDiscountPercent: 5.0,
    minBlendedRiskScore: 0.0,
    maxBlendedRiskScore: 5.0,
    requiresManagerApproval: false,
    requiresFinanceApproval: false,
    escalationLevel: "NONE",
    description: "Discounts up to 5% with low risk score are auto-approved for immediate client submission.",
    isActive: true,
    dealTriggersCount: 84,
  },
  {
    id: "rule-manager-escalation",
    name: "Sales Manager Review Range",
    minDiscountPercent: 5.1,
    maxDiscountPercent: 15.0,
    minBlendedRiskScore: 5.1,
    maxBlendedRiskScore: 20.0,
    requiresManagerApproval: true,
    requiresFinanceApproval: false,
    escalationLevel: "SALES_MANAGER",
    description: "Discounts between 5.1% and 15% or moderate risk scores require Regional Sales Manager approval.",
    isActive: true,
    dealTriggersCount: 32,
  },
  {
    id: "rule-finance-escalation",
    name: "Finance & Executive Dual Approval",
    minDiscountPercent: 15.1,
    maxDiscountPercent: 100.0,
    minBlendedRiskScore: 20.1,
    maxBlendedRiskScore: 100.0,
    requiresManagerApproval: true,
    requiresFinanceApproval: true,
    escalationLevel: "SALES_MANAGER_AND_FINANCE",
    description: "Deep concessions >15% or high margin risk trigger mandatory dual approval by Sales Manager and Finance Ops.",
    isActive: true,
    dealTriggersCount: 11,
  },
];

export const MOCK_ADMIN_CUSTOMER_TIERS: AdminCustomerTier[] = [
  {
    id: "tier-bronze",
    code: "BRONZE",
    name: "Bronze Tier",
    discountCeiling: 5.0,
    customerCount: 12,
    description: "Standard commercial accounts and newly onboarded customers. Cap: 5%.",
  },
  {
    id: "tier-silver",
    code: "SILVER",
    name: "Silver Tier",
    discountCeiling: 10.0,
    customerCount: 8,
    description: "Established mid-market clients with recurring volume. Cap: 10%.",
  },
  {
    id: "tier-gold",
    code: "GOLD",
    name: "Gold Tier",
    discountCeiling: 15.0,
    customerCount: 5,
    description: "Strategic high-volume enterprise partners. Cap: 15%.",
  },
  {
    id: "tier-platinum",
    code: "PLATINUM",
    name: "Platinum Tier",
    discountCeiling: 20.0,
    customerCount: 2,
    description: "Global key accounts with multi-national enterprise agreements. Cap: 20%.",
  },
];

export const MOCK_ADMIN_PRICE_LISTS: AdminPriceList[] = [
  {
    id: "pl-gold",
    name: "Gold Tier Preferred Price List",
    currency: "INR",
    tierCode: "GOLD",
    tierName: "Gold Tier",
    itemCount: 9,
    isDefault: false,
    updatedAt: "2026-03-01",
  },
  {
    id: "pl-standard",
    name: "Global Master List Price Schedule",
    currency: "INR",
    tierCode: "BRONZE",
    tierName: "Standard List",
    itemCount: 9,
    isDefault: true,
    updatedAt: "2026-02-15",
  },
  {
    id: "pl-plat",
    name: "Platinum Global Master Agreement 2026",
    currency: "INR",
    tierCode: "PLATINUM",
    tierName: "Platinum Tier",
    itemCount: 9,
    isDefault: false,
    updatedAt: "2026-02-28",
  },
];

export const MOCK_ADMIN_WAREHOUSES: AdminWarehouse[] = [
  {
    id: "wh-denver-01",
    name: "Main Central Warehouse",
    code: "WH-MAIN",
    location: "Denver, Colorado",
    shippingCostWeight: 1.0,
    isActive: true,
    totalStockUnits: 165,
    totalStockValue: 312500,
    lowStockItemsCount: 0,
  },
  {
    id: "wh-newark-02",
    name: "East Coast Logistics Depot",
    code: "WH-EAST",
    location: "Newark, New Jersey",
    shippingCostWeight: 1.3,
    isActive: true,
    totalStockUnits: 58,
    totalStockValue: 85200,
    lowStockItemsCount: 1,
  },
  {
    id: "wh-sanjose-03",
    name: "West Fast-Hub Regional Depot",
    code: "WH-WEST",
    location: "San Jose, California",
    shippingCostWeight: 1.4,
    isActive: true,
    totalStockUnits: 52,
    totalStockValue: 91400,
    lowStockItemsCount: 1,
  },
];

export const MOCK_ADMIN_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: "log-1",
    action: "RULE_THRESHOLD_UPDATE",
    entity: "DiscountApprovalRule",
    performedBy: "System Administrator",
    details: "Adjusted Manager Escalation threshold from 12% to 15% for Q3 margin alignment.",
    timestamp: "10 mins ago",
    level: "INFO",
  },
  {
    id: "log-2",
    action: "INVITATION_SENT",
    entity: "Invitation",
    performedBy: "Marcus Vance",
    details: "Issued onboarding invite to clara.oswald@dealflow360.com with role FINANCE_OPS.",
    timestamp: "45 mins ago",
    level: "INFO",
  },
  {
    id: "log-3",
    action: "PRICE_OVERRIDE_ALERT",
    entity: "Product",
    performedBy: "Alex Rivera",
    details: "Quotation Q-1044 breached Category Discount Ceiling for Hardware (18% vs 15% cap).",
    timestamp: "2 hours ago",
    level: "WARN",
  },
  {
    id: "log-4",
    action: "STOCK_REPLENISHMENT_ORDER",
    entity: "StockLevel",
    performedBy: "System Worker",
    details: "Auto-generated replenishment requisition for HW-SRV-01 at Newark Depot (8 units remaining).",
    timestamp: "5 hours ago",
    level: "INFO",
  },
  {
    id: "log-5",
    action: "TIER_DISCOUNT_CEILING_MODIFIED",
    entity: "CustomerTier",
    performedBy: "System Administrator",
    details: "Confirmed Platinum Tier discount ceiling at 20.0% for enterprise MSA accounts.",
    timestamp: "1 day ago",
    level: "CRITICAL",
  },
];
