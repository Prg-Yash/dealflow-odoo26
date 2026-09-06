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
  Award,
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
  usePriceLists,
  useCustomerTiers,
  useDiscountRules,
  useApproveQuotation,
  useRejectQuotation,
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
  const { data: apiPriceLists } = usePriceLists();
  const { data: apiCustomerTiers } = useCustomerTiers();
  const { data: apiDiscountRules } = useDiscountRules();

  const submitMutation = useSubmitQuotation(quoteId);
  const confirmMutation = useConfirmQuotation(quoteId);
  const addLineMutation = useAddQuotationLine(quoteId);
  const updateLineMutation = useUpdateQuotationLine(quoteId);
  const deleteLineMutation = useDeleteQuotationLine(quoteId);
  const updateStageMutation = useUpdateQuotationStage();
  const approveQuotationMutation = useApproveQuotation();
  const rejectQuotationMutation = useRejectQuotation();

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

  // Dynamic Price List (Price Field) and Tier selection
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");
  const [selectedTierId, setSelectedTierId] = useState<string>("");

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

  // Sync Price List and Tier from Quote / Customer data
  useEffect(() => {
    if (apiQuote?.customer?.tier?.id) {
      setSelectedTierId(apiQuote.customer.tier.id);
      if (apiPriceLists && apiPriceLists.length > 0) {
        const matchingPL = apiPriceLists.find((pl) =>
          pl.customerTiers?.some((t) => t.id === apiQuote.customer?.tier?.id)
        );
        if (matchingPL) {
          setSelectedPriceListId(matchingPL.id);
        }
      }
    } else if (apiPriceLists && apiPriceLists.length > 0 && !selectedPriceListId) {
      const defaultPL = apiPriceLists.find((pl) => pl.isDefault) || apiPriceLists[0]!;
      setSelectedPriceListId(defaultPL.id);
      if (defaultPL.customerTiers && defaultPL.customerTiers.length > 0) {
        setSelectedTierId(defaultPL.customerTiers[0]!.id);
      } else {
        setSelectedTierId("");
      }
    }
  }, [apiQuote, apiPriceLists, selectedPriceListId]);

  // Derive active price list and available customer tiers (STRICTLY dependent on selectedPriceList)
  const selectedPriceList = useMemo(() => {
    if (!selectedPriceListId) return undefined;
    return apiPriceLists?.find((pl) => pl.id === selectedPriceListId);
  }, [apiPriceLists, selectedPriceListId]);

  const availableTiers = useMemo(() => {
    if (!selectedPriceList) return [];
    return selectedPriceList.customerTiers || [];
  }, [selectedPriceList]);

  const activeTier = useMemo(() => {
    if (!selectedPriceList || availableTiers.length === 0) return undefined;
    return availableTiers.find((t) => t.id === selectedTierId) || (selectedTierId ? undefined : availableTiers[0]);
  }, [selectedPriceList, availableTiers, selectedTierId]);

  const activeTierCeiling = activeTier?.discountCeiling ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD;

  const handlePriceListChange = (newPlId: string) => {
    setSelectedPriceListId(newPlId);
    if (!newPlId) {
      setSelectedTierId("");
      return;
    }
    const pl = apiPriceLists?.find((p) => p.id === newPlId);
    if (pl?.customerTiers && pl.customerTiers.length > 0) {
      const hasCurrent = pl.customerTiers.some((t) => t.id === selectedTierId);
      if (!hasCurrent) {
        setSelectedTierId(pl.customerTiers[0]!.id);
      }
    } else {
      setSelectedTierId("");
    }
  };

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
    return localLines.map((it) => {
      const effectiveLineLimit = activeTier ? activeTier.discountCeiling : it.categoryCeiling;
      return {
        id: it.id,
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        categoryCeiling: effectiveLineLimit,
      };
    });
  }, [localLines, activeTier]);

  const riskSummary = useMemo(() => {
    return calculateQuotationRisk(
      riskLines,
      activeTierCeiling,
      DEFAULT_BLENDED_DISCOUNT_THRESHOLD,
      apiDiscountRules
    );
  }, [riskLines, activeTierCeiling, apiDiscountRules]);

  // Live upsell & cross-sell recommendation candidates for current items (Matching Wireframe 4)
  const upsellSuggestions = useMemo(() => {
    if (!localLines || localLines.length === 0 || !apiProducts) return [];
    const currentProductIds = new Set(localLines.map((i) => i.productId));

    // 1. Direct Pairing Rules from DB / API
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
        const marginAmt = Math.round(prod.basePrice - prod.costPrice);
        return {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || "Accessory",
          basePrice: prod.basePrice,
          costPrice: prod.costPrice,
          marginAmount: marginAmt,
          marginPercent: Math.round(margin),
          score: rec.coPurchaseScore,
          promotionalTag: rec.promotionalTag || null,
          isPromoted: prod.isPromoted,
        };
      })
      .filter(Boolean) as any[];

    // 2. Intelligently add complementary high-margin catalog items if pairings are few
    if (directCandidates.length < 3) {
      const addedIds = new Set([
        ...Array.from(currentProductIds),
        ...directCandidates.map((d) => d.productId),
      ]);

      const complementary = apiProducts
        .filter((p) => !addedIds.has(p.id))
        .map((p) => {
          const margin = p.basePrice > 0 ? ((p.basePrice - p.costPrice) / p.basePrice) * 100 : 0;
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category?.name || "Standard",
            basePrice: p.basePrice,
            costPrice: p.costPrice,
            marginAmount: Math.round(p.basePrice - p.costPrice),
            marginPercent: Math.round(margin),
            score: p.isPromoted ? 4.5 : 3.5,
            promotionalTag: p.sku === "ACC-DCK-01" ? "Promo: 12% off" : null,
            isPromoted: p.isPromoted,
          };
        })
        .filter((p) => p.marginPercent >= 15)
        .sort((a, b) => b.score - a.score || b.marginPercent - a.marginPercent);

      for (const comp of complementary) {
        if (directCandidates.length >= 8) break;
        directCandidates.push(comp);
      }
    }

    return directCandidates.slice(0, 8);
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
      setStatusFeedback(
        riskSummary.approvalType === "DUAL_APPROVAL"
          ? "Quotation submitted for Dual Approval (Sales Manager & Finance Ops)!"
          : "Quotation submitted for Manager Approval!"
      );
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
        await approveQuotationMutation.mutateAsync({ id: apiQuote.id });
      }
      setStatusFeedback("Quotation step approved successfully!");
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
            <button onClick={() => setStatusFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
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

            {/* Top Form Fields: Customer, Dynamic Price List & Customer Tier matching Wireframe 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
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
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <DollarSign size={13} className="text-[#0066cc]" />
                    <span>Price List</span>
                  </label>
                  {selectedPriceList?.isDefault && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <select
                  disabled={isReadOnlyForSalesRep}
                  value={selectedPriceListId}
                  onChange={(e) => handlePriceListChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0066cc] disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
                >
                  <option value="">-- Select Price List / Price Field --</option>
                  {(apiPriceLists || []).map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.currency}) &ndash; {pl.customerTiers && pl.customerTiers.length > 0 ? `${pl.customerTiers.length} tier${pl.customerTiers.length > 1 ? "s" : ""} assigned` : "No tiers assigned"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Award size={13} className="text-amber-500" />
                    <span>Applied Customer Tier</span>
                  </label>
                  {activeTier ? (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Limit: {activeTier.discountCeiling}% Max
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      No Tier Applied
                    </span>
                  )}
                </div>
                <select
                  disabled={isReadOnlyForSalesRep || !selectedPriceListId || availableTiers.length === 0}
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0066cc] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  {!selectedPriceListId ? (
                    <option value="">-- Select a Price List first --</option>
                  ) : availableTiers.length === 0 ? (
                    <option value="">-- No tiers assigned to this Price List --</option>
                  ) : (
                    <>
                      <option value="">-- Select Customer Tier --</option>
                      {availableTiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name} ({tier.code}) &ndash; {tier.discountCeiling}% Ceiling
                        </option>
                      ))}
                    </>
                  )}
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
                      const limit = activeTier ? activeTier.discountCeiling : item.categoryCeiling;
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

                          <td className="py-3.5 px-3 text-center text-slate-700 font-bold">
                            <div>{limit}%</div>
                            {activeTier && (
                              <div className="text-[9px] font-normal text-slate-400 font-mono">
                                {activeTier.name.split(" ")[0]}
                              </div>
                            )}
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
                Discount is checked against each line's own limit live, as soon as it is entered, not only at submit time.
              </span>
            </div>
          </div>

          {/* ── DEDICATED UPSELL AND CROSS-SELL SUGGESTIONS (MATCHING WIREFRAME 4) ── */}
          {!isReadOnlyForSalesRep && upsellSuggestions.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-sky-400 tracking-tight">
                      Upsell and Cross-Sell Suggestions
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      High-margin historical pairings dynamically matched with current proposal items.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-300 bg-blue-950 border border-blue-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Zap size={12} className="text-amber-400 fill-amber-400" />
                  {upsellSuggestions.length} Suggestions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {upsellSuggestions.map((sug) => (
                  <button
                    type="button"
                    key={sug.productId}
                    onClick={() => handleAddUpsell(sug)}
                    className="bg-[#0b1120] hover:bg-[#131d33] p-4 rounded-2xl border border-slate-800 hover:border-blue-500 transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors flex items-center gap-1">
                        <span>+ {sug.name}</span>
                      </div>
                      {sug.promotionalTag ? (
                        <div className="text-[11px] font-semibold text-amber-400">
                          {sug.promotionalTag}
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-slate-400">
                          Margin +₹{sug.marginAmount.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div>
                        <div className="text-xs font-extrabold text-white font-mono">
                          ₹{sug.basePrice.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold font-mono">
                          {sug.marginPercent}% Margin
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1">
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Add</span>
                      </span>
                    </div>
                  </button>
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

            {/* Threshold Status & Approval Requirement */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
              <span className="text-slate-600 font-medium">Approval Requirement:</span>
              {riskSummary.approvalType === "DUAL_APPROVAL" ? (
                <span className="font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                  <span>Requires Dual Approval: Sales Manager &rarr; Finance (2 Hops)</span>
                </span>
              ) : riskSummary.approvalType === "SALES_MANAGER" ? (
                <span className="font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-600 shrink-0" />
                  <span>Requires Manager Approval: 1 Hop ({riskSummary.approvalReason || "Over Threshold"})</span>
                </span>
              ) : (
                <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <Check size={13} className="text-emerald-600 shrink-0" />
                  <span>Within Standard Limits: 0 Hops (Direct Approval)</span>
                </span>
              )}
            </div>

            {/* Sequential Approval Flow Tracker if Submitted */}
            {apiQuote.approvalRequest && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Sequential Approval Workflow:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {apiQuote.approvalRequest.steps?.map((step: any) => {
                    const isStep1 = step.stepNumber === 1;
                    const isStepApproved = step.status === "APPROVED";
                    const isStepRejected = step.status === "REJECTED";
                    const isStepPending = step.status === "PENDING";
                    const isCurrent = (apiQuote.approvalRequest?.currentStep ?? 1) === step.stepNumber && isStepPending;

                    return (
                      <div
                        key={step.id || step.stepNumber}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isStepApproved
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : isStepRejected
                            ? "bg-rose-50 border-rose-200 text-rose-800"
                            : isCurrent
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : "bg-slate-100/70 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-white border">
                            {step.stepNumber}
                          </span>
                          <span className="font-bold">
                            {step.level === "SALES_MANAGER" ? "1. Sales Manager" : "2. Finance Operations"}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {isStepApproved ? "✓ Approved" : isStepRejected ? "✕ Rejected" : isCurrent ? "⚡ Active Review" : "Waiting"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
