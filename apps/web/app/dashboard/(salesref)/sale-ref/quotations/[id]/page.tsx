"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Send,
  Loader2,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  DollarSign,
  ShieldCheck,
  Check,
  Save,
  FileQuestion,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { SalesNav } from "@repo/ui";
import {
  useQuotation,
  useSubmitQuotation,
  useConfirmQuotation,
  useAddQuotationLine,
  useUpdateQuotationLine,
  useDeleteQuotationLine,
  useUpdateQuotationStage,
  useProducts,
  useProductRecommendations,
} from "../../../../../../lib/query";
import { useDashboardAuth } from "../../../../layout";
import {
  calculateQuotationRisk,
  DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
  DEFAULT_BLENDED_DISCOUNT_THRESHOLD,
  type RiskLineItem,
} from "../../../../../../lib/risk-engine";

interface Props {
  params: Promise<{ id: string }>;
}

export default function QuotationDetailPage({ params }: Props) {
  const router = useRouter();
  const resolvedParams = use(params);
  const quoteId = resolvedParams.id;

  const { user } = useDashboardAuth();

  // Queries & Mutations
  const { data: apiQuote, isLoading, error } = useQuotation(quoteId);
  const { data: apiProducts } = useProducts();
  const { data: apiRecommendations } = useProductRecommendations();
  const submitMutation = useSubmitQuotation(quoteId);
  const confirmMutation = useConfirmQuotation(quoteId);
  const addLineMutation = useAddQuotationLine(quoteId);
  const updateLineMutation = useUpdateQuotationLine(quoteId);
  const deleteLineMutation = useDeleteQuotationLine(quoteId);
  const updateStageMutation = useUpdateQuotationStage();

  // Local state for instant responsive editing and calculations
  const [localLines, setLocalLines] = useState<
    Array<{
      id: string;
      productId: string;
      name: string;
      description?: string | null;
      category: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      categoryCeiling: number;
    }>
  >([]);

  const [priceList, setPriceList] = useState<string>("Standard Commercial 2026");
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>("");

  // Sync API quotation lines into local state when loaded
  useEffect(() => {
    if (apiQuote && apiQuote.lines) {
      setLocalLines(
        apiQuote.lines.map((l) => ({
          id: l.id,
          productId: l.product?.id || l.id,
          name: l.product?.name || l.description || "Product Item",
          description: l.description,
          category: (l.product as any)?.category?.name || l.itemType || "Standard",
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice) || 0,
          discountPercent: Number(l.discountPercent) || 0,
          categoryCeiling:
            (l.product as any)?.category?.ceilingLimit ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
        }))
      );
    }
  }, [apiQuote]);

  const rawStage = (apiQuote?.stage || "").toUpperCase();

  // Role detection
  const isManagerOrAdmin = user?.role === "SALES_MANAGER" || user?.role === "ADMIN";
  const isSalesRep = user?.role === "SALES_REP" || !user?.role;

  // Exact lifecycle rule:
  // Editable by Sales Rep ONLY IF stage is DRAFT or NEGOTIATION (sent back by customer)
  // Strictly locked IF stage is PENDING_APPROVAL, APPROVED, or CONFIRMED
  const isEditable =
    rawStage === "DRAFT" || rawStage === "NEGOTIATION" || rawStage === "REVISION_REQUESTED";

  const isPendingApproval = rawStage === "PENDING_APPROVAL" || rawStage === "PENDING";
  const isApproved = rawStage === "APPROVED";
  const isConfirmed = rawStage === "CONFIRMED";
  const isNegotiation = rawStage === "NEGOTIATION";

  const isReadOnlyForSalesRep = isSalesRep && !isEditable;

  // Live Risk & Threshold Calculation
  const riskLines: RiskLineItem[] = useMemo(() => {
    return localLines.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent,
      categoryCeiling: it.categoryCeiling,
    }));
  }, [localLines]);

  const riskSummary = useMemo(() => {
    return calculateQuotationRisk(
      riskLines,
      DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
      DEFAULT_BLENDED_DISCOUNT_THRESHOLD
    );
  }, [riskLines]);

  // Live upsell & cross-sell recommendation candidates for current items
  const upsellSuggestions = useMemo(() => {
    if (!localLines || localLines.length === 0 || !apiProducts) return [];
    const currentProductIds = new Set(localLines.map((i) => i.productId));

    // 1. Direct Pairing Rules from DB
    const matchingRecs = (apiRecommendations || []).filter(
      (rec) =>
        rec.isActive &&
        currentProductIds.has(rec.sourceProductId) &&
        !currentProductIds.has(rec.recommendedProductId)
    );

    const directCandidates = matchingRecs
      .map((rec) => {
        const prod = apiProducts.find((p) => p.id === rec.recommendedProductId);
        if (!prod) return null;
        const margin =
          prod.basePrice > 0 ? ((prod.basePrice - prod.costPrice) / prod.basePrice) * 100 : 0;
        if (margin < rec.minMarginThreshold) return null;
        return {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || "Accessory",
          basePrice: prod.basePrice,
          costPrice: prod.costPrice,
          marginPercent: Math.round(margin),
          score: rec.coPurchaseScore,
          promotionalTag: rec.promotionalTag || "Frequently Bought Together",
          isPromoted: prod.isPromoted,
        };
      })
      .filter(Boolean) as any[];

    // 2. Fallback candidates
    const fallbackCandidates = apiProducts
      .filter(
        (p) =>
          !currentProductIds.has(p.id) &&
          !directCandidates.some((c) => c.productId === p.id) &&
          (p.category?.type === "SERVICE" || p.isPromoted || p.category?.type === "SUBSCRIPTION")
      )
      .map((p) => {
        const margin = p.basePrice > 0 ? ((p.basePrice - p.costPrice) / p.basePrice) * 100 : 0;
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category?.name || "Service",
          basePrice: p.basePrice,
          costPrice: p.costPrice,
          marginPercent: Math.round(margin),
          score: p.isPromoted ? 9.0 : 7.0,
          promotionalTag: p.isPromoted ? "Promoted Deal Booster" : "Recommended Support Add-on",
          isPromoted: p.isPromoted,
        };
      })
      .filter((c) => c.marginPercent >= 20);

    return [...directCandidates, ...fallbackCandidates].slice(0, 4);
  }, [localLines, apiProducts, apiRecommendations]);

  // Updating Handlers (persist to DB if API quote exists)
  const handleQuantityChange = async (index: number, newQty: number) => {
    if (isReadOnlyForSalesRep) return;
    const sanitized = Math.max(1, newQty);
    const line = localLines[index];
    if (!line) return;

    setLocalLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, quantity: sanitized };
      return copy;
    });

    if (apiQuote && line.id && !line.id.startsWith("temp-")) {
      try {
        await updateLineMutation.mutateAsync({
          lineId: line.id,
          body: { quantity: sanitized },
        });
      } catch (err) {
        console.warn("Line quantity update error:", err);
      }
    }
  };

  const handleDiscountChange = async (index: number, newDiscount: number) => {
    if (isReadOnlyForSalesRep) return;
    const sanitized = Math.max(0, Math.min(100, newDiscount));
    const line = localLines[index];
    if (!line) return;

    setLocalLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, discountPercent: sanitized };
      return copy;
    });

    if (apiQuote && line.id && !line.id.startsWith("temp-")) {
      try {
        await updateLineMutation.mutateAsync({
          lineId: line.id,
          body: { discountPercent: sanitized },
        });
      } catch (err) {
        console.warn("Line discount update error:", err);
      }
    }
  };

  const handleRemoveLine = async (index: number) => {
    if (isReadOnlyForSalesRep) return;
    const line = localLines[index];
    if (!line) return;

    setLocalLines((prev) => prev.filter((_, i) => i !== index));

    if (apiQuote && line.id && !line.id.startsWith("temp-")) {
      try {
        await deleteLineMutation.mutateAsync(line.id);
        setStatusFeedback("Line item removed.");
        setTimeout(() => setStatusFeedback(null), 2500);
      } catch (err) {
        console.warn("Delete line error:", err);
      }
    }
  };

  const handleAddUpsell = async (sugOrProd: any) => {
    if (isReadOnlyForSalesRep) return;
    const prodId = sugOrProd.productId || sugOrProd.id;
    const prodName = sugOrProd.name;
    const prodPrice = sugOrProd.basePrice || sugOrProd.unitPrice || 0;

    const existingIndex = localLines.findIndex((l) => l.productId === prodId);
    if (existingIndex >= 0) {
      const existingLine = localLines[existingIndex]!;
      const newQty = existingLine.quantity + 1;
      await handleQuantityChange(existingIndex, newQty);
      setStatusFeedback(`Incremented quantity for ${prodName} (now ${newQty}).`);
      setTimeout(() => setStatusFeedback(null), 3000);
      return;
    }

    try {
      if (apiQuote) {
        await addLineMutation.mutateAsync({
          productId: prodId,
          quantity: 1,
          unitPrice: prodPrice,
          discountPercent: 0,
          description: prodName,
        });
      }
      setStatusFeedback(`Added ${prodName} to quotation!`);
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err) {
      console.warn("Add upsell line error:", err);
    }
  };

  const handleAddCatalogProduct = async () => {
    if (isReadOnlyForSalesRep || !selectedCatalogProductId || !apiProducts) return;
    const prod = apiProducts.find((p) => p.id === selectedCatalogProductId);
    if (!prod) return;

    const existingIndex = localLines.findIndex((l) => l.productId === prod.id);
    if (existingIndex >= 0) {
      const existingLine = localLines[existingIndex]!;
      const newQty = existingLine.quantity + 1;
      await handleQuantityChange(existingIndex, newQty);
      setSelectedCatalogProductId("");
      setStatusFeedback(`Incremented quantity for ${prod.name} (now ${newQty}).`);
      setTimeout(() => setStatusFeedback(null), 3000);
      return;
    }

    try {
      if (apiQuote) {
        await addLineMutation.mutateAsync({
          productId: prod.id,
          quantity: 1,
          unitPrice: prod.basePrice,
          discountPercent: 0,
          description: prod.name,
        });
      }
      setSelectedCatalogProductId("");
      setStatusFeedback(`Added ${prod.name} to proposal lines.`);
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err) {
      console.warn("Add catalog product error:", err);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      if (apiQuote) {
        await submitMutation.mutateAsync();
      }
      setStatusFeedback("Quotation submitted for Manager Approval!");
      setTimeout(() => setStatusFeedback(null), 3500);
    } catch (err: any) {
      console.error("Submit error:", err);
      setStatusFeedback(err.message || "Quotation submitted.");
      setTimeout(() => setStatusFeedback(null), 3500);
    }
  };

  const handleManagerApprove = async () => {
    try {
      if (apiQuote) {
        await updateStageMutation.mutateAsync({ id: apiQuote.id, stage: "APPROVED" as any });
      }
      setStatusFeedback("Quotation approved successfully!");
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err) {
      console.error("Manager approve error:", err);
    }
  };

  const handleManagerReturnToDraft = async () => {
    try {
      if (apiQuote) {
        await updateStageMutation.mutateAsync({ id: apiQuote.id, stage: "DRAFT" as any });
      }
      setStatusFeedback("Quotation returned to draft for rep adjustment.");
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err) {
      console.error("Manager reject error:", err);
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SR";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#0066cc]" />
        <span className="text-xs text-slate-500 font-medium">Loading quotation details...</span>
      </div>
    );
  }

  if (!apiQuote) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <FileQuestion size={28} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Quotation Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          The requested quotation could not be located in this organization or is not assigned to your account.
        </p>
        <Link
          href="/dashboard/sale-ref/quotations"
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066cc] text-white text-xs font-bold shadow-xs hover:bg-[#0052a3] transition"
        >
          <ArrowLeft size={13} />
          <span>Back to Quotations List</span>
        </Link>
      </div>
    );
  }

  const displayQuoteNumber = apiQuote.quoteNumber || apiQuote.id;
  const displayCustomerOrg = apiQuote.customer?.name || "Client Organization";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
      {/* Role-Aware Navigation */}
      <SalesNav
        activeTab="quotations"
        userName={user?.name || "Sales Representative"}
        userInitials={userInitials}
        roleLabel={user?.role === "SALES_REP" ? "Sales Representative" : user?.role || "Sales Rep"}
        linkComponent={Link}
      />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 font-medium">
          <Link
            href="/dashboard/sale-ref/quotations"
            className="hover:text-[#0066cc] transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            <span>Quotations</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold font-mono">{displayQuoteNumber}</span>
          <span>•</span>
          <span className="text-slate-500 font-medium">{displayCustomerOrg}</span>
        </div>

        {/* Feedback Alert */}
        {statusFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{statusFeedback}</span>
            </div>
            <button onClick={() => setStatusFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
              &times;
            </button>
          </div>
        )}

        {/* ── STAGE-SPECIFIC NOTICES & LOCKING BANNERS ── */}
        {isSalesRep && isPendingApproval && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Quotation Locked for Review (Read-Only)
              </h3>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                This proposal has been submitted for Manager Approval because discount overage exceeded the standard threshold.
                All line items, quantities, and discounts are <strong>read-only</strong> until approved or returned to draft by management.
              </p>
            </div>
          </div>
        )}

        {isNegotiation && (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center shrink-0 text-purple-700 mt-0.5">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800">
                Customer Counter-Proposal (Editable)
              </h3>
              <p className="text-xs text-purple-700 mt-0.5 leading-relaxed">
                The customer reviewed this proposal in the portal and sent back an updated request/counter-offer.
                You can adjust products, quantities, and discounts, then save or re-submit for approval.
              </p>
            </div>
          </div>
        )}

        {isSalesRep && isApproved && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0 text-blue-700 mt-0.5">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Quotation Approved (Read-Only)
              </h3>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                This proposal has been approved by management. The pricing and discount structure are locked for customer confirmation and order execution.
              </p>
            </div>
          </div>
        )}

        {isManagerOrAdmin && isPendingApproval && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0 text-blue-700 mt-0.5">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Manager Approval Required
                </h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  Blended risk score is <strong>{riskSummary.blendedScore}%</strong> (Limit: {DEFAULT_BLENDED_DISCOUNT_THRESHOLD}%).
                  Review line-item discounts and take action.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleManagerReturnToDraft}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Request Changes
              </button>
              <button
                onClick={handleManagerApprove}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Approve Quotation
              </button>
            </div>
          </div>
        )}

        {/* Main Quotation Card matching Reference Image 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 text-left">
          {/* Header matching Reference Image 4 */}
          <div className="border-b border-slate-200 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Quotation Detail: {displayQuoteNumber} ({displayCustomerOrg})
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    isConfirmed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isApproved
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : isPendingApproval
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : isNegotiation
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {isPendingApproval ? "Pending Approval" : rawStage}
                </span>
              </div>
            </div>

            {/* Top Form Fields: Customer & Price List matching Reference Image 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-400" />
                  <span>Customer</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${displayCustomerOrg} (${apiQuote.customer?.email || ""})`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none select-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-slate-400" />
                  <span>Price List</span>
                </label>
                <select
                  disabled={isReadOnlyForSalesRep}
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0066cc] disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
                >
                  <option value="Standard Commercial 2026">Standard Commercial 2026</option>
                  <option value="Enterprise Tier A">Enterprise Tier A (Preferred)</option>
                  <option value="Strategic Partner - Volume Discount">Strategic Partner - Volume Discount</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── PRODUCTS TABLE MATCHING REFERENCE IMAGE 4 ── */}
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 min-w-[220px]">Product</th>
                    <th className="py-3 px-3 w-20 text-center">Qty</th>
                    <th className="py-3 px-4 w-28 text-right">Price</th>
                    <th className="py-3 px-3 w-24 text-center">Discount</th>
                    <th className="py-3 px-3 w-20 text-center">Limit</th>
                    <th className="py-3 px-4 w-32 text-center">Status</th>
                    {!isReadOnlyForSalesRep && <th className="py-3 px-3 w-12 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {localLines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No products in this quotation yet. Add recommendations below.
                      </td>
                    </tr>
                  ) : (
                    localLines.map((item, idx) => {
                      const actualDiscount = item.discountPercent;
                      const limit = item.categoryCeiling;
                      const isOver = actualDiscount > limit;
                      const overageAmount = isOver ? Math.round((actualDiscount - limit) * 10) / 10 : 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div>{item.name}</div>
                            {item.description && (
                              <div className="text-[11px] font-normal text-slate-400 line-clamp-1">
                                {item.description}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {isReadOnlyForSalesRep ? (
                              <span className="font-bold">{item.quantity}</span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                              />
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                            ₹{Number(item.unitPrice).toLocaleString()}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {isReadOnlyForSalesRep ? (
                              <span className="font-bold">{item.discountPercent}%</span>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.discountPercent}
                                  onChange={(e) => handleDiscountChange(idx, parseFloat(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                                />
                                <span className="text-slate-400 font-semibold">%</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center text-slate-500 font-medium">
                            {limit}%
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isOver ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                OVER (+{overageAmount}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                OK
                              </span>
                            )}
                          </td>

                          {!isReadOnlyForSalesRep && (
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                title="Remove line item"
                                className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                              >
                                <Trash2 size={14} />
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

            {/* Add Product from Organization Catalog Bar */}
            {!isReadOnlyForSalesRep && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={selectedCatalogProductId}
                    onChange={(e) => setSelectedCatalogProductId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#0066cc] cursor-pointer"
                  >
                    <option value="">Select product from organization catalog...</option>
                    {(apiProducts || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.basePrice.toLocaleString()} ({p.category?.name || "Standard"})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddCatalogProduct}
                  disabled={!selectedCatalogProductId || addLineMutation.isPending}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {addLineMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Plus size={13} strokeWidth={2.5} />
                  )}
                  <span>+ Add Product Line</span>
                </button>
              </div>
            )}

            {/* Yellow Live Banner matching Reference Image 4 */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <span className="text-amber-600 text-sm">⚠️</span>
              <span className="font-medium">
                Discount is checked against each item's own limit live, as soon as it is entered, not only at submit time.
              </span>
            </div>
          </div>

          {/* Upsell & Cross-Sell Recommendations */}
          {!isReadOnlyForSalesRep && upsellSuggestions.length > 0 && (
            <div className="bg-linear-to-br from-indigo-50/50 via-white to-sky-50/40 rounded-2xl p-6 border border-indigo-100/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Intelligent Upsell &amp; Cross-Sell Recommendations
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Margin-governed add-ons paired with the products currently in this quotation.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Zap size={12} className="text-amber-500 fill-amber-500" />
                  {upsellSuggestions.length} Recommended
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {upsellSuggestions.map((sug) => (
                  <div
                    key={sug.productId}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {sug.promotionalTag}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <TrendingUp size={11} />
                          {sug.marginPercent}% margin
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {sug.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">SKU: {sug.sku} • {sug.category}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          ₹{sug.basePrice.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">Co-purchase score: {sug.score}/10</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddUpsell(sug)}
                        disabled={addLineMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Plus size={13} />
                        <span>Add to Quote</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── THRESHOLD CALCULATION ENGINE BREAKDOWN ── */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#0066cc]" />
                <span>Governance &amp; Risk Threshold Analysis</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Formula: Weighted Overage / Total Order Value
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Subtotal</span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  ₹{riskSummary.subtotal.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Discount Amount</span>
                <div className="text-base font-black text-rose-600 mt-0.5">
                  -₹{riskSummary.discountTotal.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Order Value</span>
                <div className="text-base font-black text-[#0066cc] mt-0.5">
                  ₹{riskSummary.totalOrderValue.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Blended Score</span>
                <div
                  className={`text-base font-black mt-0.5 ${
                    riskSummary.isBlendedBreached ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {riskSummary.blendedScore}%{" "}
                  <span className="text-[10px] font-normal text-slate-400">
                    (Limit: {DEFAULT_BLENDED_DISCOUNT_THRESHOLD}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Threshold Status */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600 font-medium">Approval Requirement:</span>
              {riskSummary.requiresApproval ? (
                <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>Requires Manager Approval ({riskSummary.approvalReason || "Over Threshold"})</span>
                </span>
              ) : (
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check size={12} />
                  <span>Within Auto-Approval Limit</span>
                </span>
              )}
            </div>
          </div>

          {/* ── UPSELL AND CROSS-SELL SUGGESTIONS MATCHING REFERENCE IMAGE 4 ── */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Upsell and Cross-Sell Suggestions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {(apiProducts?.slice(0, 3) || [
                { id: "p1", name: "Wireless Mouse", basePrice: 45, category: { name: "hardware" } },
                { id: "p2", name: "Docking Station", basePrice: 280, category: { name: "hardware" } },
                { id: "p3", name: "Care Plan 2yr", basePrice: 250, category: { name: "support" } },
              ]).map((rec: any) => (
                <button
                  key={rec.id}
                  type="button"
                  disabled={isReadOnlyForSalesRep}
                  onClick={() => handleAddUpsell(rec)}
                  className="bg-slate-50/90 hover:bg-slate-100/90 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 rounded-2xl p-4 text-left transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 group-hover:text-[#0066cc] flex items-center justify-between">
                      <span>+ {rec.name}</span>
                      <span className="text-[10px] font-semibold text-slate-500">₹{rec.basePrice}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {rec.description || `Catalog add-on for ${rec.category?.name || "deal"}`}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600">
                      Standard Add-on
                    </span>
                    <span className="text-[10px] font-bold text-[#0066cc] group-hover:underline">
                      + Add to quote &rarr;
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={`/portal?token=${apiQuote.portalToken || apiQuote.id}`}
                target="_blank"
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Customer Portal</span>
              </Link>

              {isConfirmed && (
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Deal Confirmed</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {isSalesRep && isPendingApproval ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  <Clock size={14} className="animate-pulse" />
                  <span>Locked for Review (Manager Approval Pending)</span>
                </div>
              ) : isApproved ? (
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    Approved by Manager
                  </span>
                  <button
                    type="button"
                    onClick={() => confirmMutation.mutate({})}
                    disabled={confirmMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Execute &amp; Bill</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFeedback("Draft changes saved.");
                      setTimeout(() => setStatusFeedback(null), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Save Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitForApproval}
                    disabled={submitMutation.isPending || riskSummary.isEmpty}
                    className="px-5 py-2 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold text-xs shadow-md shadow-[#0066cc]/25 active:translate-y-0.5 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Submit for Approval</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
