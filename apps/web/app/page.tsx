import Link from "next/link";
import { ArrowRight, Users, Sparkles, Building2, Key } from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { ALL_ROLES } from "../lib/roles";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {/* Pill Nav Header matching Stitch Horizon design */}
      <header className="px-6 pt-6">
        <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-slate-200 bg-white/90 px-6 py-3 shadow-sm backdrop-blur-md">
          <BrandLogo href="/" />

          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Internal Login
            </Link>
            <Link href="/register" className="hover:text-slate-900 transition-colors">
              Org Sign Up
            </Link>
            <Link href="/portal/login" className="hover:text-slate-900 transition-colors">
              Customer Portal
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-xs transition-all shadow-sm"
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#ff5e3a] shadow-sm mb-6">
          <Sparkles size={14} className="text-[#ff5e3a]" />
          <span>Phase 2 — Batch 1: Auth &amp; 5-Role Access Control</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0f172a] max-w-3xl leading-[1.15]">
          Orchestrate deals, approvals &amp; revenue in{" "}
          <span className="text-[#ff5e3a]">one unified flow</span>.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          DealFlow360 connects sales reps, managers, finance, admins, and buyers with automated discount tiers, quotation negotiation, and instant fulfillment.
        </p>

        {/* Primary Screen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12 w-full text-left">
          {/* Card 1: Internal Login */}
          <Link
            href="/login"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#ff5e3a]/10 flex items-center justify-center text-[#ff5e3a] mb-4 group-hover:bg-[#ff5e3a] group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
            <div className="text-xs font-mono font-semibold text-[#ff5e3a] uppercase tracking-wider mb-1">
              Screen 01
            </div>
            <h2 className="text-lg font-bold text-[#0f172a] group-hover:text-[#ff5e3a] transition-colors">
              Internal Team Login
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Sign in for Sales Reps, Managers, Finance, and Admins. Automatically routes to the Sales Dashboard.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#ff5e3a] group-hover:translate-x-1 transition-transform">
              <span>Open Screen</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          {/* Card 2: Org Sign Up */}
          <Link
            href="/register"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#d6ed7a]/40 flex items-center justify-center text-[#546500] mb-4 group-hover:bg-[#546500] group-hover:text-white transition-colors">
              <Building2 size={20} />
            </div>
            <div className="text-xs font-mono font-semibold text-[#546500] uppercase tracking-wider mb-1">
              Screen 02
            </div>
            <h2 className="text-lg font-bold text-[#0f172a] group-hover:text-[#546500] transition-colors">
              Organization Sign Up
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Onboard companies and assign members to any of the 5 platform roles with team access rules.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#546500] group-hover:translate-x-1 transition-transform">
              <span>Open Screen</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          {/* Card 3: Customer Portal */}
          <Link
            href="/portal/login"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#c4e7ff]/60 flex items-center justify-center text-[#00668a] mb-4 group-hover:bg-[#00668a] group-hover:text-white transition-colors">
              <Key size={20} />
            </div>
            <div className="text-xs font-mono font-semibold text-[#00668a] uppercase tracking-wider mb-1">
              Screen 03
            </div>
            <h2 className="text-lg font-bold text-[#0f172a] group-hover:text-[#00668a] transition-colors">
              Customer Quotation Portal
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Secure proposal access via quote token (e.g. DF-Q1042) or buyer email for customer negotiations.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#00668a] group-hover:translate-x-1 transition-transform">
              <span>Open Screen</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        </div>

        {/* 5 User Roles Overview Strip */}
        <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-6 w-full text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Configured User Roles (5):
            </span>
            <span className="text-[11px] text-[#ff5e3a] font-semibold">
              Live role-based routing enabled
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ALL_ROLES.map((r) => (
              <div key={r.id} className="rounded-xl bg-white p-3 border border-slate-200">
                <span className="text-xs font-bold text-[#0f172a] block">{r.label}</span>
                <span className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                  {r.description}
                </span>
                <span className="text-[10px] font-mono text-[#ff5e3a] mt-2 block">
                  &rarr; {r.targetPath}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        DealFlow360 Orchestration Platform &copy; 2025 &bull; Built with Next.js 16 &amp; Tailwind CSS v4
      </footer>
    </div>
  );
}
