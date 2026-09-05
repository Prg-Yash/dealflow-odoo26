export type DealStage = "draft" | "pending" | "approved" | "negotiation" | "confirmed";

export interface QuotationLineItem {
  id: string;
  name: string;
  description: string;
  category: "license" | "services" | "support" | "hardware";
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
}

export interface Quotation {
  id: string; // e.g. "Q-1042"
  title: string;
  customerName: string;
  customerOrg: string;
  customerEmail: string;
  stage: DealStage;
  tier: "Standard" | "Silver" | "Gold" | "Enterprise";
  revision: number;
  contractTotal: number;
  arr: number;
  capex: number;
  avgMarginPercent: number;
  createdAt: string;
  validUntil: string;
  assignedRep: string;
  approverNeeded?: "None" | "Sales Manager" | "Finance" | "VP of Sales";
  items: QuotationLineItem[];
}

export interface PipelineStageConfig {
  id: DealStage;
  label: string;
  count: number;
  value: number;
  barColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: "draft",
    label: "Draft",
    count: 3,
    value: 112000,
    barColor: "bg-slate-300",
    textColor: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
  },
  {
    id: "pending",
    label: "Pending Approval",
    count: 4,
    value: 340000,
    barColor: "bg-[#ff5e3a]",
    textColor: "text-[#ff5e3a]",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    id: "approved",
    label: "Approved",
    count: 5,
    value: 398000,
    barColor: "bg-sky-500",
    textColor: "text-sky-700",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-200",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    count: 2,
    value: 172000,
    barColor: "bg-amber-400",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "confirmed",
    label: "Confirmed / PO",
    count: 6,
    value: 398000,
    barColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: "Q-1042",
    title: "Enterprise Cloud & Operations License",
    customerName: "Alex Rivera",
    customerOrg: "Acme Corporation",
    customerEmail: "customer@acme.com",
    stage: "pending",
    tier: "Gold",
    revision: 3,
    contractTotal: 68500,
    arr: 17500,
    capex: 50900,
    avgMarginPercent: 52.4,
    createdAt: "2026-03-01",
    validUntil: "2026-03-31",
    assignedRep: "Sarah Jenkins",
    approverNeeded: "Sales Manager",
    items: [
      {
        id: "item-1",
        name: "DealFlow360 Enterprise Node (x50 Seats)",
        description: "Includes workflow automation, rule engines & live analytics",
        category: "license",
        quantity: 50,
        unitPrice: 720,
        costPrice: 280,
        discountPercent: 12,
      },
      {
        id: "item-2",
        name: "Dedicated Custom Integration & SSO",
        description: "PostgreSQL enterprise sync, SAML/Okta custom directory",
        category: "services",
        quantity: 1,
        unitPrice: 8500,
        costPrice: 3500,
        discountPercent: 0,
      },
      {
        id: "item-3",
        name: "24/7 SLA & Dedicated Solutions Architect",
        description: "1-hour critical response SLA, quarterly architecture review",
        category: "support",
        quantity: 1,
        unitPrice: 9000,
        costPrice: 4200,
        discountPercent: 15,
      },
    ],
  },
  {
    id: "Q-1043",
    title: "Supply Chain Operations Suite",
    customerName: "Marcus Vance",
    customerOrg: "Apex Logic Systems",
    customerEmail: "m.vance@apexlogic.io",
    stage: "draft",
    tier: "Standard",
    revision: 1,
    contractTotal: 34000,
    arr: 12000,
    capex: 22000,
    avgMarginPercent: 52.0,
    createdAt: "2026-03-03",
    validUntil: "2026-04-15",
    assignedRep: "Sarah Jenkins",
    approverNeeded: "None",
    items: [
      {
        id: "item-4",
        name: "Core Workflow Automation Seats",
        description: "Tier 1 automation builder with multi-stage approval triggers",
        category: "license",
        quantity: 20,
        unitPrice: 600,
        costPrice: 240,
        discountPercent: 5,
      },
      {
        id: "item-5",
        name: "Onboarding & ERP Data Ingestion",
        description: "Direct Odoo/NetSuite historical ledger ingestion",
        category: "services",
        quantity: 1,
        unitPrice: 22000,
        costPrice: 11000,
        discountPercent: 0,
      },
    ],
  },
  {
    id: "Q-1044",
    title: "Global Omnichannel Commerce Platform",
    customerName: "Elena Rostova",
    customerOrg: "OmniRetail Global",
    customerEmail: "elena@omniretail.com",
    stage: "pending",
    tier: "Enterprise",
    revision: 2,
    contractTotal: 114200,
    arr: 45000,
    capex: 69200,
    avgMarginPercent: 41.5,
    createdAt: "2026-02-28",
    validUntil: "2026-03-20",
    assignedRep: "Sarah Jenkins",
    approverNeeded: "Finance",
    items: [
      {
        id: "item-6",
        name: "Multi-Storefront Operations Cluster",
        description: "12 active production regional nodes with failover",
        category: "license",
        quantity: 12,
        unitPrice: 5500,
        costPrice: 3200,
        discountPercent: 18,
      },
      {
        id: "item-7",
        name: "Enterprise Architecture Deployment",
        description: "Multi-datacenter zero-trust cluster deployment",
        category: "services",
        quantity: 1,
        unitPrice: 48200,
        costPrice: 26000,
        discountPercent: 10,
      },
    ],
  },
  {
    id: "Q-1045",
    title: "Real-Time Fleet Telemetry & Billing",
    customerName: "David Chen",
    customerOrg: "Strata Logistics",
    customerEmail: "d.chen@stratalogistics.com",
    stage: "approved",
    tier: "Silver",
    revision: 2,
    contractTotal: 45000,
    arr: 28000,
    capex: 17000,
    avgMarginPercent: 48.0,
    createdAt: "2026-02-25",
    validUntil: "2026-03-25",
    assignedRep: "Sarah Jenkins",
    approverNeeded: "None",
    items: [
      {
        id: "item-8",
        name: "Fleet Telemetry Hub Seats (x30)",
        description: "IoT GPS tracking, fuel metric sync, and driver performance",
        category: "license",
        quantity: 30,
        unitPrice: 800,
        costPrice: 380,
        discountPercent: 8,
      },
    ],
  },
  {
    id: "Q-1046",
    title: "Semiconductor Analytics Pipeline",
    customerName: "Kavita Patel",
    customerOrg: "Northstar Labs",
    customerEmail: "k.patel@northstarlabs.com",
    stage: "confirmed",
    tier: "Enterprise",
    revision: 4,
    contractTotal: 96500,
    arr: 62000,
    capex: 34500,
    avgMarginPercent: 54.2,
    createdAt: "2026-02-14",
    validUntil: "2026-03-14",
    assignedRep: "Sarah Jenkins",
    approverNeeded: "None",
    items: [
      {
        id: "item-9",
        name: "High-Throughput Analytics Cluster",
        description: "High concurrency SQL querying and anomaly detection",
        category: "license",
        quantity: 1,
        unitPrice: 75000,
        costPrice: 32000,
        discountPercent: 10,
      },
    ],
  },
  {
    id: "Q-1047",
    title: "Healthcare Compliance & Document Vault",
    customerName: "Robert Thorne",
    customerOrg: "Beta Industries",
    customerEmail: "r.thorne@betaind.com",
    stage: "negotiation",
    tier: "Gold",
    revision: 3,
    contractTotal: 72000,
    arr: 38000,
    capex: 34000,
    avgMarginPercent: 44.0,
    createdAt: "2026-03-02",
    validUntil: "2026-04-01",
    assignedRep: "Sarah Jenkins",
    approverNeeded: "Sales Manager",
    items: [
      {
        id: "item-10",
        name: "HIPAA Compliant Document Vault",
        description: "End-to-end encrypted contract signing and tamper verification",
        category: "license",
        quantity: 40,
        unitPrice: 950,
        costPrice: 480,
        discountPercent: 16,
      },
    ],
  },
];

export const CATALOG_PRODUCTS = [
  {
    id: "prod-seats",
    name: "DealFlow360 Enterprise Seats",
    description: "Full sales ops workspace, quoting engine & kanban deals board",
    category: "license" as const,
    unitPrice: 720,
    costPrice: 280,
  },
  {
    id: "prod-integration",
    name: "Dedicated Custom Integration & SSO",
    description: "PostgreSQL enterprise sync, SAML/Okta directory connector",
    category: "services" as const,
    unitPrice: 8500,
    costPrice: 3500,
  },
  {
    id: "prod-sla",
    name: "24/7 SLA & Solution Architect",
    description: "1-hour response SLA, quarterly architecture review",
    category: "support" as const,
    unitPrice: 9000,
    costPrice: 4200,
  },
  {
    id: "prod-hardware",
    name: "Edge Gateway Node (Hardware)",
    description: "Ruggedized IoT telemetry gateway with LTE failover",
    category: "hardware" as const,
    unitPrice: 1850,
    costPrice: 950,
  },
  {
    id: "prod-training",
    name: "Executive Onboarding & Training",
    description: "4-week enablement program for sales & finance teams",
    category: "services" as const,
    unitPrice: 5000,
    costPrice: 2000,
  },
];
