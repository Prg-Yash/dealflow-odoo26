"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Sparkles,
  X,
  AlertCircle,
  FolderPlus,
  RefreshCw,
  Layers,
  Zap,
  Boxes,
  Clock,
  ExternalLink,
  Tag,
  CheckCircle2,
  ShieldCheck,
  Percent,
  Check,
} from "lucide-react";
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useCreateCategory,
  useCustomerTiers,
  type ProductData,
  type CategoryData,
} from "../../../../../lib/query";

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "pricelists">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Live TanStack Query Hooks
  const {
    data: apiProducts,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useProducts();
  const {
    data: apiCategories,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useCategories();
  const {
    data: apiCustomerTiers,
    isLoading: isTiersLoading,
    refetch: refetchTiers,
  } = useCustomerTiers();

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const createCategoryMutation = useCreateCategory();

  const productsList: ProductData[] = Array.isArray(apiProducts) ? apiProducts : [];
  const categoriesList: CategoryData[] = Array.isArray(apiCategories) ? apiCategories : [];
  const tiersList = Array.isArray(apiCustomerTiers) ? apiCustomerTiers : [];

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductCatId, setNewProductCatId] = useState("");
  const [newProductBasePrice, setNewProductBasePrice] = useState<number>(1000);
  const [newProductCostPrice, setNewProductCostPrice] = useState<number>(600);
  const [newProductUnit, setNewProductUnit] = useState<string>("UNIT");
  const [newProductIsPromoted, setNewProductIsPromoted] = useState(false);
  const [newProductDesc, setNewProductDesc] = useState("");
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Add Category Modal State
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatType, setNewCatType] = useState<"HARDWARE" | "SERVICE" | "SUBSCRIPTION">("HARDWARE");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Ensure default category is selected when categories arrive
  useEffect(() => {
    const firstCat = categoriesList[0];
    if (firstCat && !newProductCatId) {
      setNewProductCatId(firstCat.id);
    }
  }, [categoriesList, newProductCatId]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchProducts(), refetchCategories(), refetchTiers()]);
    showToast("Catalog synchronized with database.");
  };

  // Filter products
  const filteredProducts = productsList.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query);
    const matchesCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate live margin preview for new product
  const calculatedMargin =
    newProductBasePrice > 0
      ? Math.max(0, ((newProductBasePrice - newProductCostPrice) / newProductBasePrice) * 100)
      : 0;

  const handleTogglePromoted = async (product: ProductData) => {
    const updated = !product.isPromoted;
    try {
      await updateProductMutation.mutateAsync({
        id: product.id,
        body: { isPromoted: updated },
      });
      showToast(`Updated promotion status for ${product.sku} to ${updated ? "Promoted ★" : "Standard"}`);
    } catch (err: any) {
      showToast(`Error updating promotion: ${err?.message || "Failed to update"}`);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductSku.trim()) {
      showToast("Product name and SKU are required.");
      return;
    }

    const catId = newProductCatId || categoriesList[0]?.id;
    if (!catId) {
      showToast("Please select or create a category first.");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      await createProductMutation.mutateAsync({
        name: newProductName.trim(),
        sku: newProductSku.trim().toUpperCase(),
        description: newProductDesc.trim() || undefined,
        basePrice: Number(newProductBasePrice),
        costPrice: Number(newProductCostPrice),
        unit: newProductUnit,
        categoryId: catId,
        isPromoted: newProductIsPromoted,
      });

      showToast(`Successfully created SKU ${newProductSku.toUpperCase()}!`);
      setIsAddModalOpen(false);

      // Reset form
      setNewProductName("");
      setNewProductSku("");
      setNewProductDesc("");
      setNewProductBasePrice(1000);
      setNewProductCostPrice(600);
      setNewProductIsPromoted(false);
      await refetchProducts();
    } catch (err: any) {
      showToast(`Failed to create product: ${err?.message || "Network error"}`);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast("Category name is required.");
      return;
    }

    const slug =
      newCatSlug.trim().toLowerCase() ||
      newCatName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");

    setIsSubmittingCat(true);
    try {
      await createCategoryMutation.mutateAsync({
        name: newCatName.trim(),
        slug,
        type: newCatType,
        description: newCatDesc.trim() || undefined,
      });

      showToast(`Category "${newCatName}" created successfully!`);
      setIsAddCatModalOpen(false);
      setNewCatName("");
      setNewCatSlug("");
      setNewCatDesc("");
      await refetchCategories();
    } catch (err: any) {
      showToast(`Failed to create category: ${err?.message || "Error"}`);
    } finally {
      setIsSubmittingCat(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/dashboard/admin" className="hover:text-slate-900">
              Admin Console
            </Link>
            <span>/</span>
            <span className="text-[#ff5e3a]">Catalog &amp; Pricing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Product Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sellable items, commercial margin baselines, product taxonomy, and customer price tier schedules.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Synchronize database"
          >
            <RefreshCw size={15} className={isProductsLoading || isCategoriesLoading ? "animate-spin text-[#ff5e3a]" : ""} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddCatModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <FolderPlus size={14} />
            <span>New Category</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add New Product</span>
          </button>
        </div>
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
          Categories &amp; Taxonomies ({categoriesList.length})
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
          Customer Tiers &amp; Schedules ({tiersList.length})
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
                All Categories ({productsList.length})
              </button>
              {categoriesList.map((c) => {
                const count = productsList.filter((p) => p.categoryId === c.id).length;
                return (
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
                    {c.name} ({count})
                  </button>
                );
              })}
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
                    <th className="py-3.5 text-right">Selling Price</th>
                    <th className="py-3.5 text-right">Unit Cost</th>
                    <th className="py-3.5 text-right">Gross Margin</th>
                    <th className="py-3.5 text-center">Unit</th>
                    <th className="py-3.5 text-center">Promoted Add-on</th>
                    <th className="py-3.5 text-center">Status</th>
                    <th className="py-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isProductsLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={16} className="animate-spin text-[#ff5e3a]" />
                          <span>Loading product catalog from database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No products match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const cost = p.costPrice ?? 0;
                      const sell = p.basePrice ?? 0;
                      const profit = sell - cost;
                      const margin = sell > 0 ? (profit / sell) * 100 : 0;
                      const marginColor =
                        margin >= 50
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : margin >= 25
                          ? "text-sky-700 bg-sky-50 border-sky-200"
                          : "text-amber-700 bg-amber-50 border-amber-200";

                      const categoryName = p.category?.name || categoriesList.find((c) => c.id === p.categoryId)?.name || "General";
                      const categoryType = p.category?.type || categoriesList.find((c) => c.id === p.categoryId)?.type || "HARDWARE";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 pl-5">
                            <Link
                              href={`/dashboard/admin/inventory?productId=${p.id}`}
                              className="font-bold text-slate-900 hover:text-[#ff5e3a] transition flex items-center gap-1"
                            >
                              <span>{p.name}</span>
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-400 font-semibold">{p.sku}</span>
                              {p.variants && p.variants.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-500 font-medium">
                                  {p.variants.length} variants
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                              {categoryName} ({categoryType})
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-extrabold text-slate-900">
                            ₹{sell.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-500">
                            ₹{cost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${marginColor}`}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 text-center font-mono text-[11px] text-slate-500">
                            {p.unitType || p.unit || "UNIT"}
                          </td>
                          <td className="py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePromoted(p)}
                              disabled={updateProductMutation.isPending}
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
                          <td className="py-3.5 text-center">
                            {p.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>Archived</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-5 text-right">
                            <Link
                              href={`/dashboard/admin/inventory?productId=${p.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#ff5e3a] hover:bg-orange-50 transition border border-slate-200 hover:border-orange-200"
                            >
                              <span>Stock &amp; Ledger</span>
                              <ExternalLink size={11} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Showing {filteredProducts.length} of {productsList.length} catalog items
              </span>
              <span className="text-[11px] text-slate-400">Synced directly with Database</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES & TAXONOMIES */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Category Governance Ceilings:</span> Classification rules govern
              how discounts escalate across Hardware, Services, and recurring SaaS Subscriptions.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {isCategoriesLoading ? (
              <div className="col-span-3 p-12 text-center text-slate-400">
                <RefreshCw size={16} className="animate-spin text-[#ff5e3a] mx-auto mb-2" />
                <span>Loading categories...</span>
              </div>
            ) : categoriesList.length > 0 ? (
              categoriesList.map((cat) => {
                const count = productsList.filter((p) => p.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                          {cat.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {count} SKUs
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 mt-1">{cat.name}</h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {cat.description || "Active catalog classification"}
                      </p>

                      <div className="mt-5 space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Classification Type:</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {cat.type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Taxonomy Slug:</span>
                          <span className="font-mono text-slate-600 text-xs">
                            {cat.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>ID: {cat.id.slice(0, 8)}...</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-500">
                <span>No product categories created yet. Click "New Category" to add one.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER TIERS & PRICE SCHEDULES */}
      {activeTab === "pricelists" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 text-xs text-sky-900 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Customer Tier Schedules:</span> Default discount ceilings and margin
              thresholds dynamically applied to customer quotes according to their assigned organization tier.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isTiersLoading ? (
              <div className="col-span-4 p-12 text-center text-slate-400">
                <RefreshCw size={16} className="animate-spin text-[#ff5e3a] mx-auto mb-2" />
                <span>Loading customer tier schedules...</span>
              </div>
            ) : tiersList.length > 0 ? (
              tiersList.map((tier) => (
                <div
                  key={tier.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                        {tier.code}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">ACTIVE TIER</span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900">{tier.name}</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {tier.description || "Organization commercial pricing schedule."}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Max Discount Ceiling:</span>
                        <span className="font-mono font-extrabold text-[#ff5e3a] text-sm">
                          {tier.discountCeiling}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Applied to assigned buyers</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-4 p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-500">
                <span>No customer tiers configured yet.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
                    onChange={(e) => {
                      setNewProductName(e.target.value);
                      if (!newProductSku) {
                        setNewProductSku(
                          e.target.value.replace(/[^a-zA-Z0-9]/g, "-").toUpperCase().slice(0, 12)
                        );
                      }
                    }}
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
                    onChange={(e) => setNewProductSku(e.target.value.toUpperCase())}
                    placeholder="e.g. HW-SEC-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Classification *</label>
                  <select
                    value={newProductCatId}
                    onChange={(e) => setNewProductCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] bg-white"
                  >
                    {categoriesList.map((c) => (
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
                    onChange={(e) => setNewProductUnit(e.target.value)}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Base Price (₹) *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Cost Price (₹) *</label>
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
                    Profit: ₹{(newProductBasePrice - newProductCostPrice).toFixed(2)} / unit
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
                  disabled={isSubmittingProduct}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct ? "Creating Product..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD CATEGORY */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center font-bold">
                  <FolderPlus size={16} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Create Catalog Category</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCatModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Networking"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (!newCatSlug) {
                      setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Classification Type *</label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] bg-white"
                >
                  <option value="HARDWARE">Physical Hardware (Tracked in Depots)</option>
                  <option value="SUBSCRIPTION">SaaS Subscription (Cloud Licensing)</option>
                  <option value="SERVICE">Professional Services (Consulting &amp; Labor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Slug</label>
                <input
                  type="text"
                  placeholder="e.g. enterprise-networking"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description for quotation and catalog classification..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCat}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCat ? "Creating Category..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
