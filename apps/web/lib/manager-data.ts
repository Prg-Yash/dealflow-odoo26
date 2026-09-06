export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";

export interface ApprovalWorkflowStep {
  id: string;
  stepNumber: number;
  nodeTitle: string;
  role: "Sales Rep" | "Sales Manager" | "VP Finance" | "Client Procurement";
  assigneeName: string;
  status: "completed" | "active" | "pending" | "locked";
  actionNote?: string;
  actionedAt?: string;
}

export interface SKUDiscountBreakdown {
  id: string;
  sku: string;
  name: string;
  category: "Hardware" | "Services" | "SaaS License" | "Support";
  quantity: number;
  listPrice: number;
  appliedDiscountPercent: number;
  policyCapPercent: number;
  netPrice: number;
  isBreached: boolean;
  breachDelta: number;
}

export interface ManagerApprovalRequest {
  id: string; // e.g. "APR-881"
  quoteId: string; // e.g. "Q-1042"
  account: string;
  accountTier: "Standard" | "Silver" | "Gold" | "Platinum";
  repName: string;
  repInitials: string;
  dealSize: number;
  discountRequested: number;
  thresholdMax: number;
  marginProjected: number;
  targetMargin: number;
  reason: string;
  status: ApprovalStatus;
  submittedAt: string;
  slaHoursLeft: number;
  blendedRiskScore: number; // 0 - 100
  escalationLevel: "SALES_MANAGER" | "SALES_MANAGER_AND_FINANCE";
  pdfFileName: string;
  pdfFileSize: string;
  pdfHash: string;
  lineItems: SKUDiscountBreakdown[];
  workflowSteps: ApprovalWorkflowStep[];
  auditLogs: {
    id: string;
    actor: string;
    role: string;
    action: string;
    timestamp: string;
    note?: string;
  }[];
}

export interface DealAnomalyRecord {
  id: string;
  quoteId: string;
  account: string;
  accountInitials: string;
  repName: string;
  dealValue: number;
  riskGaugePercent: number;
  riskLevel: "high" | "medium" | "low";
  anomalyType: "Discount Breach" | "Margin Slip" | "Stalled Deal" | "SLA Alert";
  idleDays: number;
  actionStatus: "flagged" | "escalated" | "nudged" | "resolved";
  details: string;
}

export interface TeamRepMetric {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  email: string;
  quota: number;
  closed: number;
  pipeline: number;
  pacing: number; // percentage
  commissionRate: number; // e.g. 8.5%
  historicalAvgDiscount: number; // baseline for anomaly detection
  activeDeals: number;
  anomaliesFlagged: number;
}

