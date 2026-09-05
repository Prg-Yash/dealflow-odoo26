"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Edit2,
  Trash2,
  DollarSign,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  Info,
  ChevronRight,
  ShieldAlert,
  GitBranch,
  Layers3,
  HelpCircle,
} from "lucide-react";
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  usePriceLists,
  useCreatePriceList,
  useUpdatePriceList,
  useDeletePriceList,
  useDiscountRules,
  useCreateDiscountRule,
  useUpdateDiscountRule,
  useDeleteDiscountRule,
  useCreateProductVariant,
  useDeleteProductVariant,
  useCustomerTiers,
  useCreateCustomerTier,
  useUpdateCustomerTier,
  useDeleteCustomerTier,
  type ProductData,
  type CategoryData,
  type PriceListData,
  type DiscountRuleData,
  type CustomerTierData,
} from "../../../../../lib/query";

export default function AdminCatalogPage() {
  // Navigation & Sub-views: "products" (Wireframe 16), "pricelists" ("Manage Price fields"), "categories" (Category Data Entry), "approvals" (Approval Chains)
  const [activeTab, setActiveTab] = useState<"products" | "pricelists" | "categories" | "approvals">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // TanStack Live Query Hooks
  const { data: apiProducts, isLoading: isProductsLoading, refetch: refetchProducts } = useProducts();
  const { data: apiCategories, isLoading: isCategoriesLoading, refetch: refetchCategories } = useCategories();
  const { data: apiCustomerTiers, isLoading: isTiersLoading, refetch: refetchTiers } = useCustomerTiers();
  const { data: apiPriceLists, isLoading: isPriceListsLoading, refetch: refetchPriceLists } = usePriceLists();
  const { data: apiDiscountRules, isLoading: isRulesLoading, refetch: refetchRules } = useDiscountRules();

  // Mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const createPriceListMutation = useCreatePriceList();
  const updatePriceListMutation = useUpdatePriceList();
  const deletePriceListMutation = useDeletePriceList();
  const createTierMutation = useCreateCustomerTier();
  const updateTierMutation = useUpdateCustomerTier();
  const deleteTierMutation = useDeleteCustomerTier();
  const createDiscountRuleMutation = useCreateDiscountRule();
  const updateDiscountRuleMutation = useUpdateDiscountRule();
  const deleteDiscountRuleMutation = useDeleteDiscountRule();
  const createVariantMutation = useCreateProductVariant();
  const deleteVariantMutation = useDeleteProductVariant();

  const productsList: ProductData[] = Array.isArray(apiProducts) ? apiProducts : [];
  const categoriesList: CategoryData[] = Array.isArray(apiCategories) ? apiCategories : [];
  const tiersList: CustomerTierData[] = Array.isArray(apiCustomerTiers) ? apiCustomerTiers : [];
  const priceListsList: PriceListData[] = Array.isArray(apiPriceLists) ? apiPriceLists : [];
  const discountRulesList: DiscountRuleData[] = Array.isArray(apiDiscountRules) ? apiDiscountRules : [];

  // ══════════════════════════════════════════════════════════════════════════
  // WIREFRAME 17: Product Details & Price List Modal / Drawer State
  // ══════════════════════════════════════════════════════════════════════════
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // General Info Form Fields
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formBasePrice, setFormBasePrice] = useState<number>(1200);
  const [formCostPrice, setFormCostPrice] = useState<number>(750);
  const [formUnit, setFormUnit] = useState<string>("Each");
  const [formTaxRate, setFormTaxRate] = useState<number>(15);
  const [formIsSubscription, setFormIsSubscription] = useState<boolean>(false);
  const [formRecurringCadence, setFormRecurringCadence] = useState<string>("Monthly");
  const [formQuantityOnHand, setFormQuantityOnHand] = useState<number>(24);
  const [formDescription, setFormDescription] = useState("");
  const [formIsPromoted, setFormIsPromoted] = useState<boolean>(false);

  // Form Variants State
  interface FormVariantItem {
    id?: string;
    tempId: string;
    attributeName: string;
    attributeValue: string;
    extraPrice: number;
  }
  const [formVariants, setFormVariants] = useState<FormVariantItem[]>([]);
  const [newVariantAttr, setNewVariantAttr] = useState("");
  const [newVariantValue, setNewVariantValue] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState<number | "">("");

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormName, setCatFormName] = useState("");
  const [catFormSlug, setCatFormSlug] = useState("");
  const [catFormType, setCatFormType] = useState<"HARDWARE" | "SERVICE" | "SUBSCRIPTION">("HARDWARE");
  const [catFormCeiling, setCatFormCeiling] = useState<number>(15);
  const [catFormTargetMargin, setCatFormTargetMargin] = useState<number>(35);
  const [catFormDesc, setCatFormDesc] = useState("");

  // Global Price List Modal State
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [editingPriceListId, setEditingPriceListId] = useState<string | null>(null);
  const [priceListName, setPriceListName] = useState("");
  const [priceListCurrency, setPriceListCurrency] = useState("INR");
  const [priceListTierId, setPriceListTierId] = useState("");
  const [priceListIsDefault, setPriceListIsDefault] = useState(false);

  // Approval Threshold Tuning State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleMaxManagerDiscount, setRuleMaxManagerDiscount] = useState<number | "">("");
  const [ruleMaxRiskScore, setRuleMaxRiskScore] = useState<number | "">("");
  const [ruleRequiresManager, setRuleRequiresManager] = useState(true);
  const [ruleRequiresFinance, setRuleRequiresFinance] = useState(false);
  const [ruleEscalation, setRuleEscalation] = useState<"NONE" | "SALES_MANAGER" | "FINANCE" | "SALES_MANAGER_AND_FINANCE">("SALES_MANAGER");
  const [ruleDesc, setRuleDesc] = useState("");

  // Feedback Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchProducts(),
      refetchCategories(),
      refetchTiers(),
      refetchPriceLists(),
      refetchRules(),
    ]);
    showToast("Synchronized catalog, pricelists & rules.");
  };

  // ══════════════════════════════════════════════════════════════════════════
  // METRICS CALCULATIONS (Wireframe 16)
  // ══════════════════════════════════════════════════════════════════════════
  const metrics = useMemo(() => {
    const totalProducts = productsList.length;
    const activeProducts = productsList.filter((p) => p.isActive !== false).length;
    const archivedProducts = totalProducts - activeProducts;

    const tierCount = tiersList.length || 3;
    const currencySet = new Set(priceListsList.map((pl) => pl.currency).concat(["USD", "EUR", "INR"]));
    const currencyCount = currencySet.size;

    const totalVariants = productsList.reduce((acc, p) => acc + (p.variants?.length || 0), 0);
    const totalSkus = totalProducts + totalVariants;

    return {
      activeProducts,
      archivedProducts,
      tierCount,
      currencyCount,
      totalSkus,
    };
  }, [productsList, tiersList, priceListsList]);

  // Filtered Products for Wireframe 16 table
  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q);
      const matchesCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [productsList, searchQuery, selectedCategory]);

  // Open Wireframe 17 Product Details Drawer for NEW Product
  const handleOpenNewProduct = () => {
    setSelectedProduct(null);
    setIsEditingExisting(false);
    setFormName("");
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCategoryId(categoriesList[0]?.id || "");
    setFormBasePrice(1200);
    setFormCostPrice(750);
    setFormUnit("Each");
    setFormTaxRate(15);
    setFormIsSubscription(false);
    setFormRecurringCadence("Monthly");
    setFormQuantityOnHand(24);
    setFormDescription("");
    setFormIsPromoted(false);
    setFormVariants([]);
    setNewVariantAttr("");
    setNewVariantValue("");
    setNewVariantPrice("");
    setIsProductDetailOpen(true);
  };

  // Open Wireframe 17 Product Details Drawer for EXISTING Product
  const handleOpenProductDetail = (p: ProductData) => {
    setSelectedProduct(p);
    setIsEditingExisting(true);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategoryId(p.categoryId);
    setFormBasePrice(p.basePrice);
    setFormCostPrice(p.costPrice || Math.round(p.basePrice * 0.65));
    setFormUnit(p.unit || (p.category?.type === "SUBSCRIPTION" ? "Recurring" : "Each"));
    setFormTaxRate(15);
    const isSub = p.category?.type === "SUBSCRIPTION" || p.unit === "MONTH" || p.unit === "YEAR";
    setFormIsSubscription(isSub);
    setFormRecurringCadence("Monthly");
    setFormQuantityOnHand(p.stockOnHand ?? 36);
    setFormDescription(p.description || "");
    setFormIsPromoted(p.isPromoted || false);

    const loadedVariants: FormVariantItem[] = (p.variants || []).map((v) => ({
      id: v.id,
      tempId: v.id,
      attributeName: v.attributeName || v.name || "Attribute",
      attributeValue: v.attributeValue || v.sku || "Value",
      extraPrice: v.extraPrice ?? v.priceDelta ?? 0,
    }));
    setFormVariants(loadedVariants);
    setNewVariantAttr("");
    setNewVariantValue("");
    setNewVariantPrice("");
    setIsProductDetailOpen(true);
  };

  // Save / Submit Wireframe 17 Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) {
      showToast("Product name and SKU are required.");
      return;
    }

    const catId = formCategoryId || categoriesList[0]?.id;
    if (!catId) {
      showToast("Please select or create a category first.");
      return;
    }

    try {
      if (isEditingExisting && selectedProduct) {
        await updateProductMutation.mutateAsync({
          id: selectedProduct.id,
          body: {
            name: formName.trim(),
            sku: formSku.trim().toUpperCase(),
            basePrice: Number(formBasePrice),
            costPrice: Number(formCostPrice),
            unit: formIsSubscription ? "MONTH" : formUnit,
            description: formDescription.trim() || undefined,
            categoryId: catId,
            isPromoted: formIsPromoted,
          },
        });
        showToast(`Product ${formName} updated successfully!`);
      } else {
        const createdProduct = await createProductMutation.mutateAsync({
          name: formName.trim(),
          sku: formSku.trim().toUpperCase(),
          basePrice: Number(formBasePrice),
          costPrice: Number(formCostPrice),
          unit: formIsSubscription ? "MONTH" : formUnit,
          description: formDescription.trim() || undefined,
          categoryId: catId,
          isPromoted: formIsPromoted,
        });

        // Persist any variants created in the modal for this new product
        if (formVariants.length > 0 && createdProduct?.id) {
          for (const v of formVariants) {
            try {
              await createVariantMutation.mutateAsync({
                productId: createdProduct.id,
                body: {
                  attributeName: v.attributeName,
                  attributeValue: v.attributeValue,
                  extraPrice: v.extraPrice,
                  sku: `${createdProduct.sku}-${v.attributeValue.toUpperCase().replace(/\s+/g, "-")}`,
                },
              });
            } catch (err) {
              console.error("Variant creation error:", err);
            }
          }
        }
        showToast(
          `Created new product ${formName} (${formSku.toUpperCase()})${
            formVariants.length > 0 ? ` with ${formVariants.length} variants` : ""
          }!`
        );
      }
      setIsProductDetailOpen(false);
      await refetchProducts();
    } catch (err: any) {
      showToast(`Save failed: ${err?.message || "Check fields and retry"}`);
    }
  };

  // Handle Add Variant to Product (Realtime for existing, in-memory for new)
  const handleAddVariant = async () => {
    if (!newVariantAttr.trim() || !newVariantValue.trim()) {
      showToast("Attribute name and value are required (e.g. RAM: 16GB).");
      return;
    }

    const price = newVariantPrice === "" ? 0 : Number(newVariantPrice);

    if (isEditingExisting && selectedProduct) {
      try {
        const createdVariant = await createVariantMutation.mutateAsync({
          productId: selectedProduct.id,
          body: {
            attributeName: newVariantAttr.trim(),
            attributeValue: newVariantValue.trim(),
            extraPrice: price,
            sku: `${selectedProduct.sku}-${newVariantValue.trim().toUpperCase().replace(/\s+/g, "-")}`,
          },
        });
        setFormVariants((prev) => [
          ...prev,
          {
            id: createdVariant.id,
            tempId: createdVariant.id,
            attributeName: createdVariant.attributeName || newVariantAttr.trim(),
            attributeValue: createdVariant.attributeValue || newVariantValue.trim(),
            extraPrice: createdVariant.extraPrice ?? price,
          },
        ]);
        showToast(`Added variant "${newVariantAttr}: ${newVariantValue}"!`);
        setNewVariantAttr("");
        setNewVariantValue("");
        setNewVariantPrice("");
        await refetchProducts();
      } catch (err: any) {
        showToast(`Error adding variant: ${err?.message}`);
      }
    } else {
      const newVar: FormVariantItem = {
        tempId: `temp-${Date.now()}-${Math.random()}`,
        attributeName: newVariantAttr.trim(),
        attributeValue: newVariantValue.trim(),
        extraPrice: price,
      };
      setFormVariants((prev) => [...prev, newVar]);
      showToast(`Added variant "${newVariantAttr}: ${newVariantValue}".`);
      setNewVariantAttr("");
      setNewVariantValue("");
      setNewVariantPrice("");
    }
  };

  // Handle Delete Variant
  const handleDeleteVariant = async (variantItem: FormVariantItem) => {
    if (variantItem.id && selectedProduct) {
      try {
        await deleteVariantMutation.mutateAsync({
          productId: selectedProduct.id,
          variantId: variantItem.id,
        });
        showToast("Variant removed.");
        await refetchProducts();
      } catch (err: any) {
        showToast(`Error removing variant: ${err?.message}`);
      }
    } else {
      showToast("Variant removed.");
    }
    setFormVariants((prev) =>
      prev.filter((v) => v.tempId !== variantItem.tempId && v.id !== variantItem.id)
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORY PROPER DATA ENTRY HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenNewCategory = () => {
    setEditingCatId(null);
    setCatFormName("");
    setCatFormSlug("");
    setCatFormType("HARDWARE");
    setCatFormCeiling(15);
    setCatFormTargetMargin(35);
    setCatFormDesc("");
    setIsCatModalOpen(true);
  };

  const handleEditCategory = (cat: CategoryData) => {
    setEditingCatId(cat.id);
    setCatFormName(cat.name);
    setCatFormSlug(cat.slug);
    setCatFormType(cat.type);
    setCatFormCeiling(cat.type === "HARDWARE" ? 15 : cat.type === "SERVICE" ? 10 : 12);
    setCatFormTargetMargin(cat.type === "HARDWARE" ? 35 : cat.type === "SERVICE" ? 60 : 85);
    setCatFormDesc(cat.description || "");
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim()) {
      showToast("Category name is required.");
      return;
    }
    const slug = catFormSlug.trim().toLowerCase() || catFormName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");

    try {
      if (editingCatId) {
        await updateCategoryMutation.mutateAsync({
          id: editingCatId,
          body: {
            name: catFormName.trim(),
            slug,
            type: catFormType,
            description: catFormDesc.trim() || undefined,
            discountCeiling: Number(catFormCeiling),
            targetMargin: Number(catFormTargetMargin),
          },
        });
        showToast(`Category "${catFormName}" updated!`);
      } else {
        await createCategoryMutation.mutateAsync({
          name: catFormName.trim(),
          slug,
          type: catFormType,
          description: catFormDesc.trim() || undefined,
        });
        showToast(`New category "${catFormName}" created with ${catFormCeiling}% discount ceiling!`);
      }
      setIsCatModalOpen(false);
      await refetchCategories();
    } catch (err: any) {
      showToast(`Category save error: ${err?.message}`);
    }
  };

  const handleDeleteCat = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await deleteCategoryMutation.mutateAsync(id);
      showToast(`Category "${name}" deleted.`);
      await refetchCategories();
    } catch (err: any) {
      showToast(`Delete failed: ${err?.message}`);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // GLOBAL PRICELIST & CUSTOMER TIER HANDLERS (FULL CRUD)
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenNewPriceList = () => {
    setEditingPriceListId(null);
    setPriceListName("");
    setPriceListCurrency("INR");
    setPriceListTierId(tiersList[0]?.id || "");
    setPriceListIsDefault(false);
    setIsPriceListModalOpen(true);
  };

  const handleEditPriceList = (pl: PriceListData) => {
    setEditingPriceListId(pl.id);
    setPriceListName(pl.name);
    setPriceListCurrency(pl.currency || "INR");
    setPriceListTierId(pl.customerTierId || "");
    setPriceListIsDefault(Boolean(pl.isDefault));
    setIsPriceListModalOpen(true);
  };

  const handleSavePriceList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceListName.trim()) {
      showToast("Price list name is required.");
      return;
    }
    try {
      if (editingPriceListId) {
        await updatePriceListMutation.mutateAsync({
          id: editingPriceListId,
          body: {
            name: priceListName.trim(),
            currency: priceListCurrency,
            customerTierId: priceListTierId ? priceListTierId : null,
            isDefault: priceListIsDefault,
          },
        });
        showToast(`Price List "${priceListName}" updated successfully!`);
      } else {
        await createPriceListMutation.mutateAsync({
          name: priceListName.trim(),
          currency: priceListCurrency,
          customerTierId: priceListTierId ? priceListTierId : undefined,
          isDefault: priceListIsDefault,
        });
        showToast(`Price List "${priceListName}" created successfully!`);
      }
      setIsPriceListModalOpen(false);
      setEditingPriceListId(null);
      setPriceListName("");
      await refetchPriceLists();
    } catch (err: any) {
      showToast(`Price List save error: ${err?.message}`);
    }
  };

  const handleDeletePriceList = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete price list "${name}"?`)) return;
    try {
      await deletePriceListMutation.mutateAsync(id);
      showToast(`Deleted price list "${name}".`);
      await refetchPriceLists();
    } catch (err: any) {
      showToast(`Delete failed: ${err?.message}`);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // APPROVAL CHAINS & BLENDED RISK RULES HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleSaveDiscountRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      showToast("Rule name is required.");
      return;
    }
    const maxDiscount = ruleMaxManagerDiscount === "" ? 15 : Number(ruleMaxManagerDiscount);
    const maxRisk = ruleMaxRiskScore === "" ? 10 : Number(ruleMaxRiskScore);
    const reqManager = ruleEscalation !== "NONE";
    const reqFinance = ruleEscalation === "SALES_MANAGER_AND_FINANCE" || (ruleEscalation as string) === "FINANCE";

    try {
      if (editingRuleId) {
        await updateDiscountRuleMutation.mutateAsync({
          id: editingRuleId,
          body: {
            name: ruleName.trim(),
            minDiscountPercent: 0,
            maxDiscountPercent: maxDiscount,
            minBlendedRiskScore: 0,
            maxBlendedRiskScore: maxRisk,
            requiresManagerApproval: reqManager,
            requiresFinanceApproval: reqFinance,
            escalationLevel: ruleEscalation,
            description: ruleDesc.trim() || undefined,
          },
        });
        showToast(`Approval chain rule "${ruleName}" updated!`);
      } else {
        await createDiscountRuleMutation.mutateAsync({
          name: ruleName.trim(),
          minDiscountPercent: 0,
          maxDiscountPercent: maxDiscount,
          minBlendedRiskScore: 0,
          maxBlendedRiskScore: maxRisk,
          requiresManagerApproval: reqManager,
          requiresFinanceApproval: reqFinance,
          escalationLevel: ruleEscalation,
          description: ruleDesc.trim() || undefined,
        });
        showToast(`New approval chain rule "${ruleName}" created!`);
      }
      setIsRuleModalOpen(false);
      setEditingRuleId(null);
      setRuleName("");
      setRuleMaxManagerDiscount("");
      setRuleMaxRiskScore("");
      setRuleDesc("");
      await refetchRules();
    } catch (err: any) {
      showToast(`Rule save error: ${err?.message || "Failed to save rule"}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-16">
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* ── HEADER (Matching Wireframe 16) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Product catalog
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Every product, variant and price list in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenNewProduct}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold transition shadow-sm active:translate-y-0.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>+ New Product</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === "pricelists" ? "products" : "pricelists")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                activeTab === "pricelists"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <DollarSign size={14} />
              <span>Manage Price fields</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === "categories" ? "products" : "categories")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                activeTab === "categories"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <FolderPlus size={14} />
              <span>Categories &amp; Ceilings</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === "approvals" ? "products" : "approvals")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                activeTab === "approvals"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <GitBranch size={14} />
              <span>Approval Chains</span>
            </button>

            <button
              onClick={handleRefreshAll}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* ── METRICS CARDS (Matching Wireframe 16) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Products */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Products</span>
              <Boxes size={16} className="text-[#3b82f6]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {productsList.length} Total
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {metrics.activeProducts} active, {metrics.archivedProducts} archived
              </p>
            </div>
          </div>

          {/* Card 2: Pricelists */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Pricelists</span>
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {priceListsList.length || 3} Lists Configured
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {metrics.tierCount} tiers (Bronze, Gold, Platinum), {metrics.currencyCount} Currencies
              </p>
            </div>
          </div>

          {/* Card 3: Variants */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Variants</span>
              <Layers size={16} className="text-amber-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {metrics.totalSkus} Active SKUs
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Dimensional attributes (RAM, Size, Color) across all products
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 1: PRODUCT CATALOG TABLE (Wireframe 16)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "products" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6] transition"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Categories ({productsList.length})
                </button>
                {categoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-[#3b82f6] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table (Wireframe 16) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-[#f8fafc] border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Product name</th>
                      <th className="py-3.5 px-4 font-bold">Category</th>
                      <th className="py-3.5 px-4 font-bold">Variants</th>
                      <th className="py-3.5 px-4 font-bold">Price</th>
                      <th className="py-3.5 px-4 font-bold">Unit</th>
                      <th className="py-3.5 px-4 font-bold">Tax</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {isProductsLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw size={20} className="animate-spin mx-auto text-[#3b82f6] mb-2" />
                          <span>Loading product catalog...</span>
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No products found matching your search. Click <strong>+ New Product</strong> to create one.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isSub = p.category?.type === "SUBSCRIPTION" || p.unit === "MONTH";
                        const variantCount = p.variants?.length || 0;
                        const variantText =
                          variantCount > 0
                            ? `${variantCount} (${p.variants?.[0]?.attributeName?.toLowerCase() || "attrs"})`
                            : "—";

                        return (
                          <tr
                            key={p.id}
                            onClick={() => handleOpenProductDetail(p)}
                            className="hover:bg-blue-50/50 cursor-pointer transition group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <span className="font-bold text-slate-900 group-hover:text-[#3b82f6] transition-colors block">
                                    {p.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                                </div>
                                {p.isPromoted && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold">
                                    ★ Upsell
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                {p.category?.name || "General"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-mono">
                              {variantText}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {isSub ? `$${p.basePrice}/mo` : `$${p.basePrice.toLocaleString()}`}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {isSub ? "Recurring" : p.unit || "Each"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {isSub ? "0%" : "15%"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Active</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Wireframe Banner Note */}
              <div className="bg-amber-50/80 border-t border-amber-200/80 p-3.5 text-center text-xs text-amber-900 font-medium">
                Click a product row to open general info, variants and tier/currency price lists.
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 2: UNIFIED PRICE LISTS & TIER SCHEDULES ("Manage Price fields")
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "pricelists" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Global Customer Tier Price Lists</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure multi-currency rate cards (USD, EUR, INR) and customer discount limits (Bronze 5%, Silver 10%, Gold 15%, Platinum 20%).
                </p>
              </div>
              <button
                onClick={handleOpenNewPriceList}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition shrink-0"
              >
                <Plus size={14} />
                <span>+ Add Price List</span>
              </button>
            </div>

            {/* Quick Context Helper for Presentation / Demo */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
              <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-950">How it works:</span>
                <p className="text-emerald-800 text-[11px]">
                  Each <strong>Price List</strong> sets the quotation <strong>Currency</strong> (USD, EUR, INR) and links to a <strong>Customer Tier</strong> to enforce maximum discount limits before requiring manager approval.
                </p>
              </div>
            </div>

            {/* Dynamic Database Price Lists Grid */}
            {isPriceListsLoading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Loading price lists from database...</span>
              </div>
            ) : priceListsList.length === 0 ? (
              <div className="p-8 bg-[#f8fafc] border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                <DollarSign size={28} className="mx-auto text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800">No Price Lists Configured Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Create customer tier price schedules to automate pricing rules (e.g. Bronze 0%, Silver 5%, Gold 10%) across currencies.
                </p>
                <button
                  onClick={handleOpenNewPriceList}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>+ Create First Price List</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {priceListsList.map((pl) => {
                  const tierName = pl.customerTier?.name || (pl.name.toLowerCase().includes("gold") ? "Gold Strategic Tier" : pl.name.toLowerCase().includes("silver") ? "Silver Growth Partner" : pl.name.toLowerCase().includes("platinum") ? "Platinum Enterprise" : "Bronze Standard");
                  const ceiling = pl.customerTier?.discountCeiling ?? (pl.name.toLowerCase().includes("gold") ? 15 : pl.name.toLowerCase().includes("silver") ? 10 : pl.name.toLowerCase().includes("platinum") ? 20 : 5);
                  const isGold = pl.name.toLowerCase().includes("gold") || pl.customerTier?.code === "GOLD";
                  const isSilver = pl.name.toLowerCase().includes("silver") || pl.customerTier?.code === "SILVER";
                  const isPlat = pl.name.toLowerCase().includes("platinum") || pl.customerTier?.code === "PLATINUM";

                  return (
                    <div
                      key={pl.id}
                      className={`border rounded-2xl p-5 space-y-3.5 relative group transition ${
                        isGold
                          ? "bg-amber-50/50 border-amber-200"
                          : isSilver
                            ? "bg-blue-50/50 border-blue-200"
                            : isPlat
                              ? "bg-purple-50/50 border-purple-200"
                              : "bg-[#f8fafc] border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{pl.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                          {pl.currency}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Customer Tier:</span>
                          <span className="font-bold text-slate-800">{tierName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Discount Limit:</span>
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            Up to {ceiling}% max
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Base Rule:</span>
                          <span className="font-semibold text-slate-700">
                            {ceiling === 0 ? "List Price, no adjustment" : `Base minus ${ceiling}% schedule`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {pl.isDefault ? "★ Default Catalog List" : "Tier-Specific"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditPriceList(pl)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                            title="Edit Price List"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePriceList(pl.id, pl.name)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Price List"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 3: CATEGORIES & CEILINGS WITH PROPER DATA ENTRY
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "categories" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Product Categories &amp; Discount Ceilings</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define category-specific maximum discount limits and target gross margins used in blended risk detection.
                </p>
              </div>
              <button
                onClick={handleOpenNewCategory}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriesList.map((cat) => {
                const ceiling = cat.discountCeiling ?? (cat.type === "HARDWARE" ? 15 : cat.type === "SERVICE" ? 10 : 12);
                const targetMargin = cat.targetMargin ?? (cat.type === "HARDWARE" ? 35 : cat.type === "SERVICE" ? 60 : 85);

                return (
                  <div key={cat.id} className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-5 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          cat.type === "HARDWARE"
                            ? "bg-blue-100 text-blue-800"
                            : cat.type === "SERVICE"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {cat.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {cat.description || "Core catalog category governed by margin risk controls."}
                    </p>

                    <div className="pt-2 border-t border-slate-200/70 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Discount Ceiling:</span>
                        <span className="font-bold text-orange-600">{ceiling}% max</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Target Margin:</span>
                        <span className="font-bold text-emerald-600">{targetMargin}% benchmark</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleEditCategory(cat)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60"
                        title="Edit Category"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCat(cat.id, cat.name)}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-100/60"
                        title="Delete Category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 4: APPROVAL CHAINS & BLENDED RISK RULES (PDF SPEC)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "approvals" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Discount Approval Chains &amp; Risk Thresholds</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure automated routing: Condition 1 (Auto-Approve), Condition 2 (Sales Manager), and Condition 3 (Sales Manager + Finance).
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingRuleId(null);
                  setRuleName("");
                  setRuleMaxManagerDiscount("");
                  setRuleMaxRiskScore("");
                  setRuleRequiresManager(true);
                  setRuleRequiresFinance(false);
                  setRuleEscalation("SALES_MANAGER");
                  setRuleDesc("");
                  setIsRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Add Approval Rule</span>
              </button>
            </div>

            {/* Visual Diagram of 3 Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Condition 1 */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Condition 1: 0 Hops (Direct Approval)</span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">Blended Risk Score = 0%</p>
                  <p className="text-[11px] text-slate-500">
                    All quote line item discounts are within customer tier &amp; category ceilings.
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-700 pt-1">
                    ✓ Immediate transition to APPROVED &amp; fulfillment upon quote confirmation.
                  </p>
                </div>
              </div>

              {/* Condition 2 */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <Clock size={16} className="text-amber-600" />
                  <span>Condition 2: 1 Hop (Sales Manager)</span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">0% &lt; Risk Score &le; 10%</p>
                  <p className="text-[11px] text-slate-500">
                    Quote discount moderately exceeds standard discount ceiling.
                  </p>
                  <p className="text-[11px] font-semibold text-amber-800 pt-1">
                    ⚠ Routes exclusively to assigned Sales Manager for authorization.
                  </p>
                </div>
              </div>

              {/* Condition 3 */}
              <div className="bg-red-50/70 border border-red-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                  <ShieldAlert size={16} className="text-red-600" />
                  <span>Condition 3: 2 Hops (Manager + Finance)</span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">Risk Score &gt; 10% (High Risk)</p>
                  <p className="text-[11px] text-slate-500">
                    Severe margin erosion or heavy multi-line discount stacking.
                  </p>
                  <p className="text-[11px] font-semibold text-red-800 pt-1">
                    ⚡ Sequential: Requires Sales Manager approval, THEN Finance sign-off.
                  </p>
                </div>
              </div>
            </div>

            {/* List of active rules */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configured Rule Matrix</h3>
                <span className="text-[11px] text-slate-400 font-medium">{discountRulesList.length} rule(s) configured</span>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-2xs">
                {discountRulesList.length === 0 ? (
                  <div className="p-6 bg-white text-center text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600">No custom approval rules configured yet.</p>
                    <p className="text-[11px]">Default system approval matrix is currently governing all quotations.</p>
                  </div>
                ) : (
                  discountRulesList.map((rule) => {
                    const escalationBadge =
                      rule.escalationLevel === "NONE"
                        ? { label: "0 Hops (Direct Approval)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                        : rule.escalationLevel === "SALES_MANAGER_AND_FINANCE"
                        ? { label: "2 Hops (Manager + Finance)", color: "bg-red-50 text-red-700 border-red-200" }
                        : { label: "1 Hop (Sales Manager)", color: "bg-amber-50 text-amber-700 border-amber-200" };

                    return (
                      <div key={rule.id} className="p-4 bg-white hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${escalationBadge.color}`}>
                              {escalationBadge.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs">
                            <span>
                              Max Discount: <strong className="text-orange-600">{rule.maxDiscountPercent ?? rule.maxDiscount ?? 0}%</strong>
                            </span>
                            <span>
                              Max Blended Risk: <strong className="text-slate-800">{rule.maxBlendedRiskScore ?? rule.maxRiskScore ?? 0}</strong>
                            </span>
                            {rule.description && (
                              <span className="text-slate-400 italic font-normal">"{rule.description}"</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingRuleId(rule.id);
                              setRuleName(rule.name);
                              setRuleMaxManagerDiscount(rule.maxDiscountPercent ?? rule.maxDiscount ?? 15);
                              setRuleMaxRiskScore(rule.maxBlendedRiskScore ?? rule.maxRiskScore ?? 10);
                              setRuleRequiresManager(rule.requiresManagerApproval ?? (rule.escalationLevel !== "NONE"));
                              setRuleRequiresFinance(rule.requiresFinanceApproval ?? (rule.escalationLevel === "SALES_MANAGER_AND_FINANCE"));
                              setRuleEscalation((rule.escalationLevel as any) || "SALES_MANAGER");
                              setRuleDesc(rule.description || "");
                              setIsRuleModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Rule"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete rule "${rule.name}"?`)) {
                                try {
                                  await deleteDiscountRuleMutation.mutateAsync(rule.id);
                                  showToast(`Deleted rule "${rule.name}"`);
                                  await refetchRules();
                                } catch (err: any) {
                                  showToast(`Delete failed: ${err?.message}`);
                                }
                              }
                            }}
                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          WIREFRAME 17: PRODUCT AND PRICELIST DETAILS MODAL / DRAWER
      ══════════════════════════════════════════════════════════════════════ */}
      {isProductDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header (Sticky at top) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Product and pricelist
                </h2>
                <p className="text-xs text-slate-500">
                  {isEditingExisting ? `Configure SKU ${formSku}` : "Add new catalog product with variants & tier pricing"}
                </p>
              </div>
              <button
                onClick={() => setIsProductDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 overflow-hidden min-h-0 text-left">
              
              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* ── GENERAL INFO SECTION (Matching Wireframe 17) ── */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-5 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">General Info</span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Product name <span className="text-[#3b82f6]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g. Laptop Pro 14"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Category <span className="text-[#3b82f6]">*</span>
                        </label>
                        <select
                          value={formCategoryId}
                          onChange={(e) => {
                            setFormCategoryId(e.target.value);
                            const cat = categoriesList.find((c) => c.id === e.target.value);
                            if (cat?.type === "SUBSCRIPTION") {
                              setFormIsSubscription(true);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                        >
                          {categoriesList.map((c) => {
                            const ceiling = c.discountCeiling ?? (c.type === "HARDWARE" ? 15 : c.type === "SERVICE" ? 10 : 12);
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name} — {ceiling}% max discount ({c.type})
                              </option>
                            );
                          })}
                        </select>

                        {/* Selected Category discount % & margin badge */}
                        {(() => {
                          const currentCat = categoriesList.find((c) => c.id === formCategoryId) || categoriesList[0];
                          if (!currentCat) return null;
                          const ceiling = currentCat.discountCeiling ?? (currentCat.type === "HARDWARE" ? 15 : currentCat.type === "SERVICE" ? 10 : 12);
                          const targetMargin = currentCat.targetMargin ?? (currentCat.type === "HARDWARE" ? 35 : currentCat.type === "SERVICE" ? 60 : 85);
                          return (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1.5 mt-1">
                              <Tag size={11} className="text-[#3b82f6] shrink-0" />
                              <span>
                                Category Rules: <strong className="text-orange-600 font-bold">{ceiling}% max discount ceiling</strong>
                                {targetMargin ? ` • ${targetMargin}% target margin` : ""}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Price (₹) <span className="text-[#3b82f6]">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min={0}
                            value={formBasePrice}
                            onChange={(e) => setFormBasePrice(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={formUnit}
                            onChange={(e) => setFormUnit(e.target.value)}
                            placeholder="Each, Hour, Pack"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Detailed technical specifications..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Tax %
                        </label>
                        <input
                          type="number"
                          value={formTaxRate}
                          onChange={(e) => setFormTaxRate(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                        />
                      </div>

                      {/* Subscription YES / NO toggle (Wireframe 17) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Subscription
                          </label>
                          <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setFormIsSubscription(true)}
                              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                                formIsSubscription ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                              }`}
                            >
                              YES
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormIsSubscription(false)}
                              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                                !formIsSubscription ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                              }`}
                            >
                              NO
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          If subscription yes then recurring frequency will be visible.
                        </p>
                      </div>

                      {/* Recurring Frequency (Visible when Subscription is YES) */}
                      {formIsSubscription && (
                        <div className="space-y-1 animate-in fade-in duration-200">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#3b82f6]">
                            Recurring Frequency
                          </label>
                          <select
                            value={formRecurringCadence}
                            onChange={(e) => setFormRecurringCadence(e.target.value)}
                            className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold text-blue-900 outline-none"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Yearly">Yearly</option>
                            <option value="Weekly">Weekly</option>
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Quantity on hand (Integer field)
                        </label>
                        <input
                          type="number"
                          value={formQuantityOnHand}
                          onChange={(e) => setFormQuantityOnHand(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PRODUCT VARIANTS TABLE (Matching Wireframe 17) ── */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Product Variants
                    </span>
                    {formVariants.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {formVariants.length} {formVariants.length === 1 ? "variant configured" : "variants configured"}
                      </span>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Attribute</th>
                          <th className="py-2.5 px-3">Values</th>
                          <th className="py-2.5 px-3">Extra price</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {formVariants.length > 0 ? (
                          formVariants.map((v) => (
                            <tr key={v.tempId || v.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-900">{v.attributeName}</td>
                              <td className="py-2.5 px-3 text-slate-600">{v.attributeValue}</td>
                              <td className="py-2.5 px-3 font-semibold text-emerald-600">
                                {v.extraPrice > 0 ? `+₹${v.extraPrice.toLocaleString()}` : "₹0"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(v)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer"
                                  title="Remove Variant"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 px-3 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <Layers size={18} className="text-slate-300" />
                                <p className="text-xs font-medium text-slate-500">No variants configured for this product.</p>
                                <p className="text-[11px] text-slate-400">Use the fields below to add attributes (e.g. Color: Blue, RAM: 16GB).</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Inline Add Variant Controls */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      + Add Variant Attribute
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Attribute (e.g. Color, RAM, Size)"
                        value={newVariantAttr}
                        onChange={(e) => setNewVariantAttr(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-[#3b82f6]"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Blue, 16GB, XL)"
                        value={newVariantValue}
                        onChange={(e) => setNewVariantValue(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-[#3b82f6]"
                      />
                      <input
                        type="number"
                        placeholder="Extra Price (₹)"
                        min={0}
                        value={newVariantPrice}
                        onChange={(e) => setNewVariantPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full sm:w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-[#3b82f6]"
                      />
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus size={13} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── PRICELISTS TABLE (Matching Wireframe 17) ── */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Pricelists</span>
                    {priceListsList.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {priceListsList.length} Active {priceListsList.length === 1 ? "Price List" : "Price Lists"}
                      </span>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Price List / Tier</th>
                          <th className="py-2.5 px-3">Currency</th>
                          <th className="py-2.5 px-3">Price Rule</th>
                          <th className="py-2.5 px-3 text-right">Effective Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {priceListsList.length > 0 ? (
                          priceListsList.map((pl) => {
                            const discount =
                              pl.customerTier?.discountCeiling ??
                              (pl.name.toLowerCase().includes("gold")
                                ? 15
                                : pl.name.toLowerCase().includes("silver")
                                  ? 10
                                  : pl.name.toLowerCase().includes("platinum")
                                    ? 20
                                    : 5);

                            const currencySymbol =
                              pl.currency === "USD" ? "$" : pl.currency === "EUR" ? "€" : "₹";
                            const effectiveRate = Math.round(formBasePrice * (1 - discount / 100));

                            const ruleDesc =
                              discount === 0
                                ? "List Price, no adjustment"
                                : `Base minus ${discount}% schedule`;

                            return (
                              <tr key={pl.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900">{pl.name}</span>
                                    {pl.customerTier?.name && (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Tier: {pl.customerTier.name}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                                    {pl.currency || "INR"}
                                  </span>
                                </td>
                                <td
                                  className={`py-2.5 px-3 font-semibold ${
                                    discount >= 15
                                      ? "text-purple-600"
                                      : discount >= 10
                                        ? "text-[#ff5e3a]"
                                        : discount > 0
                                          ? "text-blue-600"
                                          : "text-slate-600"
                                  }`}
                                >
                                  {ruleDesc}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                                  {currencySymbol}
                                  {effectiveRate.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 px-3 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <DollarSign size={18} className="text-slate-300" />
                                <p className="text-xs font-medium text-slate-500">
                                  No price lists configured yet.
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Configure price lists in "Manage Price fields" to calculate customer rates automatically.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── NOTE BANNER (Matching Wireframe 17) ── */}
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 font-medium space-y-1">
                  <p>Product details should be filled.</p>
                  <p>Recurring order with this product will be invoiced at the beginning of the period.</p>
                </div>

              </div>

              {/* Modal Actions (Sticky at bottom) */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
                {isEditingExisting && selectedProduct ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Delete product ${formName}?`)) {
                        await deleteProductMutation.mutateAsync(selectedProduct.id);
                        showToast(`Deleted ${formName}`);
                        setIsProductDetailOpen(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                  >
                    Delete Product
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductDetailOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    {isEditingExisting ? "Update Product" : "Save Product"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CATEGORY CREATION / EDIT MODAL (WITH PROPER DATA ENTRY)
      ══════════════════════════════════════════════════════════════════════ */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCatId ? "Edit Category & Ceilings" : "Add New Category"}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Category Name <span className="text-[#3b82f6]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder="e.g. Hardware, Managed Services, SaaS"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Category Type
                  </label>
                  <select
                    value={catFormType}
                    onChange={(e: any) => setCatFormType(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="HARDWARE">HARDWARE</option>
                    <option value="SERVICE">SERVICE</option>
                    <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Discount Ceiling (%)
                  </label>
                  <input
                    type="number"
                    value={catFormCeiling}
                    onChange={(e) => setCatFormCeiling(Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Target Gross Margin (%)
                </label>
                <input
                  type="number"
                  value={catFormTargetMargin}
                  onChange={(e) => setCatFormTargetMargin(Number(e.target.value))}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value)}
                  placeholder="Category governance notes..."
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PRICE LIST MODAL (CREATE & EDIT)
      ══════════════════════════════════════════════════════════════════════ */}
      {isPriceListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPriceListId ? "Edit Global Price List" : "Create Global Price List"}
              </h3>
              <button onClick={() => setIsPriceListModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePriceList} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Price List Name <span className="text-[#3b82f6]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={priceListName}
                  onChange={(e) => setPriceListName(e.target.value)}
                  placeholder="e.g. Gold Tier INR Schedule"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Currency</label>
                  <select
                    value={priceListCurrency}
                    onChange={(e) => setPriceListCurrency(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Customer Tier</label>
                  <select
                    value={priceListTierId}
                    onChange={(e) => setPriceListTierId(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">Standard (All Tiers)</option>
                    {tiersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Max {t.discountCeiling}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="priceListDefaultCheck"
                  checked={priceListIsDefault}
                  onChange={(e) => setPriceListIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="priceListDefaultCheck" className="text-xs text-slate-700 font-medium select-none">
                  Set as default fallback catalog price list
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingPriceListId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete price list "${priceListName}"?`)) {
                        handleDeletePriceList(editingPriceListId, priceListName);
                        setIsPriceListModalOpen(false);
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                  >
                    Delete
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPriceListModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {editingPriceListId ? "Update Price List" : "Create Price List"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          APPROVAL CHAIN THRESHOLD MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingRuleId ? "Edit Approval Chain Rule" : "Configure Approval Chain"}
              </h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDiscountRule} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Discretion Limit or Tier Escalation"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Max Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 15"
                    value={ruleMaxManagerDiscount}
                    onChange={(e) => setRuleMaxManagerDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#ff5e3a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Max Risk Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 10"
                    value={ruleMaxRiskScore}
                    onChange={(e) => setRuleMaxRiskScore(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Escalation Routing</label>
                <select
                  value={ruleEscalation}
                  onChange={(e: any) => setRuleEscalation(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#ff5e3a]"
                >
                  <option value="NONE">Condition 1: 0 Hops — Auto Approved</option>
                  <option value="SALES_MANAGER">Condition 2: 1 Hop — Sales Manager Only</option>
                  <option value="SALES_MANAGER_AND_FINANCE">Condition 3: 2 Hops — Sales Manager then Finance</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Description / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional governance rationale or boundary note..."
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none resize-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingRuleId ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Delete approval rule "${ruleName}"?`)) {
                        try {
                          await deleteDiscountRuleMutation.mutateAsync(editingRuleId);
                          showToast(`Rule deleted`);
                          setIsRuleModalOpen(false);
                          setEditingRuleId(null);
                          await refetchRules();
                        } catch (err: any) {
                          showToast(`Delete failed: ${err?.message}`);
                        }
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1.5 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  >
                    Delete Rule
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRuleModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {editingRuleId ? "Update Rule" : "Save Chain Rule"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
