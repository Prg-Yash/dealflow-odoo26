"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  AlertTriangle,
  History,
  TrendingUp,
  Sparkles,
  Edit3,
  XCircle,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  calculateQuotationRisk,
  DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
  type RiskLineItem,
} from "../../../lib/risk-engine";
import { api } from "../../../lib/query/api-client";

export interface QuotationDetailViewProps {
  quotation: any;
  currentUser: any;
  userRole?: string;
  catalogProducts?: any[];
  onRefresh?: () => void;
  backHref?: string;
}

export function QuotationDetailView({
  quotation,
  currentUser,
  userRole = "SALES_REP",
  catalogProducts = [],
  onRefresh,
  backHref = "/dashboard/sale-ref/quotations",
}: QuotationDetailViewProps) {
  const router = useRouter();

  // Mode checks
  const isSalesRep = userRole === "SALES_REP";
  const isSalesManager = userRole === "SALES_MANAGER" || userRole === "ADMIN";
  const isFinanceOps = userRole === "FINANCE_OPS" || userRole === "ADMIN";
  const isApprover = isSalesManager || isFinanceOps;

  const rawStage = (quotation?.stage || "DRAFT").toUpperCase();
  const approvalStatus = (quotation?.approvalStatus || "PENDING").toUpperCase();

  // Active step evaluation for current approver
  const activeApprovalRequest = quotation?.approvalRequest;
  const currentStep =
    activeApprovalRequest?.steps?.find(
      (s: any) => s.stepNumber === activeApprovalRequest?.currentStep && s.status === "PENDING"
    ) || activeApprovalRequest?.steps?.find((s: any) => s.status === "PENDING");

  const isPendingReview =
    rawStage === "PENDING_APPROVAL" ||
    approvalStatus === "PENDING" ||
    (activeApprovalRequest && activeApprovalRequest.status === "PENDING");

  // Editable stages for sales rep
  const isEditable =
    isSalesRep &&
    (rawStage === "DRAFT" ||
      rawStage === "NEGOTIATION" ||
      approvalStatus === "REVISION_REQUESTED" ||
      approvalStatus === "REJECTED");

  const canApproveCurrentStep =
    isApprover &&
    isPendingReview &&
    (!currentStep ||
      ((currentStep.level === "SALES_MANAGER" && isSalesManager) ||
        (currentStep.level === "FINANCE" && isFinanceOps) ||
        userRole === "ADMIN"));

  // Local state for line item edits
  const [lines, setLines] = useState<any[]>(() => quotation?.lines || []);

  useEffect(() => {
    if (quotation?.lines) {
      setLines(quotation.lines);
    }
  }, [quotation?.lines]);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reviewer Decision Modal / inline state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState("");
  const [reviewerLineAdjustments, setReviewerLineAdjustments] = useState<Record<string, number>>({});
  const [isReviewing, setIsReviewing] = useState(false);

  // Comments / Audit Note
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Calculate live risk & margins
  const customerTierCeiling = quotation?.customer?.tier?.discountCeiling ?? 100.0;

  const riskLines: RiskLineItem[] = useMemo(() => {
    return lines.map((l: any) => ({
      id: l.id,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      costPrice: l.costPrice || l.product?.costPrice || 0,
      discountPercent: l.discountPercent,
      categoryCeiling: l.product?.category?.discountCeiling ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
      customerTierCeiling,
    }));
  }, [lines, customerTierCeiling]);

  const liveRiskSummary = useMemo(() => {
    return calculateQuotationRisk(riskLines, DEFAULT_CATEGORY_DISCOUNT_THRESHOLD, customerTierCeiling);
  }, [riskLines, customerTierCeiling]);

  // Handle Add Product Line to Quotation
  const handleAddProduct = async () => {
    if (!selectedCatalogProductId) return;
    const prod = catalogProducts.find((p) => p.id === selectedCatalogProductId);
    if (!prod) return;

    setActionError(null);
    try {
      setIsSaving(true);
      const res = await fetch(`${apiUrl}/api/quotations/${quotation.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: prod.id,
          quantity: 1,
          unitPrice: prod.basePrice,
          discountPercent: 0,
          description: prod.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add product line");
      }

      setSelectedCatalogProductId("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to add line item");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Update Line
  const handleUpdateLine = async (lineId: string, updates: { quantity?: number; discountPercent?: number; unitPrice?: number }) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...updates } : l))
    );

    try {
      await fetch(`${apiUrl}/api/quotations/${quotation.id}/lines/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Failed to patch line:", err);
    }
  };

  // Handle Delete Line
  const handleDeleteLine = async (lineId: string) => {
    setActionError(null);
    try {
      setIsSaving(true);
      const res = await fetch(`${apiUrl}/api/quotations/${quotation.id}/lines/${lineId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete line");
      }
      setLines((prev) => prev.filter((l) => l.id !== lineId));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to delete line item");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Submit / Resubmit Quotation
  const handleSubmitQuotation = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    try {
      await api.post(`/api/quotations/${quotation.id}/submit`);
      setActionSuccess("Quotation successfully submitted for approval routing.");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to submit quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Approver Approve Step
  const handleApproveStep = async () => {
    setActionError(null);
    setIsReviewing(true);

    try {
      await api.post(`/api/approvals/${quotation.id}/approve`, {
        comments: "Approved in full compliance with deal policy.",
      });

      setActionSuccess("Approval step confirmed and recorded successfully.");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve step");
    } finally {
      setIsReviewing(false);
    }
  };

  // Handle Approver Reject Step / Request Revision
  const handleRejectStep = async () => {
    if (!rejectComments.trim()) {
      setActionError("Please provide feedback notes explaining the revision request.");
      return;
    }

    setActionError(null);
    setIsReviewing(true);

    try {
      const lineAdjustments = Object.entries(reviewerLineAdjustments).map(([lineId, discountPercent]) => ({
        lineId,
        discountPercent,
      }));

      await api.post(`/api/approvals/${quotation.id}/reject`, {
        comments: rejectComments.trim(),
        lineAdjustments,
      });

      setShowRejectModal(false);
      setActionSuccess("Quotation returned to Sales Representative for revision.");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to submit rejection");
    } finally {
      setIsReviewing(false);
    }
  };

  // Combine audit events, comments, and counter-proposals into unified chronological trail
  const combinedTrails = useMemo(() => {
    const events: Array<{
      id: string;
      date: Date;
      type: "audit" | "counter" | "comment";
      title: string;
      description: string;
      actor: string;
      role: string;
      badgeColor: string;
    }> = [];

    // 1. Audit Logs
    (quotation?.auditLogs || []).forEach((log: any) => {
      let badgeColor = "bg-slate-100 text-slate-700";
      if (log.action.includes("APPROVED")) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      if (log.action.includes("REJECT") || log.action.includes("REVISION"))
        badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
      if (log.action.includes("SUBMITTED")) badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

      events.push({
        id: log.id,
        date: new Date(log.createdAt),
        type: "audit",
        title: log.action.replace(/_/g, " "),
        description: log.reason || "Workflow state progression recorded.",
        actor: log.actor?.name || "System",
        role: log.actorRole || "SYSTEM",
        badgeColor,
      });
    });

    // 2. Customer Counter Proposals
    (quotation?.counterProposals || []).forEach((cp: any) => {
      events.push({
        id: cp.id,
        date: new Date(cp.createdAt),
        type: "counter",
        title: "Customer Counter-Proposal",
        description: cp.comments || `Requested discount: ${cp.proposedDiscount || 0}%, target total: ₹${cp.requestedTotal || 0}`,
        actor: cp.respondedBy?.name || quotation.customer?.name || "Client",
        role: "CUSTOMER",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      });
    });

    // 3. Comments
    (quotation?.comments || []).forEach((c: any) => {
      events.push({
        id: c.id,
        date: new Date(c.createdAt),
        type: "comment",
        title: "Comment Added",
        description: c.content,
        actor: c.author?.name || "Collaborator",
        role: c.author?.role || "USER",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [quotation]);

  return (
    <div className="space-y-6 text-left font-sans">
      {/* ── TOP BREADCRUMB & HEADER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-medium">
            <Link href={backHref} className="hover:text-[#0066cc] transition-colors flex items-center gap-1">
              <ArrowLeft size={13} />
              <span>Back to Pipeline</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">{quotation.quoteNumber || quotation.id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              {quotation.title || "Commercial Quotation"}
            </h1>

            {/* Stage Badge */}
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                rawStage === "CONFIRMED"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : rawStage === "APPROVED"
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : rawStage === "PENDING_APPROVAL"
                  ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                  : rawStage === "NEGOTIATION"
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : "bg-slate-200 text-slate-800 border border-slate-300"
              }`}
            >
              {rawStage.replace(/_/g, " ")}
            </span>

            {/* Revision Requested Badge */}
            {approvalStatus === "REVISION_REQUESTED" && (
              <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                Revision Requested
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assigned Sales Rep: <strong>{quotation.salesRep?.user?.name || "Representative"}</strong> &bull; Client: <strong>{quotation.customer?.name || "Customer Org"}</strong> ({quotation.customer?.tier?.name || "Standard Tier"})
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Refresh Quotation"
            >
              <RefreshCw size={14} />
            </button>
          )}

          {isEditable && (
            <button
              type="button"
              disabled={isSubmitting || lines.length === 0}
              onClick={handleSubmitQuotation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-[#0066cc]/25 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{approvalStatus === "REVISION_REQUESTED" ? "Resubmit Proposal" : "Submit for Approval"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-xs">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Read-only Banner for Sales Rep if under approval */}
      {isSalesRep && isPendingReview && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-center gap-2 shadow-xs">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <span>
            This quotation is currently locked in <strong>Read-Only</strong> view awaiting management approval sign-off.
          </span>
        </div>
      )}

      {/* ── APPROVER ACTION BAR (Sales Manager / Finance Ops) ── */}
      {canApproveCurrentStep && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h3 className="text-base font-black tracking-tight">
                  Action Required: Step {currentStep?.stepNumber || 1} (
                  {currentStep?.level === "SALES_MANAGER" || isSalesManager
                    ? "Sales Manager"
                    : "Finance Operations"}{" "}
                  Review)
                </h3>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Review line discounts, risk thermometer, and margins below before confirming.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle size={14} />
                <span>Reject / Request Revision</span>
              </button>

              <button
                type="button"
                disabled={isReviewing}
                onClick={handleApproveStep}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-md shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                <span>Approve Step</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP COMMERCIAL & GOVERNANCE CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Grand Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Net Contract Value
          </span>
          <div className="text-2xl font-black text-[#0066cc]">
            ₹{liveRiskSummary.totalOrderValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Gross Subtotal: ₹{liveRiskSummary.subtotal.toLocaleString()}
          </div>
        </div>

        {/* Card 2: Total Discount */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Discount
          </span>
          <div className="text-2xl font-black text-rose-600">
            -₹{liveRiskSummary.discountTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Effective Discount: {liveRiskSummary.totalDiscountPercent.toFixed(1)}%
          </div>
        </div>

        {/* Card 3: Gross Margin */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Deal Gross Margin
          </span>
          <div
            className={`text-2xl font-black ${
              liveRiskSummary.grossMarginPercent < 35 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {liveRiskSummary.grossMarginPercent}%
          </div>
          <div className="text-[11px] text-slate-500">
            Margin Amount: ₹{liveRiskSummary.grossMargin.toLocaleString()}
          </div>
        </div>

        {/* Card 4: Blended Risk Thermometer */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Blended Risk Score
            </span>
            <span
              className={`text-base font-black ${
                liveRiskSummary.blendedScore === 0
                  ? "text-emerald-600"
                  : liveRiskSummary.blendedScore <= 10
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {liveRiskSummary.blendedScore}%
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-300 ${
                liveRiskSummary.blendedScore === 0
                  ? "bg-emerald-500"
                  : liveRiskSummary.blendedScore <= 10
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, liveRiskSummary.blendedScore * 5))}%` }}
            />
          </div>

          <div className="text-[10px] font-bold text-slate-500">
            {liveRiskSummary.classification.badgeText}
          </div>
        </div>
      </div>

      {/* ── 3-CONDITION GOVERNANCE PATH BANNER ── */}
      <div
        className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs ${
          liveRiskSummary.classification.color === "emerald"
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : liveRiskSummary.classification.color === "amber"
            ? "bg-amber-50/80 border-amber-200 text-amber-900"
            : "bg-rose-50/80 border-rose-200 text-rose-900"
        }`}
      >
        <div className="p-1 rounded-lg bg-white/80 shrink-0">
          {liveRiskSummary.classification.color === "emerald" ? (
            <Check size={18} className="text-emerald-600" />
          ) : (
            <AlertTriangle size={18} className="text-amber-600" />
          )}
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="font-extrabold text-sm">{liveRiskSummary.classification.label}</div>
          <p className="opacity-90 leading-relaxed">{liveRiskSummary.classification.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: PRODUCT LINE ITEMS TABLE (8 cols) ── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-[#0066cc]" />
                <h2 className="text-base font-bold text-slate-900">Quotation Line Items ({lines.length})</h2>
              </div>

              {/* Add Product Dropdown for Editable Mode */}
              {isEditable && catalogProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCatalogProductId}
                    onChange={(e) => setSelectedCatalogProductId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer max-w-[220px]"
                  >
                    <option value="">+ Add Catalog Product...</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.basePrice})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedCatalogProductId || isSaving}
                    className="px-3 py-1.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 min-w-[200px]">Product / Deliverable</th>
                    <th className="py-3 px-3 w-16 text-center">Qty</th>
                    <th className="py-3 px-3 w-24 text-right">Unit Price</th>
                    <th className="py-3 px-3 w-20 text-center">Discount</th>
                    <th className="py-3 px-3 w-20 text-center">Ceiling</th>
                    <th className="py-3 px-3 w-24 text-center">Status</th>
                    <th className="py-3 px-4 w-28 text-right">Net Total</th>
                    {isEditable && <th className="py-3 px-3 w-10 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={isEditable ? 8 : 7} className="py-8 text-center text-slate-400">
                        No product lines in this quotation.
                      </td>
                    </tr>
                  ) : (
                    lines.map((item, idx) => {
                      const calc = liveRiskSummary.lines[idx];
                      const ceiling = calc?.lineCeiling ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD;
                      const isOver = item.discountPercent > ceiling;
                      const overage = isOver ? Math.round((item.discountPercent - ceiling) * 10) / 10 : 0;
                      const netAmount = item.unitPrice * item.quantity * (1 - item.discountPercent / 100);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div>{item.description || item.product?.name || "Product Item"}</div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {item.product?.category?.name || "Category"} &bull; SKU: {item.product?.sku || "N/A"}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {isEditable ? (
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateLine(item.id, { quantity: parseInt(e.target.value) || 1 })
                                }
                                className="w-14 px-1.5 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                              />
                            ) : (
                              <span className="font-bold">{item.quantity}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            {isEditable ? (
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateLine(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-20 px-1.5 py-1 text-right font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                              />
                            ) : (
                              <span className="font-bold">₹{item.unitPrice.toLocaleString()}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {isEditable ? (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.discountPercent}
                                  onChange={(e) =>
                                    handleUpdateLine(item.id, {
                                      discountPercent: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-14 px-1.5 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                                />
                                <span className="text-slate-400 font-semibold">%</span>
                              </div>
                            ) : (
                              <span className="font-bold">{item.discountPercent}%</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center text-slate-500 font-medium">
                            {ceiling}%
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {isOver ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                OVER (+{overage}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                OK
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            ₹{Math.round(netAmount).toLocaleString()}
                          </td>

                          {isEditable && (
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteLine(item.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                                title="Remove Line"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── RIGHT: QUOTATION TRAILS & TIMELINE (4 cols) ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Timeline Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-[#0066cc]" />
                <h3 className="text-sm font-bold text-slate-900">Quotation Trails</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Audit Timeline
              </span>
            </div>

            {/* Approval Steps Checklist */}
            {activeApprovalRequest?.steps && activeApprovalRequest.steps.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Sequential Review Workflow
                </span>
                <div className="space-y-1.5">
                  {activeApprovalRequest.steps.map((step: any) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        {step.status === "APPROVED" ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : step.status === "REVISION_REQUESTED" ? (
                          <XCircle size={14} className="text-rose-500" />
                        ) : (
                          <Clock size={14} className="text-amber-500" />
                        )}
                        <span className="font-semibold text-slate-800">
                          Step {step.stepNumber}: {step.level === "SALES_MANAGER" ? "Sales Manager" : "Finance Ops"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          step.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : step.status === "REVISION_REQUESTED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chronological Event Feed */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {combinedTrails.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No audit trail events recorded yet.
                </div>
              ) : (
                combinedTrails.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${ev.badgeColor}`}>
                        {ev.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{ev.date.toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{ev.description}</p>
                    <div className="text-[10px] text-slate-400 pt-0.5 font-normal">
                      By <strong>{ev.actor}</strong> ({ev.role})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── REJECT / REVISION REQUEST MODAL ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-rose-600" />
                <h3 className="text-base font-extrabold text-slate-900">Request Quotation Revision</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Specify feedback and optionally adjust product line discounts before returning this quotation to the sales representative.
            </p>

            {/* Optional Line Discount Adjuster */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Suggested Line Discount Adjustments (Optional)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {l.description || l.product?.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">Target:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder={`${l.discountPercent}%`}
                        value={reviewerLineAdjustments[l.id] ?? ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setReviewerLineAdjustments((prev) => ({
                            ...prev,
                            [l.id]: isNaN(val) ? l.discountPercent : val,
                          }));
                        }}
                        className="w-14 px-1.5 py-0.5 text-center font-bold bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-rose-500"
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Comments */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Revision Feedback &amp; Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="e.g. Blended discount is too high for Q3. Please reduce hardware line discount to 8%."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReviewing || !rejectComments.trim()}
                onClick={handleRejectStep}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Send Revision Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