export const INITIAL_MANAGER_APPROVALS: ManagerApprovalRequest[] = [
  {
    id: "APR-881",
    quoteId: "Q-1042",
    account: "Acme Corporation",
    accountTier: "Gold",
    repName: "Alex Rivera",
    repInitials: "AR",
    dealSize: 68500,
    discountRequested: 18.0,
    thresholdMax: 15.0,
    marginProjected: 34.2,
    targetMargin: 39.0,
    reason: "Competitive bakeoff against Salesforce/DealHub. Multi-year enterprise expansion with 40-seat workstation deployment.",
    status: "PENDING",
    submittedAt: "25 mins ago",
    slaHoursLeft: 18.7,
    blendedRiskScore: 92,
    escalationLevel: "SALES_MANAGER_AND_FINANCE",
    pdfFileName: "Quote-Q1042-AcmeCorp-v2.pdf",
    pdfFileSize: "2.4 MB",
    pdfHash: "sha256-8e94a1b87c42",
    lineItems: [
      {
        id: "line-1",
        sku: "HW-LT-400",
        name: "Laptop Hardware Fleet",
        category: "Hardware",
        quantity: 40,
        listPrice: 48000,
        appliedDiscountPercent: 12.0,
        policyCapPercent: 15.0,
        netPrice: 42240,
        isBreached: false,
        breachDelta: 0,
      },
      {
        id: "line-2",
        sku: "SRV-MIG-01",
        name: "Onsite Setup & Data Migration",
        category: "Services",
        quantity: 1,
        listPrice: 15000,
        appliedDiscountPercent: 18.0,
        policyCapPercent: 10.0,
        netPrice: 12300,
        isBreached: true,
        breachDelta: 8.0,
      },
      {
        id: "line-3",
        sku: "SUB-CLOUD-01",
        name: "Cloud Management Suite (1-Yr)",
        category: "SaaS License",
        quantity: 1,
        listPrice: 5500,
        appliedDiscountPercent: 5.0,
        policyCapPercent: 20.0,
        netPrice: 5225,
        isBreached: false,
        breachDelta: 0,
      },
    ],
    workflowSteps: [
      {
        id: "step-1",
        stepNumber: 1,
        nodeTitle: "Node 01 · Sales Rep",
        role: "Sales Rep",
        assigneeName: "J. Rao",
        status: "completed",
        actionNote: "Submitted discount request for enterprise bid",
        actionedAt: "Today, 10:14 AM",
      },
      {
        id: "step-2",
        stepNumber: 2,
        nodeTitle: "Node 02 · Sales Manager",
        role: "Sales Manager",
        assigneeName: "M. Shah",
        status: "completed",
        actionNote: "Approved 18% commercial concession",
        actionedAt: "Today, 02:40 PM",
      },
      {
        id: "step-3",
        stepNumber: 3,
        nodeTitle: "Node 03 · VP Finance",
        role: "VP Finance",
        assigneeName: "E. Vance (You)",
        status: "active",
        actionNote: "Pending margin signoff (>15% exception)",
      },
      {
        id: "step-4",
        stepNumber: 4,
        nodeTitle: "Node 04 · Client Signoff",
        role: "Client Procurement",
        assigneeName: "Acme Procurement",
        status: "locked",
        actionNote: "Awaiting final executive determination",
      },
    ],
    auditLogs: [
      {
        id: "log-1",
        actor: "J. Rao",
        role: "Sales Representative",
        action: "SUBMITTED",
        timestamp: "Today, 10:14 AM",
        note: "Initial proposal generated with 18% concession on setup services",
      },
      {
        id: "log-2",
        actor: "M. Shah",
        role: "Sales Manager",
        action: "APPROVED_MANAGER",
        timestamp: "Today, 02:40 PM",
        note: "Endorsed for strategic account retention. Forwarded to VP Finance.",
      },
    ],
  },
  {
    id: "APR-882",
    quoteId: "Q-1044",
    account: "OmniRetail Global",
    accountTier: "Platinum",
    repName: "Sarah Jenkins",
    repInitials: "SJ",
    dealSize: 114200,
    discountRequested: 22.0,
    thresholdMax: 15.0,
    marginProjected: 46.8,
    targetMargin: 45.0,
    reason: "3-year upfront commitment across 12 global retail distribution hubs.",
    status: "PENDING",
    submittedAt: "2 hours ago",
    slaHoursLeft: 22.0,
    blendedRiskScore: 78,
    escalationLevel: "SALES_MANAGER_AND_FINANCE",
    pdfFileName: "Quote-Q1044-OmniRetail-v1.pdf",
    pdfFileSize: "3.1 MB",
    pdfHash: "sha256-4c91d098e1f5",
    lineItems: [
      {
        id: "line-4",
        sku: "SUB-ENT-GLOBAL",
        name: "Enterprise Commerce Cloud (12 Nodes)",
        category: "SaaS License",
        quantity: 12,
        listPrice: 96000,
        appliedDiscountPercent: 20.0,
        policyCapPercent: 15.0,
        netPrice: 76800,
        isBreached: true,
        breachDelta: 5.0,
      },
      {
        id: "line-5",
        sku: "SRV-ARCH-01",
        name: "Solutions Architecture & Custom API Gateway",
        category: "Services",
        quantity: 1,
        listPrice: 28000,
        appliedDiscountPercent: 25.0,
        policyCapPercent: 10.0,
        netPrice: 21000,
        isBreached: true,
        breachDelta: 15.0,
      },
    ],
    workflowSteps: [
      {
        id: "step-201",
        stepNumber: 1,
        nodeTitle: "Node 01 · Sales Rep",
        role: "Sales Rep",
        assigneeName: "Sarah Jenkins",
        status: "completed",
        actionNote: "Submitted multi-year upfront commitment",
        actionedAt: "Today, 11:30 AM",
      },
      {
        id: "step-202",
        stepNumber: 2,
        nodeTitle: "Node 02 · Sales Manager",
        role: "Sales Manager",
        assigneeName: "E. Vance (You)",
        status: "active",
        actionNote: "Pending review of 22% concession",
      },
    ],
    auditLogs: [
      {
        id: "log-201",
        actor: "Sarah Jenkins",
        role: "Sales Representative",
        action: "SUBMITTED",
        timestamp: "Today, 11:30 AM",
        note: "3-year upfront contract submitted with bundled API migration",
      },
    ],
  },
  {
    id: "APR-883",
    quoteId: "Q-1047",
    account: "Beta Industries",
    accountTier: "Silver",
    repName: "David Chen",
    repInitials: "DC",
    dealSize: 72000,
    discountRequested: 16.0,
    thresholdMax: 15.0,
    marginProjected: 48.0,
    targetMargin: 45.0,
    reason: "Government agency budget cap match for annual compliance renewal.",
    status: "APPROVED",
    submittedAt: "1 day ago",
    slaHoursLeft: 0,
    blendedRiskScore: 42,
    escalationLevel: "SALES_MANAGER",
    pdfFileName: "Quote-Q1047-BetaInd-v3.pdf",
    pdfFileSize: "1.8 MB",
    pdfHash: "sha256-a19c72e01b34",
    lineItems: [
      {
        id: "line-6",
        sku: "SUB-GOV-01",
        name: "FedRamp Certified Core Platform",
        category: "SaaS License",
        quantity: 1,
        listPrice: 85700,
        appliedDiscountPercent: 16.0,
        policyCapPercent: 15.0,
        netPrice: 72000,
        isBreached: true,
        breachDelta: 1.0,
      },
    ],
    workflowSteps: [
      {
        id: "step-301",
        stepNumber: 1,
        nodeTitle: "Node 01 · Sales Rep",
        role: "Sales Rep",
        assigneeName: "David Chen",
        status: "completed",
        actionedAt: "Yesterday, 09:15 AM",
      },
      {
        id: "step-302",
        stepNumber: 2,
        nodeTitle: "Node 02 · Sales Manager",
        role: "Sales Manager",
        assigneeName: "E. Vance (You)",
        status: "completed",
        actionNote: "Approved as public sector strategic renewal",
        actionedAt: "Yesterday, 03:00 PM",
      },
    ],
    auditLogs: [
      {
        id: "log-301",
        actor: "E. Vance",
        role: "Sales Director",
        action: "APPROVED_MANAGER",
        timestamp: "Yesterday, 03:00 PM",
        note: "Approved 1.0pt overrun on FedRamp package.",
      },
    ],
  },
  {
    id: "APR-884",
    quoteId: "Q-1049",
    account: "Vertex BioTech",
    accountTier: "Standard",
    repName: "Alex Rivera",
    repInitials: "AR",
    dealSize: 45000,
    discountRequested: 24.0,
    thresholdMax: 15.0,
    marginProjected: 31.5,
    targetMargin: 45.0,
    reason: "Requested 24% discount without multi-year commitment or software lock-in.",
    status: "REJECTED",
    submittedAt: "2 days ago",
    slaHoursLeft: 0,
    blendedRiskScore: 89,
    escalationLevel: "SALES_MANAGER",
    pdfFileName: "Quote-Q1049-Vertex-v1.pdf",
    pdfFileSize: "1.5 MB",
    pdfHash: "sha256-ff71092aa843",
    lineItems: [],
    workflowSteps: [],
    auditLogs: [
      {
        id: "log-401",
        actor: "E. Vance",
        role: "Sales Director",
        action: "REJECTED",
        timestamp: "2 days ago, 04:20 PM",
        note: "Rejected: Sub-35% margin breach without volume ramp commitment.",
      },
    ],
  },
];

