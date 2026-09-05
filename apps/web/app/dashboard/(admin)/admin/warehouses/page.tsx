"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  Truck,
  Boxes,
  AlertTriangle,
  Edit2,
  Trash2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  X,
  Building2,
  ArrowRight,
} from "lucide-react";
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  useStockLevels,
  type WarehouseData,
} from "../../../../../lib/query";

export default function AdminWarehousesPage() {
  const { data: apiWarehouses, isLoading, refetch } = useWarehouses(true);
  const { data: apiStockLevels } = useStockLevels();

  const createWarehouseMutation = useCreateWarehouse();
  const updateWarehouseMutation = useUpdateWarehouse();
  const deleteWarehouseMutation = useDeleteWarehouse();

  const warehousesList: WarehouseData[] = Array.isArray(apiWarehouses) ? apiWarehouses : [];
  const stockLevelsList = Array.isArray(apiStockLevels) ? apiStockLevels : [];

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formWeight, setFormWeight] = useState("1.0");
  const [formCapacity, setFormCapacity] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormLocation("");
    setFormWeight("1.0");
    setFormCapacity("");
    setFormIsActive(true);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (wh: WarehouseData) => {
    setEditingWarehouse(wh);
    setFormName(wh.name);
    setFormCode(wh.code || "");
    setFormLocation(wh.location || wh.address || "");
    setFormWeight(String(wh.shippingCostWeight ?? 1.0));
    setFormCapacity(wh.capacity ? String(wh.capacity) : "");
    setFormIsActive(wh.isActive);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      await createWarehouseMutation.mutateAsync({
        name: formName.trim(),
        code: formCode.trim() ? formCode.trim().toUpperCase() : undefined,
        location: formLocation.trim() || undefined,
        shippingCostWeight: parseFloat(formWeight) || 1.0,
        capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
        isActive: formIsActive,
      });
      showToast(`Warehouse facility "${formName}" created successfully!`);
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      showToast(`Failed to create warehouse: ${err?.message || "Unknown error"}`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse || !formName.trim()) return;

    try {
      await updateWarehouseMutation.mutateAsync({
        id: editingWarehouse.id,
        name: formName.trim(),
        code: formCode.trim() ? formCode.trim().toUpperCase() : undefined,
        location: formLocation.trim() || undefined,
        shippingCostWeight: parseFloat(formWeight) || 1.0,
        capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
        isActive: formIsActive,
      });
      showToast(`Warehouse "${formName}" updated successfully!`);
      setEditingWarehouse(null);
      resetForm();
    } catch (err: any) {
      showToast(`Failed to update warehouse: ${err?.message || "Unknown error"}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWarehouseId) return;
    const target = warehousesList.find((w) => w.id === deletingWarehouseId);

    try {
      await deleteWarehouseMutation.mutateAsync(deletingWarehouseId);
      showToast(`Warehouse "${target?.name || "facility"}" deleted / deactivated.`);
      setDeletingWarehouseId(null);
    } catch (err: any) {
      showToast(`Failed to delete warehouse: ${err?.message || "Unknown error"}`);
    }
  };

  // KPIs
  const totalWarehouses = warehousesList.length;
  const activeWarehouses = warehousesList.filter((w) => w.isActive).length;
  const totalStockUnits = stockLevelsList.reduce((acc, s) => acc + (s.onHand || 0), 0);
  const lowStockDepots = warehousesList.filter((wh) => {
    const whLevels = stockLevelsList.filter((s) => s.warehouseId === wh.id);
    return whLevels.some((s) => (s.onHand || 0) <= (s.reorderPoint || 10));
  }).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <Sparkles size={14} className="text-[#ff5e3a]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/dashboard/admin" className="hover:text-slate-900">Admin Console</Link>
            <span>/</span>
            <span className="text-[#ff5e3a]">Warehouses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Warehouse Network &amp; Facility Logistics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure distribution depots, shipping cost weight multipliers, and regional fulfillment routing boundaries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-slate-400" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Warehouse</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Facilities</span>
            <Building2 size={16} className="text-[#ff5e3a]" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalWarehouses}</div>
          <div className="text-[11px] text-slate-500 mt-1">{activeWarehouses} Active for routing</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stored Units</span>
            <Boxes size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalStockUnits.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all depots</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fulfillment Routing</span>
            <Truck size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">Greedy Split</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Cost-weight optimized</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Replenish Alerts</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{lowStockDepots}</div>
          <div className="text-[11px] text-slate-500 mt-1">Depots with low stock items</div>
        </div>
      </div>

      {/* Warehouse Facilities List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configured Facilities &amp; Depots</h2>
            <p className="text-xs text-slate-500">
              Manage facility profiles, dispatch weights, and physical inventory locations.
            </p>
          </div>
          <Link
            href="/dashboard/admin/inventory"
            className="text-xs font-semibold text-[#ff5e3a] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Inventory Ledger</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {warehousesList.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center mx-auto">
              <WarehouseIcon size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Warehouses Configured</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                You haven&apos;t added any warehouse facilities yet. Create your first depot to begin allocating physical inventory and enabling order fulfillment.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Your First Warehouse</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehousesList.map((wh) => {
              const whLevels = stockLevelsList.filter((s) => s.warehouseId === wh.id);
              const totalDepotUnits = whLevels.reduce((acc, s) => acc + (s.onHand || 0), 0);
              const lowStockCount = whLevels.filter((s) => (s.onHand || 0) <= (s.reorderPoint || 10)).length;

              return (
                <div
                  key={wh.id}
                  className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    {/* Top: Name & Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{wh.name}</h3>
                          {wh.code && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-700">
                              {wh.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{wh.location || wh.address || "Unspecified Location"}</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${wh.isActive
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                            : "bg-slate-100 border border-slate-200 text-slate-500"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${wh.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                        />
                        <span>{wh.isActive ? "Active Depot" : "Inactive"}</span>
                      </span>
                    </div>

                    {/* Depot Specs & Delivery Factor */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Truck size={13} className="text-slate-400" />
                          <span>Delivery Cost Factor:</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {wh.shippingCostWeight ?? 1.0}x{" "}
                          <span className="text-[10px] font-medium text-slate-500">
                            ({(wh.shippingCostWeight ?? 1.0) === 1.0 ? "Standard" : (wh.shippingCostWeight ?? 1.0) < 1.0 ? "Preferred" : "Remote"})
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Boxes size={13} className="text-slate-400" />
                          <span>Physical Stock Units:</span>
                        </span>
                        <span className="font-mono font-extrabold text-slate-900">
                          {totalDepotUnits.toLocaleString()} units
                        </span>
                      </div>

                      {wh.capacity && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Storage Capacity:</span>
                          <span className="font-mono text-slate-700">{wh.capacity.toLocaleString()} max</span>
                        </div>
                      )}
                    </div>

                    {/* Low Stock Warning */}
                    {lowStockCount > 0 ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 mb-4">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span>{lowStockCount} items at or below reorder point</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-800 text-xs flex items-center gap-2 mb-4">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>All SKU inventory healthy</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/admin/inventory?warehouseId=${wh.id}&action=stock`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ff5e3a]/10 hover:bg-[#ff5e3a]/20 border border-[#ff5e3a]/30 text-[#ff5e3a] text-xs font-semibold transition"
                      >
                        <Plus size={12} />
                        <span>Stock Products</span>
                      </Link>
                      <Link
                        href={`/dashboard/admin/inventory?warehouseId=${wh.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                      >
                        <span>Ledger</span>
                        <ExternalLink size={11} />
                      </Link>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(wh)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        title="Edit Warehouse"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingWarehouseId(wh.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Warehouse"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE WAREHOUSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <WarehouseIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Warehouse Depot</h2>
                  <p className="text-xs text-slate-500">Configure a new physical fulfillment facility</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicago Logistics Depot"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Depot Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WH-CHI"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Delivery Cost Factor (Priority)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{formWeight}x</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    1.0x = Standard. Lower (0.8x) is preferred / cheaper shipping.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setFormWeight("0.8")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${formWeight === "0.8" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      0.8x (Preferred)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormWeight("1.0")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${formWeight === "1.0" ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      1.0x (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormWeight("1.5")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${formWeight === "1.5" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      1.5x (Remote)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Address / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1400 Industrial Pkwy, Chicago, IL"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storage Capacity (Optional Units)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveNew"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-[#ff5e3a] focus:ring-[#ff5e3a]"
                />
                <label htmlFor="isActiveNew" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Activate immediately for automated split-fulfillment routing
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWarehouseMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {createWarehouseMutation.isPending ? "Creating..." : "Create Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WAREHOUSE MODAL */}
      {editingWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Warehouse Depot</h2>
                  <p className="text-xs text-slate-500">Update facility logistics parameters</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWarehouse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Depot Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Delivery Cost Factor</label>
                    <span className="text-[10px] text-slate-400 font-mono">{formWeight}x</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setFormWeight("0.8")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                        formWeight === "0.8" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      0.8x
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormWeight("1.0")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                        formWeight === "1.0" ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      1.0x
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormWeight("1.5")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                        formWeight === "1.5" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      1.5x
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Address</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Capacity</label>
                <input
                  type="number"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5e3a]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-[#ff5e3a] focus:ring-[#ff5e3a]"
                />
                <label htmlFor="isActiveEdit" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Depot active for order fulfillment
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateWarehouseMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {updateWarehouseMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingWarehouseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Deactivate Warehouse?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to deactivate this depot? It will no longer receive split-fulfillment order allocations.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWarehouseId(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteWarehouseMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleteWarehouseMutation.isPending ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
