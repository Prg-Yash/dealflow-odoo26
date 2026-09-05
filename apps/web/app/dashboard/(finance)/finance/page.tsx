"use client";

import { useState } from "react";
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

export default function FinanceDashboardPage() {
  const [activeView, setActiveView] = useState<"approvals" | "fulfillment" | "subscriptions" | "invoices">("approvals");
  const [approvals, setApprovals] = useState<FinanceApprovalRequest[]>(INITIAL_FINANCE_APPROVALS);
  const [fulfillments] = useState<FulfillmentRecord[]>(INITIAL_FULFILLMENT_RECORDS);
  const [invoices] = useState<InvoiceRecord[]>(INITIAL_INVOICE_RECORDS);
  const [subscriptions] = useState<SubscriptionRecord[]>(INITIAL_SUBSCRIPTION_RECORDS);
  
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

          {/* Right: Live Sync & Isolated User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </div>

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
                    ${totalExceptionsValue.toLocaleString()}
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
                  <h2 className="text-base font-bold text-[#0f172a]">High-Risk Exception Queue</h2>
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
                    <div className="space-y-2 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`#`}
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
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider text-rose-500">
                          {item.escalationReason}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                        <span className="font-bold text-slate-700">Justification: </span>
                        {item.reason}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Deal Value</div>
                        <div className="text-base font-extrabold text-slate-900 font-mono">
                          ${item.dealSize.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Discount Req.</div>
                        <div className="text-base font-bold text-amber-600">
                          {item.discountRequested}%
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Margin</div>
                        <div className="text-base font-bold text-rose-600">
                          {item.marginProjected}% <span className="text-[10px] text-slate-400 font-normal">({item.targetMargin}% flr)</span>
                        </div>
                      </div>

                      {item.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionModal(item, "approve")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition shrink-0 whitespace-nowrap"
                          >
                            <Check size={13} strokeWidth={3} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionModal(item, "revise")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-bold cursor-pointer transition shrink-0 whitespace-nowrap"
                          >
                            <RotateCcw size={12} />
                            <span>Revise</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionModal(item, "reject")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer transition shrink-0 whitespace-nowrap"
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
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
                        </div>
                      )}
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
                  Subscriptions (List)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every recurring plan across every customer, regardless of which order it came from.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer">
                {subscriptions.filter(s => s.status === 'Active').length} Active
              </div>
              <div className="px-4 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold cursor-pointer">
                {subscriptions.filter(s => s.status === 'Paused').length} Paused
              </div>
              <div className="px-4 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer">
                {subscriptions.filter(s => s.status === 'Cancelled').length} Cancelled
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
                  Invoices (List)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every invoice generated from one-time and recurring orders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 rounded-xl bg-rose-400 text-white text-xs font-bold shadow-sm cursor-pointer border border-rose-500">
                4 Unpaid
              </div>
              <div className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm cursor-pointer border border-emerald-700">
                21 Paid
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
                      <td className="py-4 px-4 font-mono font-bold text-slate-700 text-sm">
                        ${inv.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          inv.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          inv.status === 'DRAFT' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {inv.status === 'OVERDUE' ? 'Unpaid' : inv.status === 'ISSUED' ? 'Unpaid' : 'Paid'}
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
