"use client";

import { useState } from "react";
import Link from "next/link";
import {
  XCircle,
  Clock,
  TrendingUp,
  Check,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";

interface ApprovalRequest {
  id: string;
  quoteId: string;
  account: string;
  repName: string;
  dealSize: number;
  discountRequested: number;
  thresholdMax: number;
  marginProjected: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

const INITIAL_APPROVALS: ApprovalRequest[] = [
  {
    id: "APR-881",
    quoteId: "DF-Q1042",
    account: "Acme Corporation",
    repName: "Alex Rivera",
    dealSize: 68500,
    discountRequested: 18,
    thresholdMax: 15,
    marginProjected: 52.4,
    reason: "Competitive bakeoff against Salesforce/DealHub. End of quarter commitment.",
    status: "pending",
    submittedAt: "25 mins ago",
  },
  {
    id: "APR-882",
    quoteId: "DF-Q1044",
    account: "OmniRetail Global",
    repName: "Sarah Jenkins",
    dealSize: 114200,
    discountRequested: 22,
    thresholdMax: 15,
    marginProjected: 46.8,
    reason: "3-year upfront commitment across 12 global subsidiaries.",
    status: "pending",
    submittedAt: "2 hours ago",
  },
  {
    id: "APR-883",
    quoteId: "DF-Q1047",
    account: "Beta Industries",
    repName: "David Chen",
    dealSize: 72000,
    discountRequested: 16,
    thresholdMax: 15,
    marginProjected: 48.0,
    reason: "Government agency budget cap match for annual renewal.",
    status: "approved",
    submittedAt: "1 day ago",
  },
];

const REP_METRICS = [
  { name: "Alex Rivera", quota: 250000, closed: 188500, pipeline: 310000, pacing: 112 },
  { name: "Sarah Jenkins", quota: 220000, closed: 214200, pipeline: 195000, pacing: 128 },
  { name: "David Chen", quota: 200000, closed: 142000, pipeline: 240000, pacing: 92 },
];

export default function ManagerDashboardPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [selectedTab, setSelectedTab] = useState<"pending" | "all">("pending");

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );
  };

  const pendingList = approvals.filter((a) => a.status === "pending");
  const displayList = selectedTab === "pending" ? pendingList : approvals;

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      {/* Manager Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/manager" subtitle="Manager Hub" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
              <Sparkles size={12} className="text-amber-500" />
              Sales Director View
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/sale-ref"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              Sales Rep View &rarr;
            </Link>
            <Link
              href="/dashboard/admin"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              Admin Console &rarr;
            </Link>
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
              ER
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Manager Approvals &amp; Quota Pacing
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review exception discounts, sign-off on enterprise deals &amp; monitor team quota health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-[#ff5e3a] text-xs font-bold">
              <Clock size={14} />
              {pendingList.length} Approvals Pending
            </span>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Team Quota Attainment
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0f172a] mt-1">
              112.4%
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp size={13} />
              <span>+$544,700 closed this quarter</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Discounts Under Review
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
              ${approvals.reduce((acc, a) => acc + (a.status === "pending" ? a.dealSize : 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Avg requested discount: 20.0%
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Margin Guardrail Integrity
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              49.2%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Above 45% minimum company floor
            </div>
          </div>
        </div>

        {/* Approvals Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0f172a]">Commercial Exception Queue</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Quotes exceeding rep discount policy (15%) requiring Director authorization
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTab("pending")}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedTab === "pending" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Needs Action ({pendingList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab("all")}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedTab === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All Submissions
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {displayList.map((item) => (
              <div key={item.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/50 transition">
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{item.quoteId}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-bold text-sm text-slate-900">{item.account}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-500">Rep: {item.repName}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-[11px] text-slate-400">{item.submittedAt}</span>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
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
                      {item.discountRequested}% <span className="text-[10px] text-slate-400">(max {item.thresholdMax}%)</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Est. Margin</div>
                    <div className="text-base font-bold text-emerald-600">
                      {item.marginProjected}%
                    </div>
                  </div>

                  {item.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "approved")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition"
                      >
                        <Check size={13} strokeWidth={3} />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer transition"
                      >
                        <XCircle size={13} />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        item.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Rep Performance Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f172a]">Direct Reports &bull; Quota Pacing</h2>
            <Link
              href="/dashboard/admin/team"
              className="text-xs font-semibold text-[#ff5e3a] hover:underline"
            >
              Manage Team &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REP_METRICS.map((rep) => (
              <div key={rep.name} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900">{rep.name}</div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-emerald-700">
                    {rep.pacing}% Pacing
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#ff5e3a] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(rep.pacing, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Closed: ${rep.closed.toLocaleString()}</span>
                  <span>Target: ${rep.quota.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
