"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Loader2,
  FileText,
  Activity,
  FolderPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SalesNav, PipelineStageBar } from "@repo/ui";
import { useDashboardAuth } from "../../layout";
import { useQuotations } from "../../../../lib/query";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useDashboardAuth();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Dynamic live quotations for the logged-in sales rep
  const { data: apiQuotes, isLoading } = useQuotations();

  // Purely dynamic - NO static initial data fallback
  const quotations = (apiQuotes || []).map((q) => {
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
      customerName: q.customer?.name || "Client Lead",
      customerEmail: (q.customer as any)?.email || "",
      tier: (q.customer as any)?.tier?.name || "Standard",
      title: q.title || "Sales Quotation",
      contractTotal: Number(q.grandTotal) || 0,
      grossMarginPercent: q.grossMarginPercent || 0,
      stage: normalizedStage,
      rawStage,
      validUntil: q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : "—",
      assignedRep: q.salesRep?.user?.name || user?.name || "You",
      createdAt: new Date(q.createdAt).toLocaleDateString(),
      updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date(q.createdAt),
      blendedRiskScore: (q as any).blendedRiskScore || 0,
    };
  });

  // Dynamic Metric Computations
  const pendingApprovalsCount = quotations.filter((q) => q.stage === "pending").length;
  const openDealsCount = quotations.filter((q) => q.stage !== "confirmed").length;
  const atRiskCount = quotations.filter(
    (q) => q.grossMarginPercent < 35 || q.blendedRiskScore > 10 || q.stage === "pending"
  ).length;

  const stageStats = [
    { id: "draft", label: "Draft Proposals", barColor: "bg-slate-400" },
    { id: "pending", label: "In Review", barColor: "bg-amber-400" },
    { id: "approved", label: "Approved", barColor: "bg-blue-400" },
    { id: "negotiation", label: "Negotiation", barColor: "bg-purple-400" },
    { id: "confirmed", label: "Confirmed", barColor: "bg-emerald-500" },
  ].map((stage) => {
    const matching = quotations.filter((q) => q.stage === stage.id);
    const value = matching.reduce((acc, q) => acc + q.contractTotal, 0);
    return {
      ...stage,
      count: matching.length,
      value,
    };
  });

  const totalPipelineVal = stageStats.reduce((acc, s) => acc + s.value, 0);
  const stageBarData = stageStats.map((s) => ({
    id: s.id,
    label: s.label,
    count: s.count,
    value: s.value,
    percentage: totalPipelineVal > 0 ? Math.round((s.value / totalPipelineVal) * 100) : 0,
    colorClass: s.barColor,
  }));

  const filteredQuotes =
    selectedFilter === "all"
      ? quotations
      : quotations.filter((q) => q.stage === selectedFilter);

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
      {/* Role-Aware Navigation Bar */}
      <SalesNav
        activeTab="dashboard"
        userName={user?.name || "Sales Representative"}
        userInitials={userInitials}
        roleLabel={user?.role === "SALES_REP" ? "Sales Representative" : user?.role || "Sales Rep"}
        linkComponent={Link}
      />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Operations Header Bar */}
        <div className="pt-3 pb-2 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {user?.organization?.name || "Workspace"}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {user?.role === "SALES_REP" ? "Sales Representative Workspace" : "Sales Operations"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                Sales Dashboard / Home
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Central hub, links out to every module below
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard/sale-ref/quotations/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-[#0066cc]/25 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>+ New Quotation</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── TOP 3 HERO CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Pending Approvals */}
          <Link
            href="/dashboard/sale-ref/quotations?stage=pending"
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-300 transition-all text-left block group"
          >
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              Pending Approvals
            </h3>
            <div className="mt-2 text-2xl font-black text-amber-600">
              {pendingApprovalsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {pendingApprovalsCount} {pendingApprovalsCount === 1 ? "quotation" : "quotations"} waiting
            </p>
          </Link>

          {/* Card 2: Open Quotations */}
          <Link
            href="/dashboard/sale-ref/quotations"
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:border-[#0066cc]/40 transition-all text-left block group"
          >
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0066cc] transition-colors">
              Open Quotations
            </h3>
            <div className="mt-2 text-2xl font-black text-[#0066cc]">
              {openDealsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {openDealsCount} {openDealsCount === 1 ? "active deal" : "active deals"}
            </p>
          </Link>

          {/* Card 3: At-Risk Deals */}
          <Link
            href="/dashboard/sale-ref/quotations?stage=pending"
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:border-rose-300 transition-all text-left block group"
          >
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
              At-Risk Deals
            </h3>
            <div className="mt-2 text-2xl font-black text-rose-600">
              {atRiskCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {atRiskCount} flagged by Deal Health
            </p>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/sale-ref/quotations/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-[#0066cc]/25 transition cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>+ New Quotation</span>
          </Link>

          <Link
            href="/dashboard/sale-ref/quotations?stage=pending"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <span>View Approvals</span>
          </Link>

          <Link
            href="/dashboard/sale-ref/quotations"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <span>View All Quotations</span>
          </Link>
        </div>

        {/* ── RECENT ACTIVITY (DYNAMIC ONLY) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-[#0066cc] flex items-center gap-2">
              <Activity size={16} />
              <span>Recent Activity</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Real-time workflow events</span>
          </div>

          {isLoading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 size={16} className="animate-spin text-[#0066cc]" />
              <span>Loading recent activity...</span>
            </div>
          ) : quotations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recent quotation activity recorded yet. Create your first quotation to get started.
            </div>
          ) : (
            <ul className="space-y-2.5 text-xs text-slate-700">
              {quotations.slice(0, 5).map((q) => (
                <li key={q.rawId} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">&bull;</span>
                    <span className="font-medium text-slate-800">
                      {q.customerOrg} quotation <strong>{q.id}</strong> (₹{q.contractTotal.toLocaleString()}) &ndash; Stage: {q.stage}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-normal">{q.createdAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── PIPELINE STAGE DISTRIBUTION BAR ── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#0f172a] tracking-tight">
                Deal Pipeline Stage Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Quotations assigned to your sales portfolio
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Total Value:</span>
              <span className="font-extrabold text-[#0f172a] text-sm">
                ₹{totalPipelineVal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Segmented Pipeline Progress Bar */}
          {totalPipelineVal > 0 ? (
            <PipelineStageBar stages={stageBarData} />
          ) : (
            <div className="h-4 w-full bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 font-medium">Pipeline empty (₹0)</span>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-slate-500 font-medium mr-1">Filter View:</span>
            {["all", "draft", "pending", "approved", "negotiation", "confirmed"].map((stage) => (
              <button
                key={stage}
                onClick={() => setSelectedFilter(stage)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedFilter === stage
                    ? "bg-[#0066cc] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {stage === "pending" ? "Pending Approval" : stage}
              </button>
            ))}
          </div>
        </div>

        {/* ── ACTIVE DEALS TABLE OR EMPTY STATE ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Active Quotations ({filteredQuotes.length})
            </h3>
            {quotations.length > 0 && (
              <Link
                href="/dashboard/sale-ref/quotations"
                className="text-xs font-bold text-[#0066cc] hover:underline flex items-center gap-1"
              >
                <span>View Full Pipeline</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 size={20} className="animate-spin text-[#0066cc]" />
              <span>Fetching live pipeline data...</span>
            </div>
          ) : quotations.length === 0 ? (
            /* Explicit Empty State requested by user */
            <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-[#0066cc] flex items-center justify-center mx-auto shadow-xs">
                <FileText size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  No quotations created yet
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You don't have any active quotations in your sales portfolio. Build your first quotation to start tracking deals.
                </p>
              </div>
              <Link
                href="/dashboard/sale-ref/quotations/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-[#0066cc]/25 transition cursor-pointer"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create Quotation Now</span>
              </Link>
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
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredQuotes.slice(0, 6).map((q) => (
                    <tr key={q.rawId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        <Link
                          href={`/dashboard/sale-ref/quotations/${q.rawId}`}
                          className="hover:text-[#0066cc] transition-colors"
                        >
                          {q.id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{q.customerOrg}</div>
                        <div className="text-[11px] text-slate-400">{q.title}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {q.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        ₹{q.contractTotal.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`font-semibold ${
                            q.grossMarginPercent < 35 ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {q.grossMarginPercent}%
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            q.stage === "confirmed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : q.stage === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : q.stage === "approved"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : q.stage === "negotiation"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {q.stage === "pending" ? "Pending Approval" : q.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/dashboard/sale-ref/quotations/${q.rawId}`}
                          className="inline-flex items-center gap-1 text-[#0066cc] hover:underline font-bold text-xs"
                        >
                          <span>Open</span>
                          <ArrowUpRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
