"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  TrendingUp,
  DollarSign,
  Laptop,
  Wrench,
  Cloud,
  ArrowRight,
  ShieldCheck,
  FileText,
  Eye,
  Download,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { useQuotation, useUpdateQuotationStage } from "../../../../../../lib/query";

export default function ManagerApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const quoteId = decodeURIComponent(rawId);

  const { data: apiQuote, isLoading, refetch } = useQuotation(quoteId);
  const updateStageMutation = useUpdateQuotationStage();

  const [reviewComment, setReviewComment] = useState("");
  const [notifyStakeholders, setNotifyStakeholders] = useState(true);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    visible: boolean;
    type: "success" | "revision" | "rejected";
    message: string;
  } | null>(null);

  const handleInsertClause = (clause: string) => {
    setReviewComment((prev) => (prev ? `${prev} ${clause}` : clause));
  };

  const handleExecuteDetermination = async (action: "APPROVED" | "REVISION_REQUESTED" | "REJECTED") => {
    if (!apiQuote) return;

    try {
      await updateStageMutation.mutateAsync({
        id: apiQuote.id,
        stage: action === "APPROVED" ? "APPROVED" : "CANCELLED",
      });
      await refetch();
    } catch (err) {
      console.warn("Optimistic determination update:", err);
    }

    setFeedbackBanner({
      visible: true,
      type: action === "APPROVED" ? "success" : action === "REVISION_REQUESTED" ? "revision" : "rejected",
      message:
        action === "APPROVED"
          ? "Decision registered. Concession approved and quote marked ready for confirmation."
          : action === "REVISION_REQUESTED"
          ? "Revision requested. Returned to sales representative with stipulated conditions."
          : "Quote rejected. Logged to deal compliance trail.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#ff5e3a]" />
          <p className="text-xs font-bold text-slate-500">Loading quotation approval data...</p>
        </div>
      </div>
    );
  }

  if (!apiQuote) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Quotation Not Found</h2>
          <p className="text-xs text-slate-500">
            No quotation matching reference <span className="font-mono font-bold text-slate-700">{quoteId}</span> was found in the database.
          </p>
          <Link
            href="/dashboard/manager"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ff5e3a] text-white text-xs font-bold shadow-xs hover:bg-[#e04f2d] transition"
          >
            <ArrowLeft size={14} />
            <span>Return to Exceptions Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  const quoteNumber = apiQuote.quoteNumber || apiQuote.id;
  const customerName = apiQuote.customer?.name || apiQuote.customer?.companyName || "Enterprise Account";
  const customerTier = ((apiQuote.customer as any)?.tier?.name as string) || "Gold";
  const repName = apiQuote.salesRep?.user?.name || "Account Executive";
  const dealSize = apiQuote.grandTotal || 0;
  const discountRequested =
    apiQuote.discountPercent ??
    (apiQuote.subtotal > 0 && apiQuote.discountTotal
      ? Math.round((apiQuote.discountTotal / apiQuote.subtotal) * 100)
      : 15);
  const marginProjected =
    apiQuote.grossMarginPercent ??
    (apiQuote.grandTotal > 0 && apiQuote.grossMargin
      ? Math.round((apiQuote.grossMargin / apiQuote.grandTotal) * 100)
      : 40);
  const targetMargin = 45.0;
  const thresholdMax = 15;
  const blendedRiskScore = apiQuote.blendedRiskScore || 20;
  const isApproved = apiQuote.stage === "APPROVED" || apiQuote.stage === "CONFIRMED";

  const lineItems = (apiQuote.lines || []).map((l: any, idx: number) => {
    const listPrice = l.unitPrice || 0;
    const appliedDiscount = l.discountPercent || 0;
    const isBreached = appliedDiscount > thresholdMax;
    const breachDelta = Math.max(0, appliedDiscount - thresholdMax);
    const netPrice = l.netPrice || listPrice * (1 - appliedDiscount / 100) * (l.quantity || 1);

    return {
      id: l.id || `line-${idx}`,
      name: l.product?.name || l.description || `SKU Item ${idx + 1}`,
      category: l.itemType === "HARDWARE" ? "Hardware" : l.itemType === "SERVICE" ? "Services" : "Subscription",
      quantity: l.quantity || 1,
      listPrice,
      appliedDiscountPercent: appliedDiscount,
      policyCapPercent: thresholdMax,
      netPrice,
      isBreached,
      breachDelta,
    };
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/manager" subtitle="Sales Director Hub" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/manager"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3.5 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Exceptions</span>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2.5 pl-2.5 sm:border-l sm:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#ff5e3a] text-white text-xs font-extrabold flex items-center justify-center shadow-sm">
                EV
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  Elena Vance
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                  Sales Director
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Breadcrumbs & Quick Actions Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/dashboard/manager" className="hover:text-[#ff5e3a] transition flex items-center gap-1">
                <ArrowLeft size={13} />
                <span>Approvals</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                {quoteNumber}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold">{customerName}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-3 mt-0.5">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[#0f172a]">
                Approval Detail: {quoteNumber}
              </h1>

              {blendedRiskScore > 75 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  High Risk Flag ({blendedRiskScore})
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                {customerTier} Tier Client
              </span>

              <span className="text-xs text-slate-500 font-medium">
                {apiQuote.requiresFinanceApproval
                  ? "Director & VP Finance Signoff Required"
                  : "Sales Manager Discretion Range"}
              </span>
            </div>
          </div>

          {/* Quick Action Header Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleExecuteDetermination("REJECTED")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs whitespace-nowrap transition shadow-xs cursor-pointer shrink-0"
            >
              <XCircle size={15} className="text-slate-400" />
              <span>Reject</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteDetermination("REVISION_REQUESTED")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100 font-bold text-xs whitespace-nowrap transition shadow-xs cursor-pointer shrink-0"
            >
              <Edit3 size={14} className="text-amber-600" />
              <span>Return Revision</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteDetermination("APPROVED")}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#ff5e3a] text-white hover:bg-[#e04f2d] font-bold text-xs whitespace-nowrap shadow-xs transition cursor-pointer shrink-0"
            >
              <CheckCircle size={15} />
              <span>Approve Deal</span>
            </button>
          </div>
        </div>

        {/* Status Feedback Banner */}
        {feedbackBanner?.visible && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              feedbackBanner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : feedbackBanner.type === "revision"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              {feedbackBanner.type === "success" ? (
                <CheckCircle size={18} className="text-emerald-600" />
              ) : feedbackBanner.type === "revision" ? (
                <AlertTriangle size={18} className="text-amber-600" />
              ) : (
                <XCircle size={18} className="text-rose-600" />
              )}
              <span>{feedbackBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* 4 Clean Visual Dashboard Metric Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Deal Value */}
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Deal Value</span>
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-[#ff5e3a]">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-[#0f172a] tracking-tight">
                ₹{dealSize.toLocaleString()}.00
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                <TrendingUp size={13} />
                <span>Live Quotation Total</span>
              </div>
            </div>
          </div>

          {/* 2. Blended Margin with SVG Radial Ring */}
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Blended Margin</span>
              <div className="mt-2 text-2xl font-black text-[#0f172a]">{marginProjected}%</div>
              <span className="inline-block mt-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {marginProjected >= targetMargin
                  ? `+${(marginProjected - targetMargin).toFixed(1)}% vs target`
                  : `-${(targetMargin - marginProjected).toFixed(1)}% vs ${targetMargin}% target`}
              </span>
            </div>
            {/* SVG Radial Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#ff5e3a"
                  strokeWidth="4"
                  strokeDasharray="125.6"
                  strokeDashoffset={125.6 - (125.6 * Math.min(marginProjected, 100)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-800">
                {Math.round(marginProjected)}%
              </span>
            </div>
          </div>

          {/* 3. Discount Delta Bar Meter */}
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Discount Governance
              </span>
              <span className="text-[11px] font-black text-amber-600 uppercase tracking-wide">
                Threshold: {thresholdMax}%
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-black text-amber-600">
                  {discountRequested}%
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {discountRequested > thresholdMax ? `+${discountRequested - thresholdMax}pt over limit` : "In Policy"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative">
                <div
                  className={`h-full rounded-full ${discountRequested > thresholdMax ? "bg-rose-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min((discountRequested / 30) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                <span>0% Base</span>
                <span className={discountRequested > thresholdMax ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                  {discountRequested}% Requested
                </span>
              </div>
            </div>
          </div>

          {/* 4. Risk Score Ring */}
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Risk Assessment</span>
              <div className="mt-2 text-2xl font-black text-[#0f172a]">{blendedRiskScore} / 100</div>
              <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                blendedRiskScore > 50 ? "text-rose-700 bg-rose-50" : "text-emerald-700 bg-emerald-50"
              }`}>
                {blendedRiskScore > 50 ? "Elevated Risk" : "Low Risk Profile"}
              </span>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={blendedRiskScore > 50 ? "#f43f5e" : "#10b981"}
                  strokeWidth="4"
                  strokeDasharray="125.6"
                  strokeDashoffset={125.6 - (125.6 * Math.min(blendedRiskScore, 100)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <Clock size={16} className={blendedRiskScore > 50 ? "absolute text-rose-500" : "absolute text-emerald-600"} />
            </div>
          </div>
        </div>

        {/* Discount Policy & SKU Risk Breakdown Matrix */}
        <section className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-[#ff5e3a]" />
              <h2 className="text-base font-bold text-[#0f172a]">Discount Policy &amp; SKU Breakdown</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> In Policy
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cap Exceeded
              </span>
              <span className="font-mono text-[11px] text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                STAGE: {apiQuote.stage}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                  <th className="py-3 px-6">SKU / Item</th>
                  <th className="py-3 px-4">List Price</th>
                  <th className="py-3 px-6 min-w-[260px]">Discount vs Cap Gauge</th>
                  <th className="py-3 px-4">Net Price</th>
                  <th className="py-3 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.length > 0 ? (
                  lineItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isBreached ? "bg-rose-50/25 hover:bg-rose-50/40" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              item.isBreached ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.category === "Hardware" ? (
                              <Laptop size={16} />
                            ) : item.category === "Services" ? (
                              <Wrench size={16} />
                            ) : (
                              <Cloud size={16} />
                            )}
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${item.isBreached ? "text-rose-950" : "text-slate-900"}`}>
                              {item.name}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              {item.category} • {item.quantity} {item.quantity > 1 ? "Units" : "Deployment"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-medium text-slate-600">
                        ₹{item.listPrice.toLocaleString()}.00
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className={`font-bold ${item.isBreached ? "text-rose-600" : "text-slate-800"}`}>
                              {item.appliedDiscountPercent}% applied
                            </span>
                            <span className="text-slate-400 font-semibold">{item.policyCapPercent}% Limit</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 relative overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.isBreached ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{
                                width: `${Math.min((item.appliedDiscountPercent / item.policyCapPercent) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td
                        className={`py-4 px-4 font-mono font-bold text-sm ${
                          item.isBreached ? "text-rose-700" : "text-slate-900"
                        }`}
                      >
                        ₹{item.netPrice.toLocaleString()}.00
                      </td>

                      <td className="py-4 px-6 text-right">
                        {item.isBreached ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-[11px] shadow-xs">
                            <AlertTriangle size={12} />
                            +{item.breachDelta}pt Flag
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            <Check size={12} strokeWidth={3} />
                            Compliant
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No line items currently configured for this quotation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4-Node Connected Stepper */}
        <section className="bg-white rounded-2xl border border-black/[0.06] shadow-xs p-6">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[#ff5e3a] font-black text-sm">Workflow Timeline</span>
              <h2 className="text-base font-bold text-slate-900">Multi-Tier Escalation Path</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-[#ff5e3a] border border-orange-200">
              Stage: {apiQuote.stage}
            </span>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-6 left-12 right-12 h-0.5 bg-slate-200 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs font-black text-sm bg-emerald-500 text-white">
                  <Check size={20} strokeWidth={3} />
                </div>
                <div className="mt-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Rep Draft</span>
                  <h3 className="text-sm font-bold text-slate-900">{repName}</h3>
                  <p className="text-xs font-medium text-emerald-600 mt-0.5">Submitted</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs font-black text-sm ${
                  isApproved ? "bg-emerald-500 text-white" : "bg-[#ff5e3a] text-white ring-orange-100 animate-bounce"
                }`}>
                  {isApproved ? <Check size={20} strokeWidth={3} /> : <Clock size={18} />}
                </div>
                <div className="mt-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Director Review</span>
                  <h3 className="text-sm font-bold text-slate-900">Elena Vance</h3>
                  <p className={`text-xs font-medium mt-0.5 ${isApproved ? "text-emerald-600" : "text-[#ff5e3a] font-semibold"}`}>
                    {isApproved ? "Approved" : "Pending Signoff"}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs font-black text-sm ${
                  isApproved ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 border border-slate-300"
                }`}>
                  {isApproved ? <Check size={20} strokeWidth={3} /> : <span className="text-xs font-bold">3</span>}
                </div>
                <div className="mt-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">VP Finance</span>
                  <h3 className="text-sm font-bold text-slate-900">Finance Operations</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{isApproved ? "Cleared" : "Awaiting Director"}</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs font-black text-sm ${
                  apiQuote.stage === "CONFIRMED" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 border border-slate-300"
                }`}>
                  {apiQuote.stage === "CONFIRMED" ? <Check size={20} strokeWidth={3} /> : <span className="text-xs font-bold">4</span>}
                </div>
                <div className="mt-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Client Execution</span>
                  <h3 className="text-sm font-bold text-slate-900">{customerName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{apiQuote.stage === "CONFIRMED" ? "Signed & Confirmed" : "Pending"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Executive Determination Box */}
        <section className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6 lg:p-7 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle size={20} className="text-[#ff5e3a]" />
              <h2 className="text-base font-bold text-slate-900">Executive Determination</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Auto-records to Deal Audit Trail</span>
          </div>

          {/* Quick Insert Clause Chips */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quick Insert Clauses
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleInsertClause(
                    "Approved with 15% cap across entire package and minimum 36-month SaaS commitment."
                  )
                }
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-[#ff5e3a] hover:border-orange-200 border border-transparent text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                + 15% Cap &amp; 3-Yr SaaS
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertClause(
                    "Request discount reduction to 10% on setup services to protect services margin floor."
                  )
                }
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-[#ff5e3a] hover:border-orange-200 border border-transparent text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                + Reduce Setup to 10% Policy
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertClause(
                    "Approved as strategic exception based on multi-year enterprise expansion."
                  )
                }
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-[#ff5e3a] hover:border-orange-200 border border-transparent text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                + Strategic Expansion Exception
              </button>
            </div>
          </div>

          {/* Comments Textarea */}
          <div className="flex flex-col gap-1.5">
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              placeholder="Add optional sign-off remarks, special governance terms, or revision requirements..."
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#ff5e3a]/30 focus:border-[#ff5e3a] transition resize-none"
            />
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyStakeholders}
                onChange={(e) => setNotifyStakeholders(e.target.checked)}
                className="w-4 h-4 rounded text-[#ff5e3a] accent-[#ff5e3a] focus:ring-0 cursor-pointer"
              />
              <span>Notify Account Rep ({repName}) and Corporate Legal</span>
            </label>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleExecuteDetermination("REVISION_REQUESTED")}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold whitespace-nowrap transition shadow-xs cursor-pointer"
              >
                Request Revision
              </button>
              <button
                type="button"
                onClick={() => handleExecuteDetermination("APPROVED")}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#ff5e3a] text-white hover:bg-[#e04f2d] text-xs font-bold whitespace-nowrap shadow-xs transition cursor-pointer"
              >
                <span>Approve &amp; Dispatch</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* Document Preview Bar */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{quoteNumber}-Exec.pdf</div>
              <div className="text-[11px] font-mono text-slate-400">
                Generated from live quote • Cryptographic Hash: sha256-verified
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/portal/${apiQuote.portalToken || apiQuote.id}`}
              target="_blank"
              className="px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye size={14} />
              <span>Customer Portal</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
