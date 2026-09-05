"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Warehouse,
  AlertTriangle,
  Sparkles,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  MOCK_ADMIN_WAREHOUSES,
  type AdminWarehouse,
} from "../../../../../lib/admin-data";

interface StockAllocationRow {
  sku: string;
  name: string;
  category: string;
  denverOnHand: number;
  denverReserved: number;
  newarkOnHand: number;
  newarkReserved: number;
  sanjoseOnHand: number;
  sanjoseReserved: number;
  reorderPoint: number;
  unitCost: number;
}

const STOCK_ROWS: StockAllocationRow[] = [
  {
    sku: "HW-SRV-01",
    name: "Enterprise Edge Server 2U",
    category: "Hardware",
    denverOnHand: 25,
    denverReserved: 3,
    newarkOnHand: 8,
    newarkReserved: 0,
    sanjoseOnHand: 12,
    sanjoseReserved: 2,
    reorderPoint: 10,
    unitCost: 2925.0,
  },
  {
    sku: "HW-NET-01",
    name: "Gigabit Managed Switch 48-Port",
    category: "Hardware",
    denverOnHand: 60,
    denverReserved: 5,
    newarkOnHand: 20,
    newarkReserved: 2,
    sanjoseOnHand: 15,
    sanjoseReserved: 0,
    reorderPoint: 15,
    unitCost: 780.0,
  },
  {
    sku: "HW-TERM-01",
    name: "POS Rugged Industrial Terminal",
    category: "Hardware",
    denverOnHand: 80,
    denverReserved: 10,
    newarkOnHand: 30,
    newarkReserved: 0,
    sanjoseOnHand: 25,
    sanjoseReserved: 0,
    reorderPoint: 20,
    unitCost: 550.0,
  },
];

export default function AdminInventoryPage() {
  const [warehouses] = useState<AdminWarehouse[]>(MOCK_ADMIN_WAREHOUSES);
  const [stockRows] = useState<StockAllocationRow[]>(STOCK_ROWS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTriggerReplenishment = (sku: string, depot: string) => {
    showToast(`Replenishment purchase order dispatched for ${sku} at ${depot}!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Feedback */}
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
            <span className="text-[#ff5e3a]">Warehouse Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Multi-Warehouse Inventory &amp; Stock Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time physical inventory counts, shipping cost weight factors, and replenishment alerts across depots.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => showToast("All warehouse stock sync completed with central ERP ledger.")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <RefreshCw size={14} className="text-slate-500" />
          <span>Sync Stock Ledger</span>
        </button>
      </div>

      {/* WAREHOUSE DEPOT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {warehouses.map((wh) => (
          <div
            key={wh.id}
            className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Warehouse size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">{wh.name}</h2>
                    <span className="font-mono text-[11px] text-slate-400">{wh.code}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span>{wh.location}</span>
              </div>

              {/* Shipping factor & metrics */}
              <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shipping Cost Weight:</span>
                  <span className="font-mono font-bold text-slate-900">{wh.shippingCostWeight}x factor</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Physical Stock Count:</span>
                  <span className="font-mono font-extrabold text-slate-900">{wh.totalStockUnits} units</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Depot Valuation:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ${wh.totalStockValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              {wh.lowStockItemsCount > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>{wh.lowStockItemsCount} Low Stock Alert</span>
                </span>
              ) : (
                <span className="text-slate-400">All SKUs Above Reorder Point</span>
              )}
              <span className="font-mono text-slate-400">Prisma: Warehouse</span>
            </div>
          </div>
        ))}
      </div>

      {/* REAL-TIME STOCK LEDGER TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Real-Time Inventory Allocation Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live breakdown of on-hand vs reserved inventory across all nodes (`StockLevel` &amp; `StockMovement`)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">3 Hardware SKUs Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-5">SKU &amp; Product</th>
                <th className="py-3.5 text-center">Denver (WH-MAIN)</th>
                <th className="py-3.5 text-center">Newark (WH-EAST)</th>
                <th className="py-3.5 text-center">San Jose (WH-WEST)</th>
                <th className="py-3.5 text-right">Total Available</th>
                <th className="py-3.5 text-right">Inventory Value</th>
                <th className="py-3.5 pr-5 text-right">Requisition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stockRows.map((row) => {
                const totalOnHand = row.denverOnHand + row.newarkOnHand + row.sanjoseOnHand;
                const totalReserved = row.denverReserved + row.newarkReserved + row.sanjoseReserved;
                const totalAvailable = totalOnHand - totalReserved;
                const totalValue = totalOnHand * row.unitCost;

                return (
                  <tr key={row.sku} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-5">
                      <div className="font-bold text-slate-900">{row.name}</div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">{row.sku}</div>
                    </td>

                    {/* Denver */}
                    <td className="py-3.5 text-center">
                      <div className="font-mono font-bold text-slate-900">{row.denverOnHand}</div>
                      <div className="text-[10px] text-slate-400 font-mono">({row.denverReserved} resv)</div>
                    </td>

                    {/* Newark */}
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`font-mono font-bold ${
                            row.newarkOnHand < row.reorderPoint ? "text-amber-600" : "text-slate-900"
                          }`}
                        >
                          {row.newarkOnHand}
                        </span>
                        {row.newarkOnHand < row.reorderPoint && (
                          <span
                            title="Below Reorder Threshold"
                            className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                          />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">({row.newarkReserved} resv)</div>
                    </td>

                    {/* San Jose */}
                    <td className="py-3.5 text-center">
                      <div className="font-mono font-bold text-slate-900">{row.sanjoseOnHand}</div>
                      <div className="text-[10px] text-slate-400 font-mono">({row.sanjoseReserved} resv)</div>
                    </td>

                    {/* Total Available */}
                    <td className="py-3.5 text-right">
                      <div className="font-mono font-extrabold text-slate-900">{totalAvailable} units</div>
                      <div className="text-[10px] text-slate-400 font-mono">{totalReserved} committed</div>
                    </td>

                    {/* Inventory Value */}
                    <td className="py-3.5 text-right font-mono font-bold text-emerald-700">
                      ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 pr-5 text-right">
                      {row.newarkOnHand < row.reorderPoint ? (
                        <button
                          type="button"
                          onClick={() => handleTriggerReplenishment(row.sku, "Newark Depot")}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                        >
                          Restock Newark
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => showToast(`Stock levels optimal for ${row.sku}`)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Optimal
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
