"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Boxes,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  X,
  Layers,
  Zap,
  Clock,
  PackagePlus,
  Truck,
  Pencil,
  ArrowRightLeft,
  Minus,
  Check,
  Loader2,
} from "lucide-react";
import {
  useWarehouses,
  useStockLevels,
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useCreateCategory,
  useAdjustStock,
  type WarehouseData,
  type StockLevelData,
  type ProductData,
} from "../../../../../lib/query";

function AdminInventoryPageContent() {
  const searchParams = useSearchParams();
  const urlWarehouseId = searchParams.get("warehouseId");
  const urlAction = searchParams.get("action");

  const { data: apiWarehouses, isLoading: isWhLoading, refetch: refetchWarehouses } = useWarehouses(true);
  const { data: apiStockLevels, isLoading: isStockLoading, refetch: refetchStock } = useStockLevels();
  const { data: apiProducts, isLoading: isProdLoading, refetch: refetchProducts } = useProducts();
  const { data: apiCategories, refetch: refetchCategories } = useCategories();

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const createCategoryMutation = useCreateCategory();
  const adjustStockMutation = useAdjustStock();

  const warehousesList: WarehouseData[] = Array.isArray(apiWarehouses) ? apiWarehouses : [];
  const stockLevelsList: StockLevelData[] = Array.isArray(apiStockLevels) ? apiStockLevels : [];
  const productsList = Array.isArray(apiProducts) ? apiProducts : [];
  const categoriesList = Array.isArray(apiCategories) ? apiCategories : [];

  // Filter States
  const [activeTab, setActiveTab] = useState<"ALL" | "HARDWARE" | "SUBSCRIPTION" | "SERVICE">("HARDWARE");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>("ALL");

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchWarehouses(), refetchStock(), refetchProducts(), refetchCategories()]);
    showToast("Stock ledger & catalog synchronization completed.");
  };

  // ---------------------------------------------------------------------------
  // Modal 1: Precision Stock Management Modal (Exact Count, Receive, Deduct, Transfer)
  // ---------------------------------------------------------------------------
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [stockOperation, setStockOperation] = useState<"SET_EXACT" | "RECEIVE" | "DEDUCT" | "TRANSFER">("RECEIVE");
  const [exactCount, setExactCount] = useState<string>("0");
  const [quantityDelta, setQuantityDelta] = useState<string>("25");
  const [transferTargetWarehouseId, setTransferTargetWarehouseId] = useState<string>("");
  const [movementType, setMovementType] = useState<"ADJUSTMENT" | "PURCHASE_RECEIPT" | "TRANSFER">("PURCHASE_RECEIPT");
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>("");
  const [updateCostPriceWithInbound, setUpdateCostPriceWithInbound] = useState(false);
  const [inboundCostPrice, setInboundCostPrice] = useState<string>("0");

  const handleOpenAdjustModal = (
    productId?: string,
    warehouseId?: string,
    defaultOp: "SET_EXACT" | "RECEIVE" | "DEDUCT" | "TRANSFER" = "RECEIVE"
  ) => {
    const pId = productId || (productsList[0]?.id ?? "");
    const wId = warehouseId || (warehousesList[0]?.id ?? "");
    setSelectedProductId(pId);
    setSelectedWarehouseId(wId);
    setStockOperation(defaultOp);

    const lvl = stockLevelsList.find((s) => s.productId === pId && s.warehouseId === wId);
    const onHand = lvl?.onHand ?? 0;
    setExactCount(String(onHand));
    setQuantityDelta("25");
    setMovementType(
      defaultOp === "RECEIVE"
        ? "PURCHASE_RECEIPT"
        : defaultOp === "TRANSFER"
        ? "TRANSFER"
        : "ADJUSTMENT"
    );
    setAdjustmentNotes("");

    if (defaultOp === "RECEIVE") {
      const prod = productsList.find((p) => p.id === pId);
      setInboundCostPrice(String(prod?.costPrice ?? 0));
      setUpdateCostPriceWithInbound(false);
    } else {
      setUpdateCostPriceWithInbound(false);
    }

    const otherWh = warehousesList.find((w) => w.id !== wId);
    setTransferTargetWarehouseId(otherWh?.id || "");

    setIsAdjustModalOpen(true);
  };

  useEffect(() => {
    if (urlWarehouseId) {
      setSelectedWarehouseFilter(urlWarehouseId);
      if (urlAction === "stock") {
        handleOpenAdjustModal(undefined, urlWarehouseId, "RECEIVE");
      }
    }
  }, [urlWarehouseId, urlAction]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedWarehouseId) {
      showToast("Please select both a product and warehouse depot.");
      return;
    }

    const currentLvl = stockLevelsList.find(
      (s) => s.productId === selectedProductId && s.warehouseId === selectedWarehouseId
    );
    const currentOnHand = currentLvl?.onHand ?? 0;

    let finalDelta = 0;
    let finalMovementType = movementType;

    if (stockOperation === "SET_EXACT") {
      const exact = parseInt(exactCount, 10);
      if (isNaN(exact) || exact < 0) {
        showToast("Exact count must be a non-negative integer.");
        return;
      }
      finalDelta = exact - currentOnHand;
      if (finalDelta === 0) {
        showToast("No change: On-hand count already matches current stock level.");
        setIsAdjustModalOpen(false);
        return;
      }
      finalMovementType = "ADJUSTMENT";
    } else if (stockOperation === "RECEIVE") {
      const qty = parseInt(quantityDelta, 10);
      if (isNaN(qty) || qty <= 0) {
        showToast("Received quantity must be a positive integer.");
        return;
      }
      finalDelta = qty;
      finalMovementType = "PURCHASE_RECEIPT";
    } else if (stockOperation === "DEDUCT") {
      const qty = parseInt(quantityDelta, 10);
      if (isNaN(qty) || qty <= 0) {
        showToast("Deducted quantity must be a positive integer.");
        return;
      }
      if (qty > currentOnHand) {
        showToast(`Cannot deduct ${qty} units: only ${currentOnHand} units currently on-hand.`);
        return;
      }
      finalDelta = -qty;
      finalMovementType = "ADJUSTMENT";
    } else if (stockOperation === "TRANSFER") {
      const qty = parseInt(quantityDelta, 10);
      if (isNaN(qty) || qty <= 0) {
        showToast("Transfer quantity must be a positive integer.");
        return;
      }
      if (!transferTargetWarehouseId || transferTargetWarehouseId === selectedWarehouseId) {
        showToast("Please select a different destination warehouse depot.");
        return;
      }
      if (qty > currentOnHand) {
        showToast(`Cannot transfer ${qty} units: only ${currentOnHand} units on-hand in source depot.`);
        return;
      }
    }

    try {
      const prod = productsList.find((p) => p.id === selectedProductId);
      const sourceWh = warehousesList.find((w) => w.id === selectedWarehouseId);

      // 1. If user checked update cost price on inbound receipt
      if (
        (stockOperation === "RECEIVE" || stockOperation === "SET_EXACT") &&
        updateCostPriceWithInbound
      ) {
        const newCost = parseFloat(inboundCostPrice);
        if (!isNaN(newCost) && newCost >= 0) {
          await updateProductMutation.mutateAsync({
            id: selectedProductId,
            body: { costPrice: newCost },
          });
        }
      }

      // 2. Execute Stock Adjustment or Transfer
      if (stockOperation === "TRANSFER") {
        const qty = parseInt(quantityDelta, 10);
        const targetWh = warehousesList.find((w) => w.id === transferTargetWarehouseId);

        // Deduct from source depot
        await adjustStockMutation.mutateAsync({
          productId: selectedProductId,
          warehouseId: selectedWarehouseId,
          quantityDelta: -qty,
          movementType: "TRANSFER",
          notes: `Transferred to ${targetWh?.name || "depot"}. ${adjustmentNotes.trim()}`,
        });

        // Add to target depot
        await adjustStockMutation.mutateAsync({
          productId: selectedProductId,
          warehouseId: transferTargetWarehouseId,
          quantityDelta: qty,
          movementType: "TRANSFER",
          notes: `Transferred from ${sourceWh?.name || "depot"}. ${adjustmentNotes.trim()}`,
        });

        showToast(
          `Transferred ${qty} units of ${prod?.name || "item"} from ${sourceWh?.name} to ${targetWh?.name}!`
        );
      } else {
        await adjustStockMutation.mutateAsync({
          productId: selectedProductId,
          warehouseId: selectedWarehouseId,
          quantityDelta: finalDelta,
          movementType: finalMovementType,
          notes: adjustmentNotes.trim() || undefined,
        });

        const newTotal = currentOnHand + finalDelta;
        showToast(
          `Stock updated for ${prod?.name || "item"} at ${sourceWh?.name || "depot"}: ${newTotal} units on-hand (${finalDelta > 0 ? `+${finalDelta}` : finalDelta})!`
        );
      }

      setIsAdjustModalOpen(false);
      await Promise.all([refetchStock(), refetchWarehouses(), refetchProducts()]);
    } catch (err: any) {
      showToast(`Stock update error: ${err?.message || "Failed to update ledger"}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Modal 2: Edit Item Data & Commercial Pricing Modal
  // ---------------------------------------------------------------------------
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editBasePrice, setEditBasePrice] = useState("0");
  const [editCostPrice, setEditCostPrice] = useState("0");
  const [editUnit, setEditUnit] = useState("UNIT");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const handleOpenEditProduct = (product: ProductData) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditSku(product.sku);
    setEditBasePrice(String(product.basePrice ?? 0));
    setEditCostPrice(String(product.costPrice ?? 0));
    setEditUnit(product.unitType || product.unit || "UNIT");
    setEditIsActive(product.isActive ?? true);
    setIsEditProductModalOpen(true);
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim() || !editSku.trim()) {
      showToast("Product name and SKU are required.");
      return;
    }

    const basePrice = parseFloat(editBasePrice);
    const costPrice = parseFloat(editCostPrice);

    if (isNaN(basePrice) || basePrice < 0 || isNaN(costPrice) || costPrice < 0) {
      showToast("Please enter valid prices.");
      return;
    }

    setIsSavingProduct(true);
    try {
      await updateProductMutation.mutateAsync({
        id: editingProduct.id,
        body: {
          name: editName.trim(),
          sku: editSku.trim().toUpperCase(),
          basePrice,
          costPrice,
          unit: editUnit,
          isActive: editIsActive,
        },
      });

      showToast(
        `Updated "${editName}"! Cost: ₹${costPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}, Selling: ₹${basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      );
      setIsEditProductModalOpen(false);
      setEditingProduct(null);
      await Promise.all([refetchProducts(), refetchStock()]);
    } catch (err: any) {
      showToast(`Error updating product: ${err?.message || "Failed to save changes"}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Modal 2: Add Product & Stock Modal
  // ---------------------------------------------------------------------------
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProdType, setNewProdType] = useState<"HARDWARE" | "SUBSCRIPTION" | "SERVICE">("HARDWARE");
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdBasePrice, setNewProdBasePrice] = useState("299.00");
  const [newProdCostPrice, setNewProdCostPrice] = useState("180.00");
  const [newProdUnit, setNewProdUnit] = useState("UNIT");
  const [newProdWarehouseId, setNewProdWarehouseId] = useState("");
  const [newProdInitialStock, setNewProdInitialStock] = useState("100");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  const handleOpenAddProductModal = (type: "HARDWARE" | "SUBSCRIPTION" | "SERVICE" = "HARDWARE") => {
    setNewProdType(type);
    setNewProdName("");
    setNewProdSku("");
    setNewProdBasePrice(type === "HARDWARE" ? "299.00" : type === "SUBSCRIPTION" ? "49.00" : "150.00");
    setNewProdCostPrice(type === "HARDWARE" ? "180.00" : type === "SUBSCRIPTION" ? "10.00" : "60.00");
    setNewProdUnit(type === "HARDWARE" ? "UNIT" : type === "SUBSCRIPTION" ? "MONTH" : "HOUR");
    setNewProdWarehouseId(warehousesList[0]?.id || "");
    setNewProdInitialStock(type === "HARDWARE" ? "100" : "0");
    setIsAddProductModalOpen(true);
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSku.trim()) {
      showToast("Product name and SKU are required.");
      return;
    }

    setIsCreatingProduct(true);
    try {
      // 1. Resolve or Create Category for this type
      let targetCat = categoriesList.find((c) => c.type === newProdType);
      if (!targetCat) {
        const defaultCatName =
          newProdType === "HARDWARE"
            ? "Physical Hardware"
            : newProdType === "SUBSCRIPTION"
            ? "SaaS Subscriptions"
            : "Professional Services";

        targetCat = await createCategoryMutation.mutateAsync({
          name: defaultCatName,
          type: newProdType,
          description: `Managed ${defaultCatName} category`,
        });
      }

      // 2. Create the Product
      const createdProd = await createProductMutation.mutateAsync({
        name: newProdName.trim(),
        sku: newProdSku.trim().toUpperCase(),
        basePrice: parseFloat(newProdBasePrice) || 0,
        costPrice: parseFloat(newProdCostPrice) || 0,
        unit: newProdUnit,
        categoryId: targetCat.id,
      });

      // 3. If Hardware and Warehouse selected with initial stock, immediately stock the warehouse!
      const initialQty = parseInt(newProdInitialStock, 10);
      if (newProdType === "HARDWARE" && newProdWarehouseId && initialQty > 0) {
        await adjustStockMutation.mutateAsync({
          productId: createdProd.id,
          warehouseId: newProdWarehouseId,
          quantityDelta: initialQty,
          movementType: "PURCHASE_RECEIPT",
          notes: "Initial inventory provisioning on product setup",
        });
      }

      const whName = warehousesList.find((w) => w.id === newProdWarehouseId)?.name;
      showToast(
        `Created product "${newProdName}"${initialQty > 0 ? ` with ${initialQty} units in ${whName || "warehouse"}` : ""}!`
      );
      setIsAddProductModalOpen(false);
      await Promise.all([refetchProducts(), refetchStock(), refetchWarehouses()]);
    } catch (err: any) {
      showToast(`Error creating product: ${err?.message || "Failed to create product"}`);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Check URL parameters for direct warehouse stock action
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const whId = params.get("warehouseId");
      const action = params.get("action");
      if (whId) {
        setSelectedWarehouseFilter(whId);
        if (action === "stock") {
          setSelectedWarehouseId(whId);
          setIsAdjustModalOpen(true);
        }
      }
    }
  }, []);

  // Classify Products strictly according to Category Type (with unit fallback only if category type is unset)
  const getProductCategoryType = (p: any): "HARDWARE" | "SUBSCRIPTION" | "SERVICE" => {
    const cat = categoriesList.find((c) => c.id === p.categoryId);
    const catType = ((p.category as any)?.type || cat?.type)?.toUpperCase();
    if (catType === "SUBSCRIPTION") return "SUBSCRIPTION";
    if (catType === "SERVICE") return "SERVICE";
    if (catType === "HARDWARE") return "HARDWARE";

    const unit = (p.unitType || p.unit || "").toUpperCase();
    if (unit === "MONTH" || unit === "YEAR" || unit === "USER_MONTH" || unit === "SEAT") {
      return "SUBSCRIPTION";
    }
    if (unit === "HOUR" || unit === "PROJECT") {
      return "SERVICE";
    }
    return "HARDWARE";
  };

  const hardwareProducts = productsList.filter((p) => getProductCategoryType(p) === "HARDWARE");
  const subscriptionProducts = productsList.filter((p) => getProductCategoryType(p) === "SUBSCRIPTION");
  const serviceProducts = productsList.filter((p) => getProductCategoryType(p) === "SERVICE");

  // Filtered Products by current tab and search
  const currentTabProducts =
    activeTab === "HARDWARE"
      ? hardwareProducts
      : activeTab === "SUBSCRIPTION"
      ? subscriptionProducts
      : activeTab === "SERVICE"
      ? serviceProducts
      : productsList;

  const filteredProducts = currentTabProducts.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  // Inventory Totals & KPI Metrics
  const totalPhysicalUnitsOnHand = stockLevelsList.reduce((acc, s) => acc + (s.onHand || 0), 0);
  const totalPhysicalUnitsReserved = stockLevelsList.reduce((acc, s) => acc + (s.reserved || 0), 0);
  const netAvailableUnits = totalPhysicalUnitsOnHand - totalPhysicalUnitsReserved;

  const totalInventoryValuation = stockLevelsList.reduce((acc, s) => {
    const prod = productsList.find((p) => p.id === s.productId);
    const cost = prod?.costPrice || (s.product as any)?.costPrice || 0;
    return acc + (s.onHand || 0) * cost;
  }, 0);

  const lowStockAlertCount = stockLevelsList.filter(
    (s) => (s.onHand || 0) <= (s.reorderPoint || 10)
  ).length;

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
            <span className="text-[#ff5e3a]">Inventory Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Multi-Type Inventory &amp; Stock Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock tracking across physical warehouse depots, digital SaaS subscriptions, and service hour pools.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/admin/warehouses"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <WarehouseIcon size={14} className="text-slate-500" />
            <span>Manage Warehouses</span>
          </Link>
          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw size={14} className={isStockLoading || isProdLoading ? "animate-spin text-slate-400" : "text-slate-500"} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdjustModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw size={14} className="text-slate-600" />
            <span>Adjust Stock</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddProductModal("HARDWARE")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Product &amp; Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Physical On-Hand</span>
            <Boxes size={16} className="text-[#ff5e3a]" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalPhysicalUnitsOnHand.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across {warehousesList.length} configured depots</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Available</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{netAvailableUnits.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">{totalPhysicalUnitsReserved.toLocaleString()} reserved in active orders</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Value</span>
            <Zap size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{totalInventoryValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Based on unit cost-of-goods</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Reorder Alerts</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{lowStockAlertCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">SKU depot balances &le; reorder point</div>
        </div>
      </div>

      {/* Inventory Category Classification Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start">
          <button
            type="button"
            onClick={() => setActiveTab("HARDWARE")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "HARDWARE"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Physical Hardware ({hardwareProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SUBSCRIPTION")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "SUBSCRIPTION"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SaaS Subscriptions ({subscriptionProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SERVICE")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "SERVICE"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Services ({serviceProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Items ({productsList.length})
          </button>
        </div>

        {/* Search & Warehouse Filter */}
        <div className="flex items-center gap-2.5">
          {activeTab === "HARDWARE" && warehousesList.length > 0 && (
            <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
            >
              <option value="ALL">All Depots ({warehousesList.length})</option>
              {warehousesList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.code ? `(${w.code})` : ""}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a] w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* DYNAMIC REAL-TIME STOCK LEDGER TABLE (FOR HARDWARE & ALL) */}
      {(activeTab === "HARDWARE" || activeTab === "ALL") && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Real-Time Inventory Allocation Ledger</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic live breakdown of on-hand vs reserved stock across all active warehouse depots
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                {filteredProducts.length} Products Tracked
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                {warehousesList.length} Depots Online
              </span>
            </div>
          </div>

          {productsList.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center mx-auto">
                <Boxes size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Products or Inventory in Catalog Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Add your first hardware product, cloud subscription, or service offering to allocate stock to your warehouses and begin generating quotations.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddProductModal("HARDWARE")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add Hardware Product &amp; Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddProductModal("SUBSCRIPTION")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add Subscription</span>
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No products found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 pl-5">SKU &amp; Product</th>
                    <th className="py-3.5 px-3">Unit</th>
                    {/* DYNAMIC WAREHOUSE COLUMNS */}
                    {warehousesList
                      .filter((w) => selectedWarehouseFilter === "ALL" || w.id === selectedWarehouseFilter)
                      .map((wh) => (
                        <th key={wh.id} className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div>{wh.name}</div>
                          {wh.code && (
                            <div className="text-[9px] font-mono text-slate-400">({wh.code})</div>
                          )}
                        </th>
                      ))}
                    <th className="py-3.5 px-3 text-right">Total Available</th>
                    <th className="py-3.5 px-3 text-right">Unit Cost</th>
                    <th className="py-3.5 px-3 text-right">Total Value</th>
                    <th className="py-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    const productLevels = stockLevelsList.filter((s) => s.productId === p.id);
                    const totalOnHand = productLevels.reduce((acc, s) => acc + (s.onHand || 0), 0);
                    const totalReserved = productLevels.reduce((acc, s) => acc + (s.reserved || 0), 0);
                    const totalAvailable = totalOnHand - totalReserved;
                    const costPrice = p.costPrice || 0;
                    const totalValuation = totalOnHand * costPrice;

                    const activeWarehousesToShow = warehousesList.filter(
                      (w) => selectedWarehouseFilter === "ALL" || w.id === selectedWarehouseFilter
                    );

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Product Info with Quick Edit Trigger */}
                        <td className="py-3.5 pl-5">
                          <div className="flex items-center gap-1.5 group">
                            <Link
                              href={`/dashboard/admin/inventory/${p.id}`}
                              className="font-bold text-slate-900 hover:text-[#ff5e3a] transition"
                            >
                              {p.name}
                            </Link>
                            <Link
                              href={`/dashboard/admin/inventory/${p.id}`}
                              className="text-slate-400 hover:text-[#ff5e3a] p-1 rounded-lg hover:bg-orange-50 transition"
                              title="Open single stock management console"
                            >
                              <Pencil size={11} />
                            </Link>
                          </div>
                          <Link
                            href={`/dashboard/admin/inventory/${p.id}`}
                            className="font-mono text-[11px] text-slate-400 mt-0.5 hover:text-slate-600 block"
                          >
                            {p.sku}
                          </Link>
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                            {p.unitType || p.unit || "UNIT"}
                          </span>
                        </td>

                        {/* DYNAMIC WAREHOUSE STOCK CELLS */}
                        {activeWarehousesToShow.map((wh) => {
                          const level = productLevels.find((s) => s.warehouseId === wh.id);
                          const onHand = level?.onHand ?? 0;
                          const reserved = level?.reserved ?? 0;
                          const reorder = level?.reorderPoint ?? 10;
                          const isLow = onHand <= reorder;

                          return (
                            <td key={wh.id} className="py-3.5 px-3 text-center">
                              {onHand > 0 ? (
                                <div>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span
                                      className={`font-mono font-bold ${
                                        isLow ? "text-amber-600" : "text-slate-900"
                                      }`}
                                    >
                                      {onHand}
                                    </span>
                                    {isLow && (
                                      <span
                                        title="At or below reorder threshold"
                                        className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                                      />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    ({reserved} resv)
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdjustModal(p.id, wh.id, "SET_EXACT")}
                                    className="text-[10px] font-semibold text-[#ff5e3a] hover:underline mt-0.5 cursor-pointer block mx-auto"
                                    title={`Audit or adjust stock for ${wh.name}`}
                                  >
                                    Adjust
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-mono text-xs text-slate-300">0</span>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdjustModal(p.id, wh.id, "RECEIVE")}
                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-[#ff5e3a]/10 hover:bg-[#ff5e3a]/20 text-[#ff5e3a] text-[10px] font-bold transition mt-0.5 cursor-pointer"
                                    >
                                      <Plus size={10} />
                                      <span>Stock In</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Total Available */}
                        <td className="py-3.5 px-3 text-right">
                          <span
                            className={`font-mono font-bold ${
                              totalAvailable <= 5 ? "text-amber-600" : "text-emerald-700"
                            }`}
                          >
                            {totalAvailable}
                          </span>
                        </td>

                        {/* Unit Cost with Edit Trigger */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(p)}
                            className="inline-flex items-center gap-1 font-mono text-slate-700 hover:text-[#ff5e3a] font-medium text-xs cursor-pointer group"
                            title="Click to edit unit cost and selling price"
                          >
                            <span>₹{costPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            <Pencil size={10} className="text-slate-300 group-hover:text-[#ff5e3a] transition" />
                          </button>
                        </td>

                        {/* Total Valuation */}
                        <td className="py-3.5 px-3 font-mono font-semibold text-slate-900 text-right">
                          ₹{totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Dual Actions: Single Stock Page + Quick Adjust */}
                        <td className="py-3.5 pr-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/dashboard/admin/inventory/${p.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-[11px] transition shadow-xs"
                              title="Open single stock management console for this item"
                            >
                              <span>Manage Stock &amp; Price &rarr;</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(p.id, undefined, "RECEIVE")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition shadow-2xs cursor-pointer"
                              title="Quick stock receipt or audit modal"
                            >
                              <Boxes size={12} className="text-slate-400" />
                              <span>Quick Adjust</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIPTION LICENSES LEDGER (WHEN SUBSCRIPTION TAB IS ACTIVE) */}
      {activeTab === "SUBSCRIPTION" && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Digital SaaS License Inventory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Recurring seat allocations, cloud subscription licenses, and automated renewal cycles
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                {subscriptionProducts.length} Subscriptions
              </span>
              <button
                type="button"
                onClick={() => handleOpenAddProductModal("SUBSCRIPTION")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff5e3a] text-white text-xs font-semibold"
              >
                <Plus size={13} />
                <span>Add Subscription</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 pl-5">Subscription Product</th>
                  <th className="py-3.5 px-3">Billing Cycle / Unit</th>
                  <th className="py-3.5 px-3 text-right">List Price</th>
                  <th className="py-3.5 px-3 text-right">Cost Benchmark</th>
                  <th className="py-3.5 px-3 text-right">Target Margin</th>
                  <th className="py-3.5 px-3 text-right">Provisioning Status</th>
                  <th className="py-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subscriptionProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No cloud subscriptions created yet. Click &quot;Add Subscription&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  subscriptionProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 pl-5">
                        <div className="flex items-center gap-1.5 group">
                          <Link
                            href={`/dashboard/admin/inventory/${p.id}`}
                            className="font-bold text-slate-900 hover:text-[#ff5e3a] transition"
                          >
                            {p.name}
                          </Link>
                          <Link
                            href={`/dashboard/admin/inventory/${p.id}`}
                            className="text-slate-400 hover:text-[#ff5e3a] p-1 rounded-lg hover:bg-orange-50 transition"
                            title="Manage subscription"
                          >
                            <Pencil size={11} />
                          </Link>
                        </div>
                        <Link
                          href={`/dashboard/admin/inventory/${p.id}`}
                          className="font-mono text-[11px] text-slate-400 mt-0.5 hover:text-slate-600 block"
                        >
                          {p.sku}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
                          {p.unitType || p.unit || "MONTH"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{p.basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        ₹{(p.costPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                        {p.basePrice > 0
                          ? `${Math.round(((p.basePrice - (p.costPrice || 0)) / p.basePrice) * 100)}%`
                          : "N/A"}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                          <CheckCircle2 size={12} />
                          <span>Instant Auto-Provisioning</span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/admin/inventory/${p.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-[11px] transition shadow-xs"
                          >
                            <span>Manage &rarr;</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50/80 hover:bg-orange-100/80 border border-orange-200/80 text-[#ff5e3a] font-semibold text-[11px] transition cursor-pointer"
                            title="Edit subscription details and price"
                          >
                            <Pencil size={11} />
                            <span>Quick Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROFESSIONAL SERVICES LEDGER (WHEN SERVICE TAB IS ACTIVE) */}
      {activeTab === "SERVICE" && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Professional Services &amp; Advisory Hours</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Technical consulting hours, deployment packages, and enterprise onboarding scope
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold">
                {serviceProducts.length} Service Offerings
              </span>
              <button
                type="button"
                onClick={() => handleOpenAddProductModal("SERVICE")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff5e3a] text-white text-xs font-semibold"
              >
                <Plus size={13} />
                <span>Add Service</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 pl-5">Service Deliverable</th>
                  <th className="py-3.5 px-3">Engagement Scope</th>
                  <th className="py-3.5 px-3 text-right">Hourly / Fixed Rate</th>
                  <th className="py-3.5 px-3 text-right">Labor Cost Benchmark</th>
                  <th className="py-3.5 px-3 text-right">Delivery Mode</th>
                  <th className="py-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {serviceProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No professional services created yet. Click &quot;Add Service&quot; above to add one.
                    </td>
                  </tr>
                ) : (
                  serviceProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 pl-5">
                        <div className="flex items-center gap-1.5 group">
                          <Link
                            href={`/dashboard/admin/inventory/${p.id}`}
                            className="font-bold text-slate-900 hover:text-[#ff5e3a] transition"
                          >
                            {p.name}
                          </Link>
                          <Link
                            href={`/dashboard/admin/inventory/${p.id}`}
                            className="text-slate-400 hover:text-[#ff5e3a] p-1 rounded-lg hover:bg-orange-50 transition"
                            title="Manage service deliverable"
                          >
                            <Pencil size={11} />
                          </Link>
                        </div>
                        <Link
                          href={`/dashboard/admin/inventory/${p.id}`}
                          className="font-mono text-[11px] text-slate-400 mt-0.5 hover:text-slate-600 block"
                        >
                          {p.sku}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold">
                          {p.unitType || p.unit || "HOUR"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{p.basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        ₹{(p.costPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          <Clock size={12} />
                          <span>Milestone Scheduled</span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/admin/inventory/${p.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-[11px] transition shadow-xs"
                          >
                            <span>Manage &rarr;</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50/80 hover:bg-orange-100/80 border border-orange-200/80 text-[#ff5e3a] font-semibold text-[11px] transition cursor-pointer"
                            title="Edit service details and rate"
                          >
                            <Pencil size={11} />
                            <span>Quick Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL 1: PRECISION MULTI-MODE STOCK MANAGEMENT MODAL                   */}
      {/* ----------------------------------------------------------------------- */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <Boxes size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Manage Depot Stock &amp; Inventory</h2>
                  <p className="text-xs text-slate-500">Physical stock count audit, inbound receipts, and depot transfers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 4 Multi-Mode Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 mb-5">
              <button
                type="button"
                onClick={() => {
                  setStockOperation("RECEIVE");
                  setMovementType("PURCHASE_RECEIPT");
                }}
                className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  stockOperation === "RECEIVE"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Plus size={13} className="text-emerald-600" />
                <span>Receive (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStockOperation("SET_EXACT");
                  setMovementType("ADJUSTMENT");
                  const curLvl = stockLevelsList.find(
                    (s) => s.productId === selectedProductId && s.warehouseId === selectedWarehouseId
                  );
                  setExactCount(String(curLvl?.onHand ?? 0));
                }}
                className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  stockOperation === "SET_EXACT"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Audit Count (=)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStockOperation("DEDUCT");
                  setMovementType("ADJUSTMENT");
                }}
                className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  stockOperation === "DEDUCT"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Minus size={13} className="text-red-500" />
                <span>Issue / Scrap (-)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStockOperation("TRANSFER");
                  setMovementType("TRANSFER");
                }}
                className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  stockOperation === "TRANSFER"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowRightLeft size={13} className="text-indigo-600" />
                <span>Transfer (↔)</span>
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Product & Warehouse Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Product Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      const newPId = e.target.value;
                      setSelectedProductId(newPId);
                      const cur = stockLevelsList.find(
                        (s) => s.productId === newPId && s.warehouseId === selectedWarehouseId
                      );
                      setExactCount(String(cur?.onHand ?? 0));
                      const pr = productsList.find((p) => p.id === newPId);
                      setInboundCostPrice(String(pr?.costPrice ?? 0));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    required
                  >
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warehouse Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {stockOperation === "TRANSFER" ? "Source Depot (From)" : "Warehouse Depot"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => {
                      const newWId = e.target.value;
                      setSelectedWarehouseId(newWId);
                      const cur = stockLevelsList.find(
                        (s) => s.productId === selectedProductId && s.warehouseId === newWId
                      );
                      setExactCount(String(cur?.onHand ?? 0));
                      if (transferTargetWarehouseId === newWId) {
                        const other = warehousesList.find((w) => w.id !== newWId);
                        setTransferTargetWarehouseId(other?.id || "");
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    required
                  >
                    {warehousesList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* If TRANSFER mode: Destination Warehouse */}
              {stockOperation === "TRANSFER" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Depot (To) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transferTargetWarehouseId}
                    onChange={(e) => setTransferTargetWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="" disabled>
                      Select target destination warehouse
                    </option>
                    {warehousesList
                      .filter((w) => w.id !== selectedWarehouseId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.code ? `(${w.code})` : ""} - {w.location || "Location"}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Quantity Input Based on Operation */}
              {stockOperation === "SET_EXACT" ? (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                  <label className="block text-xs font-bold text-amber-900">
                    Physical Counted On-Hand Units (Exact Total) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={exactCount}
                    onChange={(e) => setExactCount(e.target.value)}
                    placeholder="Enter physical units counted on shelf"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Enter the exact physical quantity on the shelf. The system will automatically compute the net reconciliation adjustment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {stockOperation === "RECEIVE"
                        ? "Units to Receive (+)"
                        : stockOperation === "DEDUCT"
                        ? "Units to Deduct (-)"
                        : "Units to Transfer"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantityDelta}
                      onChange={(e) => setQuantityDelta(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Movement Classification
                    </label>
                    <select
                      value={movementType}
                      onChange={(e) => setMovementType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    >
                      {stockOperation === "RECEIVE" && (
                        <>
                          <option value="PURCHASE_RECEIPT">PO Inbound Receipt</option>
                          <option value="ADJUSTMENT">Stock Return / Found Inventory</option>
                        </>
                      )}
                      {stockOperation === "DEDUCT" && (
                        <>
                          <option value="ADJUSTMENT">Physical Damage / Scrap</option>
                          <option value="ORDER_FULFILLED">Manual Dispatch / Sampling</option>
                        </>
                      )}
                      {stockOperation === "TRANSFER" && (
                        <option value="TRANSFER">Inter-Depot Redistribution</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Dynamic Live Calculation Preview Card */}
              {(() => {
                const currentStockLvl = stockLevelsList.find(
                  (s) => s.productId === selectedProductId && s.warehouseId === selectedWarehouseId
                );
                const currentOnHand = currentStockLvl?.onHand ?? 0;
                const currentReserved = currentStockLvl?.reserved ?? 0;
                const currentProd = productsList.find((p) => p.id === selectedProductId);

                let deltaPreview = 0;
                let resultingOnHandPreview = currentOnHand;

                if (stockOperation === "SET_EXACT") {
                  const ex = parseInt(exactCount, 10);
                  resultingOnHandPreview = isNaN(ex) ? currentOnHand : ex;
                  deltaPreview = resultingOnHandPreview - currentOnHand;
                } else if (stockOperation === "RECEIVE") {
                  const q = parseInt(quantityDelta, 10);
                  deltaPreview = isNaN(q) ? 0 : Math.abs(q);
                  resultingOnHandPreview = currentOnHand + deltaPreview;
                } else if (stockOperation === "DEDUCT") {
                  const q = parseInt(quantityDelta, 10);
                  deltaPreview = isNaN(q) ? 0 : -Math.abs(q);
                  resultingOnHandPreview = currentOnHand + deltaPreview;
                } else if (stockOperation === "TRANSFER") {
                  const q = parseInt(quantityDelta, 10);
                  deltaPreview = isNaN(q) ? 0 : Math.abs(q);
                  resultingOnHandPreview = currentOnHand - deltaPreview;
                }

                const activeUnitCost =
                  updateCostPriceWithInbound &&
                  (stockOperation === "RECEIVE" || stockOperation === "SET_EXACT")
                    ? parseFloat(inboundCostPrice) || (currentProd?.costPrice ?? 0)
                    : currentProd?.costPrice ?? 0;

                const resultingValuation = Math.max(0, resultingOnHandPreview) * activeUnitCost;

                return (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                        Current On-Hand
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {currentOnHand} units
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({currentReserved} reserved)
                      </span>
                    </div>

                    <div className="flex items-center text-slate-300">
                      <ArrowRight size={18} />
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                        Resulting Stock
                      </span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          resultingOnHandPreview < 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {resultingOnHandPreview} units
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {deltaPreview >= 0 ? `+${deltaPreview}` : deltaPreview} net change
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                        Resulting Value
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{resultingValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        @ ₹{activeUnitCost.toFixed(2)}/unit
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Optional: Update Unit Cost on Inbound Receipt */}
              {(stockOperation === "RECEIVE" || stockOperation === "SET_EXACT") && (
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateCostPriceWithInbound}
                      onChange={(e) => setUpdateCostPriceWithInbound(e.target.checked)}
                      className="w-4 h-4 rounded text-[#ff5e3a] focus:ring-[#ff5e3a] border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Update Product Unit Cost from this Inbound Shipment
                    </span>
                  </label>

                  {updateCostPriceWithInbound && (
                    <div className="pl-6 pt-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        New Cost Price per Unit (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={inboundCostPrice}
                        onChange={(e) => setInboundCostPrice(e.target.value)}
                        className="w-48 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Updates the official catalog cost price and overall inventory valuation.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Audit Notes / Reference ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Notes / Reference ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-10492 inbound shipment or Q3 Physical Audit Count"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustStockMutation.isPending || updateProductMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {adjustStockMutation.isPending || updateProductMutation.isPending ? (
                    "Processing..."
                  ) : (
                    <>
                      <span>Apply Stock Update</span>
                      <Check size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL 2: ADD PRODUCT TO CATALOG & INITIAL WAREHOUSE STOCK               */}
      {/* ----------------------------------------------------------------------- */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <PackagePlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Product &amp; Stock</h2>
                  <p className="text-xs text-slate-500">Create new item and allocate initial inventory</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4">
              {/* Product Classification Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Classification Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewProdType("HARDWARE");
                      setNewProdUnit("UNIT");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      newProdType === "HARDWARE"
                        ? "border-[#ff5e3a] bg-orange-50/60 ring-2 ring-[#ff5e3a]/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Boxes size={16} className={newProdType === "HARDWARE" ? "text-[#ff5e3a]" : "text-slate-400"} />
                    <div className="font-bold text-xs text-slate-900 mt-1">Physical Hardware</div>
                    <div className="text-[10px] text-slate-500">Tracked in depots</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewProdType("SUBSCRIPTION");
                      setNewProdUnit("MONTH");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      newProdType === "SUBSCRIPTION"
                        ? "border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Zap size={16} className={newProdType === "SUBSCRIPTION" ? "text-purple-600" : "text-slate-400"} />
                    <div className="font-bold text-xs text-slate-900 mt-1">SaaS License</div>
                    <div className="text-[10px] text-slate-500">Cloud seats &amp; terms</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewProdType("SERVICE");
                      setNewProdUnit("HOUR");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      newProdType === "SERVICE"
                        ? "border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Clock size={16} className={newProdType === "SERVICE" ? "text-sky-600" : "text-slate-400"} />
                    <div className="font-bold text-xs text-slate-900 mt-1">Services</div>
                    <div className="text-[10px] text-slate-500">Consulting &amp; labor</div>
                  </button>
                </div>
              </div>

              {/* Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      newProdType === "HARDWARE"
                        ? "e.g. Industrial Edge Server 2U"
                        : newProdType === "SUBSCRIPTION"
                        ? "e.g. Enterprise Platform License"
                        : "e.g. Architecture Advisory Package"
                    }
                    value={newProdName}
                    onChange={(e) => {
                      setNewProdName(e.target.value);
                      if (!newProdSku) {
                        const autoSku = e.target.value
                          .replace(/[^a-zA-Z0-9]/g, "-")
                          .toUpperCase()
                          .slice(0, 12);
                        setNewProdSku(autoSku);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRV-2U-01"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>
              </div>

              {/* Pricing & Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    List Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 2999.00"
                    value={newProdBasePrice}
                    onChange={(e) => setNewProdBasePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Unit Cost (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Unit</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  >
                    {newProdType === "HARDWARE" ? (
                      <>
                        <option value="UNIT">Per Unit</option>
                        <option value="PROJECT">Per Batch</option>
                      </>
                    ) : newProdType === "SUBSCRIPTION" ? (
                      <>
                        <option value="MONTH">Monthly</option>
                        <option value="YEAR">Annual</option>
                        <option value="USER_MONTH">Seat / Month</option>
                      </>
                    ) : (
                      <>
                        <option value="HOUR">Hourly</option>
                        <option value="PROJECT">Per Project</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Initial Warehouse Stock Allocation (Only for Physical Hardware) */}
              {newProdType === "HARDWARE" && (
                <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck size={15} className="text-[#ff5e3a]" />
                    <span className="text-xs font-bold text-slate-900">
                      Initial Warehouse Stock Allocation
                    </span>
                  </div>

                  {warehousesList.length === 0 ? (
                    <div className="text-xs text-amber-800">
                      No warehouse created yet. Please create a warehouse first under{" "}
                      <Link href="/dashboard/admin/warehouses" className="underline font-semibold">
                        Warehouses
                      </Link>{" "}
                      to stock this item.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Stock into Warehouse Depot
                        </label>
                        <select
                          value={newProdWarehouseId}
                          onChange={(e) => setNewProdWarehouseId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                        >
                          {warehousesList.map((wh) => (
                            <option key={wh.id} value={wh.id}>
                              {wh.name} {wh.code ? `(${wh.code})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Initial Units On-Hand
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newProdInitialStock}
                          onChange={(e) => setNewProdInitialStock(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isCreatingProduct ? "Provisioning..." : "Create Product & Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL 3: EDIT PRODUCT PRICING & COMMERCIAL DATA                         */}
      {/* ----------------------------------------------------------------------- */}
      {isEditProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <Pencil size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Product &amp; Pricing</h2>
                  <p className="text-xs text-slate-500">
                    Update commercial cost price, list price, and catalog specifications
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditProductModalOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              {/* Product Type indicator */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Classification:</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-orange-100/70 text-[#ea4e28]">
                    {(editingProduct as any).type || editingProduct.category?.type || "HARDWARE"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  ID: {editingProduct.id.slice(0, 10)}...
                </div>
              </div>

              {/* Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product / Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>
              </div>

              {/* Commercial Pricing Grid */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Commercial Pricing &amp; Valuation
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Unit Cost Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editCostPrice}
                      onChange={(e) => setEditCostPrice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Determines warehouse holding inventory valuation
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      List Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editBasePrice}
                      onChange={(e) => setEditBasePrice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Default quotation &amp; sales catalog rate
                    </span>
                  </div>
                </div>

                {/* Live Margin Calculation */}
                {(() => {
                  const cost = parseFloat(editCostPrice) || 0;
                  const sell = parseFloat(editBasePrice) || 0;
                  const profit = sell - cost;
                  const marginPct = sell > 0 ? ((profit / sell) * 100).toFixed(1) : "0.0";
                  const isPositive = profit >= 0;

                  return (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Gross Margin per Unit:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          ₹{profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {marginPct}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Billing Unit & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  >
                    <option value="UNIT">Per Unit</option>
                    <option value="PROJECT">Per Batch / Project</option>
                    <option value="MONTH">Per Month</option>
                    <option value="YEAR">Per Year</option>
                    <option value="USER_MONTH">Seat / Month</option>
                    <option value="HOUR">Per Hour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catalog Status
                  </label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="editIsActive"
                        checked={editIsActive === true}
                        onChange={() => setEditIsActive(true)}
                        className="text-[#ff5e3a] focus:ring-[#ff5e3a]"
                      />
                      <span className="text-slate-800 font-medium">Active</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="editIsActive"
                        checked={editIsActive === false}
                        onChange={() => setEditIsActive(false)}
                        className="text-[#ff5e3a] focus:ring-[#ff5e3a]"
                      />
                      <span className="text-slate-500 font-medium">Archived</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Valuation Impact Notice */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                <span className="text-amber-600 font-bold">ℹ️</span>
                <span>
                  Updating <strong>Unit Cost Price</strong> will immediately recalculate total valuation
                  across all depots on this page in real-time.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingProduct ? (
                    "Saving..."
                  ) : (
                    <>
                      <span>Save Pricing &amp; Details</span>
                      <Check size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-8">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 text-xs font-semibold text-slate-600 shadow-sm">
            <Loader2 size={18} className="animate-spin text-[#ff5e3a]" />
            <span>Loading Inventory Operations Console...</span>
          </div>
        </div>
      }
    >
      <AdminInventoryPageContent />
    </Suspense>
  );
}
