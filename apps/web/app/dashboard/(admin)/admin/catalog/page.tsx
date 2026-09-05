"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";
import {
  MOCK_ADMIN_CATEGORIES,
  MOCK_ADMIN_PRODUCTS,
  MOCK_ADMIN_PRICE_LISTS,
  type AdminProduct,
  type AdminCategory,
  type AdminPriceList,
  type AdminUnitType,
} from "../../../../../lib/admin-data";

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "pricelists">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [productsList, setProductsList] = useState<AdminProduct[]>(MOCK_ADMIN_PRODUCTS);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductCatId, setNewProductCatId] = useState(MOCK_ADMIN_CATEGORIES[0]?.id || "cat-hardware");
  const [newProductBasePrice, setNewProductBasePrice] = useState<number>(1000);
  const [newProductCostPrice, setNewProductCostPrice] = useState<number>(600);
  const [newProductUnit, setNewProductUnit] = useState<AdminUnitType>("UNIT");
  const [newProductIsPromoted, setNewProductIsPromoted] = useState(false);
  const [newProductDesc, setNewProductDesc] = useState("");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter products
  const filteredProducts = productsList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate live margin preview for new product
  const calculatedMargin =
    newProductBasePrice > 0
      ? Math.max(0, ((newProductBasePrice - newProductCostPrice) / newProductBasePrice) * 100)
      : 0;

  const handleTogglePromoted = (productId: string) => {
    setProductsList((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updated = !p.isPromoted;
          showToast(`Updated promotion status for ${p.sku} to ${updated ? "Promoted" : "Standard"}`);
          return { ...p, isPromoted: updated };
        }
        return p;
      })
    );
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductSku.trim()) return;

    const cat = MOCK_ADMIN_CATEGORIES.find((c: AdminCategory) => c.id === newProductCatId) ?? MOCK_ADMIN_CATEGORIES[0]!;
    const newProduct: AdminProduct = {
      id: `prod-${Date.now()}`,
      name: newProductName.trim(),
      sku: newProductSku.trim().toUpperCase(),
      description: newProductDesc.trim() || "",
      categoryId: cat.id,
      categoryName: cat.name,
      categoryType: cat.type,
      basePrice: Number(newProductBasePrice),
      costPrice: Number(newProductCostPrice),
      unit: newProductUnit,
      taxRate: cat.type === "HARDWARE" ? 0.08 : 0.0,
      isPromoted: newProductIsPromoted,
      isActive: true,
      stockOnHand: cat.type === "HARDWARE" ? 25 : 999,
      stockReserved: 0,
    };

    setProductsList([newProduct, ...productsList]);
    setIsAddModalOpen(false);
    showToast(`Successfully created product ${newProduct.sku} (${newProduct.name})`);

    // Reset form
    setNewProductName("");
    setNewProductSku("");
    setNewProductDesc("");
    setNewProductBasePrice(1000);
    setNewProductCostPrice(600);
    setNewProductIsPromoted(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <Sparkles size={14} className="text-[#ff5e3a]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/dashboard/admin" className="hover:text-slate-900">Admin Console</Link>
            <span>/</span>
            <span className="text-[#ff5e3a]">Catalog &amp; Pricing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Product Catalog &amp; Pricing Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage sellable SKUs, live margin baselines, category ceilings, and upsell promotion priorities.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition cursor-pointer"
        >
          <Plus size={15} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Segmented View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "products"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Products &amp; SKUs ({productsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "categories"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Categories &amp; Ceilings ({MOCK_ADMIN_CATEGORIES.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pricelists")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "pricelists"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Customer Price Lists ({MOCK_ADMIN_PRICE_LISTS.length})
        </button>
      </div>

      {/* TAB 1: PRODUCTS TABLE */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by SKU or name..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#ff5e3a] focus:ring-1 focus:ring-[#ff5e3a]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-[#ff5e3a] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                All Categories
              </button>
              {MOCK_ADMIN_CATEGORIES.map((c: AdminCategory) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === c.id
                      ? "bg-[#ff5e3a] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Products Table */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 pl-5">SKU &amp; Product Name</th>
                    <th className="py-3.5">Category</th>
                    <th className="py-3.5 text-right">Base Price</th>
                    <th className="py-3.5 text-right">Unit Cost</th>
                    <th className="py-3.5 text-right">Gross Margin</th>
                    <th className="py-3.5 text-center">Unit</th>
                    <th className="py-3.5 text-center">Promoted Add-on</th>
                    <th className="py-3.5 pr-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    const margin = p.basePrice > 0 ? ((p.basePrice - p.costPrice) / p.basePrice) * 100 : 0;
                    const marginColor =
                      margin >= 60
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : margin >= 35
                        ? "text-sky-700 bg-sky-50 border-sky-200"
                        : "text-amber-700 bg-amber-50 border-amber-200";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 pl-5">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-400">{p.sku}</span>
                            {p.variants && p.variants.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-500 font-medium">
                                {p.variants.length} variants
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                            {p.categoryType}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-extrabold text-slate-900">
                          ${p.basePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 text-right font-mono text-slate-500">
                          ${p.costPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${marginColor}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-mono text-[11px] text-slate-500">
                          {p.unit}
                        </td>
                        <td className="py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePromoted(p.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                              p.isPromoted
                                ? "bg-orange-50 text-[#ff5e3a] border border-orange-200 font-bold"
                                : "text-slate-400 hover:text-slate-600 bg-slate-100"
                            }`}
                            title="Toggle priority in CPQ upsell recommendation engine"
                          >
                            {p.isPromoted ? "★ Promoted" : "Standard"}
                          </button>
                        </td>
                        <td className="py-3.5 pr-5 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Showing {filteredProducts.length} of {productsList.length} catalog items</span>
              <span className="font-mono text-[11px] text-slate-400">Prisma Model: Product</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES & CEILINGS */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Category Discount Ceilings:</span> Quotation line items that exceed
              their category ceiling (e.g. Hardware &gt; 15%) trigger mandatory manager escalation, regardless
              of the overall quotation average.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MOCK_ADMIN_CATEGORIES.map((cat: AdminCategory) => (
              <div
                key={cat.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                      {cat.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{cat.productCount} SKUs</span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 mt-1">{cat.name}</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.description}</p>

                  <div className="mt-5 space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Max Discount Ceiling:</span>
                      <span className="font-mono font-extrabold text-[#ff5e3a] text-sm">
                        {cat.discountCeiling}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Target Gross Margin:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {cat.targetMargin}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Slug: {cat.slug}</span>
                  <span className="text-slate-500 font-semibold">Governance Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRICE LISTS */}
      {activeTab === "pricelists" && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tier-Specific Price Schedules</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Contracts and custom price lists linked to Customer Tiers (`PriceList` &amp; `PriceListItem`)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 pl-5">Schedule Name</th>
                  <th className="py-3.5">Customer Tier</th>
                  <th className="py-3.5">Currency</th>
                  <th className="py-3.5">Items</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 pr-5 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {MOCK_ADMIN_PRICE_LISTS.map((pl: AdminPriceList) => (
                  <tr key={pl.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-5 font-bold text-slate-900">{pl.name}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px]">
                        {pl.tierName}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-600">{pl.currency}</td>
                    <td className="py-3.5 font-medium text-slate-600">{pl.itemCount} SKUs</td>
                    <td className="py-3.5">
                      {pl.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                          Default Master
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          Custom Tier
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-5 text-right font-mono text-slate-400">{pl.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center font-bold">
                  <Plus size={16} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Add New Product to Catalog</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-5 space-y-4">
              {/* Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g. NextGen Security Firewall"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    placeholder="e.g. HW-SEC-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Type *</label>
                  <select
                    value={newProductCatId}
                    onChange={(e) => setNewProductCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] bg-white"
                  >
                    {MOCK_ADMIN_CATEGORIES.map((c: AdminCategory) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing Unit *</label>
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value as AdminUnitType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] bg-white"
                  >
                    <option value="UNIT">UNIT (Physical Item)</option>
                    <option value="HOUR">HOUR (Consulting)</option>
                    <option value="PROJECT">PROJECT (Fixed Scope)</option>
                    <option value="USER_MONTH">USER_MONTH (SaaS Seat)</option>
                    <option value="MONTH">MONTH (Recurring)</option>
                    <option value="YEAR">YEAR (Contract SLA)</option>
                    <option value="PACK">PACK (Bulk Bundle)</option>
                  </select>
                </div>
              </div>

              {/* Pricing & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Base Price ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newProductBasePrice}
                    onChange={(e) => setNewProductBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Cost Price ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newProductCostPrice}
                    onChange={(e) => setNewProductCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              {/* Live Gross Margin Calculation Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Calculated Gross Margin:</span>
                  <span className="text-[11px] text-slate-500">
                    Profit: ${(newProductBasePrice - newProductCostPrice).toFixed(2)} / unit
                  </span>
                </div>
                <span
                  className={`text-sm font-extrabold px-2.5 py-1 rounded-full border ${
                    calculatedMargin >= 50
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {calculatedMargin.toFixed(1)}%
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  placeholder="Key technical specifications, warranty, or scope details..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              {/* Upsell Checkbox */}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newProductIsPromoted}
                  onChange={(e) => setNewProductIsPromoted(e.target.checked)}
                  className="w-4 h-4 rounded text-[#ff5e3a] focus:ring-[#ff5e3a]"
                />
                <span>Prioritize in live CPQ upsell recommendation engine (`isPromoted`)</span>
              </label>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 cursor-pointer"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
