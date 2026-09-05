"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { useDashboardAuth } from "../../../../layout";
import { BrandLogo, ProfileModal } from "@repo/ui";
import {
  INITIAL_MANAGER_APPROVALS,
  type ManagerApprovalRequest,
  type ApprovalStatus,
} from "../../../../../../lib/manager-data";
import { useQuotation, useUpdateQuotationStage } from "../../../../../../lib/query";

export default function ManagerApprovalDetailPage() {
  const { signOut } = useDashboardAuth();
  const params = useParams();
  const [profileOpen, setProfileOpen] = useState(false);
  const rawId = params.id as string;
  const quoteId = decodeURIComponent(rawId);

  const { data: apiQuote } = useQuotation(quoteId);
  const updateStageMutation = useUpdateQuotationStage();

  // Retrieve matching approval or fallback to the primary reference Q-1042
  const initialData: ManagerApprovalRequest =
    INITIAL_MANAGER_APPROVALS.find(
      (a: ManagerApprovalRequest) => a.quoteId.toLowerCase() === quoteId.toLowerCase()
    ) || INITIAL_MANAGER_APPROVALS[0]!;

  const [decisionState, setDecisionState] = useState<{
    status: ApprovalStatus;
    defaultNote: string;
    action: "APPROVED" | "REVISION_REQUESTED" | "REJECTED";
  } | null>(null);

  const baseRequest: ManagerApprovalRequest = {
    ...initialData,
    ...(apiQuote
      ? {
          quoteId: apiQuote.quoteNumber || apiQuote.id,
          account: apiQuote.customer?.name || initialData.account,
          dealSize: apiQuote.grandTotal || initialData.dealSize,
          discountRequested: apiQuote.discountPercent || initialData.discountRequested,
          marginProjected: apiQuote.grossMarginPercent || initialData.marginProjected,
          status: (apiQuote.stage === "APPROVED" ? "APPROVED" : "PENDING") as ApprovalStatus,
        }
      : {}),
  };

  const request: ManagerApprovalRequest = decisionState
    ? {
        ...baseRequest,
        status: decisionState.status,
        auditLogs: [
          ...baseRequest.auditLogs,
          {
            id: "log-decision-latest",
            actor: "E. Vance (You)",
            role: "Sales Director",
            action: decisionState.action,
            timestamp: "Just now",
            note: decisionState.defaultNote,
          },
        ],
        workflowSteps: baseRequest.workflowSteps.map((s) => {
          if (s.nodeTitle.includes("VP Finance")) {
            return {
              ...s,
              status: decisionState.action === "APPROVED" ? "completed" : "active",
              actionNote: decisionState.defaultNote,
              actionedAt: "Just now",
            };
          }
          if (s.nodeTitle.includes("Client") && decisionState.action === "APPROVED") {
            return { ...s, status: "active", actionNote: "Awaiting client counter-signature" };
          }
          return s;
        }),
      }
    : baseRequest;

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
    try {
      await updateStageMutation.mutateAsync({
        id: quoteId,
        stage: action === "APPROVED" ? "APPROVED" : "CANCELLED",
      });
    } catch (err) {
      console.warn("Optimistic determination update:", err);
    }
    const defaultNote =
      action === "APPROVED"
        ? reviewComment || "Approved and dispatched under strategic account exception criteria."
        : action === "REVISION_REQUESTED"
        ? reviewComment || "Returned for revision: Please adjust setup discount to policy cap (10%)."
        : reviewComment || "Rejected: Unacceptable margin deterioration without multi-year commitment.";

    setDecisionState({ status: action as ApprovalStatus, defaultNote, action });

    setFeedbackBanner({
      visible: true,
      type: action === "APPROVED" ? "success" : action === "REVISION_REQUESTED" ? "revision" : "rejected",
      message:
        action === "APPROVED"
          ? "Decision registered. Concession approved and quote dispatched to client procurement."
          : action === "REVISION_REQUESTED"
          ? "Revision requested. Returned to sales representative with stipulated conditions."
          : "Quote rejected. Logged to deal compliance trail.",
    });
  };

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
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3.5 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft size={13} />
              <span>Back to Exceptions</span>
            </Link>

            <div className="relative flex items-center shrink-0">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-2.5 sm:border-l sm:border-slate-200 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#ff5e3a] text-white text-xs font-extrabold flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
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
              </button>
              <ProfileModal
                onSignOut={signOut}
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                user={{
                  name: "Elena Vance",
                  email: "elena@dealflow360.com",
                  initials: "EV",
                  role: "manager",
                }}
              />
            </div>
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
                {request.quoteId}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold">{request.account}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-3 mt-0.5">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[#0f172a]">
                Approval Detail: {request.quoteId}
              </h1>

              {request.blendedRiskScore > 75 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  High Risk Flag ({request.blendedRiskScore})
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                {request.accountTier} Tier Client
              </span>

              <span className="text-xs text-slate-500 font-medium">
                {request.escalationLevel === "SALES_MANAGER_AND_FINANCE"
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
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
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
                ₹{request.dealSize.toLocaleString()}.00
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                <TrendingUp size={13} />
                <span>+₹14,200 expansion tier</span>
              </div>
            </div>
          </div>

          {/* 2. Blended Margin with SVG Radial Ring */}
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Blended Margin</span>
              <div className="mt-2 text-2xl font-black text-[#0f172a]">{request.marginProjected}%</div>
              <span className="inline-block mt-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                -{(request.targetMargin - request.marginProjected).toFixed(1)}% vs {request.targetMargin}% target
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
                  strokeDashoffset={125.6 - (125.6 * request.marginProjected) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-800">
                {Math.round(request.marginProjected)}%
              </span>
            </div>
          </div>

          {/* 3. Discount Delta Bar Meter */}
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Max Discount Breach
              </span>
              <span className="text-[11px] font-black text-rose-600 uppercase tracking-wide">
                Setup Line
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-black text-rose-600">
                  +{(request.discountRequested - request.thresholdMax).toFixed(1)}
                  <span className="text-base font-bold">pt</span>
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {request.discountRequested}% req / {request.thresholdMax}% cap
                </span>
              </div>
              {/* Dual-color Progress Gauge */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative">
                <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: "60%" }} />
                <div className="absolute top-0 right-0 h-full bg-rose-500 rounded-r-full" style={{ width: "40%" }} />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                <span>0% Allowed</span>
                <span className="text-rose-600 font-bold">{request.discountRequested}% Over limit</span>
              </div>
            </div>
          </div>

          {/* 4. SLA Countdown Ring */}
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approval SLA</span>
              <div className="mt-2 text-2xl font-black text-[#0f172a]">{request.slaHoursLeft}h 42m</div>
              <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Safe • 77% window left
              </span>
            </div>
            {/* SVG SLA Countdown Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray="125.6"
                  strokeDashoffset="28.8"
                  strokeLinecap="round"
                />
              </svg>
              <Clock size={16} className="absolute text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Discount Policy & SKU Risk Breakdown Matrix */}
        <section className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-[#ff5e3a]" />
              <h2 className="text-base font-bold text-[#0f172a]">Discount Policy &amp; SKU Risk Breakdown</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> In Policy
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cap Exceeded
              </span>
              <span className="font-mono text-[11px] text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                POL-FIN-8840
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
                {request.lineItems.map((item) => (
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
                ))}
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
              Active Stage: Director Signoff
            </span>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-6 left-12 right-12 h-0.5 bg-slate-200 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {request.workflowSteps.map((step) => (
                <div key={step.id} className="flex flex-col items-center text-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs font-black text-sm ${
                      step.status === "completed"
                        ? "bg-emerald-500 text-white"
                        : step.status === "active"
                        ? "bg-[#ff5e3a] text-white ring-orange-100 animate-bounce"
                        : "bg-slate-100 text-slate-400 border border-slate-300"
                    }`}
                  >
                    {step.status === "completed" ? (
                      <Check size={20} strokeWidth={3} />
                    ) : step.status === "active" ? (
                      <Clock size={18} />
                    ) : (
                      <span className="text-xs font-bold">{step.stepNumber}</span>
                    )}
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      {step.nodeTitle}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{step.assigneeName}</h3>
                    <p
                      className={`text-xs font-medium mt-0.5 ${
                        step.status === "completed"
                          ? "text-emerald-600"
                          : step.status === "active"
                          ? "text-[#ff5e3a] font-semibold"
                          : "text-slate-400"
                      }`}
                    >
                      {step.actionNote || (step.status === "completed" ? "Approved" : "Pending")}
                    </p>
                    {step.actionedAt && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{step.actionedAt}</p>
                    )}
                  </div>
                </div>
              ))}
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
                    "Approved with 15% cap across entire hardware package and minimum 36-month SaaS commitment."
                  )
                }
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-[#ff5e3a] hover:border-orange-200 border border-transparent text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                + 15% Hardware Cap &amp; 3-Yr SaaS
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
                    "Approved as strategic exception based on multi-year Acme Corp enterprise expansion."
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
              <span>Notify Account Rep ({request.repName}) and Corporate Legal</span>
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
              <div className="text-xs font-bold text-slate-900">{request.pdfFileName}</div>
              <div className="text-[11px] font-mono text-slate-400">
                Generated today • {request.pdfFileSize} • Cryptographic Hash: {request.pdfHash}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Audit Log Chronological Trail */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#0f172a]">Approval Compliance Audit Trail</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {request.auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{log.actor}</span>
                    <span className="text-slate-400 font-normal">({log.role})</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        log.action.includes("APPROVED")
                          ? "bg-emerald-50 text-emerald-700"
                          : log.action.includes("REVISION")
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {log.action}
                    </span>
                  </div>
                  {log.note && <p className="text-slate-600 text-[11px]">{log.note}</p>}
                </div>
                <span className="text-slate-400 font-mono text-[11px] shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
