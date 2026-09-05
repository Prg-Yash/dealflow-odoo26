"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Search,
  Box,
  CreditCard,
  Package,
  TrendingDown,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import {
  INITIAL_FINANCE_APPROVALS,
  INITIAL_FULFILLMENT_RECORDS,
  INITIAL_INVOICE_RECORDS,
  type FinanceApprovalRequest,
  type FulfillmentRecord,
  type InvoiceRecord,
  type ApprovalStatus,
  INITIAL_SUBSCRIPTION_RECORDS,
  type SubscriptionRecord,
} from "../../../../lib/finance-data";
import {
  useInvoices,
  useFulfillmentOrders,
  useQuotations,
  useUpdateQuotationStage,
  useSubscriptions,
  useApproveQuotation,
  useRejectQuotation,
} from "../../../../lib/query";

export default function FinanceDashboardPage() {
  const [activeView, setActiveView] = useState<"approvals" | "fulfillment" | "subscriptions" | "invoices">("approvals");

  // Live TanStack Query Hooks
  const { data: apiInvoices } = useInvoices();
  const { data: apiFulfillment } = useFulfillmentOrders();
  const { data: apiQuotes } = useQuotations({ stage: "PENDING_APPROVAL" });
  const { data: apiSubscriptions } = useSubscriptions();
  const updateStageMutation = useUpdateQuotationStage();
  const approveQuotationMutation = useApproveQuotation();
  const rejectQuotationMutation = useRejectQuotation();

  const [approvals, setApprovals] = useState<FinanceApprovalRequest[]>(INITIAL_FINANCE_APPROVALS);
  const [fulfillments, setFulfillments] = useState<FulfillmentRecord[]>(INITIAL_FULFILLMENT_RECORDS);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICE_RECORDS);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(INITIAL_SUBSCRIPTION_RECORDS);

  useEffect(() => {
    if (apiSubscriptions && apiSubscriptions.length > 0) {
      setSubscriptions(
        apiSubscriptions.map((s) => ({
          id: s.id,
          account: s.customer?.name || s.customer?.companyName || "Client Account",
          plan: s.lines?.[0]?.product?.name || s.notes || "Recurring Plan",
          cycle: (s.billingInterval.charAt(0).toUpperCase() + s.billingInterval.slice(1).toLowerCase()) as any,
          nextBillDate: s.nextBillingDate
            ? new Date(s.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "-",
          status: s.status === "ACTIVE" ? "Active" : s.status === "PAUSED" ? "Paused" : "Cancelled",
          amount: s.currentMrr || 0,
        }))
      );
    }
  }, [apiSubscriptions]);

  useEffect(() => {
    if (apiQuotes && apiQuotes.length > 0) {
      // Strict Sequential Filtering:
      // Quotations that require Finance approval ONLY appear in the Finance Exception Queue
      // IF Sales Manager has ALREADY approved Step 1 (or currentStep >= 2)!
      const eligibleFinanceQuotes = apiQuotes.filter((q) => {
        const reqFinance =
          q.requiresFinanceApproval ||
          q.approvalRequest?.steps?.some((s: any) => s.level === "FINANCE") ||
          (q.blendedRiskScore && q.blendedRiskScore > 10);
        if (!reqFinance) return false;

        if (q.approvalRequest?.steps && q.approvalRequest.steps.length > 0) {
          const step1 = q.approvalRequest.steps.find((s: any) => s.stepNumber === 1);
          if (step1 && step1.level === "SALES_MANAGER") {
            // If Step 1 (Sales Manager) is still PENDING, DO NOT SHOW to Finance yet!
            if (step1.status !== "APPROVED" && q.approvalRequest.currentStep < 2) {
              return false;
            }
          }
        }
        return true;
      });

      if (eligibleFinanceQuotes.length > 0) {
        setApprovals(
          eligibleFinanceQuotes.map((q) => {
            const step2 = q.approvalRequest?.steps?.find((s: any) => s.level === "FINANCE");
            const isPending = step2 ? step2.status === "PENDING" : q.stage === "PENDING_APPROVAL";

            return {
              id: q.id,
              quoteId: q.quoteNumber || q.id,
              account: q.customer?.name || "Corporate Client",
              accountTier: ((q.customer as any)?.tier?.name as any) || "Gold",
              dealSize: q.grandTotal || 0,
              discountRequested: q.discountPercent || 15,
              marginProjected: q.grossMarginPercent || 38,
              targetMargin: 45.0,
              reason: q.notes || "Sequential Step 2: High-risk discount exception requiring Finance Ops authorization.",
              status: (isPending ? "PENDING" : q.stage === "APPROVED" ? "APPROVED" : q.stage === "CANCELLED" ? "REJECTED" : "PENDING") as ApprovalStatus,
              submittedAt: new Date(q.createdAt).toLocaleDateString(),
              slaHoursLeft: 24,
              blendedRiskScore: q.blendedRiskScore || 12,
              escalationReason: `Sales Manager Approved (Step 1 ✓) &bull; High Risk ${q.blendedRiskScore || 12}% Blended`,
            };
          })
        );
      } else {
        setApprovals(INITIAL_FINANCE_APPROVALS);
      }
    }
  }, [apiQuotes]);

  useEffect(() => {
    if (apiFulfillment && apiFulfillment.length > 0) {
      setFulfillments(
        apiFulfillment.map((f) => ({
          id: f.fulfillmentNumber,
          quoteId: f.quotationId || "Q-1045",
          account: "Apex Strategic Partner",
          status: (f.status === "FULFILLED" ? "FULFILLED" : f.status === "PARTIALLY_FULFILLED" ? "PARTIALLY_FULFILLED" : "PENDING") as any,
          warehouseSplit: (f.shipments?.length || 0) > 1,
          itemsPending: f.lines?.reduce((acc: number, l: any) => acc + (l.pendingQuantity || 0), 0) || 0,
          itemsTotal: f.lines?.reduce((acc: number, l: any) => acc + (l.quantity || 0), 0) || 10,
          backorderRisk: Boolean(f.backorders && f.backorders.length > 0),
          expectedShipDate: new Date(f.promisedDate || f.createdAt).toLocaleDateString(),
        }))
      );
    }
  }, [apiFulfillment]);

  useEffect(() => {
    if (apiInvoices && apiInvoices.length > 0) {
      setInvoices(
        apiInvoices.map((inv) => ({
          id: inv.invoiceNumber,
          account: "Enterprise Account",
          amount: inv.totalAmount,
          status: (inv.status === "PARTIALLY_PAID" ? "ISSUED" : inv.status) as any,
          dueDate: new Date(inv.dueDate).toLocaleDateString(),
          paymentMethod: "ACH Transfer",
        }))
      );
    }
  }, [apiInvoices]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<"pending" | "all">("pending");

  // Decision Modal State
  const [activeModalRequest, setActiveModalRequest] = useState<{
    request: FinanceApprovalRequest;
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
      item.account.toLowerCase().includes(query)
    );
  });

  const handleOpenDecisionModal = (request: FinanceApprovalRequest, type: "approve" | "reject" | "revise") => {
    setActiveModalRequest({ request, type });
    setModalReason(
      type === "approve"
        ? "Financial impact cleared. Margin risk accepted."
        : type === "revise"
        ? "Please restructure payment terms to mitigate upfront margin hit."
        : "Margin erosion exceeds acceptable threshold. Deal rejected."
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
      if (request.id) {
        if (type === "approve") {
          await approveQuotationMutation.mutateAsync({
            id: request.id,
            comments: modalReason,
          });
        } else if (type === "reject") {
          await rejectQuotationMutation.mutateAsync({
            id: request.id,
            reason: modalReason,
          });
        } else {
          await updateStageMutation.mutateAsync({
            id: request.id,
            stage: "DRAFT" as any,
          });
        }
      }
    } catch (err) {
      console.warn("Finance approval decision error:", err);
    }

    setApprovals((prev) =>
      prev.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: newStatus,
            }
          : item
      )
    );

    setModalSuccessMsg(`Finance decision logged: ${request.quoteId} is now ${newStatus.replace("_", " ")}.`);
    setTimeout(() => {
      setActiveModalRequest(null);
      setModalSuccessMsg(null);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* Isolated Finance Topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="Finance Operations" />

            {/* Navigation Tabs - Strict Isolation to Finance Scope */}
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
                <AlertTriangle size={13} className={activeView === "approvals" ? "text-white" : "text-slate-500"} />
                <span>High-Risk Approvals</span>
                {pendingApprovals.length > 0 && (
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      activeView === "approvals"
                        ? "bg-white text-[#ff5e3a]"
                        : "bg-cyan-50 text-[#ff5e3a] border border-cyan-200"
                    }`}
                  >
                    {pendingApprovals.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveView("fulfillment")}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 cursor-pointer ${
                  activeView === "fulfillment"
                    ? "bg-[#ff5e3a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <Package size={13} className={activeView === "fulfillment" ? "text-white" : "text-slate-500"} />
                <span>Logistics &amp; Stock</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("subscriptions")}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 cursor-pointer ${
                  activeView === "subscriptions"
                    ? "bg-[#ff5e3a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <TrendingUp size={13} className={activeView === "subscriptions" ? "text-white" : "text-slate-500"} />
                <span>Subscriptions</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("invoices")}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 cursor-pointer ${
                  activeView === "invoices"
                    ? "bg-[#ff5e3a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <CreditCard size={13} className={activeView === "invoices" ? "text-white" : "text-slate-500"} />
                <span>Invoices</span>
              </button>
            </nav>
          </div>

          {/* Right: Isolated User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 pl-2.5 sm:border-l sm:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#ff5e3a] text-white text-xs font-extrabold flex items-center justify-center shadow-sm">
                FO
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  Fiona Ops
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                  VP of Finance
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* VIEW 1: HIGH-RISK APPROVALS */}
        {activeView === "approvals" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5e3a] animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff5e3a]">
                    Tier-2 Risk Engine
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight mt-1">
                  Margin Risk &amp; Deal Exceptions
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Review and sign-off on deep discount outliers breaching automated guardrails.
                </p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Revenue at Risk
                  </span>
                  <div className="w-8 h-8 rounded-full bg-cyan-50 text-[#ff5e3a] flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-[#0f172a] tracking-tight">
                    ₹{totalExceptionsValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">
                    Pending Finance Authorization
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Average Margin Drop
                  </span>
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <TrendingDown size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-rose-600 tracking-tight">-7.4%</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Below standard target (45%)
                  </div>
                </div>
              </div>
              
              <div className="p-6 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Escalation SLA
                  </span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">1.2d</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Average resolution time (2.0d limit)
                  </div>
                </div>
              </div>
            </div>

            {/* Exceptions Queue Table Card */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a]">High-Risk Exception Queue</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Requires immediate review from Finance Operations
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search quote, account..."
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
                      Action ({pendingApprovals.length})
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
                    <div className="space-y-3 w-full lg:max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`#`}
                          className="font-mono text-sm font-bold text-[#ff5e3a] hover:underline"
                        >
                          {item.quoteId}
                        </Link>
                        <span className="text-slate-300">&bull;</span>
                        <span className="font-bold text-base text-slate-900">{item.account}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          {item.accountTier}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                      </div>
                      
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {item.escalationReason}
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50/80 px-4 py-2.5 rounded-full border border-slate-100 flex items-center">
                        <span className="font-bold text-slate-700 mr-1.5">Justification:</span>
                        {item.reason}
                      </p>
                    </div>

                    <div className="mt-4 lg:mt-0 shrink-0">
                      <div className="grid grid-cols-[100px_110px_160px] gap-x-4 gap-y-3">
                        {/* Stats Row */}
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Deal Value</span>
                          <span className="text-lg font-extrabold text-slate-900 font-mono">
                            ₹{item.dealSize.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Discount Req.</span>
                          <span className="text-lg font-bold text-amber-600 font-mono">
                            {item.discountRequested}%
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Margin</span>
                          <span className="text-lg font-bold text-rose-600 font-mono">
                            {item.marginProjected}% <span className="text-[11px] text-slate-400 font-normal">({item.targetMargin}% flr)</span>
                          </span>
                        </div>

                        {/* Actions Row */}
                        {item.status === "PENDING" ? (
                          <>
                            <div className="flex justify-start items-start">
                              <button
                                type="button"
                                onClick={() => handleOpenDecisionModal(item, "approve")}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#00a86b] hover:bg-[#00905a] text-white text-xs font-bold transition whitespace-nowrap"
                              >
                                <Check size={14} strokeWidth={3} />
                                <span>Approve</span>
                              </button>
                            </div>
                            <div className="flex justify-start items-start">
                              <button
                                type="button"
                                onClick={() => handleOpenDecisionModal(item, "revise")}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-bold transition whitespace-nowrap"
                              >
                                <RotateCcw size={13} />
                                <span>Revise</span>
                              </button>
                            </div>
                            <div className="flex justify-start items-start">
                              <button
                                type="button"
                                onClick={() => handleOpenDecisionModal(item, "reject")}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition whitespace-nowrap"
                              >
                                <XCircle size={14} />
                                <span>Reject</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div />
                            <div />
                            <div className="flex justify-end items-start mt-1">
                              <span
                                className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  item.status === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : item.status === "REVISION_REQUESTED"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}
                              >
                                {item.status.replace("_", " ")}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FULFILLMENT & LOGISTICS */}
        {activeView === "fulfillment" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Operations
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight mt-1">
                  Logistics &amp; Stock Splits
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage multi-warehouse allocations, pending shipments, and backorder overrides.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {fulfillments.map((order) => (
                <Link href={`/dashboard/finance/fulfillment/${order.id}`} key={order.id} className="block group">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between group-hover:border-[#ff5e3a]/30 group-hover:shadow-md transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xs font-bold text-[#ff5e3a] font-mono">{order.id}</div>
                      <div className="text-lg font-extrabold text-slate-900 mt-1">{order.account}</div>
                      <div className="text-xs text-slate-500 mt-1">Quote Origin: {order.quoteId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        order.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        order.status === 'PARTIALLY_FULFILLED' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-[#ff5e3a] transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Completion Status</span>
                      <span className="font-bold text-slate-900">{order.itemsTotal - order.itemsPending} / {order.itemsTotal} items</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      <div className="bg-[#ff5e3a] h-full rounded-full" style={{ width: `${((order.itemsTotal - order.itemsPending) / order.itemsTotal) * 100}%` }} />
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 text-xs">
                      {order.warehouseSplit && (
                        <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                          <Box size={14} />
                          <span>Warehouse Split</span>
                        </div>
                      )}
                      {order.backorderRisk && (
                        <div className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                          <AlertTriangle size={14} />
                          <span>Backorder Risk</span>
                        </div>
                      )}
                      <div className="text-slate-500 ml-auto">
                        ETA: <span className="font-semibold text-slate-800">{order.expectedShipDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: SUBSCRIPTIONS */}
        {activeView === "subscriptions" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Recurring Revenue
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight mt-1">
                  Subscriptions
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every recurring plan across every customer, regardless of which order it came from.
                </p>
              </div>

              <Link
                href="/dashboard/finance/subscriptions"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ff4e26] text-white text-xs font-bold transition shadow-xs self-start sm:self-auto cursor-pointer"
              >
                <span>Full Subscriptions Hub &rarr;</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-emerald-100/50">
                <span className="font-black text-sm">{subscriptions.filter(s => s.status === 'Active').length}</span>
                <span className="font-semibold">Active</span>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-amber-100/50">
                <span className="font-black text-sm">{subscriptions.filter(s => s.status === 'Paused').length}</span>
                <span className="font-semibold">Paused</span>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-rose-100/50">
                <span className="font-black text-sm">{subscriptions.filter(s => s.status === 'Cancelled').length}</span>
                <span className="font-semibold">Cancelled</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-l-xl">Customer</th>
                    <th className="py-4 px-4">Plan</th>
                    <th className="py-4 px-4">Cycle</th>
                    <th className="py-4 px-4">Next Bill</th>
                    <th className="py-4 px-6 text-right rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <Link href={`/dashboard/finance/subscriptions/${sub.id}`} className="font-bold text-[#ff5e3a] hover:underline cursor-pointer block">
                          {sub.account}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-900 font-semibold">
                        {sub.plan}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {sub.cycle}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-700">
                        {sub.nextBillDate}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          sub.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          sub.status === 'Paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold">
              Click a subscription row to open its billing detail and proration history.
            </div>
          </div>
        )}

        {/* VIEW 4: INVOICING */}
        {activeView === "invoices" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Accounts Receivable
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight mt-1">
                  Invoices
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every invoice generated from one-time and recurring orders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-rose-100/50">
                <span className="font-black text-sm">4</span>
                <span className="font-semibold">Unpaid</span>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-emerald-100/50">
                <span className="font-black text-sm">21</span>
                <span className="font-semibold">Paid</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-tl-2xl">Invoice #</th>
                    <th className="py-4 px-4">Customer</th>
                    <th className="py-4 px-4">Amount</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-6 rounded-tr-2xl">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <Link href={`/dashboard/finance/invoices/${inv.id}`} className="font-bold text-slate-900 font-mono group-hover:text-[#ff5e3a] transition-colors block">
                          {inv.id}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-900 font-bold">
                        {inv.account}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                        ₹{inv.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          (inv.status === 'OVERDUE' || inv.status === 'ISSUED') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          inv.status === 'DRAFT' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {(inv.status === 'OVERDUE' || inv.status === 'ISSUED') ? 'Unpaid' : 'Paid'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-slate-800">{inv.dueDate}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold shadow-xs">
              Click an invoice row to open its full payment and delivery reconciliation detail.
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${
                    activeModalRequest.type === "approve"
                      ? "bg-emerald-500"
                      : activeModalRequest.type === "reject"
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                >
                  {activeModalRequest.type === "approve" ? (
                    <Check size={16} strokeWidth={3} />
                  ) : activeModalRequest.type === "reject" ? (
                    <XCircle size={16} />
                  ) : (
                    <RotateCcw size={16} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 capitalize">
                    {activeModalRequest.type} Exception
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {activeModalRequest.request.quoteId} &bull; Finance Level
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalRequest(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Resolution Note (Visible to Sales &amp; Audit)
                </label>
                <textarea
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#ff5e3a] focus:ring-1 focus:ring-[#ff5e3a]/20 transition resize-none"
                  placeholder="Enter reasoning for compliance audit..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalRequest(null)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  className={`px-5 py-2 rounded-full text-xs font-bold text-white shadow-sm transition cursor-pointer ${
                    activeModalRequest.type === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : activeModalRequest.type === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  Confirm &amp; Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {modalSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check size={14} strokeWidth={3} />
            </div>
            <p className="text-xs font-medium">{modalSuccessMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
