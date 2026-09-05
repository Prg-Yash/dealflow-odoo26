"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";

interface BillingContract {
  id: string;
  quoteId: string;
  customerOrg: string;
  totalValue: number;
  paymentTerms: string;
  billingFrequency: "Annual Upfront" | "Quarterly" | "Monthly";
  taxExempt: boolean;
  status: "pending_review" | "invoiced" | "reconciled";
  dueDate: string;
}

const INITIAL_CONTRACTS: BillingContract[] = [
  {
    id: "CTR-901",
    quoteId: "DF-Q1042",
    customerOrg: "Acme Corporation",
    totalValue: 68500,
    paymentTerms: "Net-30",
    billingFrequency: "Annual Upfront",
    taxExempt: false,
    status: "pending_review",
    dueDate: "2026-04-15",
  },
  {
    id: "CTR-902",
    quoteId: "DF-Q1045",
    customerOrg: "Strata Logistics",
    totalValue: 45000,
    paymentTerms: "Net-30",
    billingFrequency: "Annual Upfront",
    taxExempt: true,
    status: "invoiced",
    dueDate: "2026-04-01",
  },
  {
    id: "CTR-903",
    quoteId: "DF-Q1046",
    customerOrg: "Northstar Labs",
    totalValue: 96500,
    paymentTerms: "Net-45",
    billingFrequency: "Quarterly",
    taxExempt: false,
    status: "reconciled",
    dueDate: "2026-03-30",
  },
];

export default function FinanceDashboardPage() {
  const [contracts, setContracts] = useState<BillingContract[]>(INITIAL_CONTRACTS);

  const handleVerify = (id: string) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "invoiced" } : c))
    );
  };

  const pendingReview = contracts.filter((c) => c.status === "pending_review");

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      {/* Finance Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="Billing & RevOps" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              <ShieldCheck size={12} className="text-emerald-600" />
              Finance Operations
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
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
              MV
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Revenue Operations &amp; Contract Invoicing
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify commercial terms, issue enterprise invoices &amp; synchronize billing ledgers with ERP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <Receipt size={14} />
              $210,000 Pipeline Invoicing Queue
            </span>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Contract Bookings (Q1)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0f172a] mt-1 font-mono">
              $892,400
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              +14% vs budget forecast
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pending Finance Sign-off
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#ff5e3a] mt-1">
              {pendingReview.length} Deals
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              ${pendingReview.reduce((sum, c) => sum + c.totalValue, 0).toLocaleString()} awaiting invoice generation
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Days Sales Outstanding (DSO)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              28.4 Days
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Well within Net-30 corporate SLA
            </div>
          </div>
        </div>

        {/* Invoicing Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0f172a]">Contracts Invoicing &amp; Sign-off Ledger</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ensure tax classification, billing terms, and customer PO numbers match signed proposals
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Contract / Quote</th>
                  <th className="py-3 px-5">Customer Account</th>
                  <th className="py-3 px-5">Billing Frequency</th>
                  <th className="py-3 px-5">Payment Terms</th>
                  <th className="py-3 px-5">Total Amount</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">{contract.id}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{contract.quoteId}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">{contract.customerOrg}</div>
                      <div className="text-[11px] text-slate-400">
                        {contract.taxExempt ? "Tax Exempt (501c3)" : "Standard Corporate Tax"}
                      </div>
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-700">
                      {contract.billingFrequency}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-600">
                      {contract.paymentTerms}
                    </td>
                    <td className="py-4 px-5 font-extrabold text-slate-900 text-sm font-mono">
                      ${contract.totalValue.toLocaleString()}
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          contract.status === "reconciled"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : contract.status === "invoiced"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-orange-50 text-[#ff5e3a] border border-orange-200"
                        }`}
                      >
                        {contract.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {contract.status === "pending_review" ? (
                        <button
                          type="button"
                          onClick={() => handleVerify(contract.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-bold text-xs shadow-xs cursor-pointer transition"
                        >
                          <FileCheck2 size={13} />
                          <span>Generate Invoice</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Invoice Dispatched</span>
                      )}
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
