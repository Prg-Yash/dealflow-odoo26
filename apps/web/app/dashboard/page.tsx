"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  FileCheck,
  CreditCard,
  Settings2,
  LogOut,
  ArrowUpRight,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ROLES,
  ALL_ROLES,
  getStoredRole,
  setStoredRole,
  type UserRole,
} from "../../lib/roles";
import { Badge, BrandLogo } from "@repo/ui";

export default function DashboardPage() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<UserRole>(() => getStoredRole());

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

  const currentRoleConfig = ROLES[activeRole];

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      {/* Top Operations Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo href="/dashboard" subtitle="Sales Operations Platform" />
          <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-200">
            <span className="text-xs font-semibold text-slate-500">Active Role:</span>
            <Badge variant={currentRoleConfig.badgeVariant}>
              {currentRoleConfig.label}
            </Badge>
          </div>
        </div>

        {/* Live Role Switcher (5 users) + User profile */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">
              Switch User:
            </span>
            {ALL_ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSwitchRole(r.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  activeRole === r.id
                    ? "bg-[#ff5e3a] text-white font-bold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              <Sparkles size={14} className="text-[#ff5e3a]" />
              <span>{currentRoleConfig.defaultOrg}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0f172a]">
              Welcome back, {currentRoleConfig.defaultName}
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              {currentRoleConfig.description}. Role-based access control is actively filtering modules for your account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/portal"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <span>View Customer Portal</span>
              <ArrowUpRight size={16} />
            </Link>
            <button
              onClick={() => handleSwitchRole("manager")}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#ff5e3a] text-white text-sm font-semibold hover:bg-[#ea4e28] transition-all shadow-sm cursor-pointer"
            >
              <span>Manage Approvals</span>
            </button>
          </div>
        </div>

        {/* Role-Specific Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Pipeline
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#ff5e3a]">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0f172a]">$842,500</div>
            <span className="text-xs text-emerald-700 font-medium">+14.2% from last month</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Approvals
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-amber-600">
                <FileCheck size={18} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0f172a]">7 Quotes</div>
            <span className="text-xs text-amber-700 font-medium">3 requiring Tier 2 sign-off</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Unbilled Contracts
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-blue-600">
                <CreditCard size={18} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0f172a]">$128,400</div>
            <span className="text-xs text-slate-500 font-medium">5 invoices ready for dispatch</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rules &amp; Health
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-emerald-600">
                <Settings2 size={18} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">Optimal</div>
            <span className="text-xs text-emerald-700 font-medium">0 anomaly flags detected</span>
          </div>
        </div>

        {/* Phase 2 Batch Note */}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0f172a]">Phase 2 — Batch 1 Auth &amp; Role Setup Active</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              You are currently authenticated in the <strong>{currentRoleConfig.label}</strong> context. Internal team members land on this Sales Operations workspace, while customers accessing through tokens or customer logins land on the Quotation Negotiation Portal.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
