"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowLeft,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  FileText,
} from "lucide-react";
import { SalesNav } from "@repo/ui";
import { useQuotations } from "../../../../../lib/query";
import { useDashboardAuth } from "../../../layout";

export default function QuotationsListPage() {
  const { user, signOut } = useDashboardAuth();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search).get("stage");
      if (sp) return sp.toLowerCase();
    }
    return "all";
  });

  const stageParam =
    selectedStage === "all"
      ? undefined
      : selectedStage === "pending"
      ? "PENDING_APPROVAL"
      : selectedStage.toUpperCase();

  // Live TanStack Query - Scoped to logged in sales rep on backend
  const { data: apiQuotes, isLoading } = useQuotations({
    search: searchQuery || undefined,
    stage: stageParam,
  });

  // Purely dynamic - NO static initial data fallback
  const displayQuotations = (apiQuotes || []).map((q) => {
    const rawStage = (q.stage || "DRAFT").toUpperCase();
    let normalizedStage: "draft" | "pending" | "approved" | "negotiation" | "confirmed" = "draft";

    if (rawStage === "PENDING_APPROVAL" || rawStage === "PENDING") {
      normalizedStage = "pending";
    } else if (rawStage === "APPROVED") {
      normalizedStage = "approved";
    } else if (rawStage === "NEGOTIATION") {
      normalizedStage = "negotiation";
    } else if (rawStage === "CONFIRMED") {
      normalizedStage = "confirmed";
    }

    return {
      id: q.quoteNumber || q.id,
      rawId: q.id,
      customerOrg: q.customer?.name || "Customer Organization",
      customerName: q.customer?.name || "Procurement Team",
      tier: (q.customer as any)?.tier?.name || "Standard",
      title: q.title || "Sales Proposal",
      contractTotal: Number(q.grandTotal) || 0,
      grossMargin: q.grossMarginPercent || 0,
      avgMarginPercent: q.grossMarginPercent || 0,
      stage: normalizedStage,
      rawStage,
      validUntil: q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : "—",
      assignedRep: q.salesRep?.user?.name || user?.name || "You",
      portalToken: q.portalToken,
      requiresApproval: (q as any).approvalStatus === "PENDING" || rawStage === "PENDING_APPROVAL",
    };
  });

  const totalValue = displayQuotations.reduce((acc, q) => acc + q.contractTotal, 0);
  const pendingCount = displayQuotations.filter((q) => q.stage === "pending").length;
  const avgMargin =
    displayQuotations.length > 0
      ? (
          displayQuotations.reduce((acc, q) => acc + q.avgMarginPercent, 0) /
          displayQuotations.length
        ).toFixed(1)
      : "0.0";

  // Filtered by search query
  const filteredQuotes = displayQuotations.filter((q) => {
    if (!searchQuery.trim()) return true;
    const qLower = searchQuery.toLowerCase();
    return (
      q.id.toLowerCase().includes(qLower) ||
      q.customerOrg.toLowerCase().includes(qLower) ||
      q.customerName.toLowerCase().includes(qLower) ||
      q.title.toLowerCase().includes(qLower)
    );
  });

  // Kanban Column Definitions matching Reference Image 3
  const KANBAN_COLUMNS: {
    id: "draft" | "pending" | "approved" | "negotiation" | "confirmed";
    label: string;
    headerColor: string;
  }[] = [
    { id: "draft", label: "Draft", headerColor: "text-slate-700 bg-slate-100 border-slate-200" },
    { id: "pending", label: "Pending Approval", headerColor: "text-amber-700 bg-amber-50 border-amber-200" },
    { id: "approved", label: "Approved", headerColor: "text-blue-700 bg-blue-50 border-blue-200" },
    { id: "negotiation", label: "Negotiation", headerColor: "text-purple-700 bg-purple-50 border-purple-200" },
    { id: "confirmed", label: "Confirmed", headerColor: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SR";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
      {/* Role-Aware Navigation */}
      <SalesNav
        onSignOut={signOut}
        activeTab="quotations"
        userName={user?.name || "Sales Representative"}
        userInitials={userInitials}
        roleLabel={user?.role === "SALES_REP" ? "Sales Representative" : user?.role || "Sales Rep"}
        linkComponent={Link}
      />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard/sale-ref"
                className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium"
              >
                <ArrowLeft size={13} />
                <span>Back to Pipeline</span>
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {user?.role === "SALES_REP" ? "My Assigned Deals (Isolated)" : "Workspace View"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Quotations (List)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Every quotation in the system, one {viewMode === "kanban" ? "card" : "row"} per quotation, click to open it
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher Button */}
            <button
              onClick={() => setViewMode(viewMode === "kanban" ? "table" : "kanban")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-xs font-bold shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
            >
              {viewMode === "kanban" ? (
                <>
                  <TableIcon size={14} className="text-slate-500" />
                  <span>Switch to Table View</span>
                </>
              ) : (
                <>
                  <LayoutGrid size={14} className="text-slate-500" />
                  <span>Switch to Kanban View</span>
                </>
              )}
            </button>

            <Link
              href="/dashboard/sale-ref/quotations/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>+ New Quotation</span>
            </Link>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-left">
            <span className="text-xs font-semibold text-slate-500">Total Pipeline Value</span>
            <div className="text-2xl font-black text-[#0f172a] mt-1">
              ₹{totalValue.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">{displayQuotations.length} total active proposals</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-left">
            <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
            <span className="text-[11px] text-slate-400">Locked for review until approved by manager</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-left">
            <span className="text-xs font-semibold text-slate-500">Average Proposal Margin</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{avgMargin}%</div>
            <span className="text-[11px] text-slate-400">Healthy margin threshold &gt; 35%</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by quote number (e.g. QT-2026-0001) or customer organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl text-xs text-[#0f172a] placeholder:text-slate-400 outline-none transition-all"
            />
          </div>

          {/* Stage Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {["all", "draft", "pending", "approved", "negotiation", "confirmed"].map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedStage(stage)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedStage === stage
                    ? "bg-[#ff5e3a] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {stage === "pending" ? "Pending Approval" : stage}
              </button>
            ))}
          </div>
        </div>

        {/* ── EMPTY STATE IF NO QUOTATIONS EXIST AT ALL ── */}
        {!isLoading && displayQuotations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-[#ff5e3a] flex items-center justify-center mx-auto shadow-xs">
              <FileText size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                No quotations created yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                You haven't created any quotations for this organization yet.
                Create your first proposal to evaluate discount thresholds, margins, and customer negotiations.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard/sale-ref/quotations/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 transition cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Create Quotation Now</span>
              </Link>
            </div>
          </div>
        ) : viewMode === "kanban" ? (
          /* ── KANBAN VIEW ── */
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 size={20} className="animate-spin text-[#ff5e3a]" />
                <span>Loading your quotations pipeline...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
                {KANBAN_COLUMNS.map((col) => {
                  const quotesInCol = filteredQuotes.filter((q) => q.stage === col.id);

                  return (
                    <div
                      key={col.id}
                      className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3 flex flex-col min-h-[480px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs text-slate-800 tracking-tight">
                            {col.label}
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${col.headerColor}`}>
                          {quotesInCol.length}
                        </span>
                      </div>

                      {/* Column Cards */}
                      <div className="space-y-2.5 flex-1">
                        {quotesInCol.length === 0 ? (
                          <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center p-3">
                            <span className="text-[11px] text-slate-400 font-medium">
                              No {col.label.toLowerCase()} deals
                            </span>
                          </div>
                        ) : (
                          quotesInCol.map((q) => {
                            const targetLink = `/dashboard/sale-ref/quotations/${q.rawId}`;

                            return (
                              <Link
                                key={q.rawId}
                                href={targetLink}
                                className="block bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#ff5e3a]/40 hover:-translate-y-0.5 transition-all text-left group cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                  <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-[#ff5e3a] transition-colors">
                                    {q.id}
                                  </span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {q.tier}
                                  </span>
                                </div>

                                <div className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#ff5e3a] transition-colors">
                                  {q.customerOrg}
                                </div>

                                <div className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                                  {q.title}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                  <div className="text-xs font-black text-slate-900">
                                    ₹{Number(q.contractTotal).toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {col.id === "pending" && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        <Clock size={10} /> Locked
                                      </span>
                                    )}
                                    <span className="text-[11px] font-bold text-emerald-600">
                                      {q.grossMargin}% mgn
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
            {isLoading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 size={16} className="animate-spin text-[#ff5e3a]" />
                <span>Fetching live quotations...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-5">Quote Number</th>
                      <th className="py-3 px-5">Customer &amp; Org</th>
                      <th className="py-3 px-5">Tier</th>
                      <th className="py-3 px-5">Contract Total</th>
                      <th className="py-3 px-5">Margin</th>
                      <th className="py-3 px-5">Stage</th>
                      <th className="py-3 px-5">Valid Until</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredQuotes.map((q: any) => {
                      const targetLink = `/dashboard/sale-ref/quotations/${q.rawId}`;
                      return (
                        <tr key={q.rawId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5 font-mono font-bold text-slate-900">
                            <Link href={targetLink} className="hover:text-[#ff5e3a] transition-colors">
                              {q.id}
                            </Link>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900">{q.customerOrg}</div>
                            <div className="text-[11px] text-slate-400">{q.title}</div>
                          </td>
                          <td className="py-4 px-5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {q.tier}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-900 text-sm">
                            ₹{Number(q.contractTotal).toLocaleString()}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`font-semibold ${q.grossMargin < 30 ? "text-amber-600" : "text-emerald-600"}`}>
                              {q.grossMargin}%
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              q.stage === "confirmed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : q.stage === "pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : q.stage === "approved"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : q.stage === "negotiation"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {q.stage === "pending" ? "Pending Approval" : q.stage}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-slate-500 font-medium">
                            {q.validUntil}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="inline-flex items-center gap-2">
                              {q.portalToken && (
                                <Link
                                  href={`/portal?token=${q.portalToken}`}
                                  target="_blank"
                                  className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-[#ff5e3a] text-[11px] font-semibold"
                                >
                                  Portal
                                </Link>
                              )}
                              <Link
                                href={targetLink}
                                className="inline-flex items-center gap-1 text-[#ff5e3a] hover:text-[#ea4e28] font-bold text-xs"
                              >
                                <span>Open</span>
                                <ArrowUpRight size={13} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
