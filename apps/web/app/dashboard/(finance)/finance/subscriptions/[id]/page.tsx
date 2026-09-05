"use client";

import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { BrandLogo } from "@repo/ui";

export default function BillingDetailPage({ params }: { params: { id: string } }) {
  // In a real app, this would be fetched based on params.id
  // We mock the data here to match the wireframe exactly
  const account = "Acme Corp";
  const plan = "Care Plan 2yr";

  const oneTimeLines = [
    { product: "Laptop Pro 14", qty: 2, amount: 2280 },
    { product: "Onsite Setup", qty: 1, amount: 450 },
  ];

  const recurringLines = [
    { plan: "Care Plan 2yr", cycle: "Monthly", nextBillDate: "Sep 15", amount: 46 },
    { plan: "Support SLA", cycle: "Quarterly", nextBillDate: "Nov 1", amount: 300 },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* Isolated Finance Topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="Finance Operations" />

            <nav className="hidden md:flex items-center gap-1 p-1 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
              <Link
                href="/dashboard/finance?tab=subscriptions"
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 bg-[#ff5e3a] text-white shadow-sm"
              >
                <TrendingUp size={13} className="text-white" />
                <span>Subscriptions</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/finance"
              className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-1 border-b border-black/[0.06] pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Billing Detail: {account} - {plan}
          </h1>
          <p className="text-xs text-slate-500">
            Opened by clicking a row on the Subscriptions list.
          </p>
        </div>

        <div className="space-y-6">
          {/* One-Time Lines */}
          <div>
            <h2 className="text-sm font-bold text-[#0f172a] mb-3">One-Time Lines <span className="text-slate-400 font-normal">(from originating order)</span></h2>
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-tl-2xl">Product</th>
                    <th className="py-4 px-6">Qty</th>
                    <th className="py-4 px-6 rounded-tr-2xl text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {oneTimeLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {line.product}
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        {line.qty}
                      </td>
                      <td className="py-4 px-6 text-slate-900 font-mono font-bold text-right">
                        ${line.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recurring Lines */}
          <div>
            <h2 className="text-sm font-bold text-[#0f172a] mb-3">Recurring Lines</h2>
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-tl-2xl">Plan</th>
                    <th className="py-4 px-6">Cycle</th>
                    <th className="py-4 px-6">Next Bill Date</th>
                    <th className="py-4 px-6 rounded-tr-2xl text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recurringLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {line.plan}
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        {line.cycle}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-700">
                        {line.nextBillDate}
                      </td>
                      <td className="py-4 px-6 text-slate-900 font-mono font-bold text-right">
                        ${line.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
          <button className="px-5 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs cursor-pointer transition">
            Modify Subscription
          </button>
          <button className="px-5 py-2.5 rounded-full bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-bold shadow-xs cursor-pointer transition">
            Cancel Subscription
          </button>
        </div>
      </main>
    </div>
  );
}
