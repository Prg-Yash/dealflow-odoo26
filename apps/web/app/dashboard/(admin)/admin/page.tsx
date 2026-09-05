"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Sliders,
  Users,
  Warehouse,
  ArrowRight,
  CheckCircle2,
  Plus,
  Building2,
  TrendingUp,
} from "lucide-react";
import {
  MOCK_ADMIN_ORG,
  MOCK_ADMIN_MEMBERS,
  MOCK_ADMIN_INVITATIONS,
  MOCK_ADMIN_CATEGORIES,
  MOCK_ADMIN_PRODUCTS,
  MOCK_ADMIN_RULES,
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_ADMIN_WAREHOUSES,
  type AdminInvitation,
  type AdminAuditLog,
  type AdminCategory,
} from "../../../../lib/admin-data";

export default function AdminOverviewPage() {
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "CRITICAL">("ALL");

  const pendingInvitesCount = MOCK_ADMIN_INVITATIONS.filter((i: AdminInvitation) => i.status === "PENDING").length;
  const filteredAuditLogs = filterLevel === "ALL"
    ? MOCK_ADMIN_AUDIT_LOGS
    : MOCK_ADMIN_AUDIT_LOGS.filter((l: AdminAuditLog) => l.level === filterLevel);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Admin Console</span>
            <span>/</span>
            <span className="text-[#ff5e3a]">Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Enterprise Operations & Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tenant organization controls, catalog health, discount approval routing, and audit logs.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/admin/catalog"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
          <Link
            href="/dashboard/admin/team"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Users size={14} />
            <span>Invite Staff</span>
          </Link>
          <Link
            href="/dashboard/admin/rules"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Sliders size={14} />
            <span>Rule Simulator</span>
          </Link>
        </div>
      </div>

      {/* Organization Tenant Identity Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-50/50 via-slate-50/20 to-transparent rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 size={24} className="text-[#ff5e3a]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{MOCK_ADMIN_ORG.name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
                  slug: {MOCK_ADMIN_ORG.slug}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                  Primary Tenant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Multi-tenant boundary established on {new Date(MOCK_ADMIN_ORG.createdAt).toLocaleDateString()} &bull; Primary Currency:{" "}
                <span className="font-semibold text-slate-800">{MOCK_ADMIN_ORG.currency}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 text-left border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer Tiers</span>
              <span className="text-sm font-extrabold text-slate-800">{MOCK_ADMIN_ORG.activeTierCount} Active</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Staff Accounts</span>
              <span className="text-sm font-extrabold text-slate-800">{MOCK_ADMIN_MEMBERS.length} Users</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Invites</span>
              <span className="text-sm font-extrabold text-[#ff5e3a]">{pendingInvitesCount} Pending</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Warehouses</span>
              <span className="text-sm font-extrabold text-slate-800">{MOCK_ADMIN_WAREHOUSES.length} Locations</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Catalog */}
        <Link
          href="/dashboard/admin/catalog"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalog Products</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{MOCK_ADMIN_PRODUCTS.length}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp size={12} className="mr-0.5" /> 100% Active
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{MOCK_ADMIN_CATEGORIES.length} Categories</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Manage &rarr;
            </span>
          </div>
        </Link>

        {/* Card 2: Team */}
        <Link
          href="/dashboard/admin/team"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team & Hierarchy</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{MOCK_ADMIN_MEMBERS.length}</span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              +{pendingInvitesCount} invited
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>4 System Roles</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Directory &rarr;
            </span>
          </div>
        </Link>

        {/* Card 3: Governance Rules */}
        <Link
          href="/dashboard/admin/rules"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discount Rules</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sliders size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{MOCK_ADMIN_RULES.length}</span>
            <span className="text-xs font-semibold text-slate-500">Active Tiers</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>127 Total Deals Governed</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Configure &rarr;
            </span>
          </div>
        </Link>

        {/* Card 4: Inventory */}
        <Link
          href="/dashboard/admin/inventory"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Warehouse Inventory</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Warehouse size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">275</span>
            <span className="text-xs font-semibold text-slate-500">Units On-Hand</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>$489,100 Valuation</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Inspect &rarr;
            </span>
          </div>
        </Link>
      </div>

      {/* Governance & Approval Escalation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Discount Approval State Machine Distribution */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Deal Governance Execution Matrix</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current month discount approval escalation routing across 127 total quotations
              </p>
            </div>
            <Link
              href="/dashboard/admin/rules"
              className="text-xs font-semibold text-[#ff5e3a] hover:underline inline-flex items-center gap-1"
            >
              <span>View Rules</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Level 0 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-800">Rep Discretion (&le; 5.0% discount)</span>
                  <span className="text-slate-400 text-[11px]">&bull; Auto-Approved</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">84 deals</span>
                  <span className="text-slate-400 ml-1.5">(66%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "66%" }} />
              </div>
            </div>

            {/* Level 1 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5e3a]" />
                  <span className="font-bold text-slate-800">Sales Manager Escalation (5.1% &ndash; 15.0%)</span>
                  <span className="text-slate-400 text-[11px]">&bull; Elena Rostova</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">32 deals</span>
                  <span className="text-slate-400 ml-1.5">(25%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#ff5e3a] rounded-full" style={{ width: "25%" }} />
              </div>
            </div>

            {/* Level 2 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="font-bold text-slate-800">Finance Dual Approval (&gt; 15.0% or Risk &gt; 20)</span>
                  <span className="text-slate-400 text-[11px]">&bull; Marcus Vance</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">11 deals</span>
                  <span className="text-slate-400 ml-1.5">(9%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: "9%" }} />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Zero unmonitored discount concessions this billing cycle</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">Escalation Policy: Strict</span>
          </div>
        </div>

        {/* Right Col: Category Margin Health Overview */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Category Margins</h2>
              <Link href="/dashboard/admin/catalog" className="text-xs font-semibold text-[#ff5e3a] hover:underline">
                Catalog
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Baseline targets &amp; discount ceilings configured per Prisma Category model.
            </p>

            <div className="space-y-3">
              {MOCK_ADMIN_CATEGORIES.map((cat: AdminCategory) => (
                <div key={cat.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                    <span className="text-[11px] font-mono font-semibold text-[#ff5e3a]">
                      Ceiling: {cat.discountCeiling}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Target Gross Margin:</span>
                    <span className="font-bold text-slate-700">{cat.targetMargin}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Customer Tier Matrix: 4 Tiers</span>
            <Link href="/dashboard/admin/rules" className="text-[#ff5e3a] font-semibold hover:underline">
              Inspect &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Real-time Operational Audit Stream */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">System Audit Trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live chronological record of governance changes, threshold updates, and staff actions
            </p>
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            {(["ALL", "INFO", "WARN", "CRITICAL"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterLevel === lvl
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Level</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Target Model</th>
                <th className="pb-3">Details</th>
                <th className="pb-3">Performed By</th>
                <th className="pb-3 pr-1 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAuditLogs.map((log: AdminAuditLog) => {
                const levelColor =
                  log.level === "CRITICAL"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : log.level === "WARN"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pl-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${levelColor}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-semibold text-slate-900">{log.action}</td>
                    <td className="py-3 font-mono text-slate-500">{log.entity}</td>
                    <td className="py-3 max-w-xs sm:max-w-md text-slate-600 truncate">{log.details}</td>
                    <td className="py-3 font-medium text-slate-800">{log.performedBy}</td>
                    <td className="py-3 pr-1 text-right text-slate-400 font-mono">{log.timestamp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
