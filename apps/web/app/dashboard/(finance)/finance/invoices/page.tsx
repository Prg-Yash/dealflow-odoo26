"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronRight,
  ShieldCheck,
  Receipt,
  Download,
  Filter,
  ArrowLeft,
  Calendar,
  Building2,
  Package,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { useDashboardAuth } from "../../../layout";
import {
  useInvoices,
  useCreditNotes,
  type InvoiceData,
} from "../../../../../lib/query";

export default function InvoicesListPage() {
  const router = useRouter();
  const { user } = useDashboardAuth();

  // Role Gate: Private to Finance Ops & Admin
  const isAuthorized = !user || user.role === "FINANCE_OPS" || user.role === "ADMIN";

  // Data fetching
  const { data: apiInvoices, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: apiCreditNotes, isLoading: isLoadingCreditNotes } = useCreditNotes();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ISSUED" | "PAID" | "OVERDUE">("ALL");

  // Metrics
  const metrics = useMemo(() => {
    const list = apiInvoices || [];
    const totalIssued = list.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = list
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalUnpaid = list
      .filter((inv) => inv.status !== "PAID")
      .reduce((sum, inv) => sum + (inv.amountRemaining || inv.totalAmount || 0), 0);
    const creditNotesTotal = (apiCreditNotes || []).reduce((sum, cn) => sum + (cn.amount || 0), 0);

    return {
      totalInvoices: list.length,
      totalIssued,
      totalPaid,
      totalUnpaid,
      creditNotesTotal,
      paidCount: list.filter((i) => i.status === "PAID").length,
      unpaidCount: list.filter((i) => i.status !== "PAID").length,
    };
  }, [apiInvoices, apiCreditNotes]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    let list = apiInvoices || [];

    if (statusFilter !== "ALL") {
      list = list.filter((inv) => inv.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((inv) => {
        const num = inv.invoiceNumber?.toLowerCase() || "";
        const cust = inv.customer?.name?.toLowerCase() || "";
        const notes = inv.notes?.toLowerCase() || "";
        return num.includes(q) || cust.includes(q) || notes.includes(q);
      });
    }

    return list;
  }, [apiInvoices, statusFilter, searchQuery]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-black tracking-tight text-white">
          Restricted Access &ndash; Finance Operations Only
        </h1>
        <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
          Invoices and commercial billing ledgers are restricted strictly to Finance Operations and Administrator roles.
        </p>
        <Link
          href="/dashboard/finance"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
        >
          <ArrowLeft size={14} />
          <span>Return to Finance Overview</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans antialiased">
      {/* ── DEALFLOW 360 NAV BAR ── */}
      <header className="sticky top-0 z-40 bg-[#111827]/90 backdrop-blur-xl border-b border-slate-800 shadow-md">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="DealFlow 360" />

            <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-[#1e293b]/60 border border-slate-800 text-xs font-semibold">
              <Link
                href="/dashboard/finance"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/sale-ref/quotations"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Quotations
              </Link>
              <Link
                href="/dashboard/finance?tab=approvals"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Approvals
              </Link>
              <Link
                href="/dashboard/finance/fulfillment"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Fulfillment
              </Link>
              <Link
                href="/dashboard/finance/subscriptions"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Subscriptions
              </Link>
              <Link
                href="/dashboard/finance/invoices"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold shadow-xs transition"
              >
                Invoices
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/finance"
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 font-semibold"
            >
              <ArrowLeft size={13} />
              <span>Back to Finance</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
        {/* Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Commercial Billing &amp; Invoicing
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Invoices &amp; Credit Ledger
            </h1>
            <p className="text-xs text-slate-400">
              Manage fulfillment-triggered invoices, recurring SaaS cycle invoices, and mid-cycle proration credit notes.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Invoiced
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white font-mono">
                ${metrics.totalIssued.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {metrics.totalInvoices} total invoices issued
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Paid / Reconciled
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${metrics.totalPaid.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {metrics.paidCount} invoices collected
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Outstanding Balance
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-400 font-mono">
                ${metrics.totalUnpaid.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {metrics.unpaidCount} awaiting settlement
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Proration Credits
              </span>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Receipt size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-purple-400 font-mono">
                ${metrics.creditNotesTotal.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {(apiCreditNotes || []).length} credit notes recorded
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Search invoice number, client, or terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1e293b] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              All ({metrics.totalInvoices})
            </button>
            <button
              onClick={() => setStatusFilter("ISSUED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "ISSUED"
                  ? "bg-amber-600 text-white"
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              Unpaid ({metrics.unpaidCount})
            </button>
            <button
              onClick={() => setStatusFilter("PAID")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "PAID"
                  ? "bg-emerald-600 text-white"
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              Paid ({metrics.paidCount})
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-[#111827] rounded-3xl border border-slate-800 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard size={16} className="text-blue-400" />
              <span>Invoices Ledger</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredInvoices.length} invoices
            </span>
          </div>

          {isLoadingInvoices ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <span className="animate-spin text-blue-500">⏳</span>
              <span>Loading invoice records...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No invoices found matching current criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#1e293b]/60 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <th className="py-3.5 px-6">Invoice #</th>
                    <th className="py-3.5 px-6">Customer / Account</th>
                    <th className="py-3.5 px-4 text-center">Type</th>
                    <th className="py-3.5 px-4 text-center">Due Date</th>
                    <th className="py-3.5 px-6 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredInvoices.map((inv) => {
                    const isPaid = inv.status === "PAID";
                    const isRecurring = !!inv.subscriptionId;
                    const dueDateFormatted = inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "-";

                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-4 px-6 font-bold text-white font-mono">
                          <Link
                            href={`/dashboard/finance/invoices/${inv.id}`}
                            className="hover:text-blue-400 transition"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-white">
                            {inv.customer?.name || "Corporate Account"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {inv.customer?.email || "billing@client.com"}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              isRecurring
                                ? "bg-blue-950/80 text-blue-400 border-blue-800"
                                : "bg-purple-950/80 text-purple-400 border-purple-800"
                            }`}
                          >
                            {isRecurring ? "Recurring SaaS" : "Fulfillment / Service"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-300">
                          {dueDateFormatted}
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-white text-sm">
                          ${inv.totalAmount?.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                              isPaid
                                ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                                : "bg-amber-950/80 text-amber-400 border-amber-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/dashboard/finance/invoices/${inv.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                          >
                            <span>Manage &rarr;</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
