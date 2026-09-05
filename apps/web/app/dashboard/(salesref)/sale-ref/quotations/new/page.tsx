"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  User,
  Mail,
  Phone,
  DollarSign,
  Loader2,
  Send,
  Save,
  Package,
  ShieldCheck,
  Check,
} from "lucide-react";
import { SalesNav } from "@repo/ui";
import { useCustomers, useProducts, useCreateQuotation } from "../../../../../../lib/query";
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
  categoryCeiling: number;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { user, signOut } = useDashboardAuth();

  const { data: apiCustomers, isLoading: loadingCustomers } = useCustomers();
  const { data: apiProducts, isLoading: loadingProducts } = useProducts();
  const createQuotationMutation = useCreateQuotation();

  // Mode: select existing customer vs enter new customer
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");

  // Existing customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // New customer form state
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  // Proposal details
  const [quoteTitle, setQuoteTitle] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30 Days");
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0]!;
  });

  // Dynamic Line Items - starts clean (no fake static items)
  const [items, setItems] = useState<LineItemState[]>([]);

  // Selected catalog product to add
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Custom Item Modal state
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCategory, setCustomCategory] = useState("services");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync first customer if available
  useEffect(() => {
    if (apiCustomers && apiCustomers.length > 0) {
      if (!selectedCustomerId) {
        setSelectedCustomerId(apiCustomers[0]!.id);
      }
    } else if (apiCustomers && apiCustomers.length === 0) {
      // If organization has no customers yet, switch to "new" customer mode
      setCustomerMode("new");
    }
  }, [apiCustomers, selectedCustomerId]);

  // Sync default quote title when customer changes
  useEffect(() => {
    if (customerMode === "existing") {
      const selected = apiCustomers?.find((c) => c.id === selectedCustomerId);
      if (selected) {
        setQuoteTitle(`${selected.companyName || selected.name} Commercial Proposal`);
      }
    } else {
      if (companyName || customerName) {
        setQuoteTitle(`${companyName || customerName} Commercial Proposal`);
      }
    }
  }, [customerMode, selectedCustomerId, apiCustomers, companyName, customerName]);

  // Dynamic Risk & Threshold Calculation
  const riskLines: RiskLineItem[] = useMemo(() => {
    return items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountPercent: i.discountPercent,
      categoryCeiling: i.categoryCeiling,
    }));
  }, [items]);

  const riskSummary = useMemo(() => {
    return calculateQuotationRisk(
      riskLines,
      DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
      DEFAULT_BLENDED_DISCOUNT_THRESHOLD
    );
  }, [riskLines]);

  // Handle adding product from organization's real catalog
  const handleAddProduct = () => {
    if (!selectedProductId || !apiProducts) return;
    const prod = apiProducts.find((p) => p.id === selectedProductId);
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
        categoryCeiling: DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
        quantity: 1,
        unitPrice: prod.basePrice,
        costPrice: prod.costPrice,
        discountPercent: 0,
      };
      setItems((prev) => [...prev, newItem]);
    }
    setSelectedProductId("");
  };

  // Add custom deliverable item
  const handleAddCustom = () => {
    if (!customName.trim() || !customPrice) return;
    const price = parseFloat(customPrice) || 0;
    const fallbackProdId = apiProducts?.[0]?.id || "prod-custom";

    const newItem: LineItemState = {
      id: `custom-${Date.now()}`,
      productId: fallbackProdId,
      name: customName.trim(),
      description: "Custom commercial deliverable",
      category: customCategory,
      categoryCeiling: DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
      quantity: 1,
      unitPrice: price,
      costPrice: price * 0.4,
      discountPercent: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setCustomName("");
    setCustomPrice("");
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
      }

      const createdQuote = await createQuotationMutation.mutateAsync(payload);

      // If user clicked "Submit for Approval" directly
      if (submitImmediately && createdQuote?.id) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        await fetch(`${apiUrl}/api/quotations/${createdQuote.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }).catch(() => {});
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
        onSignOut={signOut}
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
              Build a dynamic proposal with real-time category limits, blended threshold scoring, and automated customer provisioning.
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
                  <Building2 size={18} className="text-[#ff5e3a]" />
                  <h2 className="text-sm font-bold text-slate-900">Customer Organization</h2>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    disabled={!apiCustomers || apiCustomers.length === 0}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      customerMode === "existing"
                        ? "bg-white text-[#ff5e3a] font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900 disabled:opacity-50"
                    }`}
                  >
                    Select Existing ({apiCustomers?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("new")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      customerMode === "new"
                        ? "bg-white text-[#ff5e3a] font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    + New Customer
                  </button>
                </div>
              </div>

              {customerMode === "existing" ? (
                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Select Client Account
                  </label>
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
                          {c.companyName || c.name} &ndash; {c.email} ({c.tier?.name || "Standard Tier"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                /* Auto-Provisioning Customer Fields */
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer max-w-[220px]"
                  >
                    <option value="">+ Choose Product...</option>
                    {apiProducts?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.basePrice})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedProductId}
                    className="px-3 py-1.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px]">Product</th>
                      <th className="py-3 px-3 w-20 text-center">Qty</th>
                      <th className="py-3 px-4 w-28 text-right">Price</th>
                      <th className="py-3 px-3 w-24 text-center">Discount</th>
                      <th className="py-3 px-3 w-20 text-center">Limit</th>
                      <th className="py-3 px-4 w-28 text-center">Status</th>
                      <th className="py-3 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          <Package size={24} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No products added yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Select products from your organization's catalog above to start building the quote.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const limit = item.categoryCeiling;
                        const isOver = item.discountPercent > limit;
                        const overage = isOver ? Math.round((item.discountPercent - limit) * 10) / 10 : 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              <div>{item.name}</div>
                              <div className="text-[11px] text-slate-400 font-normal">{item.category}</div>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#ff5e3a]"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-right font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#ff5e3a]"
                              />
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.discountPercent}
                                  onChange={(e) => handleUpdateDiscount(idx, parseFloat(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#ff5e3a]"
                                />
                                <span className="text-slate-400 font-semibold">%</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center text-slate-500 font-medium">
                              {limit}%
                            </td>
                            <td className="py-3.5 px-4 text-center">
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
                            <td className="py-3.5 px-3 text-center">
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

              {/* Yellow Live Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <span className="text-amber-600">⚠️</span>
                <span className="font-medium">
                  Discount is checked against each item's own limit live, as soon as it is entered, not only at submit time.
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live Economics & Submission (4 cols) ── */}
          <div className="lg:col-span-4 space-y-4 sticky top-24">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Financial Summary &amp; Thresholds
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    ₹{riskSummary.subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Discount Amount:</span>
                  <span className="font-bold text-rose-600">
                    -₹{riskSummary.discountTotal.toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-800">Net Contract Total:</span>
                  <span className="font-black text-[#ff5e3a] text-base">
                    ₹{riskSummary.totalOrderValue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Blended Risk Engine Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Blended Risk Score:</span>
                  <span
                    className={`font-black ${
                      riskSummary.isBlendedBreached ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {riskSummary.blendedScore}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Standard Approval Threshold: {DEFAULT_BLENDED_DISCOUNT_THRESHOLD}%
                </div>

                <div className="pt-2 border-t border-slate-200">
                  {riskSummary.requiresApproval ? (
                    <div className="text-[11px] font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>Requires Manager Approval</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <Check size={13} className="shrink-0" />
                      <span>Within Standard Approval Limits</span>
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
      </main>
    </div>
  );
}
