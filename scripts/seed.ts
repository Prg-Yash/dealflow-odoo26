import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import {
  PrismaClient,
  UserRole,
  CategoryType,
  UnitType,
  QuoteStage,
  ApprovalStatus,
  ApprovalLevel,
  StockMovementType,
  FulfillmentStatus,
  ShipmentStatus,
  BackorderStatus,
  SubscriptionStatus,
  BillingInterval,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  CreditNoteStatus,
  CounterProposalStatus,
} from "@prisma/client";

// Load environment variables from all standard project locations
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "packages/db/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// Helper for consistent password hashing
async function generatePasswordHashes(rawPassword: string = "Password123!") {
  let betterAuthHash = "";
  try {
    const betterCrypto = await import("better-auth/crypto");
    if (betterCrypto && typeof (betterCrypto as any).hashPassword === "function") {
      betterAuthHash = await (betterCrypto as any).hashPassword(rawPassword);
    }
  } catch {
    // fallback
  }

  // Scrypt hash compatible with apps/api/src/lib/passwords.ts (salt:key)
  const scryptHash = await new Promise<string>((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(rawPassword, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });

  return betterAuthHash || scryptHash;
}

// Deterministic Pseudo-Random helper for repeatable, varied realistic data
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ---------------------------------------------------------------------------
// MASTER SEED DEFINITIONS
// ---------------------------------------------------------------------------

const ORGANIZATIONS_CONFIG = [
  {
    id: "org-apex-01",
    name: "Apex Enterprise Technologies Inc",
    slug: "apex-tech",
    currency: "INR",
    admin: {
      id: "usr-apex-admin",
      name: "Alex Vance",
      email: "admin@dealflow360.com",
      altEmail: "admin.apex@dealflow360.com",
    },
    managers: [
      { id: "usr-apex-mgr-01", name: "Elena Rostova", email: "manager@dealflow360.com", altEmail: "manager.elena@dealflow360.com", dept: "Enterprise Core Sales", threshold: 15.0 },
      { id: "usr-apex-mgr-02", name: "David Sterling", email: "manager.david@dealflow360.com", dept: "Strategic Key Accounts", threshold: 20.0 },
      { id: "usr-apex-mgr-03", name: "Priya Nair", email: "manager.priya@dealflow360.com", dept: "Cloud Solutions & Infrastructure", threshold: 15.0 },
      { id: "usr-apex-mgr-04", name: "Carlos Mendez", email: "manager.carlos@dealflow360.com", dept: "Commercial Mid-Market", threshold: 12.5 },
    ],
    finance: [
      { id: "usr-apex-fin-01", name: "Marcus Vance", email: "finance@dealflow360.com", altEmail: "finance.marcus@dealflow360.com", dept: "Revenue Operations" },
      { id: "usr-apex-fin-02", name: "Olivia Thorne", email: "finance.olivia@dealflow360.com", dept: "Corporate Controllership" },
      { id: "usr-apex-fin-03", name: "Liam O'Connor", email: "finance.liam@dealflow360.com", dept: "Commercial Deal Desk" },
      { id: "usr-apex-fin-04", name: "Mei-Ling Zhou", email: "finance.meiling@dealflow360.com", dept: "Credit & Risk Underwriting" },
    ],
    reps: [
      { id: "usr-apex-rep-01", repId: "sr-apex-01", name: "Alex Rivera", email: "rep@dealflow360.com", altEmail: "rep.alex@dealflow360.com", mgrIndex: 0, quota: 300000, comm: 8.5, avgDisc: 6.5 },
      { id: "usr-apex-rep-02", repId: "sr-apex-02", name: "Sarah Chen", email: "rep.sarah@dealflow360.com", mgrIndex: 1, quota: 350000, comm: 9.0, avgDisc: 8.0 },
      { id: "usr-apex-rep-03", repId: "sr-apex-03", name: "James Wilson", email: "rep.james@dealflow360.com", mgrIndex: 2, quota: 275000, comm: 8.0, avgDisc: 5.5 },
      { id: "usr-apex-rep-04", repId: "sr-apex-04", name: "Maya Patel", email: "rep.maya@dealflow360.com", mgrIndex: 3, quota: 320000, comm: 9.5, avgDisc: 7.2 },
    ],
    warehouses: [
      { id: "wh-apex-denver", name: "Main Central Warehouse", code: "WH-MAIN", location: "Denver, Colorado", weight: 1.0 },
      { id: "wh-apex-newark", name: "East Coast Logistics Depot", code: "WH-EAST", location: "Newark, New Jersey", weight: 1.25 },
      { id: "wh-apex-sanjose", name: "West Fast-Hub", code: "WH-WEST", location: "San Jose, California", weight: 1.4 },
    ],
    quotePrefix: "QT-2026-",
  },
  {
    id: "org-nexus-02",
    name: "Nexus Cloud Systems",
    slug: "nexus-cloud",
    currency: "USD",
    admin: {
      id: "usr-nexus-admin",
      name: "Rachel Sterling",
      email: "admin.nexus@dealflow360.com",
    },
    managers: [
      { id: "usr-nexus-mgr-01", name: "Sarah Jenkins", email: "nexus.mgr.sarah@dealflow360.com", dept: "North America Enterprise", threshold: 15.0 },
      { id: "usr-nexus-mgr-02", name: "Michael Chang", email: "nexus.mgr.michael@dealflow360.com", dept: "SaaS & Platform Growth", threshold: 20.0 },
      { id: "usr-nexus-mgr-03", name: "Jessica Taylor", email: "nexus.mgr.jessica@dealflow360.com", dept: "Healthcare & Life Sciences", threshold: 15.0 },
      { id: "usr-nexus-mgr-04", name: "Omar Farooq", email: "nexus.mgr.omar@dealflow360.com", dept: "Emerging Tech & AI", threshold: 12.5 },
    ],
    finance: [
      { id: "usr-nexus-fin-01", name: "Jonathan Reynolds", email: "nexus.fin.jonathan@dealflow360.com", dept: "Global Financial Planning" },
      { id: "usr-nexus-fin-02", name: "Emily Watson", email: "nexus.fin.emily@dealflow360.com", dept: "Revenue Accounting" },
      { id: "usr-nexus-fin-03", name: "Daniel Kim", email: "nexus.fin.daniel@dealflow360.com", dept: "Commercial Contracts" },
      { id: "usr-nexus-fin-04", name: "Chloe Bennett", email: "nexus.fin.chloe@dealflow360.com", dept: "Treasury & Risk" },
    ],
    reps: [
      { id: "usr-nexus-rep-01", repId: "sr-nexus-01", name: "Ethan Brooks", email: "nexus.rep.ethan@dealflow360.com", mgrIndex: 0, quota: 400000, comm: 9.0, avgDisc: 7.0 },
      { id: "usr-nexus-rep-02", repId: "sr-nexus-02", name: "Zoe Anderson", email: "nexus.rep.zoe@dealflow360.com", mgrIndex: 1, quota: 380000, comm: 8.5, avgDisc: 6.0 },
      { id: "usr-nexus-rep-03", repId: "sr-nexus-03", name: "Lucas Martin", email: "nexus.rep.lucas@dealflow360.com", mgrIndex: 2, quota: 320000, comm: 8.0, avgDisc: 5.8 },
      { id: "usr-nexus-rep-04", repId: "sr-nexus-04", name: "Hannah Lee", email: "nexus.rep.hannah@dealflow360.com", mgrIndex: 3, quota: 450000, comm: 10.0, avgDisc: 8.5 },
    ],
    warehouses: [
      { id: "wh-nexus-austin", name: "Austin Distribution Center", code: "WH-ATX", location: "Austin, Texas", weight: 1.0 },
      { id: "wh-nexus-seattle", name: "Pacific Northwest Fulfillment Depot", code: "WH-SEA", location: "Seattle, Washington", weight: 1.2 },
      { id: "wh-nexus-atlanta", name: "Southeast Mega Hub", code: "WH-ATL", location: "Atlanta, Georgia", weight: 1.35 },
    ],
    quotePrefix: "QT-NEXUS-",
  },
  {
    id: "org-vanguard-03",
    name: "Vanguard Industrial Dynamics",
    slug: "vanguard-ind",
    currency: "EUR",
    admin: {
      id: "usr-vanguard-admin",
      name: "Viktor Brandt",
      email: "admin.vanguard@dealflow360.com",
    },
    managers: [
      { id: "usr-vanguard-mgr-01", name: "Hans Weber", email: "vanguard.mgr.hans@dealflow360.com", dept: "DACH Region Industry", threshold: 15.0 },
      { id: "usr-vanguard-mgr-02", name: "Claire Dubois", email: "vanguard.mgr.claire@dealflow360.com", dept: "Western Europe Solutions", threshold: 18.0 },
      { id: "usr-vanguard-mgr-03", name: "Matteo Rossi", email: "vanguard.mgr.matteo@dealflow360.com", dept: "Southern Europe & Marine", threshold: 15.0 },
      { id: "usr-vanguard-mgr-04", name: "Astrid Lindholm", email: "vanguard.mgr.astrid@dealflow360.com", dept: "Nordics Automation", threshold: 12.0 },
    ],
    finance: [
      { id: "usr-vanguard-fin-01", name: "Klaus Becker", email: "vanguard.fin.klaus@dealflow360.com", dept: "European Treasury & Audit" },
      { id: "usr-vanguard-fin-02", name: "Sophie Laurent", email: "vanguard.fin.sophie@dealflow360.com", dept: "Commercial Gating" },
      { id: "usr-vanguard-fin-03", name: "Lorenzo Silva", email: "vanguard.fin.lorenzo@dealflow360.com", dept: "Cross-Border Logistics Finance" },
      { id: "usr-vanguard-fin-04", name: "Greta Nygard", email: "vanguard.fin.greta@dealflow360.com", dept: "Contract Compliance" },
    ],
    reps: [
      { id: "usr-vanguard-rep-01", repId: "sr-vanguard-01", name: "Stefan Mueller", email: "vanguard.rep.stefan@dealflow360.com", mgrIndex: 0, quota: 350000, comm: 8.5, avgDisc: 6.2 },
      { id: "usr-vanguard-rep-02", repId: "sr-vanguard-02", name: "Camille Bernard", email: "vanguard.rep.camille@dealflow360.com", mgrIndex: 1, quota: 320000, comm: 8.0, avgDisc: 5.5 },
      { id: "usr-vanguard-rep-03", repId: "sr-vanguard-03", name: "Marco Bianchi", email: "vanguard.rep.marco@dealflow360.com", mgrIndex: 2, quota: 300000, comm: 8.5, avgDisc: 7.0 },
      { id: "usr-vanguard-rep-04", repId: "sr-vanguard-04", name: "Freja Larsson", email: "vanguard.rep.freja@dealflow360.com", mgrIndex: 3, quota: 375000, comm: 9.0, avgDisc: 6.8 },
    ],
    warehouses: [
      { id: "wh-vanguard-frankfurt", name: "Frankfurt Central Logistics Base", code: "WH-FRA", location: "Frankfurt, Germany", weight: 1.0 },
      { id: "wh-vanguard-rotterdam", name: "Rotterdam Port Warehouse", code: "WH-RTM", location: "Rotterdam, Netherlands", weight: 1.15 },
      { id: "wh-vanguard-lyon", name: "Lyon Distribution Hub", code: "WH-LYS", location: "Lyon, France", weight: 1.3 },
    ],
    quotePrefix: "QT-VANG-",
  },
  {
    id: "org-aegis-04",
    name: "Aegis Global Solutions",
    slug: "aegis-global",
    currency: "INR",
    admin: {
      id: "usr-aegis-admin",
      name: "Ananya Sharma",
      email: "admin.aegis@dealflow360.com",
    },
    managers: [
      { id: "usr-aegis-mgr-01", name: "Rajesh Kothari", email: "aegis.mgr.rajesh@dealflow360.com", dept: "Financial Services & Banking", threshold: 16.0 },
      { id: "usr-aegis-mgr-02", name: "Deepa Menon", email: "aegis.mgr.deepa@dealflow360.com", dept: "Telecom & Infrastructure", threshold: 20.0 },
      { id: "usr-aegis-mgr-03", name: "Amit Verma", email: "aegis.mgr.amit@dealflow360.com", dept: "Manufacturing & Automotive", threshold: 15.0 },
      { id: "usr-aegis-mgr-04", name: "Sunita Rao", email: "aegis.mgr.sunita@dealflow360.com", dept: "Public Sector & Defense", threshold: 12.0 },
    ],
    finance: [
      { id: "usr-aegis-fin-01", name: "Arvind Swaminathan", email: "aegis.fin.arvind@dealflow360.com", dept: "Corporate Revenue Desk" },
      { id: "usr-aegis-fin-02", name: "Neha Agarwal", email: "aegis.fin.neha@dealflow360.com", dept: "Financial Controllership" },
      { id: "usr-aegis-fin-03", name: "Rohan Gupta", email: "aegis.fin.rohan@dealflow360.com", dept: "Margin Governance" },
      { id: "usr-aegis-fin-04", name: "Kavita Iyer", email: "aegis.fin.kavita@dealflow360.com", dept: "Enterprise Contract Auditing" },
    ],
    reps: [
      { id: "usr-aegis-rep-01", repId: "sr-aegis-01", name: "Aditya Joshi", email: "aegis.rep.aditya@dealflow360.com", mgrIndex: 0, quota: 280000, comm: 8.0, avgDisc: 6.0 },
      { id: "usr-aegis-rep-02", repId: "sr-aegis-02", name: "Ritu Malhotra", email: "aegis.rep.ritu@dealflow360.com", mgrIndex: 1, quota: 350000, comm: 9.0, avgDisc: 7.5 },
      { id: "usr-aegis-rep-03", repId: "sr-aegis-03", name: "Vikram Singhania", email: "aegis.rep.vikram@dealflow360.com", mgrIndex: 2, quota: 320000, comm: 8.5, avgDisc: 6.8 },
      { id: "usr-aegis-rep-04", repId: "sr-aegis-04", name: "Pooja Deshmukh", email: "aegis.rep.pooja@dealflow360.com", mgrIndex: 3, quota: 300000, comm: 8.5, avgDisc: 5.9 },
    ],
    warehouses: [
      { id: "wh-aegis-mumbai", name: "Mumbai Central Mega Hub", code: "WH-BOM", location: "Bhiwandi, Mumbai", weight: 1.0 },
      { id: "wh-aegis-bengaluru", name: "Bengaluru Tech Depot", code: "WH-BLR", location: "Electronic City, Bengaluru", weight: 1.2 },
      { id: "wh-aegis-delhi", name: "NCR North Distribution Centre", code: "WH-DEL", location: "Gurugram, NCR", weight: 1.25 },
    ],
    quotePrefix: "QT-AEGIS-",
  },
];

const CUSTOMER_TIERS_CONFIG = [
  { code: "BRONZE", name: "Bronze Tier", discountCeiling: 5.0, description: "Standard commercial accounts and new onboarding customers. Up to 5% discount." },
  { code: "SILVER", name: "Silver Tier", discountCeiling: 10.0, description: "Established mid-market clients with recurring volume. Up to 10% discount." },
  { code: "GOLD", name: "Gold Tier", discountCeiling: 15.0, description: "Strategic high-volume enterprise partners. Up to 15% discount." },
  { code: "PLATINUM", name: "Platinum Tier", discountCeiling: 20.0, description: "Global key accounts and multi-national enterprise agreements. Up to 20% discount." },
];

const DISCOUNT_APPROVAL_RULES_CONFIG = [
  {
    name: "Standard Rep Discretion Limit",
    minDiscountPercent: 0.0,
    maxDiscountPercent: 5.0,
    minBlendedRiskScore: 0.0,
    maxBlendedRiskScore: 10.0,
    requiresManagerApproval: false,
    requiresFinanceApproval: false,
    escalationLevel: "NONE",
    description: "Standard sales representative autonomous discount allowance within approved commercial thresholds.",
  },
  {
    name: "Manager Escalation Threshold",
    minDiscountPercent: 5.01,
    maxDiscountPercent: 15.0,
    minBlendedRiskScore: 10.01,
    maxBlendedRiskScore: 25.0,
    requiresManagerApproval: true,
    requiresFinanceApproval: false,
    escalationLevel: "SALES_MANAGER",
    description: "Requires explicit Sales Manager sign-off before quotation dispatch or customer agreement.",
  },
  {
    name: "Executive & Finance Approval Gate",
    minDiscountPercent: 15.01,
    maxDiscountPercent: 40.0,
    minBlendedRiskScore: 25.01,
    maxBlendedRiskScore: 100.0,
    requiresManagerApproval: true,
    requiresFinanceApproval: true,
    escalationLevel: "SALES_MANAGER_AND_FINANCE",
    description: "High margin impact or non-standard commercial terms requiring dual Sales Manager and Finance sign-off.",
  },
  {
    name: "Strategic Enterprise Exception",
    minDiscountPercent: 40.01,
    maxDiscountPercent: 60.0,
    minBlendedRiskScore: 40.0,
    maxBlendedRiskScore: 100.0,
    requiresManagerApproval: true,
    requiresFinanceApproval: true,
    escalationLevel: "FINANCE",
    description: "Executive-level strategic exception policy governing high-volume multi-year commitments.",
  },
];

const CATEGORIES_CONFIG = [
  {
    slug: "hardware",
    name: "Hardware & Edge Appliances",
    type: CategoryType.HARDWARE,
    discountCeiling: 15.0,
    targetMargin: 35.0,
    description: "Physical servers, switches, industrial edge terminals, and rack infrastructure equipment",
  },
  {
    slug: "services",
    name: "Professional Services & SLAs",
    type: CategoryType.SERVICE,
    discountCeiling: 10.0,
    targetMargin: 60.0,
    description: "Deployment, cloud migration, integrations, and 24/7 technical support SLAs",
  },
  {
    slug: "subscriptions",
    name: "Cloud Subscriptions & Add-ons",
    type: CategoryType.SUBSCRIPTION,
    discountCeiling: 12.0,
    targetMargin: 85.0,
    description: "SaaS platform licenses, AI deal governance engines, and executive analytics suites",
  },
  {
    slug: "security-hardware",
    name: "Security & Compliance Hardware",
    type: CategoryType.HARDWARE,
    discountCeiling: 12.0,
    targetMargin: 45.0,
    description: "Hardware security modules, next-gen enterprise firewalls, and cryptographic edge nodes",
  },
];

const PRODUCTS_MASTER = [
  {
    sku: "HW-SRV-01",
    name: "Enterprise Edge Server 2U",
    categorySlug: "hardware",
    description: "Dual AMD EPYC, 64GB DDR5 ECC RAM, Hot-swap Redundant Power, 2x 10GbE SFP+",
    basePrice: 4500.0,
    costPrice: 2925.0,
    unit: UnitType.UNIT,
    taxRate: 0.08,
    isPromoted: true,
    variants: [
      { attributeName: "Memory Capacity", attributeValue: "64GB DDR5 ECC", extraPrice: 0.0, costPriceDelta: 0.0, sku: "HW-SRV-01-64G" },
      { attributeName: "Memory Capacity", attributeValue: "128GB DDR5 ECC", extraPrice: 650.0, costPriceDelta: 420.0, sku: "HW-SRV-01-128G" },
      { attributeName: "Memory Capacity", attributeValue: "256GB DDR5 ECC", extraPrice: 1400.0, costPriceDelta: 880.0, sku: "HW-SRV-01-256G" },
    ],
  },
  {
    sku: "HW-NET-01",
    name: "Gigabit Managed Switch 48-Port",
    categorySlug: "hardware",
    description: "L3 Managed Switch, 48x 1GbE RJ45 + 4x 10G SFP+ Uplinks, PoE+ 740W",
    basePrice: 1200.0,
    costPrice: 780.0,
    unit: UnitType.UNIT,
    taxRate: 0.08,
    isPromoted: false,
    variants: [
      { attributeName: "Port Configuration", attributeValue: "48-Port Standard PoE+", extraPrice: 0.0, costPriceDelta: 0.0, sku: "HW-NET-01-48P" },
      { attributeName: "Port Configuration", attributeValue: "48-Port Ultra PoE++ 90W", extraPrice: 450.0, costPriceDelta: 280.0, sku: "HW-NET-01-48UP" },
    ],
  },
  {
    sku: "HW-TERM-01",
    name: "POS Rugged Industrial Terminal",
    categorySlug: "hardware",
    description: "IP65 Rated All-in-One Touchscreen Terminal, Barcode & NFC reader integrated",
    basePrice: 850.0,
    costPrice: 550.0,
    unit: UnitType.UNIT,
    taxRate: 0.08,
    isPromoted: false,
    variants: [],
  },
  {
    sku: "HW-SEC-01",
    name: "Next-Gen Enterprise Security Gateway 1U",
    categorySlug: "security-hardware",
    description: "Deep packet inspection 10Gbps, zero-trust hardware crypto accelerator, redundant PSU",
    basePrice: 3200.0,
    costPrice: 1920.0,
    unit: UnitType.UNIT,
    taxRate: 0.08,
    isPromoted: true,
    variants: [
      { attributeName: "Throughput License", attributeValue: "10 Gbps Standard", extraPrice: 0.0, costPriceDelta: 0.0, sku: "HW-SEC-01-10G" },
      { attributeName: "Throughput License", attributeValue: "25 Gbps High-Bandwidth", extraPrice: 1100.0, costPriceDelta: 600.0, sku: "HW-SEC-01-25G" },
    ],
  },
  {
    sku: "SRV-INST-01",
    name: "On-Site Hardware Deployment & Commissioning",
    categorySlug: "services",
    description: "Rack mounting, cable management, firmware update, and high-availability verification",
    basePrice: 2500.0,
    costPrice: 1000.0,
    unit: UnitType.PROJECT,
    taxRate: 0.0,
    isPromoted: true,
    variants: [],
  },
  {
    sku: "SRV-MIG-01",
    name: "Legacy ERP & CRM Cloud Migration Service",
    categorySlug: "services",
    description: "Full ETL migration of sales history, catalog, customer records, and ledger mapping",
    basePrice: 6000.0,
    costPrice: 2400.0,
    unit: UnitType.PROJECT,
    taxRate: 0.0,
    isPromoted: false,
    variants: [],
  },
  {
    sku: "SRV-SLA-01",
    name: "24/7 Dedicated Support SLA (Annual)",
    categorySlug: "services",
    description: "15-minute guaranteed critical incident response, designated solutions engineer",
    basePrice: 1800.0,
    costPrice: 720.0,
    unit: UnitType.YEAR,
    taxRate: 0.0,
    isPromoted: true,
    variants: [
      { attributeName: "Support Commitment", attributeValue: "1-Year Agreement", extraPrice: 0.0, costPriceDelta: 0.0, sku: "SRV-SLA-01-1Y" },
      { attributeName: "Support Commitment", attributeValue: "3-Year Multi-Year Bundle", extraPrice: 3200.0, costPriceDelta: 1200.0, sku: "SRV-SLA-01-3Y" },
    ],
  },
  {
    sku: "SUB-CORE-01",
    name: "DealFlow 360 Core Platform License",
    categorySlug: "subscriptions",
    description: "Per-seat monthly license for sales reps, CPQ quotation builder, and workflow routing",
    basePrice: 120.0,
    costPrice: 18.0,
    unit: UnitType.USER_MONTH,
    taxRate: 0.0,
    isPromoted: true,
    variants: [],
  },
  {
    sku: "SUB-AI-01",
    name: "AI Deal Governance & Risk Engine Add-on",
    categorySlug: "subscriptions",
    description: "Real-time margin anomaly detection, predictive approval routing, and upsell ranker",
    basePrice: 80.0,
    costPrice: 12.0,
    unit: UnitType.USER_MONTH,
    taxRate: 0.0,
    isPromoted: true,
    variants: [],
  },
  {
    sku: "SUB-ANLY-01",
    name: "Executive Sales Performance & Analytics Suite",
    categorySlug: "subscriptions",
    description: "Pipeline velocity tracking, rep quota attribution, and automated exportable reports",
    basePrice: 250.0,
    costPrice: 35.0,
    unit: UnitType.MONTH,
    taxRate: 0.0,
    isPromoted: false,
    variants: [],
  },
];

// 24 Realistic Customer Profiles template per organization
const CUSTOMERS_TEMPLATES = [
  { name: "Acme Corporation", company: "Acme Global Logistics Inc", email: "procurement@acmecorp.com", phone: "+1 555-234-5678", taxId: "TAX-ACME-9921", tier: "GOLD", terms: "Net 30" },
  { name: "Beta Industries", company: "Beta Industries Manufacturing LLC", email: "buyer@betaindustries.com", phone: "+1 555-876-5432", taxId: "TAX-BETA-4419", tier: "SILVER", terms: "Net 30" },
  { name: "OmniCorp Dynamics", company: "OmniCorp Dynamics Financial", email: "orders@omnicorpdynamics.com", phone: "+1 555-345-9876", taxId: "TAX-OMNI-1122", tier: "BRONZE", terms: "Due on Receipt" },
  { name: "QuantumLeap Labs", company: "QuantumLeap AI Research Inc", email: "finance@quantumleaplabs.ai", phone: "+1 555-901-2345", taxId: "TAX-QLAB-8877", tier: "PLATINUM", terms: "Net 60" },
  { name: "CyberDyne Systems", company: "CyberDyne Robotics Corp", email: "contracts@cyberdyne.io", phone: "+1 555-654-3210", taxId: "TAX-CYBD-5533", tier: "GOLD", terms: "Net 30" },
  { name: "Helios Energy", company: "Helios Clean Energy Solutions", email: "supply@heliosenergy.com", phone: "+1 555-789-0123", taxId: "TAX-HELI-7766", tier: "SILVER", terms: "Net 30" },
  { name: "Titan Logistics", company: "Titan Global Freight & Transport", email: "billing@titanlogistics.com", phone: "+1 555-210-9876", taxId: "TAX-TITN-3344", tier: "BRONZE", terms: "Net 15" },
  { name: "Zenith Pharma", company: "Zenith Pharmaceuticals International", email: "operations@zenithpharma.com", phone: "+1 555-432-1098", taxId: "TAX-ZNTH-9988", tier: "PLATINUM", terms: "Net 45" },
  { name: "InnoTech Dynamics", company: "InnoTech Systems & Telecom", email: "it@innotechdynamics.com", phone: "+1 555-321-6547", taxId: "TAX-INNO-1234", tier: "GOLD", terms: "Net 30" },
  { name: "Horizon Retail", company: "Horizon Hypermarkets Global", email: "procure@horizonretail.com", phone: "+1 555-876-1234", taxId: "TAX-HRZN-5678", tier: "SILVER", terms: "Net 30" },
  { name: "Vertex Semiconductor", company: "Vertex Microelectronics Group", email: "supplychain@vertexsemi.com", phone: "+1 555-987-6543", taxId: "TAX-VRTX-9012", tier: "PLATINUM", terms: "Net 60" },
  { name: "BlueSky Telecommunications", company: "BlueSky Telecom Networks", email: "orders@blueskytelecom.net", phone: "+1 555-654-7890", taxId: "TAX-BSKY-3456", tier: "GOLD", terms: "Net 30" },
  { name: "Pacific Global Freight", company: "Pacific Container Lines Ltd", email: "dock@pacificfreight.com", phone: "+1 555-456-7891", taxId: "TAX-PACF-7890", tier: "SILVER", terms: "Net 30" },
  { name: "Atlas Engineering", company: "Atlas Heavy Civil Construction", email: "accounts@atlasengineering.com", phone: "+1 555-567-8902", taxId: "TAX-ATLS-2345", tier: "BRONZE", terms: "Due on Receipt" },
  { name: "Solstice MedTech", company: "Solstice Diagnostic Devices", email: "devices@solsticemedtech.com", phone: "+1 555-678-9013", taxId: "TAX-SLST-6789", tier: "PLATINUM", terms: "Net 45" },
  { name: "Vanguard Defense Systems", company: "Vanguard Tactical Technologies", email: "secops@vanguarddefense.mil", phone: "+1 555-789-0124", taxId: "TAX-VGDF-0123", tier: "PLATINUM", terms: "Net 60" },
  { name: "Matrix Data Centers", company: "Matrix Cloud Colocation Inc", email: "noc@matrixdata.com", phone: "+1 555-890-1235", taxId: "TAX-MTRX-4567", tier: "GOLD", terms: "Net 30" },
  { name: "Fusion Media Networks", company: "Fusion Broadcast & Streaming", email: "broadcast@fusionmedia.tv", phone: "+1 555-901-2346", taxId: "TAX-FUSN-8901", tier: "SILVER", terms: "Net 30" },
  { name: "Terra Agro Innovations", company: "Terra Precision Agriculture", email: "smartfarm@terraagro.com", phone: "+1 555-012-3457", taxId: "TAX-TERR-2345", tier: "BRONZE", terms: "Net 15" },
  { name: "Summit Capital Group", company: "Summit Financial Infrastructure", email: "trading@summitcap.com", phone: "+1 555-123-4568", taxId: "TAX-SMMT-6789", tier: "PLATINUM", terms: "Net 30" },
  { name: "Cobalt Cyber Defense", company: "Cobalt Threat Intelligence", email: "soc@cobaltcyber.com", phone: "+1 555-234-5679", taxId: "TAX-CBLT-0123", tier: "GOLD", terms: "Net 30" },
  { name: "Radiant Optics", company: "Radiant Optical Sensing Corp", email: "lasers@radiantoptics.com", phone: "+1 555-345-6780", taxId: "TAX-RDNT-4567", tier: "SILVER", terms: "Net 30" },
  { name: "Aurora Biometrics", company: "Aurora Identity & Access Solutions", email: "identity@aurorabio.com", phone: "+1 555-456-7892", taxId: "TAX-AURA-8901", tier: "BRONZE", terms: "Due on Receipt" },
  { name: "Equinox Cloud Partners", company: "Equinox Enterprise Integration", email: "deploy@equinoxcloud.io", phone: "+1 555-567-8903", taxId: "TAX-EQNX-2345", tier: "GOLD", terms: "Net 30" },
];

// Quotation Title generators for high realism
const QUOTE_TITLES = [
  "Edge Infrastructure Expansion & Modernization",
  "High-Availability Core Network Overhaul",
  "Cloud Platform Enterprise Migration & Licensing",
  "Industrial POS Rugged Terminal Rollout",
  "Next-Gen Security Gateway & Firewall Deployment",
  "Annual 24/7 Mission-Critical Support SLA Agreement",
  "AI Deal Governance Platform Expansion (Phase II)",
  "Executive Performance Analytics Suite Integration",
  "Regional Data Center Hardware Refresh",
  "Multi-Site L3 Switch Upgrade & Commissioning",
  "Zero-Trust Edge Perimeter Hardening Bundle",
  "Enterprise Cloud & Operations Node Deployment",
  "Hybrid Infrastructure & Cloud Architecture SLA",
  "Global Logistics Terminal Network Provisioning",
  "Enterprise ERP Database Cloud ETL Migration",
  "High-Throughput Storage & Server Cluster",
  "Comprehensive Smart Operations Platform License",
];

// ---------------------------------------------------------------------------
// MAIN SEED EXECUTION
// ---------------------------------------------------------------------------

export async function main() {
  console.log("================================================================================");
  console.log("  🚀 DealFlow 360 - Enterprise Multi-Tenant Master Database Seeder");
  console.log("================================================================================");

  // 1. Password Hashes
  console.log("\n[1/7] Generating Secure Password Hashes for 'Password123!'...");
  const hashedPassword = await generatePasswordHashes("Password123!");
  console.log("  ✓ Password hash ready for Better-Auth and API auth verification.");

  // 2. Clear previous data across all models cleanly in reverse foreign key order
  console.log("\n[2/7] Resetting database tables for idempotent seeding...");
  await prisma.payment.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.creditNote.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.subscriptionLine.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.shipmentLine.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.backorder.deleteMany({});
  await prisma.fulfillmentOrder.deleteMany({});
  await prisma.counterProposal.deleteMany({});
  await prisma.quoteSignature.deleteMany({});
  await prisma.quotationComment.deleteMany({});
  await prisma.approvalAuditLog.deleteMany({});
  await prisma.approvalStep.deleteMany({});
  await prisma.approvalRequest.deleteMany({});
  await prisma.quotationLine.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stockLevel.deleteMany({});
  await prisma.productRecommendation.deleteMany({});
  await prisma.priceListItem.deleteMany({});
  await prisma.priceList.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.customerTier.deleteMany({});
  await prisma.discountApprovalRule.deleteMany({});
  await prisma.salesRepresentative.deleteMany({});
  await prisma.salesManager.deleteMany({});
  await prisma.financeOpsUser.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.twoFactor.deleteMany({});
  await prisma.whatsAppOtp.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log("  ✓ All tables purged clean.");

  let totalUsersCount = 0;
  let totalQuotesCount = 0;
  let totalCustomersCount = 0;
  let totalProductsCount = 0;
  let totalInvoicesCount = 0;
  let totalSubscriptionsCount = 0;

  // 3. Loop over Organizations
  for (let orgIdx = 0; orgIdx < ORGANIZATIONS_CONFIG.length; orgIdx++) {
    const orgConf = ORGANIZATIONS_CONFIG[orgIdx]!;
    const rand = createSeededRandom(orgIdx * 999 + 42);

    console.log(`\n================================================================================`);
    console.log(`  🏢 [ORG ${orgIdx + 1}/4] Setting up: ${orgConf.name} (${orgConf.slug})`);
    console.log(`================================================================================`);

    // A. Create Organization
    const org = await prisma.organization.create({
      data: {
        id: orgConf.id,
        name: orgConf.name,
        slug: orgConf.slug,
        currency: orgConf.currency,
      },
    });

    // B. Create Organization Admin
    const adminUser = await prisma.user.create({
      data: {
        id: orgConf.admin.id,
        name: orgConf.admin.name,
        email: orgConf.admin.email,
        role: UserRole.ADMIN,
        emailVerified: true,
        organizationId: org.id,
      },
    });
    await prisma.account.create({
      data: {
        id: `acc-${adminUser.id}`,
        accountId: adminUser.id,
        providerId: "credential",
        issuer: "local:credential",
        userId: adminUser.id,
        password: hashedPassword,
      },
    });
    totalUsersCount++;

    // Optional alias admin email for dual demo convenience
    if (orgConf.admin.altEmail && orgConf.admin.altEmail !== orgConf.admin.email) {
      const altAdmin = await prisma.user.create({
        data: {
          id: `usr-alias-${orgConf.admin.id}`,
          name: `${orgConf.admin.name} (Alias)`,
          email: orgConf.admin.altEmail,
          role: UserRole.ADMIN,
          emailVerified: true,
          organizationId: org.id,
        },
      });
      await prisma.account.create({
        data: {
          id: `acc-${altAdmin.id}`,
          accountId: altAdmin.id,
          providerId: "credential",
          issuer: "local:credential",
          userId: altAdmin.id,
          password: hashedPassword,
        },
      });
      totalUsersCount++;
    }
    console.log(`  ✓ Organization & Admin Account Ready: ${adminUser.name} <${adminUser.email}>`);

    // C. Customer Tiers
    const tiersMap = new Map<string, any>();
    for (const t of CUSTOMER_TIERS_CONFIG) {
      const tier = await prisma.customerTier.create({
        data: {
          organizationId: org.id,
          code: t.code,
          name: t.name,
          discountCeiling: t.discountCeiling,
          description: t.description,
        },
      });
      tiersMap.set(t.code, tier);
    }
    console.log(`  ✓ 4 Customer Tiers configured (Bronze 5%, Silver 10%, Gold 15%, Platinum 20%)`);

    // D. Discount Approval Rules
    for (const r of DISCOUNT_APPROVAL_RULES_CONFIG) {
      await prisma.discountApprovalRule.create({
        data: {
          organizationId: org.id,
          name: r.name,
          minDiscountPercent: r.minDiscountPercent,
          maxDiscountPercent: r.maxDiscountPercent,
          minBlendedRiskScore: r.minBlendedRiskScore,
          maxBlendedRiskScore: r.maxBlendedRiskScore,
          requiresManagerApproval: r.requiresManagerApproval,
          requiresFinanceApproval: r.requiresFinanceApproval,
          escalationLevel: r.escalationLevel,
          description: r.description,
        },
      });
    }
    console.log(`  ✓ 4 Discount Approval & Escalation Governance Rules populated`);

    // E. Categories
    const categoriesMap = new Map<string, any>();
    for (const c of CATEGORIES_CONFIG) {
      const cat = await prisma.category.create({
        data: {
          organizationId: org.id,
          slug: `${c.slug}-${orgConf.slug}`,
          name: c.name,
          type: c.type,
          discountCeiling: c.discountCeiling,
          targetMargin: c.targetMargin,
          description: c.description,
        },
      });
      categoriesMap.set(c.slug, cat);
    }
    console.log(`  ✓ 4 Commercial Product Categories & Margin Ceilings active`);

    // F. Products & Variants
    const productsMap = new Map<string, any>();
    const variantsMap = new Map<string, any[]>();
    for (const p of PRODUCTS_MASTER) {
      const cat = categoriesMap.get(p.categorySlug);
      const product = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: `${p.sku}-${orgConf.slug}`,
          name: p.name,
          description: p.description,
          categoryId: cat.id,
          basePrice: p.basePrice,
          costPrice: p.costPrice,
          unit: p.unit,
          taxRate: p.taxRate,
          isPromoted: p.isPromoted,
          isActive: true,
        },
      });
      productsMap.set(p.sku, product);
      totalProductsCount++;

      const createdVariants: any[] = [];
      for (const v of p.variants) {
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
            sku: `${v.sku}-${orgConf.slug}`,
            extraPrice: v.extraPrice,
            costPriceDelta: v.costPriceDelta,
            isActive: true,
          },
        });
        createdVariants.push(variant);
      }
      variantsMap.set(p.sku, createdVariants);
    }
    console.log(`  ✓ 10 Products with attributes & dimensional variants created`);

    // G. Price Lists & Price List Items (Customer Tier Specific Price Lists)
    const basePriceList = await prisma.priceList.create({
      data: {
        organizationId: org.id,
        name: `${orgConf.name} Standard Price List`,
        currency: orgConf.currency,
        isDefault: true,
      },
    });

    const enterprisePriceList = await prisma.priceList.create({
      data: {
        organizationId: org.id,
        name: "Enterprise Global Contract Schedule",
        currency: orgConf.currency,
        isDefault: false,
        customerTiers: {
          connect: [{ id: tiersMap.get("PLATINUM").id }, { id: tiersMap.get("GOLD").id }],
        },
      },
    });

    // Add specific contract items to enterprise price list
    const srvProd = productsMap.get("HW-SRV-01");
    if (srvProd) {
      await prisma.priceListItem.create({
        data: {
          priceListId: enterprisePriceList.id,
          productId: srvProd.id,
          fixedPrice: 4100.0,
          discountPercent: 8.88,
          minQuantity: 2,
        },
      });
    }
    const licProd = productsMap.get("SUB-CORE-01");
    if (licProd) {
      await prisma.priceListItem.create({
        data: {
          priceListId: enterprisePriceList.id,
          productId: licProd.id,
          fixedPrice: 105.0,
          discountPercent: 12.5,
          minQuantity: 20,
        },
      });
    }
    console.log(`  ✓ Standard & Tier-linked Enterprise Price Lists established`);

    // H. Warehouses
    const warehousesMap = new Map<string, any>();
    for (const w of orgConf.warehouses) {
      const wh = await prisma.warehouse.create({
        data: {
          id: `${w.id}-${orgConf.slug}`,
          organizationId: org.id,
          name: w.name,
          code: `${w.code}-${orgConf.slug}`,
          location: w.location,
          shippingCostWeight: w.weight,
          isActive: true,
        },
      });
      warehousesMap.set(w.code, wh);
    }
    console.log(`  ✓ 3 Regional Warehouses with shipping weights online`);

    // I. Stock Levels across Warehouses
    const whList = Array.from(warehousesMap.values());
    for (const p of Array.from(productsMap.values())) {
      const vars = variantsMap.get(p.sku.replace(`-${orgConf.slug}`, "")) || [];
      for (const wh of whList) {
        // Base product stock
        await prisma.stockLevel.create({
          data: {
            warehouseId: wh.id,
            productId: p.id,
            quantityOnHand: Math.floor(rand() * 40) + 15,
            quantityReserved: Math.floor(rand() * 5),
            reorderPoint: 10,
          },
        });
        // Variant stock
        for (const vr of vars) {
          await prisma.stockLevel.create({
            data: {
              warehouseId: wh.id,
              productId: p.id,
              variantId: vr.id,
              quantityOnHand: Math.floor(rand() * 20) + 5,
              quantityReserved: 0,
              reorderPoint: 5,
            },
          });
        }
      }
    }
    console.log(`  ✓ Real-time stock levels populated for all catalog items`);

    // J. Product Upsell & Cross-Sell Recommendations
    const recPairings = [
      { src: "HW-SRV-01", target: "SRV-INST-01", score: 4.8, tag: "Recommended Deployment", margin: 40.0 },
      { src: "HW-SRV-01", target: "SRV-SLA-01", score: 4.5, tag: "24/7 SLA Support", margin: 50.0 },
      { src: "HW-NET-01", target: "SRV-INST-01", score: 3.9, tag: "Turnkey Installation", margin: 35.0 },
      { src: "HW-SEC-01", target: "SUB-AI-01", score: 4.9, tag: "AI Zero-Trust Engine", margin: 60.0 },
      { src: "SUB-CORE-01", target: "SUB-AI-01", score: 5.0, tag: "Popular Upgrade", margin: 70.0 },
      { src: "SUB-AI-01", target: "SUB-ANLY-01", score: 4.6, tag: "Executive Insights Bundle", margin: 65.0 },
    ];
    for (const rec of recPairings) {
      const srcProd = productsMap.get(rec.src);
      const tgtProd = productsMap.get(rec.target);
      if (srcProd && tgtProd) {
        await prisma.productRecommendation.create({
          data: {
            organizationId: org.id,
            sourceProductId: srcProd.id,
            recommendedProductId: tgtProd.id,
            coPurchaseScore: rec.score,
            promotionalTag: rec.tag,
            minMarginThreshold: rec.margin,
            isActive: true,
          },
        });
      }
    }
    console.log(`  ✓ Upsell & Cross-sell recommendation pairings configured`);

    // K. 4 Sales Managers
    const managersList: any[] = [];
    for (const m of orgConf.managers) {
      const mUser = await prisma.user.create({
        data: {
          id: m.id,
          name: m.name,
          email: m.email,
          role: UserRole.SALES_MANAGER,
          emailVerified: true,
          organizationId: org.id,
        },
      });
      await prisma.account.create({
        data: {
          id: `acc-${mUser.id}`,
          accountId: mUser.id,
          providerId: "credential",
          issuer: "local:credential",
          userId: mUser.id,
          password: hashedPassword,
        },
      });
      const sMgr = await prisma.salesManager.create({
        data: {
          id: `sm-${m.id}`,
          userId: mUser.id,
          organizationId: org.id,
          department: m.dept,
          approvalThreshold: m.threshold,
        },
      });
      managersList.push(sMgr);
      totalUsersCount++;

      // Optional alias
      if ((m as any).altEmail && (m as any).altEmail !== m.email) {
        const mAlt = await prisma.user.create({
          data: {
            id: `usr-alias-${m.id}`,
            name: `${m.name} (Alias)`,
            email: (m as any).altEmail,
            role: UserRole.SALES_MANAGER,
            emailVerified: true,
            organizationId: org.id,
          },
        });
        await prisma.account.create({
          data: {
            id: `acc-${mAlt.id}`,
            accountId: mAlt.id,
            providerId: "credential",
            issuer: "local:credential",
            userId: mAlt.id,
            password: hashedPassword,
          },
        });
        totalUsersCount++;
      }
    }
    console.log(`  ✓ 4 Sales Managers active with departmental oversight & approval thresholds`);

    // L. 4 Finance Ops Users
    const financeList: any[] = [];
    for (const f of orgConf.finance) {
      const fUser = await prisma.user.create({
        data: {
          id: f.id,
          name: f.name,
          email: f.email,
          role: UserRole.FINANCE_OPS,
          emailVerified: true,
          organizationId: org.id,
        },
      });
      await prisma.account.create({
        data: {
          id: `acc-${fUser.id}`,
          accountId: fUser.id,
          providerId: "credential",
          issuer: "local:credential",
          userId: fUser.id,
          password: hashedPassword,
        },
      });
      const finOps = await prisma.financeOpsUser.create({
        data: {
          id: `fin-${f.id}`,
          userId: fUser.id,
          organizationId: org.id,
          department: f.dept,
          canApproveHighRisk: true,
          canManageFulfillment: true,
          canManageBilling: true,
        },
      });
      financeList.push(finOps);
      totalUsersCount++;

      // Optional alias
      if ((f as any).altEmail && (f as any).altEmail !== f.email) {
        const fAlt = await prisma.user.create({
          data: {
            id: `usr-alias-${f.id}`,
            name: `${f.name} (Alias)`,
            email: (f as any).altEmail,
            role: UserRole.FINANCE_OPS,
            emailVerified: true,
            organizationId: org.id,
          },
        });
        await prisma.account.create({
          data: {
            id: `acc-${fAlt.id}`,
            accountId: fAlt.id,
            providerId: "credential",
            issuer: "local:credential",
            userId: fAlt.id,
            password: hashedPassword,
          },
        });
        totalUsersCount++;
      }
    }
    console.log(`  ✓ 4 Finance & Operations Managers active with high-risk gating & billing authority`);

    // M. 4 Sales Representatives
    const repsList: any[] = [];
    for (const r of orgConf.reps) {
      const rUser = await prisma.user.create({
        data: {
          id: r.id,
          name: r.name,
          email: r.email,
          role: UserRole.SALES_REP,
          emailVerified: true,
          organizationId: org.id,
        },
      });
      await prisma.account.create({
        data: {
          id: `acc-${rUser.id}`,
          accountId: rUser.id,
          providerId: "credential",
          issuer: "local:credential",
          userId: rUser.id,
          password: hashedPassword,
        },
      });
      const sRep = await prisma.salesRepresentative.create({
        data: {
          id: `${r.repId}-${orgConf.slug}`,
          userId: rUser.id,
          organizationId: org.id,
          managerId: managersList[r.mgrIndex].id,
          targetQuota: r.quota,
          commissionRate: r.comm,
          historicalAvgDiscount: r.avgDisc,
        },
      });
      repsList.push({ rep: sRep, user: rUser });
      totalUsersCount++;

      // Optional alias
      if ((r as any).altEmail && (r as any).altEmail !== r.email) {
        const rAlt = await prisma.user.create({
          data: {
            id: `usr-alias-${r.id}`,
            name: `${r.name} (Alias)`,
            email: (r as any).altEmail,
            role: UserRole.SALES_REP,
            emailVerified: true,
            organizationId: org.id,
          },
        });
        await prisma.account.create({
          data: {
            id: `acc-${rAlt.id}`,
            accountId: rAlt.id,
            providerId: "credential",
            issuer: "local:credential",
            userId: rAlt.id,
            password: hashedPassword,
          },
        });
        totalUsersCount++;
      }
    }
    console.log(`  ✓ 4 Sales Representatives established under departmental Managers`);

    // N. 24 Enterprise Customers per Organization (6 customers per Sales Rep)
    const customersList: any[] = [];
    for (let cIdx = 0; cIdx < CUSTOMERS_TEMPLATES.length; cIdx++) {
      const tmpl = CUSTOMERS_TEMPLATES[cIdx]!;
      const assignedRep = repsList[cIdx % repsList.length]!;
      const tier = tiersMap.get(tmpl.tier) || tiersMap.get("SILVER")!;

      // Customer Portal User Account
      const custPortalUser = await prisma.user.create({
        data: {
          id: `usr-cust-${orgConf.slug}-${cIdx + 1}`,
          name: tmpl.name,
          email: `${orgConf.slug}.${tmpl.email}`,
          role: UserRole.CUSTOMER,
          emailVerified: true,
          organizationId: org.id,
        },
      });
      await prisma.account.create({
        data: {
          id: `acc-${custPortalUser.id}`,
          accountId: custPortalUser.id,
          providerId: "credential",
          issuer: "local:credential",
          userId: custPortalUser.id,
          password: hashedPassword,
        },
      });
      totalUsersCount++;

      const customer = await prisma.customer.create({
        data: {
          id: `cust-${orgConf.slug}-${String(cIdx + 1).padStart(2, "0")}`,
          organizationId: org.id,
          name: tmpl.company,
          email: `${orgConf.slug}.${tmpl.email}`,
          phone: tmpl.phone,
          company: tmpl.company,
          taxId: `${tmpl.taxId}-${orgConf.slug.toUpperCase()}`,
          paymentTerms: tmpl.terms,
          tierId: tier.id,
          salesRepId: assignedRep.rep.id,
          portalUserId: custPortalUser.id,
          billingAddress: `Suite ${100 + cIdx * 10}, Innovation Boulevard, Tech District`,
          shippingAddress: `Dock ${String.fromCharCode(65 + (cIdx % 6))}, Logistics Park, Gate ${cIdx + 1}`,
        },
      });
      customersList.push({ customer, portalUser: custPortalUser, rep: assignedRep, tier });
      totalCustomersCount++;
    }
    console.log(`  ✓ 24 Enterprise Customers created & assigned across the 4 Sales Reps`);

    // O. Team Invitations
    await prisma.invitation.create({
      data: {
        organizationId: org.id,
        email: `onboarding.specialist@${orgConf.slug}.com`,
        role: UserRole.SALES_REP,
        token: `invite-token-${orgConf.slug}-01`,
        status: "PENDING",
        invitedById: adminUser.id,
        metadata: { department: "Enterprise Sales", assignedTerritory: "Pacific West" },
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.invitation.create({
      data: {
        organizationId: org.id,
        email: `finance.analyst@${orgConf.slug}.com`,
        role: UserRole.FINANCE_OPS,
        token: `invite-token-${orgConf.slug}-02`,
        status: "ACCEPTED",
        invitedById: adminUser.id,
        metadata: { department: "Revenue Operations" },
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      },
    });

    // P. 15–18 Connected Quotations per Sales Representative (66 Quotations per Organization)
    console.log(`  ⏳ Generating ~66 realistic quotations across deal stages & approval hops...`);
    let quoteSeq = 1;
    const allProductsArray = Array.from(productsMap.values());

    for (let repIdx = 0; repIdx < repsList.length; repIdx++) {
      const assignedRepObj = repsList[repIdx]!;
      const repCustomers = customersList.filter((c) => c.rep.rep.id === assignedRepObj.rep.id);
      const quotesForThisRepCount = repIdx < 2 ? 16 : 17; // 16 + 16 + 17 + 17 = 66 quotes

      for (let qIdx = 0; qIdx < quotesForThisRepCount; qIdx++) {
        // Guarantee every customer gets assigned quotations round-robin
        const targetCustObj = repCustomers[qIdx % repCustomers.length]!;
        const quoteNum = `${orgConf.quotePrefix}${String(quoteSeq).padStart(4, "0")}`;
        const quoteTitle = `${targetCustObj.customer.name.split(" ")[0]} - ${QUOTE_TITLES[(quoteSeq + orgIdx) % QUOTE_TITLES.length]}`;

        // Stage distribution:
        // qIdx % 6:
        // 0 -> DRAFT (Normal Rep Discretion, discount 0-4%)
        // 1 -> PENDING_APPROVAL (1-Hop: Manager sign-off needed, discount 7-12%)
        // 2 -> PENDING_APPROVAL (2-Hop: Manager + Finance sign-off needed, discount 18-25%)
        // 3 -> APPROVED (1-Hop or 2-Hop approved with audit log)
        // 4 -> NEGOTIATION (Portal comments + counter proposals active)
        // 5 -> CONFIRMED (E-signature, split fulfillment, invoices, subscriptions)
        const stageMod = qIdx % 6;
        let stage: QuoteStage = QuoteStage.DRAFT;
        let requiresManager = false;
        let requiresFinance = false;
        let approvalStatus: ApprovalStatus = ApprovalStatus.APPROVED;
        let baseDiscountRate = 3.0;

        if (stageMod === 0) {
          stage = QuoteStage.DRAFT;
          baseDiscountRate = 2.5 + (rand() * 2.5); // 2.5 - 5.0%
        } else if (stageMod === 1) {
          stage = QuoteStage.PENDING_APPROVAL;
          requiresManager = true;
          approvalStatus = ApprovalStatus.PENDING;
          baseDiscountRate = 8.0 + (rand() * 5.0); // 8.0 - 13.0%
        } else if (stageMod === 2) {
          stage = QuoteStage.PENDING_APPROVAL;
          requiresManager = true;
          requiresFinance = true;
          approvalStatus = ApprovalStatus.PENDING;
          baseDiscountRate = 18.0 + (rand() * 8.0); // 18.0 - 26.0%
        } else if (stageMod === 3) {
          stage = QuoteStage.APPROVED;
          requiresManager = true;
          requiresFinance = qIdx % 2 === 0;
          approvalStatus = ApprovalStatus.APPROVED;
          baseDiscountRate = 7.5 + (rand() * 8.0);
        } else if (stageMod === 4) {
          stage = QuoteStage.NEGOTIATION;
          requiresManager = false;
          requiresFinance = false;
          approvalStatus = ApprovalStatus.APPROVED;
          baseDiscountRate = 6.0 + (rand() * 6.0);
        } else {
          stage = QuoteStage.CONFIRMED;
          requiresManager = false;
          requiresFinance = false;
          approvalStatus = ApprovalStatus.APPROVED;
          baseDiscountRate = 5.0 + (rand() * 5.0);
        }

        // Dedicated demo portal deal on Org 1 (Quote Seq 6)
        const isDemoDeal = orgIdx === 0 && quoteSeq === 6;
        const portalToken = isDemoDeal ? "DF-Q1042" : `portal-${orgConf.slug}-q${String(quoteSeq).padStart(4, "0")}-${crypto.randomBytes(4).toString("hex")}`;

        // Build 2 to 4 Quotation Lines with real catalog products
        const linesCount = (quoteSeq % 3) + 2; // 2 to 4 lines
        const selectedProducts = [
          allProductsArray[(quoteSeq * 2) % allProductsArray.length]!,
          allProductsArray[(quoteSeq * 2 + 1) % allProductsArray.length]!,
          allProductsArray[(quoteSeq * 2 + 2) % allProductsArray.length]!,
          allProductsArray[(quoteSeq * 2 + 3) % allProductsArray.length]!,
        ].slice(0, linesCount);

        let quoteSubtotal = 0;
        let quoteDiscountTotal = 0;
        let quoteTaxTotal = 0;
        let quoteTotalCost = 0;
        let weightedOverageSum = 0;

        const preparedLinesData: any[] = [];
        for (let lIdx = 0; lIdx < selectedProducts.length; lIdx++) {
          const prod = selectedProducts[lIdx]!;
          const cat = Array.from(categoriesMap.values()).find((c) => c.id === prod.categoryId)!;
          const vars = variantsMap.get(prod.sku.replace(`-${orgConf.slug}`, "")) || [];
          const chosenVar = vars.length > 0 && lIdx === 0 ? vars[0] : null;

          const unitPrice = prod.basePrice + (chosenVar ? chosenVar.extraPrice : 0);
          const costPrice = prod.costPrice + (chosenVar ? chosenVar.costPriceDelta : 0);
          const qty = prod.unit === UnitType.USER_MONTH ? 25 : prod.unit === UnitType.PROJECT || prod.unit === UnitType.YEAR ? 1 : Math.floor(rand() * 4) + 2;

          const lineDiscountPct = Math.min(35.0, Math.max(0.0, baseDiscountRate + (lIdx === 0 ? 2.0 : -1.5)));
          const grossRevenue = unitPrice * qty;
          const discountAmt = grossRevenue * (lineDiscountPct / 100);
          const netPrice = grossRevenue - discountAmt;
          const lineCost = costPrice * qty;
          const lineMargin = netPrice - lineCost;
          const lineMarginPct = netPrice > 0 ? (lineMargin / netPrice) * 100 : 0;

          const catCeiling = cat.discountCeiling;
          const custCeiling = targetCustObj.tier.discountCeiling;
          const effectiveCeiling = Math.min(catCeiling, custCeiling);
          const isBreached = lineDiscountPct > effectiveCeiling;
          const riskPts = Math.max(0, lineDiscountPct - effectiveCeiling);

          quoteSubtotal += grossRevenue;
          quoteDiscountTotal += discountAmt;
          quoteTotalCost += lineCost;
          if (prod.taxRate > 0) {
            quoteTaxTotal += netPrice * prod.taxRate;
          }
          weightedOverageSum += riskPts * netPrice;

          preparedLinesData.push({
            productId: prod.id,
            variantId: chosenVar ? chosenVar.id : null,
            itemType: cat.type,
            description: `${prod.name}${chosenVar ? ` (${chosenVar.attributeValue})` : ""}`,
            quantity: qty,
            unitPrice: Math.round(unitPrice * 100) / 100,
            costPrice: Math.round(costPrice * 100) / 100,
            discountPercent: Math.round(lineDiscountPct * 100) / 100,
            discountAmount: Math.round(discountAmt * 100) / 100,
            netPrice: Math.round(netPrice * 100) / 100,
            totalCost: Math.round(lineCost * 100) / 100,
            lineMargin: Math.round(lineMargin * 100) / 100,
            lineMarginPercent: Math.round(lineMarginPct * 100) / 100,
            categoryCeiling: catCeiling,
            customerCeiling: custCeiling,
            isCeilingBreached: isBreached,
            riskPoints: Math.round(riskPts * 100) / 100,
            sortOrder: lIdx + 1,
          });
        }

        const quoteGrandTotal = quoteSubtotal - quoteDiscountTotal + quoteTaxTotal;
        const quoteGrossMargin = quoteGrandTotal - quoteTaxTotal - quoteTotalCost;
        const quoteGrossMarginPercent = (quoteGrandTotal - quoteTaxTotal) > 0 ? (quoteGrossMargin / (quoteGrandTotal - quoteTaxTotal)) * 100 : 0;
        const blendedRiskScore = (quoteGrandTotal - quoteTaxTotal) > 0 ? weightedOverageSum / (quoteGrandTotal - quoteTaxTotal) : 0;

        // Create Quotation record
        const quotation = await prisma.quotation.create({
          data: {
            organizationId: org.id,
            quoteNumber: quoteNum,
            title: quoteTitle,
            customerId: targetCustObj.customer.id,
            salesRepId: assignedRepObj.rep.id,
            stage,
            subtotal: Math.round(quoteSubtotal * 100) / 100,
            discountTotal: Math.round(quoteDiscountTotal * 100) / 100,
            taxTotal: Math.round(quoteTaxTotal * 100) / 100,
            grandTotal: Math.round(quoteGrandTotal * 100) / 100,
            totalCost: Math.round(quoteTotalCost * 100) / 100,
            grossMargin: Math.round(quoteGrossMargin * 100) / 100,
            grossMarginPercent: Math.round(quoteGrossMarginPercent * 100) / 100,
            blendedRiskScore: Math.round(blendedRiskScore * 100) / 100,
            requiresManagerApproval: requiresManager,
            requiresFinanceApproval: requiresFinance,
            approvalStatus,
            portalToken,
            portalAccessExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            notes: `Commercial proposal prepared for ${targetCustObj.customer.name}.`,
          },
        });
        totalQuotesCount++;

        // Create Quotation Lines
        for (const pLine of preparedLinesData) {
          await prisma.quotationLine.create({
            data: {
              quotationId: quotation.id,
              ...pLine,
            },
          });
        }

        // Q. Approval Chains (1-Hop & 2-Hop)
        if (stage === QuoteStage.PENDING_APPROVAL) {
          const appReq = await prisma.approvalRequest.create({
            data: {
              quotationId: quotation.id,
              status: ApprovalStatus.PENDING,
              escalationLevel: requiresFinance ? "SALES_MANAGER_AND_FINANCE" : "SALES_MANAGER",
              currentStep: requiresFinance && qIdx % 4 === 0 ? 2 : 1,
              blendedRiskScore: Math.round(blendedRiskScore * 100) / 100,
            },
          });

          // Step 1: Sales Manager
          const step1Approved = requiresFinance && qIdx % 4 === 0;
          await prisma.approvalStep.create({
            data: {
              approvalRequestId: appReq.id,
              stepNumber: 1,
              level: ApprovalLevel.SALES_MANAGER,
              status: step1Approved ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
              reviewerId: managersList[0].userId,
              comments: step1Approved ? "Manager review approved. Escalating to Finance for high discount sign-off." : null,
              actionedAt: step1Approved ? new Date(Date.now() - 4 * 60 * 60 * 1000) : null,
            },
          });

          // Step 2: Finance Ops (if 2-hop)
          if (requiresFinance) {
            await prisma.approvalStep.create({
              data: {
                approvalRequestId: appReq.id,
                stepNumber: 2,
                level: ApprovalLevel.FINANCE,
                status: ApprovalStatus.PENDING,
                reviewerId: financeList[0].userId,
                comments: null,
              },
            });
          }

          // Approval Audit Log
          await prisma.approvalAuditLog.create({
            data: {
              quotationId: quotation.id,
              organizationId: org.id,
              actorId: assignedRepObj.user.id,
              actorRole: UserRole.SALES_REP,
              action: "SUBMITTED_FOR_APPROVAL",
              reason: `Discount of ${Math.round(baseDiscountRate)}% exceeds standard discretion threshold.`,
              metadata: { blendedRiskScore: quotation.blendedRiskScore, escalation: appReq.escalationLevel },
            },
          });
        } else if (stage === QuoteStage.APPROVED && (requiresManager || requiresFinance)) {
          // Fully approved deal with audit logs
          const appReq = await prisma.approvalRequest.create({
            data: {
              quotationId: quotation.id,
              status: ApprovalStatus.APPROVED,
              escalationLevel: requiresFinance ? "SALES_MANAGER_AND_FINANCE" : "SALES_MANAGER",
              currentStep: requiresFinance ? 2 : 1,
              blendedRiskScore: Math.round(blendedRiskScore * 100) / 100,
            },
          });
          await prisma.approvalStep.create({
            data: {
              approvalRequestId: appReq.id,
              stepNumber: 1,
              level: ApprovalLevel.SALES_MANAGER,
              status: ApprovalStatus.APPROVED,
              reviewerId: managersList[0].userId,
              comments: "Approved by Sales Manager. Commercial volume aligns with quarterly targets.",
              actionedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          });
          await prisma.approvalAuditLog.create({
            data: {
              quotationId: quotation.id,
              organizationId: org.id,
              actorId: managersList[0].userId,
              actorRole: UserRole.SALES_MANAGER,
              action: "APPROVED_BY_MANAGER",
              reason: "Approved commercial expansion pricing.",
            },
          });
          if (requiresFinance) {
            await prisma.approvalStep.create({
              data: {
                approvalRequestId: appReq.id,
                stepNumber: 2,
                level: ApprovalLevel.FINANCE,
                status: ApprovalStatus.APPROVED,
                reviewerId: financeList[0].userId,
                comments: "Finance Ops verified gross margin floor. Approved.",
                actionedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
              },
            });
            await prisma.approvalAuditLog.create({
              data: {
                quotationId: quotation.id,
                organizationId: org.id,
                actorId: financeList[0].userId,
                actorRole: UserRole.FINANCE_OPS,
                action: "APPROVED_BY_FINANCE",
                reason: "Gross margin validated above contractual baseline.",
              },
            });
          }
        }

        // R. Customer Negotiation & Portal Comments (for NEGOTIATION stage)
        if (stage === QuoteStage.NEGOTIATION || isDemoDeal) {
          const qLines = await prisma.quotationLine.findMany({ where: { quotationId: quotation.id } });
          const firstLine = qLines[0];

          await prisma.quotationComment.create({
            data: {
              quotationId: quotation.id,
              quotationLineId: firstLine ? firstLine.id : null,
              authorId: targetCustObj.portalUser.id,
              authorRole: UserRole.CUSTOMER,
              message: "We are reviewing the proposal. Could you grant an additional 5% discount on the primary line item?",
              proposedDiscountPercent: firstLine ? firstLine.discountPercent + 5.0 : 12.0,
              isResolved: false,
              createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
            },
          });

          await prisma.quotationComment.create({
            data: {
              quotationId: quotation.id,
              quotationLineId: firstLine ? firstLine.id : null,
              authorId: assignedRepObj.user.id,
              authorRole: UserRole.SALES_REP,
              message: "We can accommodate that request if we commit to an annual support term. Please submit your counter-proposal in the portal.",
              isResolved: true,
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            },
          });

          await prisma.counterProposal.create({
            data: {
              quotationId: quotation.id,
              proposedGrandTotal: Math.round((quotation.grandTotal * 0.94) * 100) / 100,
              proposedDiscountPercent: Math.round((baseDiscountRate + 4.0) * 100) / 100,
              customerNotes: "Adjusted proposal to meet our allocated quarterly departmental budget.",
              status: CounterProposalStatus.PENDING,
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            },
          });
        }

        // S. CONFIRMED Deals: E-Signature, Split Fulfillment, Shipments, Backorders, Invoices, Subscriptions
        if (stage === QuoteStage.CONFIRMED) {
          // 1. E-Signature
          await prisma.quoteSignature.create({
            data: {
              quotationId: quotation.id,
              signedByName: targetCustObj.customer.name,
              signedByEmail: targetCustObj.customer.email,
              signatureData: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M10 80 Q 95 10 180 80 T 290 80' fill='none' stroke='#0f172a' stroke-width='3'/></svg>",
              ipAddress: `198.51.100.${(quoteSeq * 7) % 200 + 1}`,
              userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
              signedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          });

          // 2. Fulfillment Order
          const fulfillmentOrder = await prisma.fulfillmentOrder.create({
            data: {
              organizationId: org.id,
              fulfillmentNumber: `FUL-${orgConf.slug.toUpperCase()}-${String(quoteSeq).padStart(4, "0")}`,
              quotationId: quotation.id,
              status: FulfillmentStatus.PARTIALLY_FULFILLED,
              shippingAddress: targetCustObj.customer.shippingAddress || "100 Enterprise Way, Industrial Dock B",
              notes: `Multi-warehouse split fulfillment dispatched across ${orgConf.warehouses[0]!.name} and ${orgConf.warehouses[1]!.name}.`,
            },
          });

          const qLines = await prisma.quotationLine.findMany({ where: { quotationId: quotation.id } });
          const hwLine = qLines.find((l) => l.itemType === CategoryType.HARDWARE);

          // 3. Shipment 1: Main Central Warehouse
          const shipment1 = await prisma.shipment.create({
            data: {
              fulfillmentOrderId: fulfillmentOrder.id,
              warehouseId: whList[0]!.id,
              shipmentNumber: `SHP-${orgConf.slug.toUpperCase()}-${String(quoteSeq).padStart(4, "0")}-A`,
              carrier: "FedEx Freight Priority",
              trackingNumber: `FX-99${orgIdx}${quoteSeq}01-MAIN`,
              shippingCost: 145.50,
              status: ShipmentStatus.SHIPPED,
              estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              shippedAt: new Date(),
            },
          });

          if (hwLine) {
            await prisma.shipmentLine.create({
              data: {
                shipmentId: shipment1.id,
                quotationLineId: hwLine.id,
                productId: hwLine.productId,
                quantity: Math.max(1, Math.floor(hwLine.quantity / 2)),
              },
            });
          }

          // 4. Shipment 2: East Coast Depot
          const shipment2 = await prisma.shipment.create({
            data: {
              fulfillmentOrderId: fulfillmentOrder.id,
              warehouseId: whList[1]!.id,
              shipmentNumber: `SHP-${orgConf.slug.toUpperCase()}-${String(quoteSeq).padStart(4, "0")}-B`,
              carrier: "UPS Supply Chain Solutions",
              trackingNumber: `UPS-1Z${orgIdx}${quoteSeq}99441`,
              shippingCost: 92.00,
              status: ShipmentStatus.PACKED,
              estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            },
          });

          if (hwLine && hwLine.quantity > 1) {
            await prisma.shipmentLine.create({
              data: {
                shipmentId: shipment2.id,
                quotationLineId: hwLine.id,
                productId: hwLine.productId,
                quantity: Math.ceil(hwLine.quantity / 2),
              },
            });
          }

          // 5. Backorder for shortage item
          if (hwLine) {
            await prisma.backorder.create({
              data: {
                fulfillmentOrderId: fulfillmentOrder.id,
                quotationLineId: hwLine.id,
                productId: hwLine.productId,
                quantityBackordered: 1,
                status: BackorderStatus.PENDING_REPLENISHMENT,
                expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                notes: "Memory expansion module backordered from component supplier.",
              },
            });
          }

          // 6. Commercial Invoice & Payment
          const invoice = await prisma.invoice.create({
            data: {
              organizationId: org.id,
              invoiceNumber: `INV-${orgConf.slug.toUpperCase()}-${String(quoteSeq).padStart(4, "0")}`,
              quotationId: quotation.id,
              customerId: targetCustObj.customer.id,
              status: InvoiceStatus.ISSUED,
              issueDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              paymentTerms: targetCustObj.customer.paymentTerms || "Net 30",
              subtotal: quotation.subtotal,
              discountTotal: quotation.discountTotal,
              taxTotal: quotation.taxTotal,
              totalAmount: quotation.grandTotal,
              amountPaid: Math.round(quotation.grandTotal * 0.6 * 100) / 100,
              amountRemaining: Math.round(quotation.grandTotal * 0.4 * 100) / 100,
              notes: `Commercial invoice for confirmed sales order ${quotation.quoteNumber}.`,
            },
          });
          totalInvoicesCount++;

          for (const ql of qLines) {
            await prisma.invoiceLine.create({
              data: {
                invoiceId: invoice.id,
                quotationLineId: ql.id,
                productId: ql.productId,
                variantId: ql.variantId,
                description: ql.description || "Product line item",
                quantity: ql.quantity,
                unitPrice: ql.unitPrice,
                discountPercent: ql.discountPercent,
                totalAmount: ql.netPrice,
                isRecurring: ql.itemType === CategoryType.SUBSCRIPTION,
              },
            });
          }

          // Payment record
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: invoice.amountPaid,
              paymentMethod: PaymentMethod.WIRE_TRANSFER,
              transactionReference: `TXN-WIRE-${orgConf.slug.toUpperCase()}-${quoteSeq}9982`,
              status: PaymentStatus.COMPLETED,
              paidAt: new Date(),
              notes: "60% milestone wire transfer settlement received.",
            },
          });

          // 7. Recurring SaaS Subscription (if quotation has subscription lines)
          const subLine = qLines.find((l) => l.itemType === CategoryType.SUBSCRIPTION);
          if (subLine) {
            const periodStart = new Date();
            const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const mrr = Math.round(subLine.netPrice * 100) / 100;
            const arr = Math.round(mrr * 12 * 100) / 100;

            const subscription = await prisma.subscription.create({
              data: {
                organizationId: org.id,
                subscriptionNumber: `SUB-${orgConf.slug.toUpperCase()}-${String(quoteSeq).padStart(4, "0")}`,
                quotationId: quotation.id,
                customerId: targetCustObj.customer.id,
                status: SubscriptionStatus.ACTIVE,
                billingInterval: BillingInterval.MONTHLY,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                nextBillingDate: periodEnd,
                currentMrr: mrr,
                currentArr: arr,
                autoRenew: true,
                notes: `Enterprise recurring platform subscription for ${targetCustObj.customer.name}.`,
              },
            });
            totalSubscriptionsCount++;

            await prisma.subscriptionLine.create({
              data: {
                subscriptionId: subscription.id,
                quotationLineId: subLine.id,
                productId: subLine.productId,
                quantity: subLine.quantity,
                unitPrice: subLine.unitPrice,
                discountPercent: subLine.discountPercent,
                recurringAmount: subLine.netPrice,
              },
            });

            // Credit Note for license proration
            if (quoteSeq % 3 === 0) {
              await prisma.creditNote.create({
                data: {
                  organizationId: org.id,
                  creditNoteNumber: `CN-${orgConf.slug.toUpperCase()}-${String(quoteSeq).padStart(4, "0")}`,
                  subscriptionId: subscription.id,
                  customerId: targetCustObj.customer.id,
                  amount: 180.0,
                  reason: "Mid-cycle license seat adjustment (unused proration allowance)",
                  status: CreditNoteStatus.ISSUED,
                },
              });
            }
          }
        }

        quoteSeq++;
      }
    }
    console.log(`  ✓ 66 connected quotations generated with zero orphan records.`);
  }

  console.log("\n================================================================================");
  console.log("  🎉 SEEDING COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
  console.log(`  🏢 Organizations Seeded : 4 Enterprise Tenants`);
  console.log(`  👥 Total User Accounts  : ${totalUsersCount} (All with Password: Password123!)`);
  console.log(`  🏢 Enterprise Customers : ${totalCustomersCount} (Zero orphaned records)`);
  console.log(`  📄 Connected Quotations : ${totalQuotesCount} (15–18 quotes per Rep)`);
  console.log(`  📦 Catalog Products     : ${totalProductsCount} (with Attribute Variants)`);
  console.log(`  💰 Generated Invoices   : ${totalInvoicesCount}`);
  console.log(`  🔄 Active Subscriptions : ${totalSubscriptionsCount}`);
  console.log("--------------------------------------------------------------------------------");
  console.log("  🔑 QUICK DEMO LOGIN ACCOUNTS (Password: Password123!)");
  console.log("  ------------------------------------------------------------------------------");
  console.log("  👑 Admin Apex        : admin@dealflow360.com  / admin.apex@dealflow360.com");
  console.log("  👑 Admin Nexus       : admin.nexus@dealflow360.com");
  console.log("  👑 Admin Vanguard    : admin.vanguard@dealflow360.com");
  console.log("  👑 Admin Aegis       : admin.aegis@dealflow360.com");
  console.log("  💼 Sales Manager     : manager@dealflow360.com / manager.elena@dealflow360.com");
  console.log("  💳 Finance & Ops     : finance@dealflow360.com / finance.marcus@dealflow360.com");
  console.log("  🎯 Sales Rep (Alex)  : rep@dealflow360.com     / rep.alex@dealflow360.com");
  console.log("  🎯 Sales Rep (Sarah) : rep.sarah@dealflow360.com");
  console.log("  🌐 Customer Portal   : apex-tech.procurement@acmecorp.com");
  console.log("  🔗 Dedicated Deal    : portalToken = 'DF-Q1042' (Negotiation demo)");
  console.log("================================================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
