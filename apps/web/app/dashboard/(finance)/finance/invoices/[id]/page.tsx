"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, Check, Circle, Dot } from "lucide-react";
import { BrandLogo } from "@repo/ui";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  // In a real app, we'd fetch this based on params.id
  const account = "Acme Corp";
  const id = params.id;

  const lines = [
    { id: "INV-1042", amount: 2730, status: "Unpaid", dueDate: "Sep 10" },
    { id: "INV-1043 (Recurring)", amount: 46, status: "Paid", dueDate: "Sep 15" },
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
                href="/dashboard/finance?tab=invoices"
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 bg-[#ff5e3a] text-white shadow-sm"
              >
                <CreditCard size={13} className="text-white" />
                <span>Invoices</span>
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
            Invoice Detail: {id} ({account})
          </h1>
          <p className="text-xs text-slate-500">
            Opened by clicking a row on the Invoices list
          </p>
        </div>

        {/* Workflow Tracker */}
        <div className="py-8 flex items-center justify-center max-w-2xl mx-auto">
          <div className="flex items-center w-full">
            {/* Step 1 */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa]">
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="absolute top-10 text-[10px] font-bold text-slate-600 whitespace-nowrap">Order Confirmed</span>
            </div>
            
            <div className="flex-1 h-1 bg-emerald-500 relative z-0 -mx-1" />

            {/* Step 2 */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa]">
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="absolute top-10 text-[10px] font-bold text-slate-600 whitespace-nowrap">Shipped</span>
            </div>

            <div className="flex-1 h-1 bg-sky-500 relative z-0 -mx-1" />

            {/* Step 3 */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa]">
                <Dot size={24} strokeWidth={4} />
              </div>
              <span className="absolute top-10 text-[10px] font-bold text-slate-900 whitespace-nowrap">Invoiced</span>
            </div>

            <div className="flex-1 h-1 bg-slate-200 relative z-0 -mx-1" />

            {/* Step 4 */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa]">
                <Circle size={10} fill="currentColor" strokeWidth={0} />
              </div>
              <span className="absolute top-10 text-[10px] font-bold text-slate-400 whitespace-nowrap">Paid</span>
            </div>
          </div>
        </div>

        {/* Invoice Lines Table */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden mt-12">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                <th className="py-4 px-6 rounded-tl-2xl">Invoice #</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 rounded-tr-2xl">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900 font-mono">
                    {line.id}
                  </td>
                  <td className="py-4 px-6 text-slate-900 font-bold font-mono">
                    ${line.amount.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      line.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {line.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-800">
                    {line.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <button className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer transition active:translate-y-0.5">
            Record Payment
          </button>
          <button className="px-5 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs cursor-pointer transition">
            Download Summary
          </button>
        </div>

        {/* Footer Note */}
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold shadow-xs">
          Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.
        </div>
      </main>
    </div>
  );
}