export const INITIAL_DEAL_ANOMALIES: DealAnomalyRecord[] = [
  {
    id: "ANOM-01",
    quotationId: "cmtolm9ei0012v5hc9c15985t",
    quoteId: "Q-1042",
    account: "Acme Corp Enterprise",
    accountInitials: "AC",
    repName: "Alex Rivera",
    dealValue: 68500,
    riskGaugePercent: 92,
    riskLevel: "high",
    anomalyType: "Discount Breach",
    idleDays: 4,
    actionStatus: "flagged",
    details: "+8.0pt overrun on setup line (18% applied vs 10% policy limit)",
  },
  {
    id: "ANOM-02",
    quotationId: "cmtolm9ei0012v5hc9c15985t",
    quoteId: "Q-1039",
    account: "Nova Retail Global",
    accountInitials: "NR",
    repName: "Sarah Jenkins",
    dealValue: 142000,
    riskGaugePercent: 64,
    riskLevel: "medium",
    anomalyType: "Margin Slip",
    idleDays: 6,
    actionStatus: "flagged",
    details: "Projected margin slipped to 38.4% (-6.6% below target floor)",
  },
  {
    id: "ANOM-03",
    quotationId: "cmtolm9ei0012v5hc9c15985t",
    quoteId: "Q-1044",
    account: "CloudScale Infra",
    accountInitials: "CS",
    repName: "David Chen",
    dealValue: 95000,
    riskGaugePercent: 58,
    riskLevel: "medium",
    anomalyType: "Stalled Deal",
    idleDays: 11,
    actionStatus: "flagged",
    details: "Stalled in Negotiation for 11 days without client interaction",
  },
  {
    id: "ANOM-04",
    quotationId: "cmtolm9ei0012v5hc9c15985t",
    quoteId: "Q-1035",
    account: "Zenith Co Network",
    accountInitials: "ZC",
    repName: "Sarah Jenkins",
    dealValue: 54000,
    riskGaugePercent: 28,
    riskLevel: "low",
    anomalyType: "SLA Alert",
    idleDays: 2,
    actionStatus: "flagged",
    details: "Approaching manager sign-off SLA limit (under 4 hours remaining)",
  },
];

