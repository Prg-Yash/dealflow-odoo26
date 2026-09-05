"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Check, MessageSquare } from "lucide-react";
import { Badge, BrandLogo } from "@repo/ui";

function CustomerPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "DF-Q1042";
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {/* Customer Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo href="/" size="sm" subtitle="Customer Quotation Portal" />
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-xs font-semibold text-[#ff5e3a]">
              <ShieldCheck size={14} />
              <span>Token: {token}</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Switch to Internal View
            </Link>
          </div>
        </div>
      </header>

      {/* Main Proposal Review */}
      <main className="max-w-5xl mx-auto w-full px-6 py-10 flex-1">
        {/* Proposal Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">Quotation Active</Badge>
              <span className="text-xs text-slate-400">&bull; Valid until March 31, 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Enterprise Cloud &amp; Operations License
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Prepared for <strong>Acme Technologies, Inc.</strong> by Sarah Jenkins (Account Executive)
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs uppercase font-semibold text-slate-400">Total Investment</div>
            <div className="text-3xl font-extrabold text-[#ff5e3a]">$48,200 <span className="text-sm font-normal text-slate-500">/ yr</span></div>
          </div>
        </div>

        {/* Proposal Line Items Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 text-left">
          <h2 className="text-base font-bold text-slate-900 mb-4">Included Products &amp; Services</h2>
          <div className="divide-y divide-slate-100">
            <div className="py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">DealFlow360 Enterprise Node (x50 Seats)</h3>
                <p className="text-xs text-slate-500">Includes advanced workflow automation, rule engines &amp; analytics</p>
              </div>
              <span className="text-sm font-semibold text-slate-900">$36,000 / yr</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Custom Integration &amp; Dedicated Deployment</h3>
                <p className="text-xs text-slate-500">NeonDB enterprise sync, custom SAML/SSO configuration</p>
              </div>
              <span className="text-sm font-semibold text-slate-900">$8,500</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">24/7 SLA &amp; Dedicated Solution Architect</h3>
                <p className="text-xs text-slate-500">1-hour response SLA, quarterly architecture reviews</p>
              </div>
              <span className="text-sm font-semibold text-slate-900">$3,700 / yr</span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-900">Ready to proceed or have questions?</h3>
            <p className="text-xs text-slate-500">
              You can accept this quotation directly or start an asynchronous negotiation thread.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/portal/login"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              <MessageSquare size={14} />
              <span>Negotiate Terms</span>
            </Link>

            <button
              onClick={() => setAccepted(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4c28] text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              {accepted ? (
                <>
                  <Check size={14} />
                  <span>Proposal Accepted</span>
                </>
              ) : (
                <span>Accept Quotation</span>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 py-4 px-6 bg-white text-center text-xs text-slate-400 font-medium">
        DealFlow360 Customer Quotation Portal &copy; 2025
      </footer>
    </div>
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-sm text-slate-500">Loading portal...</div>}>
      <CustomerPortalContent />
    </Suspense>
  );
}
