"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Loader2,
  Send,
  Save,
  Package,
  ShieldCheck,
  Check,
  AlertTriangle,
  Trash2,
  Layers,
  Clock,
  Sparkles,
  Info,
  TrendingUp,
  Zap,
  Plus,
  Award,
  DollarSign,
} from "lucide-react";
import {
  useCustomers,
  useCustomerTiers,
  useProducts,
  useCategories,
  useCreateQuotation,
  useProductRecommendations,
  usePriceLists,
  useDiscountRules,
} from "../../../../../../lib/query";
import { useDashboardAuth } from "../../../../layout";
import {
  calculateQuotationRisk,
  DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
  DEFAULT_BLENDED_DISCOUNT_THRESHOLD,
  type RiskLineItem,
} from "../../../../../../lib/risk-engine";

interface LineItemState {
  id: string;
  productId: string;
  name: string;
  description: string;
  category: string;
  categoryType: string;
  categoryCeiling: number;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { user, signOut } = useDashboardAuth();

  // Dynamic Data Queries
  const { data: apiCustomers, isLoading: loadingCustomers } = useCustomers();
  const { data: apiCustomerTiers, isLoading: loadingTiers } = useCustomerTiers();
  const { data: apiProducts, isLoading: loadingProducts } = useProducts();
  const { data: apiCategories } = useCategories();
  const { data: apiRecommendations } = useProductRecommendations();
  const { data: apiPriceLists } = usePriceLists();
  const { data: apiDiscountRules } = useDiscountRules();
  const createQuotationMutation = useCreateQuotation();

  // Organization Currency Symbol
  const currencySymbol =
    user?.organization?.currency === "USD"
      ? "$"
      : user?.organization?.currency === "EUR"
        ? "€"
        : "₹";

  // Mode: select existing customer vs enter new customer
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");

  // Dynamic Price List (Price Field) and Tier selection
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");
  const [selectedTierId, setSelectedTierId] = useState<string>("");

  // Existing customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // New customer form state
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [selectedNewCustomerTierId, setSelectedNewCustomerTierId] = useState<string>("");

