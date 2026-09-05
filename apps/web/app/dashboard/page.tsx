"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Percent,
  Plus,
} from "lucide-react";
import { SalesNav, PipelineStageBar } from "@repo/ui";
import {
  getStoredRole,
  setStoredRole,
  type UserRole,
  ROLES,
  ALL_ROLES,
} from "../../lib/roles";
import {
  PIPELINE_STAGES,
  INITIAL_QUOTATIONS,
  type Quotation,
} from "../../lib/sales-data";

export default function DashboardPage() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<UserRole>(() => getStoredRole());
  const [quotations] = useState<Quotation[]>(INITIAL_QUOTATIONS);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  useEffect(() => {
    if (activeRole === "customer") {
      router.push("/portal");
    }
  }, [activeRole, router]);

  const handleSwitchRole = (newRole: UserRole) => {
    setStoredRole(newRole);
    if (newRole === "customer") {
      router.push("/portal");
    } else {
      setActiveRole(newRole);
    }
  };

  const currentRole = ROLES[activeRole];

  // Pipeline stage bar data calculated from sales data
  const totalPipelineVal = PIPELINE_STAGES.reduce((acc, s) => acc + s.value, 0);
  const stageBarData = PIPELINE_STAGES.map((s) => ({
    id: s.id,
    label: s.label,
    count: s.count,
    value: s.value,
    percentage: Math.round((s.value / totalPipelineVal) * 100),
    colorClass: s.barColor,
  }));

  const filteredQuotes = selectedFilter === "all"
    ? quotations
    : quotations.filter((q) => q.stage === selectedFilter);

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      {/* Persistent Modular Sales Navigation */}
      <SalesNav
        activeTab="dashboard"
        userInitials="SJ"
        userName={currentRole.defaultName}
        roleLabel={currentRole.label}
        linkComponent={Link}
      />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Operations Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {currentRole.defaultOrg}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Q3 Pipeline Live
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Sales Operations
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Role Switcher for Demo Testing */}
            <div className="hidden md:flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 px-2">Role:</span>
              {ALL_ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSwitchRole(r.id)}
                  className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeRole === r.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New Quotation</span>
            </Link>
          </div>
        </div>

        {/* Top 4 KPI Stat Cards with SVG Sparklines matching Stitch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Pipeline */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Pipeline</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                <TrendingUp size={13} /> +14.2%
              </span>
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-[#0f172a] tracking-tight">$1.42M</span>
              <span className="text-xs font-semibold text-slate-400">20 active deals</span>
            </div>
            <div className="h-8 w-full pt-1">
              <svg className="w-full h-full stroke-[#ff5e3a] fill-none stroke-[2]" preserveAspectRatio="none" viewBox="0 0 100 24">
                <path d="M0,20 L15,17 L30,19 L45,11 L60,14 L75,7 L90,9 L100,2" />
              </svg>
            </div>
          </div>

          {/* KPI 2: Win Rate */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Win Rate</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                <TrendingUp size={13} /> +5.8%
              </span>
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-[#0f172a] tracking-tight">68.0%</span>
              <span className="text-xs font-semibold text-slate-400">Target 65%</span>
            </div>
            <div className="flex items-end gap-1.5 h-8 pt-1">
              <div className="flex-1 bg-slate-100 rounded-t h-[45%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t h-[60%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t h-[52%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t h-[70%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t h-[64%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t h-[80%]"></div>
              <div className="flex-1 bg-emerald-500 rounded-t h-[92%]"></div>
            </div>
          </div>

          {/* KPI 3: Cycle Velocity */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Cycle Velocity</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                <Clock size={13} /> -1.8d
              </span>
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-[#0f172a] tracking-tight">11.4d</span>
              <span className="text-xs font-semibold text-slate-400">Creation → PO</span>
            </div>
            <div className="h-8 w-full pt-1">
              <svg className="w-full h-full stroke-sky-500 fill-none stroke-[2]" preserveAspectRatio="none" viewBox="0 0 100 24">
                <path d="M0,8 L16,12 L32,6 L48,14 L64,9 L80,16 L100,20" />
              </svg>
            </div>
          </div>

          {/* KPI 4: Avg Margin */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Avg Deal Margin</span>
              <span className="inline-flex items-center gap-0.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                <Percent size={13} /> 48.2%
              </span>
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-[#0f172a] tracking-tight">48.2%</span>
              <span className="text-xs font-semibold text-slate-400">Min 40%</span>
            </div>
            <div className="w-full pt-2">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-[#ff5e3a] h-full rounded-full" style={{ width: "78%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Row: Pipeline Stage Volume Bar + Radial Quota Attainment */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <PipelineStageBar stages={stageBarData} />
          </div>

          {/* Quota Radial Gauge */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#0f172a]">Quota Attainment</h2>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                On Pace
              </span>
            </div>
            <div className="flex items-center justify-center my-4 relative">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="stroke-slate-100 fill-none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  strokeWidth="3.5"
                />
                <path
                  className="stroke-[#ff5e3a] fill-none transition-all duration-1000 ease-out"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  strokeDasharray="78, 100"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-[#0f172a]">78%</span>
                <span className="text-[11px] font-semibold text-slate-400">$1.1M / $1.4M</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>SLA Compliance: <strong className="text-slate-900">96.4%</strong></span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">8d left</span>
            </div>
          </div>
        </div>

        {/* 5-Column Pipeline Kanban Board matching Stitch */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-[#0f172a]">Deal Pipeline Flow</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                {quotations.length} Proposals
              </span>
            </div>
            <Link
              href="/quotations"
              className="text-xs text-[#ff5e3a] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Table View</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const quotesInStage = quotations.filter((q) => q.stage === stage.id);

              return (
                <div key={stage.id} className="flex flex-col gap-2.5">
                  <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${stage.bgColor} border ${stage.borderColor}`}>
                    <span className={`text-xs font-bold ${stage.textColor}`}>{stage.label}</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 bg-white rounded-md text-slate-600 border border-slate-200">
                      {quotesInStage.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {quotesInStage.map((quote) => (
                      <Link
                        key={quote.id}
                        href={`/quotations/${quote.id}`}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-[#ff5e3a] hover:shadow-md transition-all flex flex-col gap-2.5 cursor-pointer text-left group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug group-hover:text-[#ff5e3a] transition-colors">
                            {quote.customerOrg}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1"></span>
                        </div>
                        <div className="text-base sm:text-lg font-black text-[#0f172a] tracking-tight">
                          ${quote.contractTotal.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-slate-400 font-medium font-mono text-[11px]">{quote.id}</span>
                          <span className="text-slate-600 font-bold font-mono text-[11px]">
                            {quote.avgMarginPercent}% Mgn
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Quotations Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#0f172a]">Active Quotations List</h2>
            <div className="flex items-center gap-1.5">
              {["all", "draft", "pending", "approved", "negotiation", "confirmed"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${selectedFilter === filter
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Quote ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Total Contract</th>
                  <th className="py-3 px-4">ARR / CapEx</th>
                  <th className="py-3 px-4">Margin</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{q.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{q.customerOrg}</div>
                      <div className="text-[11px] text-slate-400">{q.customerName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{q.tier}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      ${q.contractTotal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      ${Math.round(q.arr / 1000)}k / ${Math.round(q.capex / 1000)}k
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600">
                      {q.avgMarginPercent}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${q.stage === "confirmed"
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
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-[#ff5e3a] hover:underline"
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
        </div>
      </main>
    </div>
  );
}
