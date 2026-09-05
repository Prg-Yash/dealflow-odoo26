"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Boxes,
  Warehouse as WarehouseIcon,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Plus,
  Minus,
  ArrowRightLeft,
  Check,
  PackageCheck,
  Truck,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  History,
  ShieldAlert,
  Sparkles,
  Layers,
  X,
} from "lucide-react";
import {
  useProduct,
  useUpdateProduct,
  useWarehouses,
  useStockLevels,
  useStockMovements,
  useAdjustStock,
  type WarehouseData,
  type StockLevelData,
  type StockMovementData,
} from "../../../../../../lib/query";

export default function SingleInventoryStockItemPage(props: { params: Promise<{ id: string }> }) {
  // Unwrap Next.js 15/16 async params safely
  const resolvedParams = use(props.params);
  const productId = resolvedParams.id;
  const router = useRouter();

  // Live TanStack Data Hooks
  const {
    data: product,
    isLoading: isProductLoading,
    refetch: refetchProduct,
  } = useProduct(productId);

  const {
    data: apiWarehouses,
    isLoading: isWhLoading,
    refetch: refetchWarehouses,
  } = useWarehouses(true);

  const {
    data: apiStockLevels,
    isLoading: isStockLoading,
    refetch: refetchStock,
  } = useStockLevels({ productId });

  const {
    data: apiMovements,
    isLoading: isMovementsLoading,
    refetch: refetchMovements,
  } = useStockMovements({ productId });

  const updateProductMutation = useUpdateProduct();
  const adjustStockMutation = useAdjustStock();

  const warehousesList: WarehouseData[] = Array.isArray(apiWarehouses) ? apiWarehouses : [];
  const stockLevelsList: StockLevelData[] = Array.isArray(apiStockLevels) ? apiStockLevels : [];
  const movementsList: StockMovementData[] = Array.isArray(apiMovements) ? apiMovements : [];

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchProduct(), refetchWarehouses(), refetchStock(), refetchMovements()]);
    showToast("Stock levels, pricing, and audit ledger refreshed.");
  };

  // ---------------------------------------------------------------------------
  // Section 1: Commercial Pricing & Master Details State
  // ---------------------------------------------------------------------------
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [unit, setUnit] = useState("UNIT");
  const [isActive, setIsActive] = useState(true);
  const [isPromoted, setIsPromoted] = useState(false);
  const [description, setDescription] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Sync form inputs when product loads
  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setSku(product.sku || "");
      setBasePrice(String(product.basePrice ?? 0));
      setCostPrice(String(product.costPrice ?? 0));
      setUnit(product.unitType || product.unit || "UNIT");
      setIsActive(product.isActive ?? true);
      setIsPromoted(product.isPromoted ?? false);
      setDescription(product.description || "");
    }
  }, [product]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      showToast("Product name and SKU are required.");
      return;
    }

    const bp = parseFloat(basePrice);
    const cp = parseFloat(costPrice);

    if (isNaN(bp) || bp < 0 || isNaN(cp) || cp < 0) {
      showToast("Please enter valid positive pricing numbers.");
      return;
    }

    setIsSavingProduct(true);
    try {
      await updateProductMutation.mutateAsync({
        id: productId,
        body: {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          basePrice: bp,
          costPrice: cp,
          unit,
          isActive,
          isPromoted,
          description: description.trim() || undefined,
        },
      });

      showToast(
        `Commercial details saved! Cost: ₹${cp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}, Selling: ₹${bp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      );
      await Promise.all([refetchProduct(), refetchStock(), refetchMovements()]);
    } catch (err: any) {
      showToast(`Error saving product: ${err?.message || "Failed to update"}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Section 2: Stock Adjustment Drawer / Modal
  // ---------------------------------------------------------------------------
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [stockOperation, setStockOperation] = useState<"SET_EXACT" | "RECEIVE" | "DEDUCT" | "TRANSFER">("SET_EXACT");
  const [exactCount, setExactCount] = useState("0");
  const [quantityDelta, setQuantityDelta] = useState("10");
  const [transferTargetWarehouseId, setTransferTargetWarehouseId] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [updateCostOnInbound, setUpdateCostOnInbound] = useState(false);
  const [inboundUnitCost, setInboundUnitCost] = useState("0");

  const handleOpenStockAction = (
    warehouseId: string,
    operation: "SET_EXACT" | "RECEIVE" | "DEDUCT" | "TRANSFER"
  ) => {
    setTargetWarehouseId(warehouseId);
    setStockOperation(operation);

    const level = stockLevelsList.find((s) => s.warehouseId === warehouseId);
    const currentOnHand = level?.onHand ?? 0;

    setExactCount(String(currentOnHand));
    setQuantityDelta("10");
    setAdjustmentNotes("");
    setUpdateCostOnInbound(false);
    setInboundUnitCost(String(product?.costPrice ?? costPrice));

    const otherWh = warehousesList.find((w) => w.id !== warehouseId);
    setTransferTargetWarehouseId(otherWh?.id || "");

    setIsAdjustModalOpen(true);
  };

  const handleApplyStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWarehouseId) {
      showToast("Please select a target warehouse depot.");
      return;
    }

    const currentLvl = stockLevelsList.find((s) => s.warehouseId === targetWarehouseId);
    const currentOnHand = currentLvl?.onHand ?? 0;
    const currentWh = warehousesList.find((w) => w.id === targetWarehouseId);

    let finalDelta = 0;
    let finalMovementType: "ADJUSTMENT" | "PURCHASE_RECEIPT" | "TRANSFER" = "ADJUSTMENT";

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
        showToast("Receipt quantity must be a positive integer.");
        return;
      }
      finalDelta = qty;
      finalMovementType = "PURCHASE_RECEIPT";
    } else if (stockOperation === "DEDUCT") {
      const qty = parseInt(quantityDelta, 10);
      if (isNaN(qty) || qty <= 0) {
        showToast("Deduction quantity must be a positive integer.");
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
      if (qty > currentOnHand) {
        showToast(`Cannot transfer ${qty} units: only ${currentOnHand} units on-hand in source depot.`);
        return;
      }
      if (!transferTargetWarehouseId || transferTargetWarehouseId === targetWarehouseId) {
        showToast("Please select a distinct destination warehouse depot.");
        return;
      }
    }

    try {
      if (stockOperation === "TRANSFER") {
        const qty = parseInt(quantityDelta, 10);
        const targetWh = warehousesList.find((w) => w.id === transferTargetWarehouseId);

        // Deduct from source
        await adjustStockMutation.mutateAsync({
          warehouseId: targetWarehouseId,
          productId,
          quantityDelta: -qty,
          movementType: "TRANSFER",
          referenceId: `TRF-OUT-${Date.now().toString().slice(-6)}`,
          notes: `Transferred to ${targetWh?.name || "depot"}. ${adjustmentNotes.trim()}`,
        });

        // Add to destination
        await adjustStockMutation.mutateAsync({
          warehouseId: transferTargetWarehouseId,
          productId,
          quantityDelta: qty,
          movementType: "TRANSFER",
          referenceId: `TRF-IN-${Date.now().toString().slice(-6)}`,
          notes: `Transferred from ${currentWh?.name || "depot"}. ${adjustmentNotes.trim()}`,
        });

        showToast(
          `Transferred ${qty} units from ${currentWh?.name} to ${targetWh?.name} successfully!`
        );
      } else {
        // Handle optional cost price update on inbound PO receipt
        if (stockOperation === "RECEIVE" && updateCostOnInbound) {
          const newCost = parseFloat(inboundUnitCost);
          if (!isNaN(newCost) && newCost > 0) {
            await updateProductMutation.mutateAsync({
              id: productId,
              body: { costPrice: newCost },
            });
            setCostPrice(String(newCost));
          }
        }

        await adjustStockMutation.mutateAsync({
          warehouseId: targetWarehouseId,
          productId,
          quantityDelta: finalDelta,
          movementType: finalMovementType,
          referenceId: `STK-${Date.now().toString().slice(-6)}`,
          notes: adjustmentNotes.trim() || `${stockOperation} stock adjustment`,
        });

        const newTotal = currentOnHand + finalDelta;
        showToast(
          `Stock updated for ${currentWh?.name || "depot"}: ${newTotal} units on-hand (${finalDelta > 0 ? `+${finalDelta}` : finalDelta})!`
        );
      }

      setIsAdjustModalOpen(false);
      await Promise.all([refetchStock(), refetchMovements(), refetchProduct(), refetchWarehouses()]);
    } catch (err: any) {
      showToast(`Stock update error: ${err?.message || "Failed to update ledger"}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Aggregate Metrics Calculations
  // ---------------------------------------------------------------------------
  const currentCostPrice = parseFloat(costPrice) || product?.costPrice || 0;
  const currentBasePrice = parseFloat(basePrice) || product?.basePrice || 0;

  const totalOnHand = stockLevelsList.reduce((acc, s) => acc + (s.onHand ?? 0), 0);
  const totalReserved = stockLevelsList.reduce((acc, s) => acc + (s.reserved ?? 0), 0);
  const totalAvailable = Math.max(0, totalOnHand - totalReserved);
  const totalInventoryValuation = totalOnHand * currentCostPrice;

  const unitGrossProfit = currentBasePrice - currentCostPrice;
  const unitGrossMarginPct =
    currentBasePrice > 0 ? ((unitGrossProfit / currentBasePrice) * 100).toFixed(1) : "0.0";
  const unitMarkupPct =
    currentCostPrice > 0 ? ((unitGrossProfit / currentCostPrice) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
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
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
            <Link
              href="/dashboard/admin/inventory"
              className="inline-flex items-center gap-1 hover:text-slate-900 transition"
            >
              <ArrowLeft size={13} />
              <span>Back to Inventory Hub</span>
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-400">{product?.sku || sku}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {product?.name || name || "Inventory Stock Item"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-orange-50 text-[#ff5e3a] border border-orange-200">
              {(product as any)?.category?.type || (product as any)?.type || "HARDWARE"}
            </span>
            {isActive ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Catalog</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                <span>Archived</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            SKU Code: <strong className="font-mono text-slate-700">{product?.sku || sku}</strong> &bull;
            Single Stock Management Console &amp; Commercial Pricing Master
          </p>
        </div>

        {/* Global Sync & Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw
              size={13}
              className={isProductLoading || isStockLoading ? "animate-spin text-[#ff5e3a]" : ""}
            />
            <span>Synchronize</span>
          </button>

          {warehousesList[0] && (
            <button
              type="button"
              onClick={() => handleOpenStockAction(warehousesList[0]!.id, "RECEIVE")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Receive / Inbound Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total On-Hand</span>
            <Boxes size={15} className="text-[#ff5e3a]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalOnHand}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across {stockLevelsList.length} warehouse depots
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Available</span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">{totalAvailable}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {totalReserved} units reserved in orders
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Valuation</span>
            <TrendingUp size={15} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{totalInventoryValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            At ₹{currentCostPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / unit cost
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Commercial Margin</span>
            <span className="text-xs font-bold text-emerald-600 font-mono">{unitGrossMarginPct}%</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{unitGrossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Markup: {unitMarkupPct}% &bull; Sell: ₹{currentBasePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Depots Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* =================================================================== */}
        {/* LEFT: COMMERCIAL PRICING & PRODUCT MASTER FORM                      */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Commercial Master &amp; Pricing</h2>
                  <p className="text-xs text-slate-500">
                    Live unit cost, list price, and catalog specifications
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product / Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dell Laptop Charger 150W"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              {/* SKU Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SKU Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. DA_0002"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              {/* Commercial Pricing Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Commercial Valuation &amp; Pricing</span>
                  <span className="text-[10px] text-slate-500">Live Indian Rupee (₹)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Unit Cost Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cost of Goods / Holding baseline
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      List Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Quotation sales catalog rate
                    </span>
                  </div>
                </div>

                {/* Real-Time Gross Margin Card */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Gross Margin per Unit:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold font-mono ${
                        unitGrossProfit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      ₹{unitGrossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        unitGrossProfit >= 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {unitGrossMarginPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Unit of Measure & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  >
                    <option value="UNIT">UNIT (Per Unit)</option>
                    <option value="PROJECT">PROJECT (Batch)</option>
                    <option value="MONTH">MONTH (Recurring)</option>
                    <option value="YEAR">YEAR (Annual)</option>
                    <option value="USER_MONTH">USER_MONTH (Seat)</option>
                    <option value="HOUR">HOUR (Hourly)</option>
                    <option value="PACK">PACK (Bulk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catalog Status
                  </label>
                  <div className="flex items-center gap-4 pt-2.5">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="isActiveToggle"
                        checked={isActive === true}
                        onChange={() => setIsActive(true)}
                        className="text-[#ff5e3a] focus:ring-[#ff5e3a]"
                      />
                      <span className="text-slate-800 font-medium">Active</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="isActiveToggle"
                        checked={isActive === false}
                        onChange={() => setIsActive(false)}
                        className="text-[#ff5e3a] focus:ring-[#ff5e3a]"
                      />
                      <span className="text-slate-500 font-medium">Archived</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key specifications, part numbers, warranty notes..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              {/* Priority Upsell Checkbox */}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isPromoted}
                  onChange={(e) => setIsPromoted(e.target.checked)}
                  className="w-4 h-4 rounded text-[#ff5e3a] focus:ring-[#ff5e3a]"
                />
                <span>Prioritize in CPQ quote recommendations (`isPromoted`)</span>
              </label>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="w-full py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingProduct ? (
                    "Saving Changes..."
                  ) : (
                    <>
                      <span>Save Pricing &amp; Commercial Master</span>
                      <Check size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT: WAREHOUSE DEPOT ALLOCATIONS & AUDIT LEDGER                   */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* DEPOT ALLOCATION CARDS */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <WarehouseIcon size={18} className="text-[#ff5e3a]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Warehouse Holding Depots</h2>
                  <p className="text-xs text-slate-500">
                    Live stock levels across configured physical warehouse locations
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                {warehousesList.length} Facilities
              </span>
            </div>

            {warehousesList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                No warehouse facilities configured in this organization yet. Please create a warehouse first under{" "}
                <Link href="/dashboard/admin/warehouses" className="text-[#ff5e3a] font-semibold underline">
                  Warehouses
                </Link>.
              </div>
            ) : (
              <div className="space-y-3">
                {warehousesList.map((wh) => {
                  const level = stockLevelsList.find((s) => s.warehouseId === wh.id);
                  const onHand = level?.onHand ?? 0;
                  const reserved = level?.reserved ?? 0;
                  const available = Math.max(0, onHand - reserved);
                  const depotValuation = onHand * currentCostPrice;
                  const reorderPoint = level?.reorderPoint ?? 20;
                  const isLow = available <= reorderPoint;

                  return (
                    <div
                      key={wh.id}
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{wh.name}</span>
                          {wh.code && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-semibold">
                              {wh.code}
                            </span>
                          )}
                          {wh.location && (
                            <span className="text-[11px] text-slate-400">({wh.location})</span>
                          )}
                        </div>

                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={11} />
                            <span>Low Stock (≤ {reorderPoint})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />
                            <span>Optimal Holding</span>
                          </span>
                        )}
                      </div>

                      {/* Stock Counts Matrix */}
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-center">
                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            On-Hand
                          </span>
                          <span className="text-base font-black font-mono text-slate-900">
                            {onHand}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            Reserved
                          </span>
                          <span className="text-base font-black font-mono text-amber-600">
                            {reserved}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            Available
                          </span>
                          <span className="text-base font-black font-mono text-emerald-600">
                            {available}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">
                            Valuation
                          </span>
                          <span className="text-xs font-black font-mono text-slate-900 mt-1 block">
                            ₹{depotValuation.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {/* Precision Action Triggers */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">Quick Depot Adjustments:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenStockAction(wh.id, "SET_EXACT")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                            title="Set exact physical count"
                          >
                            <span>Audit (=)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenStockAction(wh.id, "RECEIVE")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                            title="Receive inbound PO inventory"
                          >
                            <Plus size={11} />
                            <span>Receive</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenStockAction(wh.id, "DEDUCT")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                            title="Deduct damaged or scrapped inventory"
                          >
                            <Minus size={11} />
                            <span>Deduct</span>
                          </button>

                          {warehousesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleOpenStockAction(wh.id, "TRANSFER")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                              title="Transfer stock to another warehouse"
                            >
                              <ArrowRightLeft size={11} />
                              <span>Transfer</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AUDIT LEDGER MOVEMENT HISTORY */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History size={17} className="text-[#ff5e3a]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Stock Movement Audit Trail</h2>
                  <p className="text-xs text-slate-500">
                    Immutable transactional ledger of inbound receipts, physical audits, and allocations
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {movementsList.length} Entries
              </span>
            </div>

            {movementsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                No stock movements recorded yet for this SKU.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 pl-3">Date &amp; Time</th>
                      <th className="py-2.5">Depot Facility</th>
                      <th className="py-2.5">Operation Type</th>
                      <th className="py-2.5 text-right">Quantity</th>
                      <th className="py-2.5 pr-3">Reference / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {movementsList.map((m) => {
                      const isPositive = m.quantity > 0;
                      const dateStr = new Date(m.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const typeColor =
                        m.movementType === "PURCHASE_RECEIPT"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : m.movementType === "TRANSFER"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : m.movementType === "ORDER_RESERVED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : m.movementType === "ORDER_FULFILLED"
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : "bg-slate-100 text-slate-700 border-slate-200";

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pl-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="py-2.5 font-semibold text-slate-900">
                            {m.warehouse?.name || "Depot"}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeColor}`}>
                              {m.movementType}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold">
                            <span className={isPositive ? "text-emerald-600" : "text-red-600"}>
                              {isPositive ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-[11px] text-slate-500 max-w-xs truncate">
                            {m.referenceId && (
                              <span className="font-mono font-semibold text-slate-700 mr-1.5">
                                [{m.referenceId}]
                              </span>
                            )}
                            {m.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: PRECISION MULTI-MODE STOCK ADJUSTMENT CONSOLE                  */}
      {/* ===================================================================== */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <Boxes size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Precision Stock Management</h2>
                  <p className="text-xs text-slate-500">{product?.name || name} ({product?.sku || sku})</p>
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

            <form onSubmit={handleApplyStockAdjustment} className="space-y-4">
              {/* Target Warehouse Depot */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warehouse Depot <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                >
                  {warehousesList.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4-Mode Action Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Stock Operation Mode
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setStockOperation("SET_EXACT")}
                    className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                      stockOperation === "SET_EXACT"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Exact Count (=)
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockOperation("RECEIVE")}
                    className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                      stockOperation === "RECEIVE"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Receive (+)
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockOperation("DEDUCT")}
                    className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                      stockOperation === "DEDUCT"
                        ? "bg-red-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Deduct (-)
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockOperation("TRANSFER")}
                    className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                      stockOperation === "TRANSFER"
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Transfer (↔)
                  </button>
                </div>
              </div>

              {/* Mode-Specific Input Field */}
              {stockOperation === "SET_EXACT" && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1.5">
                  <label className="block text-xs font-bold text-blue-950">
                    Physical Counted Quantity (Exact Total Floor Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={exactCount}
                    onChange={(e) => setExactCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-blue-800">
                    Enter the exact count verified on the floor. Ledger automatically computes required delta.
                  </p>
                </div>
              )}

              {stockOperation === "RECEIVE" && (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-950">
                    Inbound Shipment Quantity to Add (+)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityDelta}
                    onChange={(e) => setQuantityDelta(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {stockOperation === "DEDUCT" && (
                <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200/80 space-y-1.5">
                  <label className="block text-xs font-bold text-red-950">
                    Units to Remove / Scrap (-)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityDelta}
                    onChange={(e) => setQuantityDelta(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {stockOperation === "TRANSFER" && (
                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-950 mb-1">
                      Units to Relocate (↔)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantityDelta}
                      onChange={(e) => setQuantityDelta(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-purple-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-950 mb-1">
                      Destination Warehouse Depot
                    </label>
                    <select
                      value={transferTargetWarehouseId}
                      onChange={(e) => setTransferTargetWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-purple-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {warehousesList
                        .filter((w) => w.id !== targetWarehouseId)
                        .map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.name} {wh.code ? `(${wh.code})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Dynamic Live Preview Card */}
              {(() => {
                const currentLvl = stockLevelsList.find((s) => s.warehouseId === targetWarehouseId);
                const current = currentLvl?.onHand ?? 0;
                let next = current;
                let delta = 0;

                if (stockOperation === "SET_EXACT") {
                  const exact = parseInt(exactCount, 10) || 0;
                  next = exact;
                  delta = exact - current;
                } else if (stockOperation === "RECEIVE") {
                  const q = parseInt(quantityDelta, 10) || 0;
                  next = current + q;
                  delta = q;
                } else if (stockOperation === "DEDUCT" || stockOperation === "TRANSFER") {
                  const q = parseInt(quantityDelta, 10) || 0;
                  next = Math.max(0, current - q);
                  delta = -q;
                }

                const projectedValuation = next * currentCostPrice;

                return (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="font-bold text-slate-700">Projected Ledger Impact</div>
                    <div className="grid grid-cols-4 gap-2 text-center pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Current</span>
                        <span className="font-mono font-bold text-slate-800">{current}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Change</span>
                        <span
                          className={`font-mono font-bold ${
                            delta > 0
                              ? "text-emerald-600"
                              : delta < 0
                              ? "text-red-600"
                              : "text-slate-500"
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Resulting</span>
                        <span className="font-mono font-bold text-slate-900">{next}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Valuation</span>
                        <span className="font-mono font-bold text-[#ff5e3a]">
                          ₹{projectedValuation.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Inbound Cost Price Update Toggle */}
              {stockOperation === "RECEIVE" && (
                <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/80 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateCostOnInbound}
                      onChange={(e) => setUpdateCostOnInbound(e.target.checked)}
                      className="w-4 h-4 rounded text-[#ff5e3a] focus:ring-[#ff5e3a] border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Update Product Unit Cost from this Inbound Shipment
                    </span>
                  </label>

                  {updateCostOnInbound && (
                    <div className="pl-6 pt-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        New Unit Cost Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={inboundUnitCost}
                        onChange={(e) => setInboundUnitCost(e.target.value)}
                        className="w-48 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Audit Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Notes / Reference ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-10293 inbound shipment or Q3 Physical Stock Count"
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
                  {adjustStockMutation.isPending ? (
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
    </div>
  );
}
