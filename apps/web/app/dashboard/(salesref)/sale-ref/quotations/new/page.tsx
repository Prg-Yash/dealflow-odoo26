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
  Sparkles,
  Info,
  TrendingUp,
  Zap,
  Plus,
} from "lucide-react";
import { SalesNav } from "@repo/ui";
import {
  useCustomers,
  useCustomerTiers,
  useProducts,
  useCategories,
  useCreateQuotation,
  useProductRecommendations,
} from "../../../../../../lib/query";
import { useDashboardAuth } from "../../../../layout";
import {
  calculateQuotationRisk,
  DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
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
  const { user } = useDashboardAuth();

  // Dynamic Data Queries
  const { data: apiCustomers, isLoading: loadingCustomers } = useCustomers();
  const { data: apiCustomerTiers, isLoading: loadingTiers } = useCustomerTiers();
  const { data: apiProducts, isLoading: loadingProducts } = useProducts();
  const { data: apiCategories } = useCategories();
  const { data: apiRecommendations } = useProductRecommendations();
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

  const activeCustomerTierCeiling = activeCustomerTier?.discountCeiling ?? 10.0;

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
      customerTierCeiling: activeCustomerTierCeiling,
    }));
  }, [items, activeCustomerTierCeiling]);

  const riskSummary = useMemo(() => {
    return calculateQuotationRisk(
      riskLines,
      DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
      activeCustomerTierCeiling
    );
  }, [riskLines, activeCustomerTierCeiling]);

  // Live upsell & cross-sell recommendation candidates for current items
  const upsellSuggestions = useMemo(() => {
    if (!items || items.length === 0 || !apiProducts) return [];
    const currentProductIds = new Set(items.map((i) => i.productId));

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
        if (margin < rec.minMarginThreshold) return null; // Enforce margin floor
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

    // 2. If no direct pairings, surface high-margin services/accessories not yet in quote
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
  }, [items, apiProducts, apiRecommendations]);

  const handleAddSuggestion = (sug: any) => {
    const prod = apiProducts?.find((p) => p.id === sug.productId);
    if (!prod) return;

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
        categoryCeiling: (prod.category as any)?.ceilingLimit ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
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

    // Find dynamic category discount ceiling
    const catCeiling = (prod.category as any)?.discountCeiling ?? 15.0;

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

      router.push(`/dashboard/sale-ref/quotations/${createdQuote.id}`);
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
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
      {/* Role-Aware Navigation Header */}
      <SalesNav
        activeTab="new-quote"
        userName={user?.name || "Sales Representative"}
        userInitials={userInitials}
        roleLabel={user?.role === "SALES_REP" ? "Sales Representative" : user?.role || "Sales Rep"}
        linkComponent={Link}
      />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 text-left">
        {/* Header Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-medium">
              <Link
                href="/dashboard/sale-ref/quotations"
                className="hover:text-[#0066cc] transition-colors flex items-center gap-1"
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
              href="/dashboard/sale-ref/quotations"
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* ── MEASURERS DASHBOARD: Live Organization Inputs Header ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Measurer 1: Customer Tier (WHO) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] border border-blue-100 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Customer Tier (WHO)</span>
              <div className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                <span>{activeCustomerTier?.name || "Standard Tier"}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0066cc] text-[10px] font-extrabold">
                  {activeCustomerTierCeiling}% Max Limit
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
          {/* ── LEFT & CENTER: Customer & Items Configuration (8 cols) ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Customer Selection Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-[#0066cc]" />
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
                      <Loader2 size={14} className="animate-spin text-[#0066cc]" />
                      <span>Loading organization customers...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
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
                    <ShieldCheck size={14} className="text-[#0066cc] shrink-0" />
                    <span>
                      If customer does not have an account, DealFlow 360 will automatically create a portal user and assign this quotation.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Customer Email <span className="text-[#0066cc]">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="procurement@client.com"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs text-slate-900 outline-none font-medium"
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
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs text-slate-900 outline-none font-medium"
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
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs text-slate-900 outline-none font-medium"
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
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs text-slate-900 outline-none font-medium"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs text-slate-900 font-medium outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0066cc] rounded-xl text-xs text-slate-900 font-medium outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Quotation Products Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-[#0066cc]" />
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
                    className="px-3.5 py-1.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
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
                        const effectiveLimit = Math.min(activeCustomerTierCeiling, item.categoryCeiling);
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
                                min({item.categoryCeiling}%, {activeCustomerTierCeiling}%)
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

            {/* 3. Upsell & Cross-Sell Suggestions */}
            {upsellSuggestions.length > 0 && (
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
                        AI &amp; Margin-governed add-ons to lift deal size and strengthen blended margin.
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
                          onClick={() => handleAddSuggestion(sug)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
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
          </div>

          {/* ── RIGHT: Live Economics & Governance Thermometer (4 cols) ── */}
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
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] font-semibold space-y-1 ${riskSummary.classification.color === "emerald"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : riskSummary.classification.color === "amber"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {riskSummary.classification.color === "emerald" ? (
                        <Check size={14} className="shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle size={14} className="shrink-0" />
                      )}
                      <span>{riskSummary.classification.label}</span>
                    </div>
                    <p className="text-[10px] opacity-90 font-normal leading-relaxed">
                      {riskSummary.classification.description}
                    </p>
                  </div>
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
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-[#0066cc]/25 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Submit for Approval</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
