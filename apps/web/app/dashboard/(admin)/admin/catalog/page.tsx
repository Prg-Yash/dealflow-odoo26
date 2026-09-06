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
  Award,
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
  useProductRecommendations,
  useCreateProductRecommendation,
  useUpdateProductRecommendation,
  useDeleteProductRecommendation,
  type ProductData,
  type CategoryData,
  type PriceListData,
  type DiscountRuleData,
  type CustomerTierData,
  type ProductRecommendationData,
} from "../../../../../lib/query";

export default function AdminCatalogPage() {
  // Navigation & Sub-views: "products", "pricelists", "tiers", "categories", "approvals", "recommendations"
  const [activeTab, setActiveTab] = useState<"products" | "pricelists" | "tiers" | "categories" | "approvals" | "recommendations">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // TanStack Live Query Hooks
  const { data: apiProducts, isLoading: isProductsLoading, refetch: refetchProducts } = useProducts();
  const { data: apiCategories, isLoading: isCategoriesLoading, refetch: refetchCategories } = useCategories();
  const { data: apiCustomerTiers, isLoading: isTiersLoading, refetch: refetchTiers } = useCustomerTiers();
  const { data: apiPriceLists, isLoading: isPriceListsLoading, refetch: refetchPriceLists } = usePriceLists();
  const { data: apiDiscountRules, isLoading: isRulesLoading, refetch: refetchRules } = useDiscountRules();
  const { data: apiRecommendations, isLoading: isRecommendationsLoading, refetch: refetchRecommendations } = useProductRecommendations();

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
  const createRecMutation = useCreateProductRecommendation();
  const updateRecMutation = useUpdateProductRecommendation();
  const deleteRecMutation = useDeleteProductRecommendation();

  const productsList: ProductData[] = Array.isArray(apiProducts) ? apiProducts : [];
  const categoriesList: CategoryData[] = Array.isArray(apiCategories) ? apiCategories : [];
  const tiersList: CustomerTierData[] = Array.isArray(apiCustomerTiers) ? apiCustomerTiers : [];
  const priceListsList: PriceListData[] = Array.isArray(apiPriceLists) ? apiPriceLists : [];
  const discountRulesList: DiscountRuleData[] = Array.isArray(apiDiscountRules) ? apiDiscountRules : [];
  const recommendationsList: ProductRecommendationData[] = Array.isArray(apiRecommendations) ? apiRecommendations : [];

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

  // Customer Tier Modal State
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierFormName, setTierFormName] = useState("");
  const [tierFormCode, setTierFormCode] = useState("");
  const [tierFormCeiling, setTierFormCeiling] = useState<number>(10);
  const [tierFormDesc, setTierFormDesc] = useState("");

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
  const [priceListTierIds, setPriceListTierIds] = useState<string[]>([]);
  const [priceListIsDefault, setPriceListIsDefault] = useState(false);

  // Recommendations & Upsell Pairing Modal State
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [recSourceProductId, setRecSourceProductId] = useState("");
  const [recTargetProductId, setRecTargetProductId] = useState("");
  const [recCoPurchaseScore, setRecCoPurchaseScore] = useState<number>(8.5);
  const [recPromotionalTag, setRecPromotionalTag] = useState("Frequently Bought Together");
  const [recMinMarginThreshold, setRecMinMarginThreshold] = useState<number>(20);
  const [recIsActive, setRecIsActive] = useState(true);

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
      refetchRecommendations(),
    ]);
    showToast("Synchronized catalog, pricelists, rules & recommendations.");
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
    const productsWithVariants = productsList.filter((p) => (p.variants?.length || 0) > 0).length;
    const totalSkus = totalProducts + totalVariants;

    return {
      totalProducts,
      activeProducts,
      archivedProducts,
      tierCount,
      currencyCount,
      totalVariants,
      productsWithVariants,
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

        // Persist any uncommitted variants for existing product
        const uncommitted = formVariants.filter((v) => !v.id || v.id.startsWith("temp-"));
        for (const v of uncommitted) {
          try {
            await createVariantMutation.mutateAsync({
              productId: selectedProduct.id,
              body: {
                attributeName: v.attributeName,
                attributeValue: v.attributeValue,
                extraPrice: v.extraPrice,
                sku: `${selectedProduct.sku}-${v.attributeValue.toUpperCase().replace(/\s+/g, "-")}`,
              },
            });
          } catch (err) {
            console.error("Variant creation error:", err);
          }
        }

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
  // CUSTOMER TIER FULL DYNAMIC CRUD HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenNewTier = () => {
    setEditingTierId(null);
    setTierFormName("");
    setTierFormCode("");
    setTierFormCeiling(10);
    setTierFormDesc("");
    setIsTierModalOpen(true);
  };

  const handleEditTier = (tier: CustomerTierData) => {
    setEditingTierId(tier.id);
    setTierFormName(tier.name);
    setTierFormCode(tier.code);
    setTierFormCeiling(tier.discountCeiling);
    setTierFormDesc(tier.description || "");
    setIsTierModalOpen(true);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierFormName.trim()) {
      showToast("Tier name is required.");
      return;
    }
    const code =
      tierFormCode.trim().toUpperCase() ||
      tierFormName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10);

    try {
      if (editingTierId) {
        await updateTierMutation.mutateAsync({
          id: editingTierId,
          body: {
            name: tierFormName.trim(),
            code,
            discountCeiling: Number(tierFormCeiling),
            description: tierFormDesc.trim() || undefined,
          },
        });
        showToast(`Customer Tier "${tierFormName}" updated successfully!`);
      } else {
        await createTierMutation.mutateAsync({
          name: tierFormName.trim(),
          code,
          discountCeiling: Number(tierFormCeiling),
          description: tierFormDesc.trim() || undefined,
        });
        showToast(`New Customer Tier "${tierFormName}" created with ${tierFormCeiling}% discount limit!`);
      }
      setIsTierModalOpen(false);
      setEditingTierId(null);
      await refetchTiers();
      await refetchPriceLists();
    } catch (err: any) {
      showToast(`Tier save error: ${err?.message || "Failed to save tier"}`);
    }
  };

  const handleDeleteTier = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Customer Tier "${name}"?`)) return;
    try {
      await deleteTierMutation.mutateAsync(id);
      showToast(`Customer Tier "${name}" deleted.`);
      await refetchTiers();
      await refetchPriceLists();
    } catch (err: any) {
      showToast(`Delete failed: ${err?.message}`);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // GLOBAL PRICELIST & CUSTOMER TIER HANDLERS (MULTI-TIER SUPPORT)
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenNewPriceList = () => {
    setEditingPriceListId(null);
    setPriceListName("");
    setPriceListCurrency("INR");
    setPriceListTierIds(tiersList.map((t) => t.id)); // Default select all tiers
    setPriceListIsDefault(false);
    setIsPriceListModalOpen(true);
  };

  const handleEditPriceList = (pl: PriceListData) => {
    setEditingPriceListId(pl.id);
    setPriceListName(pl.name);
    setPriceListCurrency(pl.currency || "INR");
    const attachedIds = pl.customerTiers?.map((t) => t.id) ?? (pl.customerTierId ? [pl.customerTierId] : []);
    setPriceListTierIds(attachedIds);
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
            customerTierIds: priceListTierIds,
            customerTierId: priceListTierIds[0] || null,
            isDefault: priceListIsDefault,
          },
        });
        showToast(`Price List "${priceListName}" updated with ${priceListTierIds.length} assigned tier(s)!`);
      } else {
        await createPriceListMutation.mutateAsync({
          name: priceListName.trim(),
          currency: priceListCurrency,
          customerTierIds: priceListTierIds,
          customerTierId: priceListTierIds[0] || undefined,
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
  // UPSELL & CROSS-SELL RECOMMENDATION PAIRING HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenNewRec = () => {
    setEditingRecId(null);
    setRecSourceProductId(productsList[0]?.id || "");
    setRecTargetProductId(productsList[1]?.id || productsList[0]?.id || "");
    setRecCoPurchaseScore(8.5);
    setRecPromotionalTag("Frequently Bought Together");
    setRecMinMarginThreshold(20);
    setRecIsActive(true);
    setIsRecModalOpen(true);
  };

  const handleEditRec = (rec: ProductRecommendationData) => {
    setEditingRecId(rec.id);
    setRecSourceProductId(rec.sourceProductId);
    setRecTargetProductId(rec.recommendedProductId);
    setRecCoPurchaseScore(rec.coPurchaseScore);
    setRecPromotionalTag(rec.promotionalTag || "Frequently Bought Together");
    setRecMinMarginThreshold(rec.minMarginThreshold);
    setRecIsActive(rec.isActive);
    setIsRecModalOpen(true);
  };

  const handleSaveRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recSourceProductId || !recTargetProductId) {
      showToast("Please select both source and recommended target products.");
      return;
    }
    if (recSourceProductId === recTargetProductId) {
      showToast("Source and recommended products must be different.");
      return;
    }

    try {
      if (editingRecId) {
        await updateRecMutation.mutateAsync({
          id: editingRecId,
          body: {
            sourceProductId: recSourceProductId,
            recommendedProductId: recTargetProductId,
            coPurchaseScore: Number(recCoPurchaseScore) || 1.0,
            promotionalTag: recPromotionalTag.trim() || null,
            minMarginThreshold: Number(recMinMarginThreshold) || 20.0,
            isActive: recIsActive,
          },
        });
        showToast("Recommendation pairing rule updated!");
      } else {
        await createRecMutation.mutateAsync({
          sourceProductId: recSourceProductId,
          recommendedProductId: recTargetProductId,
          coPurchaseScore: Number(recCoPurchaseScore) || 1.0,
          promotionalTag: recPromotionalTag.trim() || undefined,
          minMarginThreshold: Number(recMinMarginThreshold) || 20.0,
          isActive: recIsActive,
        });
        showToast("Product pairing recommendation created!");
      }
      setIsRecModalOpen(false);
      setEditingRecId(null);
      await refetchRecommendations();
    } catch (err: any) {
      showToast(`Recommendation error: ${err?.message || "Failed to save rule"}`);
    }
  };

  const handleDeleteRec = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recommendation pairing rule?")) return;
    try {
      await deleteRecMutation.mutateAsync(id);
      showToast("Recommendation rule deleted.");
      await refetchRecommendations();
    } catch (err: any) {
      showToast(`Delete failed: ${err?.message}`);
    }
  };

  // Smart Auto-Pairing Generator for Demo / Admin Ease
  const handleGenerateSmartPairings = async () => {
    if (productsList.length < 2) {
      showToast("Need at least 2 catalog products to generate smart pairing rules.");
      return;
    }

    let createdCount = 0;
    try {
      const hardwareProds = productsList.filter(
        (p) => p.category?.type === "HARDWARE" || p.name.toLowerCase().includes("laptop") || p.name.toLowerCase().includes("server") || p.name.toLowerCase().includes("switch")
      );
      const serviceProds = productsList.filter(
        (p) => p.category?.type === "SERVICE" || p.name.toLowerCase().includes("warranty") || p.name.toLowerCase().includes("support") || p.name.toLowerCase().includes("sla")
      );
      const accessoryProds = productsList.filter(
        (p) => p.name.toLowerCase().includes("dock") || p.name.toLowerCase().includes("monitor") || p.name.toLowerCase().includes("cable") || p.name.toLowerCase().includes("adapter")
      );

      // 1. Pair each Hardware with Service Warranty
      for (const hw of hardwareProds) {
        for (const srv of serviceProds) {
          if (hw.id !== srv.id) {
            await createRecMutation
              .mutateAsync({
                sourceProductId: hw.id,
                recommendedProductId: srv.id,
                coPurchaseScore: 9.5,
                promotionalTag: "3-Year Premier Support & Onsite SLA",
                minMarginThreshold: 20,
                isActive: true,
              })
              .then(() => createdCount++)
              .catch(() => {});
          }
        }
      }

      // 2. Pair Hardware with Accessories
      for (const hw of hardwareProds) {
        for (const acc of accessoryProds) {
          if (hw.id !== acc.id) {
            await createRecMutation
              .mutateAsync({
                sourceProductId: hw.id,
                recommendedProductId: acc.id,
                coPurchaseScore: 8.8,
                promotionalTag: "Frequently Bought Together",
                minMarginThreshold: 25,
                isActive: true,
              })
              .then(() => createdCount++)
              .catch(() => {});
          }
        }
      }

      // Fallback: If no categorized products matched, pair first few items
      if (createdCount === 0 && productsList.length >= 2) {
        for (let i = 0; i < Math.min(3, productsList.length); i++) {
          const src = productsList[i]!;
          const target = productsList[(i + 1) % productsList.length]!;
          await createRecMutation
            .mutateAsync({
              sourceProductId: src.id,
              recommendedProductId: target.id,
              coPurchaseScore: 8.0,
              promotionalTag: "Recommended Commercial Add-on",
              minMarginThreshold: 15,
              isActive: true,
            })
            .then(() => createdCount++)
            .catch(() => {});
        }
      }

      await refetchRecommendations();
      showToast(`✨ Generated ${createdCount} smart upsell & cross-sell pairing rules!`);
    } catch (err: any) {
      showToast(`Generation completed. Rules updated.`);
      await refetchRecommendations();
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
              <span>Price Lists</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === "tiers" ? "products" : "tiers")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                activeTab === "tiers"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Award size={14} />
              <span>Customer Tiers</span>
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
              onClick={() => setActiveTab(activeTab === "recommendations" ? "products" : "recommendations")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                activeTab === "recommendations"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Upsell &amp; Cross-Sell</span>
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
              <span>Variants &amp; Attributes</span>
              <Layers size={16} className="text-amber-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {metrics.totalVariants} Variants ({metrics.totalSkus} Total SKUs)
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {metrics.productsWithVariants} of {metrics.totalProducts} products configured with dimensional attributes
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
                            <td className="py-3.5 px-4">
                              {p.variants && p.variants.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-[10px] font-bold">
                                    {p.variants.length} {p.variants.length === 1 ? "variant" : "variants"}
                                  </span>
                                  {p.variants.slice(0, 2).map((v) => (
                                    <span
                                      key={v.id}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono"
                                      title={`${v.attributeName}: ${v.attributeValue} (+₹${v.extraPrice ?? 0})`}
                                    >
                                      {v.attributeValue}
                                    </span>
                                  ))}
                                  {p.variants.length > 2 && (
                                    <span className="text-[10px] text-slate-400 font-bold">
                                      +{p.variants.length - 2} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
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
                  const assignedTiers =
                    pl.customerTiers && pl.customerTiers.length > 0
                      ? pl.customerTiers
                      : pl.customerTier
                        ? [pl.customerTier]
                        : [];

                  return (
                    <div
                      key={pl.id}
                      className="border border-slate-200 bg-white hover:border-slate-300 rounded-2xl p-5 space-y-3.5 relative group transition shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{pl.name}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold font-mono">
                            {pl.currency}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Assigned Customer Tiers ({assignedTiers.length})
                            </span>
                            {assignedTiers.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {assignedTiers.map((t) => {
                                  const isGold = t.code === "GOLD" || t.name.toLowerCase().includes("gold");
                                  const isSilver = t.code === "SILVER" || t.name.toLowerCase().includes("silver");
                                  const isPlat = t.code === "PLATINUM" || t.name.toLowerCase().includes("platinum");

                                  return (
                                    <span
                                      key={t.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                                        isGold
                                          ? "bg-amber-50 text-amber-800 border-amber-200"
                                          : isSilver
                                            ? "bg-blue-50 text-blue-800 border-blue-200"
                                            : isPlat
                                              ? "bg-purple-50 text-purple-800 border-purple-200"
                                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      }`}
                                    >
                                      <span>{t.name}</span>
                                      <span className="opacity-75 font-mono">({t.discountCeiling}% cap)</span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
                                All Customer Tiers (Default Public)
                              </span>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                            <span className="text-slate-500">Tier Pricing:</span>
                            <span className="font-semibold text-slate-800">
                              {assignedTiers.length > 0
                                ? `${assignedTiers.length} tier schedule(s)`
                                : `Base rate schedule`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {pl.isDefault ? "★ Master Catalog Rate" : "Multi-Tier Price List"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditPriceList(pl)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
            VIEW 3: CUSTOMER TIERS & DISCOUNT CEILINGS (DYNAMIC CRUD)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "tiers" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Customer Tiers &amp; Discount Ceilings</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define customer entitlement tiers, tier codes, and maximum discount ceilings before managerial approval is required.
                </p>
              </div>
              <button
                onClick={handleOpenNewTier}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>+ Add Customer Tier</span>
              </button>
            </div>

            {/* Dynamic Tiers Grid */}
            {isTiersLoading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto text-[#3b82f6] mb-2" />
                <span>Loading customer tiers...</span>
              </div>
            ) : tiersList.length === 0 ? (
              <div className="p-8 bg-[#f8fafc] border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                <Award size={28} className="mx-auto text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800">No Customer Tiers Configured Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Create customer tiers (e.g. Bronze 5%, Silver 10%, Gold 15%, Platinum 20%) to establish commercial discount limits.
                </p>
                <button
                  onClick={handleOpenNewTier}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>+ Create First Customer Tier</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tiersList.map((tier) => {
                  const isGold = tier.code === "GOLD" || tier.name.toLowerCase().includes("gold");
                  const isSilver = tier.code === "SILVER" || tier.name.toLowerCase().includes("silver");
                  const isPlat = tier.code === "PLATINUM" || tier.name.toLowerCase().includes("platinum");
                  const ceiling = tier.discountCeiling;

                  return (
                    <div
                      key={tier.id}
                      className={`border rounded-2xl p-5 space-y-3.5 relative group transition flex flex-col justify-between ${
                        isGold
                          ? "bg-amber-50/40 border-amber-200"
                          : isSilver
                            ? "bg-blue-50/40 border-blue-200"
                            : isPlat
                              ? "bg-purple-50/40 border-purple-200"
                              : "bg-[#f8fafc] border-slate-200"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{tier.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
                            {tier.code}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                          {tier.description || `Commercial discount entitlement level capped at ${ceiling}% max.`}
                        </p>

                        <div className="pt-2 border-t border-slate-200/70 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Discount Limit:</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md border text-xs ${
                                ceiling >= 15
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : ceiling >= 10
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              Up to {ceiling}% max
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Price Rule:</span>
                            <span className="font-semibold text-slate-700">
                              {ceiling === 0 ? "Standard List Price" : `Base minus ${ceiling}%`}
                            </span>
                          </div>
                          {tier._count?.customers !== undefined && (
                            <div className="flex justify-between items-center text-[11px] text-slate-400">
                              <span>Linked Accounts:</span>
                              <span className="font-medium text-slate-600">{tier._count.customers} customers</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-200/60">
                        <button
                          onClick={() => handleEditTier(tier)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                          title="Edit Customer Tier"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTier(tier.id, tier.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete Customer Tier"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 4: CATEGORIES & CEILINGS WITH PROPER DATA ENTRY
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

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 6: UPSELL & CROSS-SELL RECOMMENDATION PAIRINGS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "recommendations" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500 shrink-0" />
                  <h2 className="text-base font-bold text-slate-900">Upsell &amp; Cross-Sell Suggestions Engine</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                  Configure live product pairings, co-purchase affinity weights, and hard minimum margin floors to safeguard deal margins.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleGenerateSmartPairings}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                >
                  <Sparkles size={13} />
                  <span>✨ Generate Smart Pairings</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewRec}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                >
                  <Plus size={14} />
                  <span>+ Add Pairing Rule</span>
                </button>
              </div>
            </div>

            {/* Explanatory Banners / Rule Principles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Layers3 size={15} className="text-[#3b82f6]" />
                  <span>Cross-Sell Attachments</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Attaches high-margin warranties, SLA support packs, docks, and peripherals to base hardware deals.
                </p>
              </div>

              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <TrendingUp size={15} className="text-purple-600" />
                  <span>Upsell Tier Upgrades</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Recommends higher spec/tier alternatives (e.g. Standard to Enterprise Pro) to increase average deal size (ACV).
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  <span>Margin Floor Gatekeeper</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Strictly suppresses any recommendation whose live gross margin is below your defined min margin floor.
                </p>
              </div>
            </div>

            {/* Recommendations List / Table */}
            {isRecommendationsLoading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto text-[#3b82f6] mb-2" />
                <span>Loading recommendation rules...</span>
              </div>
            ) : recommendationsList.length === 0 ? (
              <div className="p-8 bg-[#f8fafc] border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                <Sparkles size={28} className="mx-auto text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">No Recommendation Rules Configured</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click below to auto-generate smart pairings between catalog hardware, accessories, and warranty SLAs.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateSmartPairings}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0 whitespace-nowrap active:scale-95 transition"
                  >
                    <Sparkles size={14} />
                    <span>✨ Auto-Generate Smart Pairings</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenNewRec}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0 whitespace-nowrap active:scale-95 transition"
                  >
                    <Plus size={14} />
                    <span>+ Custom Pairing</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Configured Recommendation Pairings ({recommendationsList.length})
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-2xs">
                  {recommendationsList.map((rec) => {
                    const source = rec.sourceProduct || productsList.find((p) => p.id === rec.sourceProductId);
                    const target = rec.recommendedProduct || productsList.find((p) => p.id === rec.recommendedProductId);
                    const targetBasePrice = target && typeof target.basePrice === "number" ? target.basePrice : 0;
                    const targetCostPrice = target && typeof target.costPrice === "number" ? target.costPrice : 0;
                    const targetMargin =
                      targetBasePrice > 0
                        ? Math.round(((targetBasePrice - targetCostPrice) / targetBasePrice) * 100)
                        : 0;

                    return (
                      <div
                        key={rec.id}
                        className="p-4 bg-white hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Source Product Badge */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-900">
                              <span className="text-[10px] uppercase font-mono text-slate-500">Trigger:</span>
                              <span>{source?.name || rec.sourceProductId}</span>
                            </div>

                            <ArrowRight size={14} className="text-slate-400 shrink-0" />

                            {/* Target Recommended Product Badge */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 font-bold text-blue-900">
                              <span className="text-[10px] uppercase font-mono text-blue-600">Suggest:</span>
                              <span>{target?.name || rec.recommendedProductId}</span>
                              {target && (
                                <span className="text-emerald-700 font-mono text-[11px] ml-1">
                                  (₹{targetBasePrice.toLocaleString()})
                                </span>
                              )}
                            </div>

                            {/* Tag */}
                            {rec.promotionalTag && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                                {rec.promotionalTag}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs">
                            <span>
                              Co-Purchase Score:{" "}
                              <strong className="text-slate-800">{rec.coPurchaseScore}/10</strong>
                            </span>
                            <span>
                              Min Margin Floor:{" "}
                              <strong className="text-orange-600">{rec.minMarginThreshold}%</strong>
                            </span>
                            <span>
                              Target Live Margin:{" "}
                              <strong
                                className={`font-bold ${
                                  targetMargin >= rec.minMarginThreshold
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {targetMargin}%{" "}
                                {targetMargin < rec.minMarginThreshold && "(Erosion Warning)"}
                              </strong>
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded font-bold text-[10px] ${
                                rec.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {rec.isActive ? "● Active in Sales Drawer" : "○ Paused"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditRec(rec)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Pairing Rule"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRec(rec.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Pairing Rule"
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
                            const assignedTiers =
                              pl.customerTiers && pl.customerTiers.length > 0
                                ? pl.customerTiers
                                : pl.customerTier
                                  ? [pl.customerTier]
                                  : [];

                            const maxCeiling =
                              assignedTiers.length > 0
                                ? Math.max(...assignedTiers.map((t) => t.discountCeiling))
                                : 0;

                            const currencySymbol =
                              pl.currency === "USD" ? "$" : pl.currency === "EUR" ? "€" : "₹";
                            const effectiveRate = Math.round(formBasePrice * (1 - maxCeiling / 100));

                            return (
                              <tr key={pl.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-900">{pl.name}</span>
                                    {assignedTiers.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {assignedTiers.map((t) => (
                                          <span
                                            key={t.id}
                                            className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700"
                                          >
                                            {t.name} ({t.discountCeiling}%)
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        All Customer Tiers
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                                    {pl.currency || "INR"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-700">
                                  {maxCeiling === 0
                                    ? "List Price (0% discount)"
                                    : `Up to ${maxCeiling}% tier discount`}
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
                                  Configure price lists in "Price Lists" tab to calculate customer rates automatically.
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
          CUSTOMER TIER MODAL (CREATE & EDIT DYNAMIC CEILINGS)
      ══════════════════════════════════════════════════════════════════════ */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingTierId ? "Edit Customer Tier" : "New Customer Tier"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set customer discount privileges and commercial ceilings.
                </p>
              </div>
              <button
                onClick={() => setIsTierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Tier Name <span className="text-[#3b82f6]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold Strategic Enterprise"
                  value={tierFormName}
                  onChange={(e) => {
                    setTierFormName(e.target.value);
                    if (!editingTierId && !tierFormCode) {
                      setTierFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10));
                    }
                  }}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Tier Code <span className="text-[#3b82f6]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GOLD"
                    value={tierFormCode}
                    onChange={(e) => setTierFormCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#3b82f6] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Discount Ceiling % <span className="text-[#3b82f6]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      step={0.5}
                      value={tierFormCeiling}
                      onChange={(e) => setTierFormCeiling(Number(e.target.value))}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 pr-7 text-xs font-bold text-slate-900 outline-none focus:border-[#3b82f6] focus:bg-white"
                    />
                    <Percent size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Description / Commercial Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. High-volume enterprise partners with annual spend commitments above ₹50L."
                  value={tierFormDesc}
                  onChange={(e) => setTierFormDesc(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6] focus:bg-white"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-900 flex items-start gap-2">
                <Info size={14} className="text-[#3b82f6] shrink-0 mt-0.5" />
                <span>
                  Sales reps granting discounts above <strong>{tierFormCeiling}%</strong> for customers in this tier will automatically require manager/finance approval.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTierModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {editingTierId ? "Update Tier" : "Create Tier"}
                </button>
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
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPriceListId ? "Edit Multi-Tier Price List" : "Create Multi-Tier Price List"}
                </h3>
                <p className="text-xs text-slate-500">
                  Assign multiple customer tiers to this price list schedule.
                </p>
              </div>
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
                  placeholder="e.g. Strategic Multi-Tier Schedule"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                />
              </div>

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

              {/* Multi-Select Assigned Customer Tiers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Assigned Customer Tiers ({priceListTierIds.length} of {tiersList.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPriceListTierIds(tiersList.map((t) => t.id))}
                      className="text-[#3b82f6] hover:underline font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setPriceListTierIds([])}
                      className="text-slate-500 hover:underline font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-[#f8fafc] rounded-2xl border border-slate-200">
                  {tiersList.map((tier) => {
                    const isSelected = priceListTierIds.includes(tier.id);
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setPriceListTierIds((prev) =>
                            prev.includes(tier.id) ? prev.filter((id) => id !== tier.id) : [...prev, tier.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/90 border-[#3b82f6] text-blue-950 font-bold shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-[#3b82f6] border-[#3b82f6] text-white" : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="truncate">{tier.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono shrink-0 ml-1">
                          {tier.discountCeiling}% cap
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">
                  Any customer mapped to these selected tiers will automatically use this pricing schedule.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="priceListDefaultCheck"
                  checked={priceListIsDefault}
                  onChange={(e) => setPriceListIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="priceListDefaultCheck" className="text-xs text-slate-700 font-medium select-none cursor-pointer">
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
          UPSELL & CROSS-SELL RECOMMENDATION PAIRING MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {isRecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRecId ? "Edit Recommendation Pairing Rule" : "Create Recommendation Pairing Rule"}
                </h3>
                <p className="text-xs text-slate-500">
                  Pair a base product with an upsell upgrade or cross-sell attachment.
                </p>
              </div>
              <button onClick={() => setIsRecModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRec} className="space-y-4 text-left">
              {/* Source Product Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Base / Trigger Product <span className="text-[#3b82f6]">*</span>
                </label>
                <select
                  value={recSourceProductId}
                  onChange={(e) => setRecSourceProductId(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 outline-none font-medium cursor-pointer"
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) &ndash; ₹{p.basePrice.toLocaleString()}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  When a sales rep adds this product to a quotation, the engine evaluates the recommendation.
                </p>
              </div>

              {/* Recommended Product Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Recommended Target Product <span className="text-[#3b82f6]">*</span>
                </label>
                <select
                  value={recTargetProductId}
                  onChange={(e) => setRecTargetProductId(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 outline-none font-medium cursor-pointer"
                >
                  {productsList
                    .filter((p) => p.id !== recSourceProductId)
                    .map((p) => {
                      const margin = p.basePrice > 0 ? Math.round(((p.basePrice - p.costPrice) / p.basePrice) * 100) : 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) &ndash; ₹{p.basePrice.toLocaleString()} ({margin}% gross margin)
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Promotional Tag Presets & Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Promotional Tag / Pairing Type
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {[
                    "Frequently Bought Together",
                    "Upgrade to Pro Tier",
                    "3-Year Premier Support / SLA",
                    "High Margin Accessory",
                    "Recommended Cloud Add-on",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setRecPromotionalTag(tag)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                        recPromotionalTag === tag
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={recPromotionalTag}
                  onChange={(e) => setRecPromotionalTag(e.target.value)}
                  placeholder="e.g. Frequently Bought Together"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Co-Purchase Score */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Co-Purchase Score (1-10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={recCoPurchaseScore}
                    onChange={(e) => setRecCoPurchaseScore(Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                  />
                  <p className="text-[10px] text-slate-400">Higher score appears first in suggestion drawer.</p>
                </div>

                {/* Min Margin Floor % */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Min Margin Floor (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={recMinMarginThreshold}
                    onChange={(e) => setRecMinMarginThreshold(Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#3b82f6]"
                  />
                  <p className="text-[10px] text-slate-400">Suppresses candidate if margin falls below.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recActiveCheck"
                  checked={recIsActive}
                  onChange={(e) => setRecIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="recActiveCheck" className="text-xs text-slate-700 font-medium select-none cursor-pointer">
                  Rule is active and currently surfacing to sales reps
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingRecId ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteRec(editingRecId);
                      setIsRecModalOpen(false);
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
                    onClick={() => setIsRecModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {editingRecId ? "Update Pairing" : "Create Pairing Rule"}
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
