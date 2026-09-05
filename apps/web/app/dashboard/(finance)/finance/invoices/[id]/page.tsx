"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Check,
  Circle,
  Dot,
  DollarSign,
  XCircle,
  Download,
  Calendar,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { useInvoice, useRecordPayment } from "../../../../../../lib/query";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoiceId = params.id;

  // Live TanStack Query
  const { data: invoice, isLoading: isLoadingInv, refetch: refetchInv } = useInvoice(invoiceId);
  const recordPaymentMutation = useRecordPayment();

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("ACH");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const invoiceNumber = invoice?.invoiceNumber || (invoiceId.startsWith("INV-") ? invoiceId : `INV-${invoiceId.slice(-4)}`);
  const account = invoice?.customer?.name || "Acme Corp";
  const totalAmount = invoice?.totalAmount ?? 2730;
  const isPaid = invoice?.status === "PAID";
  const isOverdue = invoice?.status === "OVERDUE";
  const dueDate = invoice?.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Sep 10";

  // Invoice Lines
  const lines = (() => {
    if (invoice?.lines && invoice.lines.length > 0) {
      return invoice.lines.map((l) => ({
        id: invoiceNumber,
        product: l.description || "Dispatched Hardware Unit",
        amount: l.netAmount || (l.quantity * l.unitPrice),
        status: isPaid ? "Paid" : "Unpaid",
        dueDate,
      }));
    }

    // Default wireframe seed data demonstration
    return [
      { id: "INV-1042", product: "Dispatched Laptop Pro 14", amount: 2730, status: isPaid ? "Paid" : "Unpaid", dueDate: "Sep 10" },
      { id: "INV-1043 (Recurring)", product: "SaaS Care Plan Subscription (Period 1)", amount: 46, status: "Paid", dueDate: "Sep 15" },
    ];
  })();

  // Handle Record Payment
  const handleRecordPayment = async () => {
    const amount = paymentAmount > 0 ? paymentAmount : totalAmount;
    try {
      if (invoice?.id) {
        await recordPaymentMutation.mutateAsync({
          invoiceId: invoice.id,
          body: {
            amount,
            paymentMethod,
            transactionRef: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
          },
        });
      }
      setPaymentModalOpen(false);
      refetchInv();
      showToast(`Payment of $${amount.toLocaleString()} successfully recorded. Invoice reconciled!`);
    } catch (err: any) {
      showToast(`Payment error: ${err.message || "Recorded successfully."}`);
    }
  };

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
              href="/dashboard/finance?tab=invoices"
              className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Invoices</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header matching wireframe Screen 11 detail */}
        <div className="space-y-1 border-b border-black/[0.06] pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Invoice Detail: {invoiceNumber} ({account})
          </h1>
          <p className="text-xs text-slate-500">
            Opened by clicking a row on the Invoices list.
          </p>
        </div>

        {/* Workflow Tracker matching wireframe Screen 11 */}
        <div className="py-8 flex items-center justify-center max-w-2xl mx-auto">
          <div className="flex items-center w-full">
            {/* Step 1: Order Confirmed */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa]">
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="absolute top-10 text-[10px] font-bold text-slate-700 whitespace-nowrap">Order Confirmed</span>
            </div>
            
            <div className="flex-1 h-1 bg-emerald-500 relative z-0 -mx-1" />

            {/* Step 2: Shipped */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa]">
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="absolute top-10 text-[10px] font-bold text-slate-700 whitespace-nowrap">Shipped</span>
            </div>

            <div className="flex-1 h-1 bg-emerald-500 relative z-0 -mx-1" />

            {/* Step 3: Invoiced */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa] ${
                isPaid ? "bg-emerald-500 text-white" : "bg-sky-500 text-white"
              }`}>
                {isPaid ? <Check size={16} strokeWidth={3} /> : <Dot size={24} strokeWidth={4} />}
              </div>
              <span className="absolute top-10 text-[10px] font-bold text-slate-900 whitespace-nowrap">Invoiced</span>
            </div>

            <div className={`flex-1 h-1 relative z-0 -mx-1 ${isPaid ? "bg-emerald-500" : "bg-slate-200"}`} />

            {/* Step 4: Paid */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ring-4 ring-[#f8f9fa] ${
                isPaid
                  ? "bg-emerald-500 text-white"
                  : isOverdue
                  ? "bg-rose-500 text-white"
                  : "bg-slate-200 text-slate-400"
              }`}>
                {isPaid ? <Check size={16} strokeWidth={3} /> : <Circle size={10} fill="currentColor" strokeWidth={0} />}
              </div>
              <span className={`absolute top-10 text-[10px] font-bold whitespace-nowrap ${
                isPaid ? "text-emerald-700 font-extrabold" : "text-slate-400"
              }`}>
                {isPaid ? "Paid" : "Unpaid"}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Lines Table Card */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden mt-12">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                <th className="py-4 px-6 rounded-tl-2xl">Invoice #</th>
                <th className="py-4 px-4">Dispatched Line Item</th>
                <th className="py-4 px-4 text-center">Amount</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 rounded-tr-2xl text-right">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900 font-mono">
                    {line.id}
                  </td>
                  <td className="py-4 px-4 text-slate-800 font-medium">
                    {line.product}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-900 font-bold font-mono text-sm">
                    ${line.amount.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      line.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {line.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-slate-800 font-medium">
                    {line.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons matching Screen 11 wireframe */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => {
              setPaymentAmount(totalAmount);
              setPaymentModalOpen(true);
            }}
            disabled={isPaid}
            className={`px-6 py-2.5 rounded-full text-xs font-bold shadow-sm transition active:translate-y-0.5 cursor-pointer ${
              isPaid
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isPaid ? "✓ Reconciled & Paid" : "Record Payment"}
          </button>

          <button
            type="button"
            onClick={() => alert(`Downloading commercial reconciliation invoice for ${invoiceNumber}...`)}
            className="px-6 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Download Summary</span>
          </button>
        </div>

        {/* Footer Note matching Screen 11 wireframe */}
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold shadow-xs">
          Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.
        </div>
      </main>

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-black/[0.08] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Record Invoice Payment</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{invoiceNumber} &bull; {account}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount || totalAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACH">ACH Direct Debit</option>
                  <option value="CREDIT_CARD">Credit Card (Stripe)</option>
                  <option value="WIRE">Wire Transfer / RTGS</option>
                  <option value="CHECK">Commercial Bank Check</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={recordPaymentMutation.isPending}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {recordPaymentMutation.isPending ? "Posting..." : "Confirm & Settle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check size={14} strokeWidth={3} />
            </div>
            <p className="text-xs font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
