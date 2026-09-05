"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Zap,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  XCircle,
  Package,
  Layers,
  FileText,
  Building2,
  Mail,
  RefreshCw,
  X,
  Plus,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { useDashboardAuth } from "../../../../layout";
import {
  useSubscription,
  useModifySubscription,
  useCancelSubscription,
  useScheduleReminder,
} from "../../../../../../lib/query";

interface Props {
  params: Promise<{ id: string }>;
}

export default function BillingDetailPage({ params }: Props) {
  const router = useRouter();
  const resolvedParams = use(params);
  const subId = resolvedParams.id;

  const { user } = useDashboardAuth();

  // Role Gate: Private to Finance Ops & Admin
  const isAuthorized = user?.role === "FINANCE_OPS" || user?.role === "ADMIN";

  // Data fetching
  const { data: sub, isLoading, refetch } = useSubscription(subId);
  const modifyMutation = useModifySubscription();
  const cancelMutation = useCancelSubscription();
  const reminderMutation = useScheduleReminder();

  // Feedback banner
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modify Modal State
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [editBillingCycle, setEditBillingCycle] = useState<"MONTHLY" | "QUARTERLY" | "ANNUALLY">("MONTHLY");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED">("ACTIVE");
  const [editNextBillDate, setEditNextBillDate] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editUnitPrice, setEditUnitPrice] = useState(0);
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editNotes, setEditNotes] = useState("");

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Customer requested cancellation");

  // Open Modify Modal
  const handleOpenModify = () => {
    if (!sub) return;
    setEditBillingCycle(sub.billingInterval);
    setEditStatus(sub.status);
    setEditNextBillDate(sub.nextBillingDate ? sub.nextBillingDate.split("T")[0]! : "");
    const primaryLine = sub.lines?.[0];
    if (primaryLine) {
      setEditQuantity(primaryLine.quantity);
      setEditUnitPrice(primaryLine.unitPrice);
      setEditDiscountPercent(primaryLine.discountPercent);
    }
    setEditNotes(sub.notes || "");
    setIsModifyModalOpen(true);
  };

  // Submit Modify
  const handleSaveModify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await modifyMutation.mutateAsync({
        id: subId,
        body: {
          billingInterval: editBillingCycle,
          status: editStatus,
          nextBillingDate: editNextBillDate ? new Date(editNextBillDate).toISOString() : undefined,
          quantity: editQuantity,
          unitPrice: editUnitPrice,
          discountPercent: editDiscountPercent,
          notes: editNotes.trim() || undefined,
        },
      });

      setIsModifyModalOpen(false);
      setFeedback("Subscription schedule modified successfully.");
      refetch();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || "Failed to update subscription.");
    }
  };

  // Submit Cancel
  const handleConfirmCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        id: subId,
        reason: cancelReason,
      });

      setIsCancelModalOpen(false);
      setFeedback("Subscription has been cancelled. Recurring billing paused.");
      refetch();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || "Failed to cancel subscription.");
    }
  };

  // Trigger BullMQ Reminder
  const handleTriggerReminder = async () => {
    try {
      const res: any = await reminderMutation.mutateAsync({
        subscriptionId: subId,
        reminderDaysBefore: 7,
        manualTrigger: true,
      });

      setFeedback(res.message || "BullMQ reminder dispatched successfully!");
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || "Reminder triggered.");
    }
  };

  // Extract one-time lines from originating quotation or fallback
  const oneTimeLines = useMemo(() => {
    if (sub?.quotation?.lines && sub.quotation.lines.length > 0) {
      return sub.quotation.lines.filter(
        (l) => l.itemType === "HARDWARE" || l.itemType === "SERVICE"
      );
    }
    return [];
  }, [sub]);

  // Extract recurring lines
  const recurringLines = useMemo(() => {
    if (sub?.lines && sub.lines.length > 0) {
      return sub.lines;
    }
    return [];
  }, [sub]);

  // Unauthorized Access Guard
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
          The Billing Detail &amp; Proration ledger is private and restricted strictly to Finance Operations and Administrator roles.
        </p>
        <Link
          href="/dashboard/finance"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Return to Finance Overview</span>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <span className="text-xs text-slate-400 font-medium">Loading billing detail and schedule...</span>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-base font-bold text-white">Subscription Schedule Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          The requested subscription ID could not be found or has been purged.
        </p>
        <Link
          href="/dashboard/finance/subscriptions"
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-500 transition"
        >
          <ArrowLeft size={13} />
          <span>Back to Subscriptions List</span>
        </Link>
      </div>
    );
  }

  const customerName = sub.customer?.name || sub.customer?.companyName || "Client Account";
  const primaryPlanName = sub.lines?.[0]?.product?.name || sub.notes || "Care Plan 2yr";
  const nextBillDateFormatted = sub.nextBillingDate
    ? new Date(sub.nextBillingDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "-";

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans antialiased">
      {/* ── DEALFLOW 360 NAV BAR (Matching Wireframe 10) ── */}
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
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold shadow-xs transition"
              >
                Subscriptions
              </Link>
              <Link
                href="/dashboard/finance/invoices"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Invoices
              </Link>
              <Link
                href="/dashboard/admin/reports"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Deal Health
              </Link>
              <Link
                href="/dashboard/admin/reports"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Reports
              </Link>
              <Link
                href="/dashboard/admin/catalog"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Product
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/finance/subscriptions"
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 font-semibold"
            >
              <ArrowLeft size={13} />
              <span>Back to Subscriptions List</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (Matching Wireframe 10) ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {/* Header matching Wireframe 10 */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Billing Detail: {customerName} - {primaryPlanName}
            </h1>
            <p className="text-xs text-slate-400">
              Opened by clicking a row on the Subscriptions list.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                sub.status === "ACTIVE"
                  ? "bg-emerald-950/90 text-emerald-400 border-emerald-800"
                  : sub.status === "PAUSED"
                  ? "bg-amber-950/90 text-amber-400 border-amber-800"
                  : "bg-rose-950/90 text-rose-400 border-rose-800"
              }`}
            >
              {sub.status}
            </span>
          </div>
        </div>

        {/* ── SECTION 1: ONE-TIME LINES (FROM ORIGINATING ORDER) (Matching Wireframe 10) ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>One-Time Lines</span>
            <span className="text-xs text-slate-400 font-normal">(from originating order)</span>
          </h2>

          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#1e293b]/60 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4 text-center w-24">Qty</th>
                  <th className="py-3.5 px-6 text-right w-36">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {oneTimeLines.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 px-6 text-center text-slate-500">
                      No one-time hardware or service items attached to this originating agreement.
                    </td>
                  </tr>
                ) : (
                  oneTimeLines.map((line) => (
                    <tr key={line.id} className="hover:bg-[#1e293b]/50 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-white">
                        {line.product?.name || line.description || "Hardware Item"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                        {line.quantity}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-white">
                        ₹{Number(line.netPrice || line.unitPrice * line.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 2: RECURRING LINES (Matching Wireframe 10) ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Recurring Lines
          </h2>

          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#1e293b]/60 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <th className="py-3.5 px-6">Plan</th>
                  <th className="py-3.5 px-4 text-center w-28">Cycle</th>
                  <th className="py-3.5 px-6 text-center w-36">Next Bill Date</th>
                  <th className="py-3.5 px-6 text-right w-36">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {recurringLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 px-6 text-center text-slate-500">
                      No recurring lines configured.
                    </td>
                  </tr>
                ) : (
                  recurringLines.map((line) => (
                    <tr key={line.id} className="hover:bg-[#1e293b]/50 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-white">
                        {line.product?.name || primaryPlanName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium capitalize text-slate-300">
                        {sub.billingInterval.toLowerCase()}
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono font-bold text-slate-300">
                        {sub.status === "PAUSED" ? "-" : nextBillDateFormatted}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-400 text-sm">
                        ₹{line.recurringAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 3: BULLMQ RENEWAL REMINDER TELEMETRY ── */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap size={14} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                BullMQ Background Renewal Reminder Bus
              </h3>
            </div>
            <button
              type="button"
              onClick={handleTriggerReminder}
              disabled={reminderMutation.isPending || sub.status !== "ACTIVE"}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {reminderMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              <span>Test BullMQ Dispatch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#1e293b]/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Channel Queue</div>
              <div className="font-bold text-white font-mono mt-0.5">subscription-reminder-queue</div>
            </div>
            <div className="p-3 rounded-xl bg-[#1e293b]/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Recipient Email</div>
              <div className="font-bold text-white truncate mt-0.5">{sub.customer?.email}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#1e293b]/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Schedule Cadence</div>
              <div className="font-bold text-emerald-400 mt-0.5">
                {sub.autoRenew ? "Auto-Renew (Active)" : "Manual Renewal Only"}
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS (Matching Wireframe 10) ── */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenModify}
            className="px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-slate-800 border border-slate-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Edit2 size={14} className="text-blue-400" />
            <span>Modify Subscription</span>
          </button>

          {sub.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/80 text-rose-400 hover:text-rose-300 text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <XCircle size={14} />
              <span>Cancel Subscription</span>
            </button>
          )}
        </div>
      </main>

      {/* ── MODIFY SUBSCRIPTION MODAL ── */}
      {isModifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111827] rounded-3xl border border-slate-800 max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 my-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Modify Subscription Agreement</h3>
              <button
                type="button"
                onClick={() => setIsModifyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModify} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lifecycle Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ACTIVE">Active (Billing Scheduled)</option>
                  <option value="PAUSED">Paused (Temporary Hold)</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Billing Interval Cycle
                </label>
                <select
                  value={editBillingCycle}
                  onChange={(e) => setEditBillingCycle(e.target.value as any)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Seats / Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Rate (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Next Billing Date
                </label>
                <input
                  type="date"
                  value={editNextBillDate}
                  onChange={(e) => setEditNextBillDate(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modifyMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {modifyMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CANCEL SUBSCRIPTION CONFIRMATION MODAL ── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111827] rounded-3xl border border-rose-900/50 max-w-md w-full p-6 shadow-2xl space-y-4 my-auto text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cancel Subscription Agreement</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Are you sure you want to cancel the recurring schedule for <strong>{customerName}</strong> ({primaryPlanName})?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/40 text-xs text-rose-300">
              Future recurring invoices and automated reminders will be stopped immediately.
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Cancellation Reason
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {cancelMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