export const INITIAL_REP_METRICS: TeamRepMetric[] = [
  {
    id: "rep-1",
    name: "Alex Rivera",
    initials: "AR",
    avatarBg: "bg-blue-500",
    email: "alex.rivera@dealflow360.com",
    quota: 250000,
    closed: 188500,
    pipeline: 310000,
    pacing: 112,
    commissionRate: 8.5,
    historicalAvgDiscount: 11.2,
    activeDeals: 6,
    anomaliesFlagged: 2,
  },
  {
    id: "rep-2",
    name: "Sarah Jenkins",
    initials: "SJ",
    avatarBg: "bg-purple-500",
    email: "sarah.jenkins@dealflow360.com",
    quota: 220000,
    closed: 214200,
    pipeline: 195000,
    pacing: 128,
    commissionRate: 9.0,
    historicalAvgDiscount: 8.4,
    activeDeals: 8,
    anomaliesFlagged: 2,
  },
  {
    id: "rep-3",
    name: "David Chen",
    initials: "DC",
    avatarBg: "bg-emerald-500",
    email: "david.chen@dealflow360.com",
    quota: 200000,
    closed: 142000,
    pipeline: 240000,
    pacing: 92,
    commissionRate: 7.5,
    historicalAvgDiscount: 14.1,
    activeDeals: 5,
    anomaliesFlagged: 1,
  },
];