  // Proposal details
  const [quoteTitle, setQuoteTitle] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30 Days");
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0]!;
  });

  // Dynamic Line Items
  const [items, setItems] = useState<LineItemState[]>([]);

  // Selected catalog product to add
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync first customer if available
  useEffect(() => {
    if (apiCustomers && apiCustomers.length > 0) {
      if (!selectedCustomerId) {
        setSelectedCustomerId(apiCustomers[0]!.id);
      }
    } else if (apiCustomers && apiCustomers.length === 0) {
      setCustomerMode("new");
    }
  }, [apiCustomers, selectedCustomerId]);

  // Sync default tier for new customer mode
  useEffect(() => {
    if (apiCustomerTiers && apiCustomerTiers.length > 0 && !selectedNewCustomerTierId) {
      setSelectedNewCustomerTierId(apiCustomerTiers[0]!.id);
    }
  }, [apiCustomerTiers, selectedNewCustomerTierId]);

  // Active Customer & Dynamic Tier Resolution
  const selectedCustomer = useMemo(() => {
    if (customerMode === "existing") {
      return apiCustomers?.find((c) => c.id === selectedCustomerId);
    }
    return null;
  }, [customerMode, apiCustomers, selectedCustomerId]);

  const activeCustomerTier = useMemo(() => {
    if (customerMode === "existing") {
      return selectedCustomer?.tier || apiCustomerTiers?.[0];
    }
    return (
      apiCustomerTiers?.find((t) => t.id === selectedNewCustomerTierId) || apiCustomerTiers?.[0]
    );
  }, [customerMode, selectedCustomer, apiCustomerTiers, selectedNewCustomerTierId]);

  const activeCustomerTierCeiling = activeCustomerTier?.discountCeiling ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD;

  // Sync default quote title when customer changes
  useEffect(() => {
    if (customerMode === "existing") {
      if (selectedCustomer) {
        setQuoteTitle(
          `${selectedCustomer.companyName || selectedCustomer.name} Commercial Proposal`
        );
      }
    } else {
      if (companyName || customerName) {
        setQuoteTitle(`${companyName || customerName} Commercial Proposal`);
      }
    }
  }, [customerMode, selectedCustomer, companyName, customerName]);

  // Sync Price List and Tier defaults
  useEffect(() => {
    if (apiPriceLists && apiPriceLists.length > 0 && !selectedPriceListId) {
      const defaultPL = apiPriceLists.find((pl) => pl.isDefault) || apiPriceLists[0]!;
      setSelectedPriceListId(defaultPL.id);
      if (defaultPL.customerTiers && defaultPL.customerTiers.length > 0) {
        setSelectedTierId(defaultPL.customerTiers[0]!.id);
      } else {
        setSelectedTierId("");
      }
    }
  }, [apiPriceLists, selectedPriceListId]);

  // When customer changes, auto-select matching Price List and Tier if customer has one
  useEffect(() => {
    if (customerMode === "existing" && selectedCustomerId && apiCustomers) {
      const cust = apiCustomers.find((c) => c.id === selectedCustomerId);
      if (cust?.tier?.id && apiPriceLists) {
        const matchingPL = apiPriceLists.find((pl) =>
          pl.customerTiers?.some((t) => t.id === cust.tier?.id)
        );
        if (matchingPL) {
          setSelectedPriceListId(matchingPL.id);
          setSelectedTierId(cust.tier.id);
        }
      }
    }
  }, [customerMode, selectedCustomerId, apiCustomers, apiPriceLists]);

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

  const activeTierCeiling = activeTier?.discountCeiling ?? activeCustomerTierCeiling;

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

  // Dynamic Risk & Threshold Calculation
  const riskLines: RiskLineItem[] = useMemo(() => {
    return items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      costPrice: i.costPrice,
      discountPercent: i.discountPercent,
      categoryCeiling: i.categoryCeiling,
      customerTierCeiling: activeTierCeiling,
    }));
  }, [items, activeTierCeiling]);

  const riskSummary = useMemo(() => {
    return calculateQuotationRisk(
      riskLines,
      DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
      activeTierCeiling,
      DEFAULT_BLENDED_DISCOUNT_THRESHOLD,
      apiDiscountRules
    );
  }, [riskLines, activeTierCeiling, apiDiscountRules]);

  // Live upsell & cross-sell recommendation candidates for current items (Matching Wireframe 4)
  const upsellSuggestions = useMemo(() => {
    if (!items || items.length === 0 || !apiProducts) return [];
    const currentProductIds = new Set(items.map((i) => i.productId));

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
        if (margin < rec.minMarginThreshold) return null; // Enforce margin floor
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
  }, [items, apiProducts, apiRecommendations]);

  const handleAddSuggestion = (sug: any) => {
    const prod = apiProducts?.find((p) => p.id === sug.productId);
    if (!prod) return;

    const catCeiling = (prod.category as any)?.discountCeiling ?? (prod.category as any)?.ceilingLimit ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD;

    const existing = items.find((it) => it.productId === prod.id);
    if (existing) {
      setItems((prev) =>
        prev.map((it) => (it.productId === prod.id ? { ...it, quantity: it.quantity + 1 } : it))
      );
    } else {
      const newItem: LineItemState = {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        name: prod.name,
        description: prod.description || prod.name,
        category: prod.category?.name || "Standard",
        categoryType: prod.category?.type || "HARDWARE",
        categoryCeiling: catCeiling,
        quantity: 1,
        unitPrice: prod.basePrice,
        costPrice: prod.costPrice,
        discountPercent: 0,
      };
      setItems((prev) => [...prev, newItem]);
    }
  };

  // Handle adding product from organization's real catalog
  const handleAddProduct = () => {
    if (!selectedProductId || !apiProducts) return;
    const prod = apiProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const catCeiling = (prod.category as any)?.discountCeiling ?? (prod.category as any)?.ceilingLimit ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD;

    const existing = items.find((it) => it.productId === prod.id);
    if (existing) {
      setItems((prev) =>
        prev.map((it) => (it.productId === prod.id ? { ...it, quantity: it.quantity + 1 } : it))
      );
    } else {
      const newItem: LineItemState = {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        name: prod.name,
        description: prod.description || prod.name,
        category: prod.category?.name || "Standard",
        categoryType: prod.category?.type || "HARDWARE",
        categoryCeiling: catCeiling,
        quantity: 1,
        unitPrice: prod.basePrice,
        costPrice: prod.costPrice,
        discountPercent: 0,
      };
      setItems((prev) => [...prev, newItem]);
    }
    setSelectedProductId("");
  };

  const handleUpdateQty = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, quantity: Math.max(1, qty) };
      return copy;
    });
  };

  const handleUpdateDiscount = (index: number, discount: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, discountPercent: Math.max(0, Math.min(100, discount)) };
      return copy;
    });
  };

  const handleUpdatePrice = (index: number, price: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, unitPrice: Math.max(0, price) };
      return copy;
    });
  };

  const handleRemoveLine = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Create Quotation Handler
  const handleSaveQuotation = async (submitImmediately: boolean) => {
    setErrorMessage(null);

    // Validation
    if (customerMode === "existing" && !selectedCustomerId) {
      setErrorMessage("Please select a customer for this proposal.");
      return;
    }
    if (customerMode === "new" && (!customerEmail.trim() || !customerEmail.includes("@"))) {
      setErrorMessage("Please provide a valid customer email address.");
      return;
    }
    if (items.length === 0) {
      setErrorMessage("Please add at least one product line item to this quotation.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        title: quoteTitle.trim() || "Commercial Quotation",
        notes: paymentTerms,
        expiresAt: validUntil ? new Date(validUntil).toISOString() : undefined,
        lines: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          description: i.name,
        })),
      };

      if (customerMode === "existing") {
        payload.customerId = selectedCustomerId;
      } else {
        payload.customerEmail = customerEmail.trim().toLowerCase();
        payload.customerName = customerName.trim() || undefined;
        payload.companyName = companyName.trim() || customerName.trim() || undefined;
        payload.customerPhone = customerPhone.trim() || undefined;
        payload.tierId = selectedNewCustomerTierId || undefined;
      }

      const createdQuote = await createQuotationMutation.mutateAsync(payload);

      // If user clicked "Submit for Approval" directly
      if (submitImmediately && createdQuote?.id) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        await fetch(`${apiUrl}/api/quotations/${createdQuote.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }).catch(() => { });
      }

      router.push(`/dashboard/admin/quotations/${createdQuote.id}`);
    } catch (err: any) {
      console.error("Create quotation error:", err);
      setErrorMessage(
        err.message || "Failed to create quotation. Please check customer and line details."
      );
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-transparent">
      <div className="space-y-6 text-left">
        {/* Header Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-medium">
              <Link
                href="/dashboard/admin/quotations"
                className="hover:text-[#ff5e3a] transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={13} />
                <span>Quotations</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">New Proposal Builder</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Create New Quotation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Build a dynamic proposal with organization tiers, category discount limits, and automated approval classification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/quotations"
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* MEASURERS DASHBOARD: Live Organization Inputs Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Measurer 1: Customer Tier (WHO) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] border border-blue-100 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Customer Tier (WHO)</span>
              <div className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                <span>{activeTier?.name || activeCustomerTier?.name || "Standard Tier"}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0066cc] text-[10px] font-extrabold">
                  {activeTierCeiling}% Max Limit
                </span>
              </div>
            </div>
          </div>

          {/* Measurer 2: Categories (WHAT) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Categories (WHAT)</span>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5 flex-wrap">
                {apiCategories && apiCategories.length > 0 ? (
                  apiCategories.slice(0, 3).map((cat) => (
                    <span key={cat.id} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {cat.name}: {cat.discountCeiling ?? 15}%
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">Hardware (15%), Services (10%), SaaS (12%)</span>
                )}
              </div>
            </div>
          </div>

          {/* Measurer 3: Pricing & Currency */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Price Schedule</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {user?.organization?.currency || "INR"} Commercial Schedule ({currencySymbol})
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-xs">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT & CENTER: Customer & Items Configuration (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Customer Selection Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-[#ff5e3a]" />
                  <h2 className="text-sm font-bold text-slate-900">Customer Organization</h2>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    disabled={!apiCustomers || apiCustomers.length === 0}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${customerMode === "existing"
                        ? "bg-white text-[#0066cc] font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      }`}
                  >
                    Select Existing ({apiCustomers?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("new")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${customerMode === "new"
                        ? "bg-white text-[#0066cc] font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    + New Customer
                  </button>
                </div>
              </div>

              {customerMode === "existing" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Select Client Account
                    </label>
                    {selectedCustomer?.tier && (
                      <span className="text-[11px] font-bold text-[#0066cc] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {selectedCustomer.tier.name} &bull; {selectedCustomer.tier.discountCeiling}% Max Limit
                      </span>
                    )}
                  </div>

                  {loadingCustomers ? (
                    <div className="py-3 flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 size={14} className="animate-spin text-[#ff5e3a]" />
                      <span>Loading organization customers...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                    >
                      {apiCustomers?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName || c.name} &ndash; {c.email} ({c.tier?.name || "Standard Tier"}: {c.tier?.discountCeiling ?? 10}%)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                /* Auto-Provisioning Customer Fields with Dynamic Tier Selection */
                <div className="space-y-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-800 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#ff5e3a] shrink-0" />
                    <span>
                      If customer does not have an account, DealFlow 360 will automatically create a portal user and assign this quotation.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Customer Email <span className="text-[#ff5e3a]">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="procurement@client.com"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] rounded-xl text-xs text-slate-900 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Company / Organization
                      </label>
                      <div className="relative">
                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Acme Corp"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] rounded-xl text-xs text-slate-900 outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Contact Person Name
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Johnathan Ward"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] rounded-xl text-xs text-slate-900 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+1 (555) 019-2834"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] rounded-xl text-xs text-slate-900 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Customer Tier
                      </label>
                      <select
                        value={selectedNewCustomerTierId}
                        onChange={(e) => setSelectedNewCustomerTierId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        {apiCustomerTiers?.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.name} ({tier.discountCeiling}% limit)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Price List & Customer Tier Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <DollarSign size={13} className="text-[#0066cc]" />
                      <span>Assigned Price List</span>
                    </label>
                    {selectedPriceList?.isDefault && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Default List
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedPriceListId}
                    onChange={(e) => handlePriceListChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
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
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
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
                    value={selectedTierId}
                    onChange={(e) => setSelectedTierId(e.target.value)}
                    disabled={!selectedPriceListId || availableTiers.length === 0}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                            {tier.name} ({tier.code}) &ndash; {tier.discountCeiling}% Discount Ceiling
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {!selectedPriceListId && (
                    <p className="text-[10px] text-slate-400 italic">
                      Customer tiers are scoped to price lists. Please select an Assigned Price List to view and apply eligible tiers.
                    </p>
                  )}
                </div>
              </div>

              {/* Proposal Title & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Proposal Title
                  </label>
                  <input
                    type="text"
                    value={quoteTitle}
                    onChange={(e) => setQuoteTitle(e.target.value)}
                    placeholder="e.g. Enterprise Solution & Hardware Modernization"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] rounded-xl text-xs text-slate-900 font-medium outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] rounded-xl text-xs text-slate-900 font-medium outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Quotation Products Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-[#ff5e3a]" />
                  <h2 className="text-sm font-bold text-slate-900">Quotation Line Items</h2>
                </div>

                {/* Catalog Dropdown to add product */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    disabled={loadingProducts || !apiProducts || apiProducts.length === 0}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer max-w-[240px]"
                  >
                    <option value="">+ Choose Catalog Product...</option>
                    {apiProducts?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({currencySymbol}{p.basePrice}) &ndash; {p.category?.name || "Cat"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedProductId}
                    className="px-3 py-1.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Add Line
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px]">Product &amp; Category</th>
                      <th className="py-3 px-3 w-16 text-center">Qty</th>
                      <th className="py-3 px-3 w-24 text-right">Unit Price</th>
                      <th className="py-3 px-3 w-24 text-center">Discount %</th>
                      <th className="py-3 px-3 w-28 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>Effective Limit</span>
                          <Info size={11} className="text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3 w-24 text-center">Status</th>
                      <th className="py-3 px-3 w-24 text-right">Net Total</th>
                      <th className="py-3 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Package size={28} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">No products added to proposal yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Select products from your organization's catalog above to start building the quotation.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const effectiveLimit = Math.min(activeTierCeiling, item.categoryCeiling);
                        const isOver = item.discountPercent > effectiveLimit;
                        const overage = isOver ? Math.round((item.discountPercent - effectiveLimit) * 10) / 10 : 0;
                        const grossLineTotal = item.quantity * item.unitPrice;
                        const netLineTotal = grossLineTotal * (1 - item.discountPercent / 100);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <div>{item.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                  {item.category}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Cat Limit: {item.categoryCeiling}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                                className="w-14 px-1.5 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                              />
                            </td>
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-right font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.discountPercent}
                                  onChange={(e) => handleUpdateDiscount(idx, parseFloat(e.target.value) || 0)}
                                  className="w-14 px-1.5 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                                />
                                <span className="text-slate-400 font-semibold">%</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="font-extrabold text-slate-800 text-xs">
                                {effectiveLimit}%
                              </div>
                              <div className="text-[9px] text-slate-400 leading-tight">
                                min({item.categoryCeiling}%, {activeTierCeiling}%)
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
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
                            <td className="py-3 px-3 text-right font-bold text-slate-900 text-xs">
                              {currencySymbol}{Math.round(netLineTotal).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Logic Explainer */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <span className="text-amber-600 shrink-0 mt-0.5">⚠️</span>
                <span className="font-medium text-[11px] leading-relaxed">
                  <strong>Effective Line Ceiling</strong> is computed live as <code>min(Customer Tier Ceiling, Category Ceiling)</code>.
                  Any entered discount above this limit produces line overage and directly scales the Blended Risk Score.
                </span>
              </div>
            </div>

            {/* 3. Dedicated Upsell and Cross-Sell Suggestions */}
            {upsellSuggestions.length > 0 && (
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
                      onClick={() => handleAddSuggestion(sug)}
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
                            Margin +{currencySymbol}{sug.marginAmount.toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div>
                          <div className="text-xs font-extrabold text-white font-mono">
                            {currencySymbol}{sug.basePrice.toLocaleString()}
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
          </div>

          {/* RIGHT: Live Economics & Governance Thermometer (4 cols) */}
          <div className="lg:col-span-4 space-y-4 sticky top-24">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Financial Summary &amp; Governance
              </h3>

              {/* Gross Margin & Discount % */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    {currencySymbol}{riskSummary.subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Total Discount:</span>
                  <span className="font-bold text-rose-600">
                    -{currencySymbol}{riskSummary.discountTotal.toLocaleString()} ({riskSummary.totalDiscountPercent.toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Deal Gross Margin:</span>
                  <span className={`font-bold ${riskSummary.grossMarginPercent < 35 ? "text-amber-600" : "text-emerald-600"}`}>
                    {currencySymbol}{riskSummary.grossMargin.toLocaleString()} ({riskSummary.grossMarginPercent}%)
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-800">Net Proposal Total:</span>
                  <span className="font-black text-[#0066cc] text-base">
                    {currencySymbol}{riskSummary.totalOrderValue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 3-Condition Approval Governance Thermometer */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Blended Risk Score:</span>
                  <span
                    className={`font-black text-sm ${riskSummary.blendedScore === 0
                        ? "text-emerald-600"
                        : riskSummary.blendedScore <= 10
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                  >
                    {riskSummary.blendedScore}%
                  </span>
                </div>

                {/* Thermometer Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${riskSummary.blendedScore === 0
                        ? "bg-emerald-500"
                        : riskSummary.blendedScore <= 10
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    style={{ width: `${Math.min(100, Math.max(5, riskSummary.blendedScore * 5))}%` }}
                  />
                </div>

                {/* Condition Classification Badge & Routing Details */}
                <div className="pt-2 border-t border-slate-200">
                  {riskSummary.approvalType === "DUAL_APPROVAL" ? (
                    <div className="text-[11px] font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-start gap-2 shadow-2xs">
                      <AlertTriangle size={15} className="shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <div className="font-black text-rose-800 tracking-tight">{riskSummary.classification.label}</div>
                        <div className="text-[10px] text-rose-600 font-medium">
                          Sequential: 1. Sales Manager &rarr; 2. Finance Ops
                        </div>
                        <p className="text-[10px] text-rose-700/80 font-normal mt-0.5">
                          {riskSummary.classification.description}
                        </p>
                      </div>
                    </div>
                  ) : riskSummary.approvalType === "SALES_MANAGER" ? (
                    <div className="text-[11px] font-bold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2 shadow-2xs">
                      <Clock size={15} className="shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <div className="font-black text-amber-800 tracking-tight">{riskSummary.classification.label}</div>
                        <div className="text-[10px] text-amber-600 font-medium">
                          1 Hop: Assigned Sales Director / Manager Sign-off
                        </div>
                        <p className="text-[10px] text-amber-700/80 font-normal mt-0.5">
                          {riskSummary.classification.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-start gap-2 shadow-2xs">
                      <Check size={15} className="shrink-0 text-emerald-600 mt-0.5" />
                      <div>
                        <div className="font-black text-emerald-800 tracking-tight">{riskSummary.classification.label}</div>
                        <div className="text-[10px] text-emerald-600 font-medium">
                          0 Hops: Instant Direct Approval
                        </div>
                        <p className="text-[10px] text-emerald-700/80 font-normal mt-0.5">
                          {riskSummary.classification.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Actions */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting || items.length === 0}
                  onClick={() => handleSaveQuotation(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || items.length === 0}
                  onClick={() => handleSaveQuotation(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Submit for Approval</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
