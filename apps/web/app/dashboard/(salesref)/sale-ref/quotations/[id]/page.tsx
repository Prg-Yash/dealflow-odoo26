"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FileText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SalesNav, ApprovalTracker, QuotationLineItems } from "@repo/ui";
import { INITIAL_QUOTATIONS, type Quotation } from "../../../../../../lib/sales-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default function QuotationDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const quoteId = resolvedParams.id;

  const quote: Quotation =
    INITIAL_QUOTATIONS.find((q) => q.id.toLowerCase() === quoteId.toLowerCase()) ||
    INITIAL_QUOTATIONS[0]!;

  const [isSubmitted, setIsSubmitted] = useState(quote.stage !== "draft");

  const approvalSteps = [
    {
      id: "step-1",
      label: "Draft Created",
      role: "Sales Rep",
      assignedTo: quote.assignedRep,
      status: "completed" as const,
      timestamp: `${quote.createdAt} 09:30 AM`,
    },
    {
      id: "step-2",
      label: "Manager Approval",
      role: "Sales Director",
      assignedTo: "Marcus Vance",
      status: isSubmitted ? ("active" as const) : ("pending" as const),
      timestamp: isSubmitted ? "Awaiting review (Discounts > 10%)" : undefined,
    },
    {
      id: "step-3",
      label: "Finance Verification",
      role: "FinOps",
      assignedTo: "Elena Rostova",
      status: "pending" as const,
    },
    {
      id: "step-4",
      label: "Customer Sign-off",
      role: "Buyer",
      assignedTo: quote.customerName,
      status: "pending" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      <SalesNav activeTab="quotations" linkComponent={Link} />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Breadcrumbs & Action Bar matching Stitch */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-500 font-medium">
              <Link href="/dashboard/sale-ref/quotations" className="hover:text-[#ff5e3a] transition-colors flex items-center gap-1">
                <ArrowLeft size={13} />
                <span>Quotations</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold font-mono">{quote.id}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                Rev {quote.revision}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                {quote.id} · {quote.customerOrg}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active Deal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
                <Sparkles size={13} className="text-amber-500" />
                {quote.tier} Tier
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
                ${quote.contractTotal.toLocaleString()}
                <span className="text-base font-semibold text-slate-400">.00</span>
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                ARR ${Math.round(quote.arr / 1000)}k <span className="text-slate-300">•</span> CapEx ${Math.round(quote.capex / 1000)}k
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href={`/portal?token=DF-Q1042`}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Customer View</span>
              </Link>

              {!isSubmitted ? (
                <button
                  type="button"
                  onClick={() => setIsSubmitted(true)}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-bold text-xs shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Submit for Approval</span>
                </button>
              ) : (
                <div className="px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-[#ff5e3a] font-bold text-xs flex items-center gap-1.5">
                  <Clock size={14} className="animate-pulse" />
                  <span>In Approval Chain</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approval Workflow Node Tracker */}
        <ApprovalTracker steps={approvalSteps} />

        {/* Proposal Line Items Table */}
        <QuotationLineItems items={quote.items} readOnly />

        {/* Negotiation & Specifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Terms & Fulfillment Rules */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#ff5e3a]" />
              <span>Commercial Terms &amp; Fulfillment</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e3a] shrink-0 mt-1.5"></span>
                <span><strong>Billing Frequency:</strong> Annual upfront subscription with Net-30 payment terms.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e3a] shrink-0 mt-1.5"></span>
                <span><strong>Warehouse &amp; Deployment:</strong> Automated cloud provisioning on PO execution.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e3a] shrink-0 mt-1.5"></span>
                <span><strong>Discount Tier Approval:</strong> 15% discount requires Regional Sales Director sign-off.</span>
              </li>
            </ul>
          </div>

          {/* Customer Stakeholder Contact */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-sky-600" />
              <span>Customer Procurement Profile</span>
            </h3>
            <div className="text-xs space-y-1.5 text-slate-600">
              <div><strong>Organization:</strong> {quote.customerOrg}</div>
              <div><strong>Primary Contact:</strong> {quote.customerName}</div>
              <div><strong>Contact Email:</strong> {quote.customerEmail}</div>
              <div><strong>Proposal Expiry:</strong> {quote.validUntil}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
