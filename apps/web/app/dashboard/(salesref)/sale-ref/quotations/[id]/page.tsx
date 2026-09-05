"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { SalesNav, ApprovalTracker, QuotationLineItems } from "@repo/ui";
import { useQuotation, useSubmitQuotation, useConfirmQuotation } from "../../../../../../lib/query";
import { INITIAL_QUOTATIONS, type Quotation } from "../../../../../../lib/sales-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default function QuotationDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const quoteId = resolvedParams.id;

  // Live TanStack Query
  const { data: apiQuote, isLoading } = useQuotation(quoteId);
  const submitMutation = useSubmitQuotation(quoteId);
  const confirmMutation = useConfirmQuotation(quoteId);

  // Fallback quotation if not found on API
  const fallbackQuote: Quotation =
    INITIAL_QUOTATIONS.find((q) => q.id.toLowerCase() === quoteId.toLowerCase()) ||
    INITIAL_QUOTATIONS[0]!;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#ff5e3a]" />
      </div>
    );
  }

  const isApiLoaded = Boolean(apiQuote);

  const displayQuote = isApiLoaded
    ? {
        id: apiQuote!.quoteNumber || apiQuote!.id,
        rawId: apiQuote!.id,
        customerOrg: apiQuote!.customer?.name || "Acme Corporation",
        customerName: apiQuote!.customer?.name || "Procurement Lead",
        tier: (apiQuote!.customer as any)?.tier?.name || "Enterprise",
        title: apiQuote!.title || "Enterprise Proposal",
        contractTotal: apiQuote!.grandTotal || 0,
        grossMargin: apiQuote!.grossMarginPercent || 40,
        stage: apiQuote!.stage.toLowerCase(),
        revision: 1,
        arr: Math.round((apiQuote!.grandTotal || 0) * 0.7),
        capex: Math.round((apiQuote!.grandTotal || 0) * 0.3),
        assignedRep: apiQuote!.salesRep?.user?.name || "You",
        portalToken: apiQuote!.portalToken,
        createdAt: new Date(apiQuote!.createdAt).toLocaleDateString(),
        lineItems: apiQuote!.lines && apiQuote!.lines.length > 0
          ? apiQuote!.lines.map((l) => ({
              id: l.id,
              name: l.product?.name || l.description,
              description: l.description,
              category: l.itemType.toLowerCase(),
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountPercent: l.discountPercent,
            }))
          : fallbackQuote.items,
      }
    : { ...fallbackQuote, rawId: fallbackQuote.id, portalToken: "portal-token-quantum-04", lineItems: fallbackQuote.items };

  const isSubmitted = displayQuote.stage !== "draft" || submitMutation.isSuccess;
  const isConfirmed = displayQuote.stage === "confirmed" || confirmMutation.isSuccess;

  const handleSubmitForApproval = async () => {
    try {
      await submitMutation.mutateAsync();
    } catch (err) {
      console.warn("Submit with optimistic stage change:", err);
    }
  };

  const handleConfirmQuotation = async () => {
    try {
      await confirmMutation.mutateAsync({});
    } catch (err) {
      console.warn("Confirm with optimistic stage change:", err);
    }
  };

  const approvalSteps = [
    {
      id: "step-1",
      label: "Draft Created",
      role: "Sales Rep",
      assignedTo: displayQuote.assignedRep,
      status: "completed" as const,
      timestamp: `${displayQuote.createdAt} 09:30 AM`,
    },
    {
      id: "step-2",
      label: "Manager Approval",
      role: "Sales Director",
      assignedTo: "Elena Rostova",
      status: isConfirmed ? ("completed" as const) : isSubmitted ? ("active" as const) : ("pending" as const),
      timestamp: isSubmitted ? "Discount evaluated against tier threshold" : undefined,
    },
    {
      id: "step-3",
      label: "Finance Verification",
      role: "FinOps",
      assignedTo: "Clara Vance",
      status: isConfirmed ? ("completed" as const) : ("pending" as const),
    },
    {
      id: "step-4",
      label: "Customer Sign-off",
      role: "Buyer",
      assignedTo: displayQuote.customerName,
      status: isConfirmed ? ("completed" as const) : ("pending" as const),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      <SalesNav activeTab="quotations" linkComponent={Link} />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Breadcrumbs & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-500 font-medium">
              <Link href="/dashboard/sale-ref/quotations" className="hover:text-[#ff5e3a] transition-colors flex items-center gap-1">
                <ArrowLeft size={13} />
                <span>Quotations</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold font-mono">{displayQuote.id}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                Rev {displayQuote.revision}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                {displayQuote.id} &middot; {displayQuote.customerOrg}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active Deal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
                <Sparkles size={13} className="text-amber-500" />
                {displayQuote.tier} Tier
              </span>
            </div>
          </div>

          {/* Key Amount & Primary Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="text-left sm:text-right">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Contract Total
              </div>
              <div className="text-3xl font-black text-[#0f172a] tracking-tight leading-tight">
                ₹{Number(displayQuote.contractTotal).toLocaleString()}
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                ARR ₹{Math.round(displayQuote.arr / 1000)}k <span className="text-slate-300">&bull;</span> CapEx ₹{Math.round(displayQuote.capex / 1000)}k
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href={`/portal?token=${displayQuote.portalToken || "portal-token-quantum-04"}`}
                target="_blank"
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Customer Portal</span>
              </Link>

              {isConfirmed ? (
                <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Deal Confirmed</span>
                </div>
              ) : !isSubmitted ? (
                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  disabled={submitMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-bold text-xs shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Submit for Approval</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-[#ff5e3a] font-bold text-xs flex items-center gap-1.5">
                    <Clock size={14} className="animate-pulse" />
                    <span>In Review / Negotiation</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmQuotation}
                    disabled={confirmMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1"
                  >
                    <span>Execute &amp; Bill</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Line Items Component */}
        <QuotationLineItems items={displayQuote.lineItems as any} readOnly />

        {/* Approval Tracker */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Governance &amp; Approval Pipeline</h3>
            <p className="text-xs text-slate-500">Tiered escalation thresholds enforced automatically by the DealFlow rule engine.</p>
          </div>
          <ApprovalTracker steps={approvalSteps} />
        </div>
      </main>
    </div>
  );
}
