"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  ChevronRight,
  RefreshCw,
  Plus,
  Warehouse as WarehouseIcon,
  Layers,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import {
  type FinanceApprovalRequest,
  type ApprovalStatus,
} from "../../../../lib/finance-data";
import {
  useInvoices,
  useSubscriptions,
  useFulfillmentOrders,
  useStockLevels,
  useQuotations,
  useUpdateQuotationStage,
} from "../../../../lib/query";

function FinanceDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const [activeView, setActiveView] = useState<"approvals" | "fulfillment" | "subscriptions" | "invoices">(
    (tabParam === "fulfillment" || tabParam === "subscriptions" || tabParam === "invoices")
      ? tabParam
      : "approvals"
  );

  useEffect(() => {
    if (tabParam === "fulfillment" || tabParam === "subscriptions" || tabParam === "invoices" || tabParam === "approvals") {
      setActiveView(tabParam);
    }
  }, [tabParam]);

  // Live TanStack Query Hooks
  const { data: apiInvoices, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: apiSubscriptions, isLoading: isLoadingSubscriptions, refetch: refetchSubscriptions } = useSubscriptions();
  const { data: apiFulfillment, isLoading: isLoadingFulfillment, refetch: refetchFulfillment } = useFulfillmentOrders();
  const { data: apiStockLevels, isLoading: isLoadingStock, refetch: refetchStock } = useStockLevels();
  const { data: allQuotes, isLoading: isLoadingQuotes, refetch: refetchQuotes } = useQuotations();
  const updateStageMutation = useUpdateQuotationStage();

  const [approvals, setApprovals] = useState<FinanceApprovalRequest[]>([]);

  useEffect(() => {
    if (allQuotes) {
      setApprovals(
        allQuotes.map((q) => {
          const discountPct =
            q.discountPercent ??
            (q.subtotal > 0 && q.discountTotal ? Math.round((q.discountTotal / q.subtotal) * 100) : 0);
          const marginPct =
            q.grossMarginPercent ??
            (q.grandTotal > 0 && q.grossMargin ? Math.round((q.grossMargin / q.grandTotal) * 100) : 40);

          const isPending = q.stage === "PENDING_APPROVAL" || q.approvalStatus === "PENDING";
          const isApproved = q.stage === "APPROVED" || q.stage === "CONFIRMED" || q.approvalStatus === "APPROVED";
          const isRejected = q.stage === "CANCELLED" || q.approvalStatus === "REJECTED";

          const status: ApprovalStatus = isApproved
            ? "APPROVED"
            : isRejected
            ? "REJECTED"
            : isPending
            ? "PENDING"
            : "PENDING";

          return {
            id: q.id,
            quoteId: q.quoteNumber || q.id,
            account: q.customer?.name || q.customer?.companyName || "Corporate Client",
            accountTier: ((q.customer as any)?.tier?.name as any) || "Gold",
            dealSize: q.grandTotal || 0,
            discountRequested: discountPct,
            marginProjected: marginPct,
            targetMargin: 45.0,
            reason: q.notes || "Commercial discount approval required.",
            status,
            submittedAt: new Date(q.createdAt).toLocaleDateString(),
            slaHoursLeft: 24,
            blendedRiskScore: q.blendedRiskScore || 12,
            escalationReason: `Quote escalated for ${discountPct}% discount threshold`,
          };
        })
      );
    }
  }, [allQuotes]);

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

  const handleConfirmDecision = () => {
    if (!activeModalRequest) return;
    const { request, type } = activeModalRequest;
    const newStatus: ApprovalStatus =
      type === "approve"
        ? "APPROVED"
        : type === "reject"
        ? "REJECTED"
        : "REVISION_REQUESTED";

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

    if (request.id.startsWith("q-") || request.id.length > 15) {
      updateStageMutation.mutate({
        id: request.id,
        stage: type === "approve" ? "APPROVED" : type === "reject" ? "CANCELLED" : "DRAFT",
      });
    }

    setModalSuccessMsg(`Finance decision logged: ${request.quoteId} is now ${newStatus.replace("_", " ")}.`);
    setTimeout(() => {
      setActiveModalRequest(null);
      setModalSuccessMsg(null);
    }, 1200);
  };

  // Compile Dynamic Orders Awaiting Fulfillment
  // Merge FulfillmentOrders with any confirmed Quotations that don't have a FulfillmentOrder yet
  const dynamicFulfillmentList = (() => {
    const list: Array<{
      id: string; // FulfillmentOrder ID or Quotation ID
      orderNumber: string;
      customerName: string;
      status: string;
      warehouses: string;
      shipmentCount: number;
      backordersCount: number;
      isQuotationDirect?: boolean;
    }> = [];

    if (apiFulfillment && apiFulfillment.length > 0) {
      for (const fo of apiFulfillment) {
        const uniqueWarehouses = Array.from(
          new Set(
            fo.shipments
              ?.map((s) => s.warehouse?.name || "Main Warehouse")
              .filter(Boolean) || []
          )
        );
        const whDisplay = uniqueWarehouses.length > 0 ? uniqueWarehouses.join(" + ") : "Pending Split";
        const hasBackorder = (fo.backorders?.length || 0) > 0;
        const statusDisplay = hasBackorder
          ? "Backorder"
          : fo.status === "FULFILLED"
          ? "Fulfilled"
          : fo.status === "PARTIALLY_FULFILLED"
          ? "Partially Fulfilled"
          : "Split Pending";

        list.push({
          id: fo.id,
          orderNumber: fo.quotation?.quoteNumber || fo.fulfillmentNumber,
          customerName: fo.quotation?.customer?.name || "Enterprise Customer",
          status: statusDisplay,
          warehouses: whDisplay,
          shipmentCount: fo.shipments?.length || 0,
          backordersCount: fo.backorders?.length || 0,
        });
      }
    }

    // Also include confirmed quotes that are ready to split
    if (allQuotes && allQuotes.length > 0) {
      const existingQuoteIds = new Set(apiFulfillment?.map((f) => f.quotationId) || []);
      const confirmedWithoutFO = allQuotes.filter(
        (q: any) => (q.stage === "CONFIRMED" || q.stage === "APPROVED") && !existingQuoteIds.has(q.id)
      );

      for (const q of confirmedWithoutFO) {
        list.push({
          id: q.id,
          orderNumber: q.quoteNumber || `QT-${q.id.slice(-4)}`,
          customerName: q.customer?.name || "Corporate Customer",
          status: "Split Pending",
          warehouses: "Auto-Split Available",
          shipmentCount: 0,
          backordersCount: 0,
          isQuotationDirect: true,
        });
      }
    }

    // Fallback seed rows if database is completely empty
    if (list.length === 0) {
      return [
        {
          id: "ORD-441",
          orderNumber: "Q-1042",
          customerName: "Acme Corp",
          status: "Split Pending",
          warehouses: "Main + East Depot",
          shipmentCount: 2,
          backordersCount: 0,
        },
        {
          id: "ORD-442",
          orderNumber: "Q-1030",
          customerName: "Zenith Co",
          status: "Backorder",
          warehouses: "East Depot",
          shipmentCount: 1,
          backordersCount: 1,
        },
      ];
    }

    return list;
  })();

  // Compile Dynamic Subscriptions List & Counts
  const dynamicSubscriptionsList = (() => {
    if (apiSubscriptions && apiSubscriptions.length > 0) {
      return apiSubscriptions.map((sub) => {
        const nextDate = sub.nextBillingDate
          ? new Date(sub.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "-";
        const planName = sub.lines?.[0]?.product?.name || "Enterprise Cloud Plan";
        const cycle =
          sub.billingInterval === "MONTHLY"
            ? "Monthly"
            : sub.billingInterval === "QUARTERLY"
            ? "Quarterly"
            : "Annual";
        const status =
          sub.status === "ACTIVE"
            ? "Active"
            : sub.status === "PAUSED"
            ? "Paused"
            : "Cancelled";

        return {
          id: sub.id,
          customerName: sub.customer?.name || "Corporate Client",
          plan: planName,
          cycle,
          nextBillDate: nextDate,
          status,
          amount: sub.currentMrr || 46,
        };
      });
    }

    return [
      {
        id: "SUB-8812",
        customerName: "Acme Corp",
        plan: "Care Plan 2yr",
        cycle: "Monthly",
        nextBillDate: "Sep 15",
        status: "Active",
        amount: 46,
      },
      {
        id: "SUB-8813",
        customerName: "Beta Industries",
        plan: "Support SLA",
        cycle: "Quarterly",
        nextBillDate: "Nov 1",
        status: "Active",
        amount: 300,
      },
      {
        id: "SUB-8814",
        customerName: "Delta LLC",
        plan: "Care Plan 1yr",
        cycle: "Monthly",
        nextBillDate: "-",
        status: "Paused",
        amount: 46,
      },
    ];
  })();

  const subActiveCount = dynamicSubscriptionsList.filter((s) => s.status === "Active").length;
  const subPausedCount = dynamicSubscriptionsList.filter((s) => s.status === "Paused").length;
  const subCancelledCount = dynamicSubscriptionsList.filter((s) => s.status === "Cancelled").length;

  // Compile Dynamic Invoices List & Counts
  const dynamicInvoicesList = (() => {
    if (apiInvoices && apiInvoices.length > 0) {
      return apiInvoices.map((inv) => {
        const isPaid = inv.status === "PAID";
        const dueDate = inv.dueDate
          ? new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Sep 10";

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer?.name || "Enterprise Customer",
          amount: inv.totalAmount,
          status: isPaid ? "Paid" : "Unpaid",
          dueDate,
        };
      });
    }

    return [
      { id: "inv-1", invoiceNumber: "INV-1042", customerName: "Acme Corp", amount: 2730, status: "Unpaid", dueDate: "Sep 10" },
      { id: "inv-2", invoiceNumber: "INV-1043", customerName: "Acme Corp", amount: 46, status: "Paid", dueDate: "Sep 15" },
      { id: "inv-3", invoiceNumber: "INV-1038", customerName: "Nova Retail", amount: 9750, status: "Paid", dueDate: "Aug 30" },
    ];
  })();

  const invUnpaidCount = dynamicInvoicesList.filter((i) => i.status === "Unpaid").length;
  const invPaidCount = dynamicInvoicesList.filter((i) => i.status === "Paid").length;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* Isolated Finance Topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="Finance Operations" />

            {/* Navigation Tabs */}
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
                <span>Approvals</span>
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
                <span>Fulfillment</span>
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
                  Finance &amp; Logistics
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
                {filteredApprovals.length > 0 ? (
                  filteredApprovals.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/60 transition"
                    >
                      <div className="space-y-3 w-full lg:max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#ff5e3a]">
                            {item.quoteId}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="font-bold text-base text-slate-900">{item.account}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                            {item.accountTier}
                          </span>
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

                          {item.status === "PENDING" ? (
                            <>
                              <div className="flex justify-start items-start">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDecisionModal(item, "approve")}
                                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#00a86b] hover:bg-[#00905a] text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
                                >
                                  <Check size={14} strokeWidth={3} />
                                  <span>Approve</span>
                                </button>
                              </div>
                              <div className="flex justify-start items-start">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDecisionModal(item, "revise")}
                                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-bold transition whitespace-nowrap cursor-pointer"
                                >
                                  <RotateCcw size={13} />
                                  <span>Revise</span>
                                </button>
                              </div>
                              <div className="flex justify-start items-start">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDecisionModal(item, "reject")}
                                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition whitespace-nowrap cursor-pointer"
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
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Check size={28} className="mx-auto mb-2 text-emerald-500" />
                    <p className="font-semibold text-slate-700">No Exceptions in Finance Queue</p>
                    <p className="text-xs text-slate-400 mt-0.5">All customer quotations are currently compliant with margin policy.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FULFILLMENT AND STOCK (LIST) - SCREEN 7 */}
        {activeView === "fulfillment" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                  Fulfillment and Stock (List)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Live stock per warehouse, plus every order that still needs fulfilling.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  refetchStock();
                  refetchFulfillment();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw size={13} className={isLoadingStock || isLoadingFulfillment ? "animate-spin" : ""} />
                <span>Sync Inventory</span>
              </button>
            </div>

            {/* SECTION 1: LIVE STOCK PER WAREHOUSE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <WarehouseIcon size={16} className="text-[#ff5e3a]" />
                  <span>Live Stock per Warehouse</span>
                </h2>
              </div>

              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                      <th className="py-3.5 px-6 rounded-tl-2xl">Warehouse</th>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4 text-center">In Stock</th>
                      <th className="py-3.5 px-4 text-center">Reserved</th>
                      <th className="py-3.5 px-6 text-right rounded-tr-2xl">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {isLoadingStock ? (
                      [1, 2, 3].map((n) => (
                        <tr key={n} className="animate-pulse">
                          <td className="py-3.5 px-6">
                            <div className="h-4 bg-slate-200 rounded w-32" />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="h-4 bg-slate-200 rounded w-40" />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="h-4 bg-slate-200 rounded w-8 mx-auto" />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="h-4 bg-slate-200 rounded w-8 mx-auto" />
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="h-4 bg-slate-200 rounded w-8 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : apiStockLevels && apiStockLevels.length > 0 ? (
                      apiStockLevels.map((s) => {
                        const onHand = s.quantityOnHand ?? s.onHand ?? 0;
                        const reserved = s.quantityReserved ?? s.reserved ?? 0;
                        const available = s.quantityAvailable ?? s.available ?? Math.max(0, onHand - reserved);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-bold text-slate-900">
                              {s.warehouse?.name || "Main Warehouse"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-800 font-medium">
                              <div>{s.product?.name || "Hardware Item"}</div>
                              {s.product?.sku && (
                                <div className="text-[10px] font-mono text-slate-400">{s.product.sku}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-900">
                              {onHand}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-amber-600 font-semibold">
                              {reserved}
                            </td>
                            <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-600">
                              {available}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          <WarehouseIcon size={24} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No Inventory Stock Levels Found</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Stock allocations will appear here when inventory is mapped to warehouses in the database.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: ORDERS AWAITING FULFILLMENT */}
            <div className="space-y-3 pt-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Box size={16} className="text-[#ff5e3a]" />
                <span>Orders Awaiting Fulfillment</span>
              </h2>

              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                      <th className="py-4 px-6 rounded-tl-2xl">Order</th>
                      <th className="py-4 px-4">Customer</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-6 rounded-tr-2xl text-right">Warehouses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dynamicFulfillmentList.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/finance/fulfillment/${order.id}`}
                            className="font-bold text-[#ff5e3a] font-mono hover:underline flex items-center gap-1.5"
                          >
                            <span>{order.orderNumber}</span>
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-[#ff5e3a] transition-colors" />
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-slate-900 font-bold">
                          {order.customerName}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              order.status === "Backorder"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : order.status === "Fulfilled"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-slate-700">
                          {order.warehouses}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Wireframe Info Banner */}
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold shadow-2xs flex items-center justify-between">
                <span>Click an order row to open its warehouse split detail.</span>
                <span className="text-[11px] text-amber-700/80 font-normal">Real-time NeonDB allocations</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: SUBSCRIPTIONS (LIST) - SCREEN 9 */}
        {activeView === "subscriptions" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                  Subscriptions (List)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every recurring plan across every customer, regardless of which order it came from.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchSubscriptions()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw size={13} className={isLoadingSubscriptions ? "animate-spin" : ""} />
                <span>Refresh SaaS Plans</span>
              </button>
            </div>

            {/* Stat Chips */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs flex items-center gap-1.5 shadow-2xs">
                <span className="font-black text-sm">{subActiveCount}</span>
                <span className="font-semibold">Active</span>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs flex items-center gap-1.5 shadow-2xs">
                <span className="font-black text-sm">{subPausedCount}</span>
                <span className="font-semibold">Paused</span>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-1.5 shadow-2xs">
                <span className="font-black text-sm">{subCancelledCount}</span>
                <span className="font-semibold">Canceled</span>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-tl-2xl">Customer</th>
                    <th className="py-4 px-4">Plan</th>
                    <th className="py-4 px-4">Cycle</th>
                    <th className="py-4 px-4">Next Bill</th>
                    <th className="py-4 px-6 text-right rounded-tr-2xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dynamicSubscriptionsList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/finance/subscriptions/${sub.id}`}
                          className="font-bold text-[#ff5e3a] hover:underline cursor-pointer block text-sm"
                        >
                          {sub.customerName}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-900 font-semibold">
                        {sub.plan}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {sub.cycle}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-700 font-semibold">
                        {sub.nextBillDate}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            sub.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : sub.status === "Paused"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Info Banner & Admin Action */}
            <div className="space-y-4">
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold shadow-2xs">
                Click a subscription row to open its billing detail and proration history.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => alert("To add a new recurring SaaS plan, configure Quotation lines with Category: SUBSCRIPTION.")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <Plus size={13} />
                  <span>+ New Plan (Admin)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: INVOICES (LIST) - SCREEN 11 */}
        {activeView === "invoices" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                  Invoices (List)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every invoice generated from one-time and recurring orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchInvoices()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw size={13} className={isLoadingInvoices ? "animate-spin" : ""} />
                <span>Refresh Ledgers</span>
              </button>
            </div>

            {/* Stat Chips */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-1.5 shadow-2xs">
                <span className="font-black text-sm">{invUnpaidCount}</span>
                <span className="font-semibold">Unpaid</span>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs flex items-center gap-1.5 shadow-2xs">
                <span className="font-black text-sm">{invPaidCount}</span>
                <span className="font-semibold">Paid</span>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-tl-2xl">Invoice #</th>
                    <th className="py-4 px-4">Customer</th>
                    <th className="py-4 px-4">Amount</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-6 rounded-tr-2xl text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dynamicInvoicesList.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/finance/invoices/${inv.id}`}
                          className="font-bold text-slate-900 font-mono group-hover:text-[#ff5e3a] transition-colors block text-sm"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-900 font-bold">
                        {inv.customerName}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                        ${inv.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            inv.status === "Unpaid"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-800 font-medium">
                        {inv.dueDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Info Banner */}
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold shadow-2xs">
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

export default function FinanceDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-xs font-bold text-slate-400">Loading Finance Hub...</div>}>
      <FinanceDashboardContent />
    </Suspense>
  );
}
