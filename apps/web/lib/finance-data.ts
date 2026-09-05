export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";

export interface FinanceApprovalRequest {
  id: string; // e.g. "FIN-901"
  quoteId: string; // e.g. "Q-1045"
  account: string;
  accountTier: "Standard" | "Silver" | "Gold" | "Platinum";
  dealSize: number;
  discountRequested: number;
  marginProjected: number;
  targetMargin: number;
  reason: string;
  status: ApprovalStatus;
  submittedAt: string;
  slaHoursLeft: number;
  blendedRiskScore: number;
  escalationReason: string;
}

export interface FulfillmentRecord {
  id: string; // e.g. "ORD-441"
  quoteId: string;
  account: string;
  status: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";
  warehouseSplit: boolean;
  itemsPending: number;
  itemsTotal: number;
  backorderRisk: boolean;
  expectedShipDate: string;
}

export interface InvoiceRecord {
  id: string; // e.g. "INV-2026-081"
  account: string;
  amount: number;
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID" | "OVERDUE";
  dueDate: string;
  daysOverdue?: number;
  paymentMethod?: string;
  subscriptionId?: string;
}

export interface SubscriptionRecord {
  id: string; // e.g. "SUB-8812"
  account: string;
  plan: string;
  cycle: "Monthly" | "Quarterly" | "Annual";
  nextBillDate: string; // can be "-" if paused/cancelled
  status: "Active" | "Paused" | "Cancelled";
  amount: number;
}

export interface FulfillmentDetailRecord {
  id: string;
  quoteId: string;
  account: string;
  warehouseSplits: {
    warehouse: string;
    qtyFulfilled: number;
    estShipments: number;
    cost: number;
  }[];
}

export const INITIAL_FINANCE_APPROVALS: FinanceApprovalRequest[] = [
  {
    id: "FIN-901",
    quoteId: "Q-1045",
    account: "Globex Corporation",
    accountTier: "Platinum",
    dealSize: 145000,
    discountRequested: 22.5,
    marginProjected: 38.4,
    targetMargin: 45.0,
    reason: "Competitor price match requirement for multi-year contract.",
    status: "PENDING",
    submittedAt: "2 hours ago",
    slaHoursLeft: 22,
    blendedRiskScore: 88,
    escalationReason: "Margin dropped below 40% floor (requires VP Finance override)",
  },
  {
    id: "FIN-902",
    quoteId: "Q-1048",
    account: "Initech Systems",
    accountTier: "Gold",
    dealSize: 89000,
    discountRequested: 18.0,
    marginProjected: 42.1,
    targetMargin: 45.0,
    reason: "Volume commitment up-front payment concession.",
    status: "PENDING",
    submittedAt: "5 hours ago",
    slaHoursLeft: 19,
    blendedRiskScore: 65,
    escalationReason: "Standard Finance review for >15% discount.",
  },
  {
    id: "FIN-903",
    quoteId: "Q-1039",
    account: "Stark Industries",
    accountTier: "Silver",
    dealSize: 45000,
    discountRequested: 25.0,
    marginProjected: 35.0,
    targetMargin: 45.0,
    reason: "Strategic account penetration.",
    status: "REJECTED",
    submittedAt: "1 day ago",
    slaHoursLeft: 0,
    blendedRiskScore: 92,
    escalationReason: "Margin breach > 10% delta.",
  },
];

export const INITIAL_FULFILLMENT_RECORDS: FulfillmentRecord[] = [
  {
    id: "ORD-441",
    quoteId: "Q-1022",
    account: "Wayne Enterprises",
    status: "PARTIALLY_FULFILLED",
    warehouseSplit: true,
    itemsPending: 12,
    itemsTotal: 50,
    backorderRisk: true,
    expectedShipDate: "Tomorrow",
  },
  {
    id: "ORD-442",
    quoteId: "Q-1025",
    account: "Massive Dynamic",
    status: "PENDING",
    warehouseSplit: false,
    itemsPending: 200,
    itemsTotal: 200,
    backorderRisk: false,
    expectedShipDate: "In 3 Days",
  },
  {
    id: "ORD-443",
    quoteId: "Q-1031",
    account: "Hooli",
    status: "PENDING",
    warehouseSplit: true,
    itemsPending: 5,
    itemsTotal: 45,
    backorderRisk: true,
    expectedShipDate: "Delayed (No ETA)",
  },
];

export const INITIAL_INVOICE_RECORDS: InvoiceRecord[] = [
  {
    id: "INV-2026-081",
    account: "Soylent Corp",
    amount: 12500,
    status: "OVERDUE",
    dueDate: "2026-08-15",
    daysOverdue: 21,
    subscriptionId: "SUB-8812",
  },
  {
    id: "INV-2026-084",
    account: "Umbrella Corporation",
    amount: 54000,
    status: "DRAFT",
    dueDate: "2026-09-30",
  },
  {
    id: "INV-2026-085",
    account: "Cyberdyne Systems",
    amount: 8900,
    status: "ISSUED",
    dueDate: "2026-09-15",
  },
];

export const INITIAL_SUBSCRIPTION_RECORDS: SubscriptionRecord[] = [
  {
    id: "SUB-8812",
    account: "Acme Corp",
    plan: "Care Plan 2yr",
    cycle: "Monthly",
    nextBillDate: "Sep 15",
    status: "Active",
    amount: 46,
  },
  {
    id: "SUB-8813",
    account: "Beta Industries",
    plan: "Support SLA",
    cycle: "Quarterly",
    nextBillDate: "Nov 1",
    status: "Active",
    amount: 300,
  },
  {
    id: "SUB-8814",
    account: "Delta LLC",
    plan: "Care Plan 1yr",
    cycle: "Monthly",
    nextBillDate: "-",
    status: "Paused",
    amount: 46,
  },
];

export const MOCK_FULFILLMENT_DETAIL: FulfillmentDetailRecord = {
  id: "ORD-441",
  quoteId: "Q-1042",
  account: "Acme Corp",
  warehouseSplits: [
    {
      warehouse: "Main Warehouse",
      qtyFulfilled: 18,
      estShipments: 1,
      cost: 42,
    },
    {
      warehouse: "East Depot",
      qtyFulfilled: 6,
      estShipments: 1,
      cost: 29,
    },
  ],
};
