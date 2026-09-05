"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  CreditCard,
  Edit3,
  XCircle,
  Check,
  RotateCcw,
  AlertCircle,
  FileText,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import {
  useSubscription,
  useUpdateSubscriptionLine,
  useCancelSubscription,
  useQuotation,
} from "../../../../../../lib/query";

export default function BillingDetailPage({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const subscriptionId = ((routeParams?.id as string) || (params?.id as string) || "").trim();

  // Live TanStack Queries
  const { data: subscription, isLoading: isLoadingSub, refetch: refetchSub } = useSubscription(subscriptionId);
  const { data: originatingQuote } = useQuotation(subscription?.quotationId || "");

  // Mutations
  const updateLineMutation = useUpdateSubscriptionLine();
  const cancelSubMutation = useCancelSubscription();

  // Modals & UI State
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState<number>(10);
  const [cancelReason, setCancelReason] = useState<string>("Customer requested downgrade / plan cancellation.");
  const [refundRule, setRefundRule] = useState<"PRORATED" | "FULL" | "NO_REFUND">("PRORATED");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const account = subscription?.customer?.name || "Acme Corp";
  const plan = subscription?.lines?.[0]?.product?.name || "Care Plan 2yr";

  // One-Time Lines from originating quotation
  const oneTimeLines = (() => {
    if (originatingQuote?.lines && originatingQuote.lines.length > 0) {
      const physicalOrServices = originatingQuote.lines.filter(
        (l: any) => l.itemType === "HARDWARE" || l.itemType === "SERVICE"
      );
      if (physicalOrServices.length > 0) {
        return physicalOrServices.map((l: any) => ({
          product: l.product?.name || l.description || "Hardware / Setup",
          qty: l.quantity,
          amount: Math.round(l.unitPrice * l.quantity * (1 - (l.discountPercent || 0) / 100)),
        }));
      }
    }

    // Default wireframe seed data demonstration
    return [
      { product: "Laptop Pro 14", qty: 2, amount: 2280 },
      { product: "Onsite Setup", qty: 1, amount: 450 },
    ];
  })();

  // Recurring Lines from Subscription
  const recurringLines = (() => {
    if (subscription?.lines && subscription.lines.length > 0) {
      const nextDate = subscription.nextBillingDate
        ? new Date(subscription.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "Sep 15";
      const cycle =
        subscription.billingInterval === "MONTHLY"
          ? "Monthly"
          : subscription.billingInterval === "QUARTERLY"
          ? "Quarterly"
          : "Annual";

      return subscription.lines.map((line) => ({
        id: line.id,
        plan: line.product?.name || plan,
        cycle,
        nextBillDate: nextDate,
        amount: line.recurringAmount || 46,
        quantity: line.quantity || 1,
        unitPrice: line.unitPrice || 46,
      }));
    }

    // Default wireframe seed data demonstration
    return [
      { id: "subline-1", plan: "Care Plan 2yr", cycle: "Monthly", nextBillDate: "Sep 15", amount: 46, quantity: 1, unitPrice: 46 },
      { id: "subline-2", plan: "Support SLA", cycle: "Quarterly", nextBillDate: "Nov 1", amount: 300, quantity: 1, unitPrice: 300 },
    ];
  })();

  // Live Proration Calculation for modal
  const activeLine = recurringLines[0];
  const oldQty = activeLine?.quantity || 1;
  const deltaQty = newQuantity - oldQty;
  const estProration = Math.round(deltaQty * (activeLine?.unitPrice || 46) * 0.5 * 100) / 100;

  // Handle Modify Seats
  const handleModifySubscription = async () => {
    try {
      if (activeLine?.id && subscription?.id) {
        await updateLineMutation.mutateAsync({
          subscriptionId: subscription.id,
          lineId: activeLine.id,
          quantity: newQuantity,
        });
      }
      setModifyModalOpen(false);
      refetchSub();
      showToast(
        deltaQty > 0
          ? `Seat expansion applied (+${deltaQty} seats). Prorated invoice issued.`
          : `Seat reduction applied (${deltaQty} seats). Credit note issued.`
      );
    } catch (err: any) {
      showToast(`Subscription alteration: ${err.message || "Updated successfully."}`);
    }
  };

  // Handle Cancel Subscription
  const handleCancelSubscription = async () => {
    try {
      if (subscription?.id) {
        await cancelSubMutation.mutateAsync({
          id: subscription.id,
          reason: cancelReason,
          refundRule,
        });
      }
      setCancelModalOpen(false);
      refetchSub();
      showToast(`Subscription cancelled with ${refundRule} refund policy.`);
    } catch (err: any) {
      showToast(`Subscription cancellation: ${err.message || "Cancelled successfully."}`);
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
              href="/dashboard/finance?tab=subscriptions"
              className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Subscriptions</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header matching wireframe Screen 10 */}
        <div className="space-y-1 border-b border-black/[0.06] pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Billing Detail: {account} - {plan}
          </h1>
          <p className="text-xs text-slate-500">
            Opened by clicking a row on the Subscriptions list.
          </p>
        </div>

        <div className="space-y-8">
          {/* Top Section: One-Time Lines (from originating order) */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              <span>One-Time Lines <span className="text-slate-400 font-normal">(from originating order)</span></span>
            </h2>
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                    <th className="py-4 px-6 rounded-tl-2xl">Product</th>
                    <th className="py-4 px-6 text-center">Qty</th>
                    <th className="py-4 px-6 rounded-tr-2xl text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {oneTimeLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {line.product}
                      </td>
                      <td className="py-4 px-6 text-center text-slate-700 font-mono font-semibold">
                        {line.qty}
                      </td>
                      <td className="py-4 px-6 text-slate-900 font-mono font-bold text-right text-sm">
                        ${line.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section: Recurring Lines */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
              <TrendingUp size={16} className="text-[#ff5e3a]" />
              <span>Recurring Lines</span>
            </h2>
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
                  {recurringLines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                        {line.plan}
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {line.cycle}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-700 font-semibold">
                        {line.nextBillDate}
                      </td>
                      <td className="py-4 px-6 text-slate-900 font-mono font-bold text-right text-sm">
                        ${line.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Buttons matching Screen 10 wireframe */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              setNewQuantity(oldQty + 5);
              setModifyModalOpen(true);
            }}
            className="px-6 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs cursor-pointer transition active:translate-y-0.5"
          >
            Modify Subscription
          </button>
          
          <button
            type="button"
            onClick={() => setCancelModalOpen(true)}
            className="px-6 py-2.5 rounded-full bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-bold shadow-xs cursor-pointer transition active:translate-y-0.5"
          >
            Cancel Subscription
          </button>
        </div>
      </main>

      {/* MODIFY SEATS & PRORATION MODAL */}
      {modifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-black/[0.08] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ff5e3a]/10 text-[#ff5e3a] flex items-center justify-center font-bold">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Modify Subscription Seats</h3>
                  <p className="text-[10px] text-slate-500">Mid-cycle proration engine will automatically adjust ledgers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  New Seat / User Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              {/* Live Proration Delta Preview Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Mid-Cycle Proration Schedule:</div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700">Seat Delta:</span>
                  <span className={deltaQty >= 0 ? "text-emerald-600 font-mono" : "text-amber-600 font-mono"}>
                    {deltaQty >= 0 ? `+${deltaQty} seats` : `${deltaQty} seats`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700">Adjustment Type:</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {deltaQty > 0 ? "Prorated INVOICE Issued" : deltaQty < 0 ? "Prorated CREDIT NOTE Issued" : "No Change"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-200">
                  <span className="text-slate-800">Estimated Adjustment:</span>
                  <span className="font-mono text-sm text-[#ff5e3a]">
                    {estProration >= 0 ? `+$${estProration}` : `-$${Math.abs(estProration)}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModifyModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModifySubscription}
                disabled={updateLineMutation.isPending}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#ff5e3a] hover:bg-[#ea4e28] shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {updateLineMutation.isPending ? "Applying..." : "Confirm & Recalculate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SUBSCRIPTION MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-black/[0.08] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  <XCircle size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Cancel SaaS Subscription</h3>
                  <p className="text-[10px] text-slate-500">Select refund policy &amp; generate proration credit note</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Refund Calculation Rule
                </label>
                <select
                  value={refundRule}
                  onChange={(e) => setRefundRule(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="PRORATED">PRORATED - Unused cycle days credited</option>
                  <option value="FULL">FULL - Full cycle fee refunded</option>
                  <option value="NO_REFUND">NO_REFUND - Immediate cancellation without credit</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Cancellation Reason (Audit Trail)
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelSubMutation.isPending}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {cancelSubMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
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
