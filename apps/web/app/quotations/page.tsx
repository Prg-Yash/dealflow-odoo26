"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, ArrowUpRight, ArrowLeft } from "lucide-react";
import { SalesNav } from "@repo/ui";
import { INITIAL_QUOTATIONS, type Quotation } from "../../lib/sales-data";

export default function QuotationsListPage() {
  const [quotations] = useState<Quotation[]>(INITIAL_QUOTATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerOrg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === "all" || q.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  const totalValue = quotations.reduce((acc, q) => acc + q.contractTotal, 0);
  const pendingCount = quotations.filter((q) => q.stage === "pending").length;

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      <SalesNav activeTab="quotations" linkComponent={Link} />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard"
                className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium"
              >
                <ArrowLeft size={13} />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Quotations &amp; Proposals
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New Quotation</span>
            </Link>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Total Pipeline Value</span>
            <div className="text-2xl font-black text-[#0f172a] mt-1">
              ${totalValue.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">{quotations.length} total active proposals</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
            <div className="text-2xl font-black text-[#ff5e3a] mt-1">{pendingCount}</div>
            <span className="text-[11px] text-slate-400">Requires Sales Manager or Finance</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Average Proposal Margin</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">48.7%</div>
            <span className="text-[11px] text-slate-400">Healthy margin &gt; 40% threshold</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by quote number (e.g. Q-1042) or customer organization..."
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

        {/* Proposals Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      <Link href={`/quotations/${q.id}`} className="hover:text-[#ff5e3a] transition-colors">
                        {q.id}
                      </Link>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">{q.customerOrg}</div>
                      <div className="text-[11px] text-slate-400">{q.title}</div>
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-700">{q.tier}</td>
                    <td className="py-4 px-5 font-extrabold text-slate-900 text-sm">
                      ${q.contractTotal.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 font-bold text-emerald-600">
                      {q.avgMarginPercent}%
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          q.stage === "confirmed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : q.stage === "approved"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : q.stage === "pending"
                            ? "bg-orange-50 text-[#ff5e3a] border border-orange-200"
                            : q.stage === "negotiation"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {q.stage}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">{q.validUntil}</td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="inline-flex items-center gap-1 font-bold text-[#ff5e3a] hover:underline"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
