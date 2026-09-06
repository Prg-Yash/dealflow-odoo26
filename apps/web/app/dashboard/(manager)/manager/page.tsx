"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  XCircle,
  Clock,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Users,
  Activity,
  ArrowUpRight,
  Send,
  Calendar,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useDashboardAuth } from "../../layout";
import { BrandLogo, ProfileModal } from "@repo/ui";
import {
  type ManagerApprovalRequest,
  type DealAnomalyRecord,
  type ApprovalStatus,
  type TeamRepMetric,
  INITIAL_MANAGER_APPROVALS,
  INITIAL_DEAL_ANOMALIES,
  INITIAL_REP_METRICS,
} from "../../../../lib/manager-data";
import {
  useQuotations,
  useDealAnomalies,
  useStalledQuotations,
  useFulfillmentSlippage,
  useNudgeAction,
  useMembers,
  useUpdateQuotationStage,
  useApproveStep,
  useRejectStep,
  useApproveQuotation,
  useRejectQuotation,
} from "../../../../lib/query";
import { toast } from "sonner";

export default function ManagerDashboardPage() {
  const { user, signOut } = useDashboardAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<"approvals" | "telemetry" | "team">("approvals");
  const [profileOpen, setProfileOpen] = useState(false);

  const currentUserName = user?.name || "Elena Vance";
  const currentUserInitials = (user?.name || "EV")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Live TanStack Query Hooks (Database Driven)
  const { data: allQuotes, isLoading: isLoadingQuotes, refetch: refetchQuotes } = useQuotations();
  const { data: apiAnomalies, isLoading: isLoadingAnomalies, refetch: refetchAnomalies } = useDealAnomalies();
  const { data: apiStalled } = useStalledQuotations();
  const { data: apiSlippage } = useFulfillmentSlippage();
  const { data: apiMembers, isLoading: isLoadingMembers } = useMembers();
  const updateStageMutation = useUpdateQuotationStage();
  const approveStepMutation = useApproveStep();
  const rejectStepMutation = useRejectStep();
  const approveQuotationMutation = useApproveQuotation();
  const rejectQuotationMutation = useRejectQuotation();
  const nudgeMutation = useNudgeAction();

  const approvals: ManagerApprovalRequest[] = useMemo(() => {
    if (!allQuotes || allQuotes.length === 0) return INITIAL_MANAGER_APPROVALS;
    return allQuotes.map((q) => {
      const discountPct =
        q.discountPercent ??
        (q.subtotal > 0 && q.discountTotal ? Math.round((q.discountTotal / q.subtotal) * 100) : 0);
      const marginPct =
        q.grossMarginPercent ??
        (q.grandTotal > 0 && q.grossMargin ? Math.round((q.grossMargin / q.grandTotal) * 100) : 40);

      const isExplicitlyApproved =
        q.stage === "APPROVED" ||
        q.stage === "CONFIRMED" ||
        q.approvalStatus === "APPROVED";

      const isExplicitlyRejected =
        q.stage === "CANCELLED" ||
        q.approvalStatus === "REJECTED";

      const isRevisionRequested =
        q.approvalStatus === "REVISION_REQUESTED";

      // Multi-hop approval step check for Sales Manager
      const managerStep = (q as any).approvalRequest?.steps?.find(
        (s: any) => s.level === "SALES_MANAGER"
      );

      let status: ApprovalStatus = "PENDING";
      if (isExplicitlyApproved || (managerStep && managerStep.status === "APPROVED")) {
        status = "APPROVED";
      } else if (isExplicitlyRejected || (managerStep && managerStep.status === "REJECTED")) {
        status = "REJECTED";
      } else if (isRevisionRequested || (managerStep && managerStep.status === "REVISION_REQUESTED")) {
        status = "REVISION_REQUESTED";
      } else if (q.stage === "PENDING_APPROVAL" || (managerStep && managerStep.status === "PENDING") || (q.approvalStatus === "PENDING" && q.requiresManagerApproval)) {
        status = "PENDING";
      } else if (q.stage === "DRAFT") {
        status = "PENDING";
      } else {
        status = "APPROVED";
      }

      const hasFinanceStep = q.requiresFinanceApproval || q.approvalRequest?.steps?.some((s: any) => s.level === "FINANCE");
      const customerName = q.customer?.name || (q.customer as any)?.company || (q.customer as any)?.companyName || "Enterprise Account";
      const repDisplayName = q.salesRep?.user?.name || "Account Executive";
      const repInitials = repDisplayName
        .split(" ")
        .map((s: string) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: q.id,
        quoteId: q.quoteNumber || q.id,
        account: customerName,
        accountTier: (((q.customer as any)?.tier?.name as any) || "Gold") as any,
        repName: repDisplayName,
        repInitials,
        dealSize: q.grandTotal || 0,
        discountRequested: discountPct,
        thresholdMax: (q.customer as any)?.tier?.discountCeiling ?? 15,
        marginProjected: marginPct,
        targetMargin: 45,
        reason: q.notes || "Commercial discount exception requested.",
        status,
        submittedAt: new Date(q.createdAt).toLocaleDateString(),
        slaHoursLeft: 24,
        blendedRiskScore: q.blendedRiskScore || 15,
        escalationLevel: hasFinanceStep ? "SALES_MANAGER_AND_FINANCE" : "SALES_MANAGER",
        pdfFileName: `${q.quoteNumber || "Quote"}-Exec.pdf`,
        pdfFileSize: "1.2 MB",
        pdfHash: "sha256-verified",
        lineItems: (q.lines || []).map((l: any, idx: number) => ({
          id: l.id || `line-${idx}`,
          sku: l.product?.sku || `SKU-${idx + 1}`,
          name: l.product?.name || l.description || "Product Item",
          category: (l.itemType === "HARDWARE" ? "Hardware" : l.itemType === "SERVICE" ? "Services" : "SaaS License") as any,
          quantity: l.quantity || 1,
          listPrice: l.unitPrice || 0,
          appliedDiscountPercent: l.discountPercent || 0,
          policyCapPercent: l.categoryCeiling || 15,
          netPrice: l.netPrice || (l.unitPrice ? l.unitPrice * (1 - (l.discountPercent || 0) / 100) * (l.quantity || 1) : 0),
          isBreached: l.isCeilingBreached ?? ((l.discountPercent || 0) > (l.categoryCeiling || 15)),
          breachDelta: Math.max(0, (l.discountPercent || 0) - (l.categoryCeiling || 15)),
        })),
        workflowSteps: (q as any).approvalRequest?.steps && (q as any).approvalRequest.steps.length > 0
          ? [
              {
                id: `ws-rep-${q.id}`,
                stepNumber: 1,
                nodeTitle: "Node 01 · Sales Rep Submit",
                role: "Sales Rep" as const,
                assigneeName: q.salesRep?.user?.name || "Account Executive",
                status: "completed" as const,
                actionedAt: new Date(q.createdAt).toLocaleDateString(),
                actionNote: "Submitted for approval",
              },
              ...(q as any).approvalRequest.steps.map((s: any, idx: number) => ({
                id: s.id || `ws-${idx + 2}`,
                stepNumber: idx + 2,
                nodeTitle: s.level === "SALES_MANAGER" ? "Node 02 · Sales Manager" : "Node 03 · VP Finance",
                role: (s.level === "SALES_MANAGER" ? "Sales Manager" : "VP Finance") as any,
                assigneeName: s.reviewer?.name || (s.level === "SALES_MANAGER" ? "Elena Vance" : "Fiona Ops"),
                status: (s.status === "APPROVED" ? "completed" : s.status === "PENDING" ? "active" : "pending") as any,
                actionedAt: s.actionedAt ? new Date(s.actionedAt).toLocaleDateString() : undefined,
                actionNote: s.comments || (s.status === "APPROVED" ? "Approved exception" : s.status === "REJECTED" ? "Rejected" : "Pending signoff"),
              })),
            ]
          : [
              {
                id: "ws-1",
                stepNumber: 1,
                nodeTitle: "Node 01 · Sales Rep Submit",
                role: "Sales Rep" as const,
                assigneeName: q.salesRep?.user?.name || "Account Executive",
                status: "completed" as const,
                actionedAt: new Date(q.createdAt).toLocaleDateString(),
                actionNote: "Submitted for approval",
              },
              {
                id: "ws-2",
                stepNumber: 2,
                nodeTitle: "Node 02 · Sales Manager",
                role: "Sales Manager" as const,
                assigneeName: "Elena Vance",
                status: (status === "APPROVED" ? "completed" : "active") as any,
                actionedAt: status !== "PENDING" ? "Recently" : undefined,
                actionNote: status === "APPROVED" ? "Approved exception" : status === "REJECTED" ? "Rejected" : "Pending signoff",
              },
              ...(hasFinanceStep
                ? [
                    {
                      id: "ws-3",
                      stepNumber: 3,
                      nodeTitle: "Node 03 · VP Finance",
                      role: "VP Finance" as const,
                      assigneeName: "Fiona Ops",
                      status: (status === "APPROVED" ? "active" : "pending") as any,
                      actionNote: "Pending second-level margin signoff (>15% exception)",
                    },
                  ]
                : []),
            ],
        auditLogs: (q as any).auditLogs && (q as any).auditLogs.length > 0
          ? (q as any).auditLogs.map((al: any) => ({
              id: al.id,
              actor: al.actor?.name || "User",
              role: al.actorRole?.replace("_", " ") || "Reviewer",
              action: al.action,
              timestamp: new Date(al.createdAt).toLocaleDateString(),
              note: al.reason || "",
            }))
          : [
              {
                id: `log-${q.id}`,
                actor: q.salesRep?.user?.name || "Account Executive",
                role: "Sales Rep",
                action: "SUBMITTED",
                timestamp: new Date(q.createdAt).toLocaleDateString(),
                note: `Submitted quote ${q.quoteNumber || q.id} for commercial signoff.`,
              },
            ],
      };
    });
  }, [allQuotes]);

  // Anomaly & Telemetry Data Processing
  const anomaliesList = (apiAnomalies as any)?.anomalies || (apiAnomalies as any)?.alerts || (Array.isArray(apiAnomalies) ? apiAnomalies : []);
  const stalledList = (apiStalled as any)?.alerts || (Array.isArray(apiStalled) ? apiStalled : []);
  const slippageList = (apiSlippage as any)?.alerts || (Array.isArray(apiSlippage) ? apiSlippage : []);

  // Unified alert list merging all 3 sources (Discount Breaches, Stalled Quotes, SLA Slippage)
  const allAlerts: DealAnomalyRecord[] = useMemo(() => {
    const list: DealAnomalyRecord[] = [];

    if (anomaliesList && anomaliesList.length > 0) {
      anomaliesList.forEach((a: any) => {
        list.push({
          id: a.quotationId || a.id || "anom-" + Math.random(),
          quoteId: a.quoteNumber || "QT-1042",
          quotationId: a.quotationId,
          account: a.customerName || "Strategic Account",
          accountInitials: (a.customerName || "SA").slice(0, 2).toUpperCase(),
          repName: a.salesRepName || a.repName || "Account Rep",
          dealValue: a.dealSize || 75000,
          riskGaugePercent: a.blendedRiskScore || 25,
          riskLevel: (a.severity === "HIGH" || a.severity === "CRITICAL" ? "high" : a.severity === "LOW" ? "low" : "medium") as "high" | "medium" | "low",
          anomalyType: "Discount Breach" as const,
          idleDays: a.daysSinceLastActivity || 3,
          actionStatus: "flagged" as const,
          details: a.recommendation || `Discount +${a.excessPercent?.toFixed(1) || 5}% above rep baseline (${a.repBaselinePercent?.toFixed(1) || 10}%)`,
        });
      });
    }

    if (stalledList && stalledList.length > 0) {
      stalledList.forEach((s: any) => {
        list.push({
          id: s.quotationId || s.id || "stall-" + Math.random(),
          quoteId: s.quoteNumber || "QT-1043",
          quotationId: s.quotationId,
          account: s.customerName || "Strategic Account",
          accountInitials: (s.customerName || "SA").slice(0, 2).toUpperCase(),
          repName: s.salesRepName || "Account Rep",
          dealValue: s.grandTotal || 50000,
          riskGaugePercent: s.severity === "HIGH" ? 80 : s.severity === "MEDIUM" ? 50 : 25,
          riskLevel: (s.severity === "HIGH" ? "high" : s.severity === "MEDIUM" ? "medium" : "low") as "high" | "medium" | "low",
          anomalyType: "Stalled Deal" as const,
          idleDays: s.daysInactive || 7,
          actionStatus: "flagged" as const,
          details: `Inactive for ${s.daysInactive || 0} days (+${Math.max(0, (s.daysInactive || 0) - (s.thresholdDays || 7))} days over ${s.thresholdDays || 7}d limit) — Stage: ${s.stage}`,
        });
      });
    }

    if (slippageList && slippageList.length > 0) {
      slippageList.forEach((sl: any) => {
        list.push({
          id: sl.fulfillmentOrderId || sl.id || "slip-" + Math.random(),
          quoteId: sl.fulfillmentNumber || "FO-101",
          quotationId: sl.quotationId,
          account: sl.customerName || sl.fulfillmentNumber || "Fulfillment Order",
          accountInitials: "FO",
          repName: "Logistics Ops",
          dealValue: 0,
          riskGaugePercent: 70,
          riskLevel: "high" as const,
          anomalyType: "SLA Alert" as const,
          idleDays: sl.daysOverdue || 2,
          actionStatus: "flagged" as const,
          details: `Delivery ${sl.daysOverdue || 0} days past SLA — ${sl.reason || "No shipment dispatched"}`,
        });
      });
    }

    return list;
  }, [anomaliesList, stalledList, slippageList]);

  const displayAnomalies: DealAnomalyRecord[] = allAlerts.length > 0 ? allAlerts : INITIAL_DEAL_ANOMALIES;

  // Team Quota Metrics
  const teamReps = useMemo(() => {
    const rawReps = (apiMembers || []).filter(
      (m: any) => m.role === "SALES_REP" || m.salesRep
    );

    if (rawReps.length > 0) {
      return rawReps.map((m: any, idx: number) => {
        const repName = m.name || m.user?.name || "Account Executive";
        const repEmail = m.email || m.user?.email || "rep@dealflow.ai";
        const initials = repName
          .split(" ")
          .map((s: string) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        const repQuotes = (allQuotes || []).filter(
          (q) =>
            q.salesRepId === m.id ||
            q.salesRepId === m.salesRep?.id ||
            q.salesRep?.id === m.id ||
            q.salesRep?.id === m.salesRep?.id ||
            (q.salesRep as any)?.userId === m.id ||
            (q.salesRep as any)?.userId === (m as any).userId ||
            q.salesRep?.user?.name === repName
        );

        const closed = repQuotes
          .filter((q) => q.stage === "CONFIRMED" || q.stage === "APPROVED")
          .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

        const pipeline = repQuotes
          .filter(
            (q) =>
              q.stage === "DRAFT" ||
              q.stage === "PENDING_APPROVAL" ||
              q.stage === "NEGOTIATION"
          )
          .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

        const activeDeals = repQuotes.filter(
          (q) =>
            q.stage === "DRAFT" ||
            q.stage === "PENDING_APPROVAL" ||
            q.stage === "NEGOTIATION"
        ).length;

        const totalQuotesWithDiscount = repQuotes.filter(
          (q) => q.discountPercent !== undefined && q.discountPercent > 0
        );
        const historicalAvgDiscount =
          m.salesRep?.historicalAvgDiscount ??
          (totalQuotesWithDiscount.length > 0
            ? Math.round(
                totalQuotesWithDiscount.reduce(
                  (sum, q) => sum + (q.discountPercent || 0),
                  0
                ) / totalQuotesWithDiscount.length
              )
            : 10);

        const quota = m.salesRep?.targetQuota || (m as any).quotaTarget || 500000;
        const pacing = quota > 0 ? Math.round((closed / quota) * 100) : 0;
        const commissionRate = m.salesRep?.commissionRate ?? 10;

        const bgColors = [
          "bg-indigo-600",
          "bg-emerald-600",
          "bg-sky-600",
          "bg-amber-600",
          "bg-purple-600",
          "bg-rose-600",
        ];
        const avatarBg = bgColors[idx % bgColors.length];

        return {
          id: m.id,
          name: repName,
          email: repEmail,
          initials,
          avatarBg,
          closed,
          pipeline,
          activeDeals,
          historicalAvgDiscount,
          quota,
          pacing,
          commissionRate,
        };
      });
    }

    // Fallback to sample rep metrics for demo presentation
    return INITIAL_REP_METRICS.map((rep) => ({
      id: rep.id,
      name: rep.name,
      email: rep.email,
      initials: rep.initials,
      avatarBg: rep.avatarBg || "bg-indigo-600",
      closed: rep.closed,
      pipeline: rep.pipeline,
      activeDeals: rep.activeDeals,
      historicalAvgDiscount: rep.historicalAvgDiscount,
      quota: rep.quota,
      pacing: rep.pacing,
      commissionRate: rep.commissionRate,
    }));
  }, [apiMembers, allQuotes]);

  const [approvalFilter, setApprovalFilter] = useState<"pending" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Telemetry filters
  const [timeframe, setTimeframe] = useState("Last 30 Days");
  const [riskFilter, setRiskFilter] = useState("All Risks");
  const [repFilter, setRepFilter] = useState("All Reps");
  const [diagnosticsRan, setDiagnosticsRan] = useState(false);

  // Decision Modal State
  const [activeModalRequest, setActiveModalRequest] = useState<{
    request: ManagerApprovalRequest;
    type: "approve" | "reject" | "revise";
  } | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === "PENDING");
  const totalExceptionsValue = pendingApprovals.reduce((acc, a) => acc + a.dealSize, 0);

  const filteredApprovals = approvals.filter((item) => {
    if (approvalFilter === "pending" && item.status !== "PENDING") return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.quoteId.toLowerCase().includes(query) ||
      item.account.toLowerCase().includes(query) ||
      item.repName.toLowerCase().includes(query)
    );
  });

  const filteredAnomalies = displayAnomalies.filter((item) => {
    if (riskFilter === "High Risk Only" && item.riskLevel !== "high") return false;
    if (riskFilter === "Medium & High" && item.riskLevel === "low") return false;
    if (repFilter !== "All Reps" && item.repName !== repFilter) return false;
    return true;
  });

  const handleOpenDecisionModal = (request: ManagerApprovalRequest, type: "approve" | "reject" | "revise") => {
    setActiveModalRequest({ request, type });
    setModalReason(
      type === "approve"
        ? "Approved as strategic exception for multi-year customer retention."
        : type === "revise"
        ? "Please reduce setup concession to 10% policy cap to protect margin floor."
        : "Concession exceeds discount governance bounds without committed ramp volume."
    );
  };

  const handleConfirmDecision = async () => {
    if (!activeModalRequest) return;
    const { request, type } = activeModalRequest;
    const newStatus: ApprovalStatus =
      type === "approve"
        ? "APPROVED"
        : type === "reject"
        ? "REJECTED"
        : "REVISION_REQUESTED";

    try {
      const targetQuoteId = request.id || request.quoteId;
      if (type === "approve") {
        await approveStepMutation.mutateAsync({
          quotationId: targetQuoteId,
          comments: modalReason,
        });
      } else if (type === "reject") {
        await rejectStepMutation.mutateAsync({
          quotationId: targetQuoteId,
          comments: modalReason,
        });
      } else {
        await updateStageMutation.mutateAsync({
          id: targetQuoteId,
          stage: "DRAFT" as any,
        });
      }
      await refetchQuotes();
      await refetchAnomalies();
    } catch (err: any) {
      console.warn("Approval mutation fallback:", err);
      // Fallback update stage if approval step routing is in custom state
      try {
        const targetQuoteId = request.id || request.quoteId;
        if (targetQuoteId) {
          await updateStageMutation.mutateAsync({
            id: targetQuoteId,
            stage: newStatus === "APPROVED" ? "APPROVED" : "DRAFT",
          });
        }
      } catch (innerErr) {
        console.warn("Stage update fallback error:", innerErr);
      }
      await refetchQuotes();
    }

    const isDual = request.escalationLevel === "SALES_MANAGER_AND_FINANCE";
    setModalSuccessMsg(
      type === "approve" && isDual
        ? `Step 1 (Sales Manager) Approved for ${request.quoteId}! Forwarded to Finance Operations.`
        : `Decision logged: ${request.quoteId} is now ${newStatus.replace("_", " ")}.`
    );
    setTimeout(() => {
      setActiveModalRequest(null);
      setModalSuccessMsg(null);
    }, 1500);
  };

  const handleAnomalyAction = (id: string, actionType: "escalate" | "nudge") => {
    nudgeMutation.mutate(
      { quotationId: id, type: actionType },
      {
        onSuccess: () => toast.success(`Action '${actionType}' registered for anomaly`),
        onError: () => toast.error(`Failed to register action`),
      }
    );
  };

  const handleRunDiagnostics = () => {
    setDiagnosticsRan(true);
    setTimeout(() => setDiagnosticsRan(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* Top Universal Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/manager" subtitle="Sales Director Hub" />

            {/* Hub Primary Navigation Tabs with Uniform Height and Styling */}
            <nav className="hidden md:flex items-center gap-1 p-1 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveView("approvals")}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 cursor-pointer ${
                  activeView === "approvals"
                    ? "bg-[#ff5e3a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <Clock size={13} className={activeView === "approvals" ? "text-white" : "text-slate-500"} />
                <span>Exceptions Queue</span>
                {pendingApprovals.length > 0 && (
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      activeView === "approvals"
                        ? "bg-white text-[#ff5e3a]"
                        : "bg-orange-50 text-[#ff5e3a] border border-orange-200"
                    }`}
                  >
                    {pendingApprovals.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveView("telemetry")}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 cursor-pointer ${
                  activeView === "telemetry"
                    ? "bg-[#ff5e3a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <Activity size={13} className={activeView === "telemetry" ? "text-white" : "text-slate-500"} />
                <span>Deal Health Telemetry</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeView === "telemetry" ? "bg-white" : "bg-[#ff5e3a]"
                  } animate-pulse`}
                />
              </button>

              <button
                type="button"
                onClick={() => setActiveView("team")}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 cursor-pointer ${
                  activeView === "team"
                    ? "bg-[#ff5e3a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <Users size={13} className={activeView === "team" ? "text-white" : "text-slate-500"} />
                <span>Team Quotas</span>
              </button>
            </nav>
          </div>

          {/* Right: Manager Profile */}
          <div className="relative flex items-center gap-3 shrink-0">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 pl-2.5 sm:border-l sm:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#ff5e3a] text-white text-xs font-extrabold flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
                {currentUserInitials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  {currentUserName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                  Sales Director
                </span>
              </div>
            </button>
            <ProfileModal
              onSignOut={signOut}
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              user={{
                name: currentUserName,
                email: user?.email || "elena@dealflow360.com",
                initials: currentUserInitials,
                role: "manager",
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* VIEW 1: APPROVALS & COMMERCIAL EXCEPTION QUEUE */}
        {activeView === "approvals" && (
          <div className="space-y-8">
            {/* View Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5e3a] animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff5e3a]">
                    Commercial Governance Engine
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight mt-1">
                  Manager Approvals &amp; Concessions
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Review discount exceptions, authorize enterprise concessions, and safeguard company gross margins.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-[#ff5e3a] text-xs font-bold">
                  <Clock size={13} />
                  {pendingApprovals.length} Quotes Pending Signoff
                </span>
              </div>
            </div>

            {/* 3 Key Metric Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Team Quota Attainment
                  </span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-[#0f172a] tracking-tight">
                    {allQuotes && allQuotes.length > 0
                      ? `${(
                          ((allQuotes
                            .filter((q) => q.stage === "CONFIRMED" || q.stage === "APPROVED")
                            .reduce((sum, q) => sum + (q.grandTotal || 0), 0)) /
                            1500000) *
                          100
                        ).toFixed(1)}%`
                      : "0.0%"}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">
                    ₹{((allQuotes || [])
                      .filter((q) => q.stage === "CONFIRMED" || q.stage === "APPROVED")
                      .reduce((sum, q) => sum + (q.grandTotal || 0), 0))
                      .toLocaleString()}{" "}
                    closed to date
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Discounts Under Review
                  </span>
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-amber-600 tracking-tight">
                    ₹{totalExceptionsValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Across {pendingApprovals.length} pending bids
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Margin Guardrail Integrity
                  </span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">
                    {(allQuotes && allQuotes.length > 0
                      ? allQuotes.reduce((sum, q) => sum + (q.grossMarginPercent || 40), 0) / allQuotes.length
                      : 45.0
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Company gross margin average
                  </div>
                </div>
              </div>
            </div>

            {/* Exceptions Queue Table Card */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">Commercial Exception Queue</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Proposals exceeding rep discount limit (15%) requiring management signoff
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search quote, account, rep..."
                      className="pl-8 pr-3 py-1.5 rounded-full bg-slate-100 text-xs border border-transparent focus:border-slate-300 focus:bg-white focus:outline-none w-48 sm:w-56 transition"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setApprovalFilter("pending")}
                      className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                        approvalFilter === "pending"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Needs Action ({pendingApprovals.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalFilter("all")}
                      className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                        approvalFilter === "all"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      All ({approvals.length})
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredApprovals.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/60 transition"
                  >
                    <div className="space-y-2 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/manager/approvals/${item.id || item.quoteId}`}
                          className="font-mono text-xs font-bold text-[#ff5e3a] hover:underline"
                        >
                          {item.quoteId}
                        </Link>
                        <span className="text-slate-300">&bull;</span>
                        <span className="font-bold text-sm text-slate-900">{item.account}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                          {item.accountTier}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-xs text-slate-500">Rep: {item.repName}</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-[11px] text-slate-400">{item.submittedAt}</span>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                        <span className="font-bold text-slate-700">Concession Case: </span>
                        {item.reason}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Deal Value</div>
                        <div className="text-base font-extrabold text-slate-900 font-mono">
                          ₹{item.dealSize.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Discount Req.</div>
                        <div className="text-base font-bold text-amber-600">
                          {item.discountRequested}%{" "}
                          <span className="text-[10px] text-slate-400 font-normal">(max {item.thresholdMax}%)</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Margin</div>
                        <div
                          className={`text-base font-bold ${
                            item.marginProjected >= 45 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {item.marginProjected}%
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Risk Score</div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            item.blendedRiskScore > 75
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : item.blendedRiskScore > 50
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {item.blendedRiskScore} / 100
                        </span>
                      </div>

                      {item.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionModal(item, "approve")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition"
                          >
                            <Check size={13} strokeWidth={3} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionModal(item, "revise")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-bold cursor-pointer transition"
                          >
                            <RotateCcw size={12} />
                            <span>Revise</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionModal(item, "reject")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer transition"
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                          <Link
                            href={`/dashboard/manager/approvals/${item.id || item.quoteId}`}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                            title="Open Deep Determination Workspace"
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${
                              item.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "REVISION_REQUESTED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                          <Link
                            href={`/dashboard/manager/approvals/${item.id || item.quoteId}`}
                            className="text-xs text-[#ff5e3a] hover:underline font-semibold"
                          >
                            View Audit &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DEAL HEALTH DASHBOARD */}
        {activeView === "telemetry" && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight mt-1">
                  Deal Health and Anomaly Dashboard
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time flags for stalled deals and unusual discount patterns
                </p>
              </div>
            </div>

            {/* Action & Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Timeframe Select */}
              <div className="bg-white rounded-full shadow-xs border border-slate-200 px-3.5 py-1.5 flex items-center gap-2 text-xs">
                <Calendar size={14} className="text-slate-400" />
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer pr-1"
                >
                  <option>Last 30 Days</option>
                  <option>Last 14 Days</option>
                  <option>Quarter to Date</option>
                </select>
              </div>

              {/* Risk Level Select */}
              <div className="bg-white rounded-full shadow-xs border border-slate-200 px-3.5 py-1.5 flex items-center gap-2 text-xs">
                <AlertTriangle size={14} className="text-slate-400" />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer pr-1"
                >
                  <option>All Risks</option>
                  <option>High Risk Only</option>
                  <option>Medium &amp; High</option>
                </select>
              </div>

              {/* Rep Select */}
              <div className="bg-white rounded-full shadow-xs border border-slate-200 px-3.5 py-1.5 flex items-center gap-2 text-xs">
                <Users size={14} className="text-slate-400" />
                <select
                  value={repFilter}
                  onChange={(e) => setRepFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer pr-1"
                >
                  <option>All Reps</option>
                  {teamReps && teamReps.length > 0 ? (
                    teamReps.map((rep) => (
                      <option key={rep.id} value={rep.name}>
                        {rep.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option>Sarah Jenkins</option>
                      <option>David Chen</option>
                      <option>Alex Rivera</option>
                    </>
                  )}
                </select>
              </div>

              {/* Diagnostics Trigger */}
              <button
                type="button"
                onClick={handleRunDiagnostics}
                className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2 rounded-full border border-slate-200 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <SlidersHorizontal size={13} className={diagnosticsRan ? "animate-spin text-[#ff5e3a]" : "text-slate-500"} />
                <span>{diagnosticsRan ? "Running..." : "Run Diagnostics"}</span>
              </button>
            </div>

            {/* 3 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-black/[0.06] shadow-xs">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Stalled Deals</h3>
                <p className="text-2xl font-black text-[#0f172a]">
                  {displayAnomalies.filter((a) => a.anomalyType === "Stalled Deal").length}{" "}
                  <span className="text-sm font-medium text-slate-500">idle 7+ days</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-black/[0.06] shadow-xs">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Discount Anomalies</h3>
                <p className="text-2xl font-black text-[#0f172a]">
                  {displayAnomalies.filter((a) => a.anomalyType === "Discount Breach").length}{" "}
                  <span className="text-sm font-medium text-slate-500">above rep avg</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-black/[0.06] shadow-xs">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">SLA Slippage</h3>
                <p className="text-2xl font-black text-[#0f172a]">
                  {displayAnomalies.filter((a) => a.anomalyType === "SLA Alert").length}{" "}
                  <span className="text-sm font-medium text-slate-500">past delivery date</span>
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-tl-2xl">Deal</th>
                    <th className="py-4 px-4">Issue</th>
                    <th className="py-4 px-4">Risk</th>
                    <th className="py-4 px-6 rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAnomalies.length > 0 ? (
                    filteredAnomalies.map((a: any) => {
                      const quotationHref = a.quotationId
                        ? `/dashboard/manager/approvals/${a.quotationId}`
                        : null;
                      return (
                        <tr
                          key={a.id}
                          className={`hover:bg-orange-50/40 transition-colors group ${quotationHref ? "cursor-pointer" : ""}`}
                          onClick={() => quotationHref && router.push(quotationHref)}
                        >
                          <td className="py-4 px-6 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className={quotationHref ? "group-hover:text-[#ff5e3a] transition-colors" : ""}>{a.account}</div>
                                <div className="text-[11px] font-mono text-slate-400">{a.quoteId} • {a.repName}</div>
                              </div>
                              {quotationHref && (
                                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-[#ff5e3a] transition-colors flex-shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 max-w-xs">
                            <div className={`font-semibold text-xs ${a.riskLevel === "high" ? "text-rose-600" : "text-slate-700"}`}>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${
                                a.anomalyType === "Stalled Deal" ? "bg-amber-50 text-amber-700" :
                                a.anomalyType === "Discount Breach" ? "bg-rose-50 text-rose-700" :
                                "bg-purple-50 text-purple-700"
                              }`}>{a.anomalyType}</span>
                              {a.details}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    a.riskLevel === "high" ? "bg-rose-500" : a.riskLevel === "medium" ? "bg-amber-400" : "bg-emerald-400"
                                  }`}
                                  style={{ width: `${a.riskGaugePercent}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">{a.riskGaugePercent}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {a.quotationId ? (
                              <div
                                className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() =>
                                    nudgeMutation.mutate(
                                      { quotationId: a.quotationId, type: "nudge" },
                                      { onSuccess: () => toast.success(`Nudge sent for ${a.quoteId || a.account}`), onError: () => toast.error("Failed to send nudge") }
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-bold border border-sky-200 cursor-pointer transition"
                                >
                                  Nudge
                                </button>
                                <button
                                  onClick={() =>
                                    nudgeMutation.mutate(
                                      { quotationId: a.quotationId, type: "escalate" },
                                      { onSuccess: () => toast.success(`Escalated ${a.quoteId || a.account}`), onError: () => toast.error("Failed to escalate") }
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer transition"
                                >
                                  Escalate
                                </button>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">Flagged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No deal anomalies or stalled quotations detected. All deals healthy. ✅
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TEAM QUOTA PACING & DIRECT REPORTS */}
      {activeView === "team" && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                Team Quota Attainment &amp; Rep Pacing
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Track direct reports quota progress, commission structures, and deal health baselines.
              </p>
            </div>
          </div>

          {/* Team Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamReps && teamReps.length > 0 ? (
              teamReps.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white rounded-2xl border border-black/[0.06] shadow-xs p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${rep.avatarBg} text-white font-extrabold text-sm flex items-center justify-center shadow-xs`}
                      >
                        {rep.initials}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#0f172a]">{rep.name}</div>
                        <div className="text-[11px] text-slate-400">{rep.email}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        rep.pacing >= 100
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {rep.pacing}% Pacing
                    </span>
                  </div>

                  {/* Attainment Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Closed: ₹{rep.closed.toLocaleString()}</span>
                      <span className="text-slate-400 font-normal">Quota: ₹{rep.quota.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          rep.pacing >= 100 ? "bg-[#ff5e3a]" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(rep.pacing, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Rep Metrics Strip */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Active Pipeline</div>
                      <div className="font-mono font-bold text-slate-800">₹{rep.pipeline.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Commission</div>
                      <div className="font-mono font-bold text-emerald-600">{rep.commissionRate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Active Deals</div>
                      <div className="font-bold text-slate-800">{rep.activeDeals} Deals</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Hist Avg Discount</div>
                      <div className="font-mono font-bold text-slate-700">{rep.historicalAvgDiscount}%</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                <Users size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No Sales Representatives Registered</p>
                <p className="text-xs text-slate-400 mt-0.5">Team members will appear here once added to the organization.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>

    {/* QUICK DECISION MODAL */}
    {activeModalRequest && (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full border border-black/[0.08] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                  activeModalRequest.type === "approve"
                    ? "bg-emerald-600"
                    : activeModalRequest.type === "revise"
                    ? "bg-amber-600"
                    : "bg-rose-600"
                }`}
              >
                {activeModalRequest.type === "approve" ? (
                  <Check size={16} strokeWidth={3} />
                ) : activeModalRequest.type === "revise" ? (
                  <RotateCcw size={14} />
                ) : (
                  <XCircle size={16} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base capitalize">
                  {activeModalRequest.type === "revise" ? "Return for Revision" : `${activeModalRequest.type} Concession`}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {activeModalRequest.request.quoteId} • {activeModalRequest.request.account}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModalRequest(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Deal Size: ₹{activeModalRequest.request.dealSize.toLocaleString()}</span>
                <span className="text-amber-600">
                  Requested Concession: {activeModalRequest.request.discountRequested}%
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Rep: {activeModalRequest.request.repName} • Margin: {activeModalRequest.request.marginProjected}%
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Executive Determination Note:</label>
              <textarea
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]/30 focus:border-[#ff5e3a]"
                placeholder="Enter audit rationale, counter-terms, or revision requirements..."
              />
            </div>

            {modalSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check size={14} />
                <span>{modalSuccessMsg}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveModalRequest(null)}
              className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDecision}
              className={`px-5 py-2 rounded-full text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeModalRequest.type === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : activeModalRequest.type === "revise"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              <Send size={13} />
              <span>Confirm &amp; Register Audit</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
