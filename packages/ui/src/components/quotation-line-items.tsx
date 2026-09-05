"use client";

import { Minus, Plus, Trash2, PlusCircle, Package } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./button";

export interface LineItem {
  id: string;
  name: string;
  description: string;
  category: "license" | "services" | "support" | "hardware" | string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discountPercent: number;
}

interface QuotationLineItemsProps {
  items: LineItem[];
  readOnly?: boolean;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onUpdateDiscount?: (id: string, discount: number) => void;
  onRemoveItem?: (id: string) => void;
  onOpenCatalog?: () => void;
  onAddCustomItem?: () => void;
  className?: string;
}

export function QuotationLineItems({
  items,
  readOnly = false,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onOpenCatalog,
  onAddCustomItem,
  className,
}: QuotationLineItemsProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "license":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "services":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "support":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "hardware":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const totalContract = items.reduce((acc, item) => {
    const gross = item.unitPrice * item.quantity;
    const discount = gross * (item.discountPercent / 100);
    return acc + (gross - discount);
  }, 0);

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {/* Table Header / Action Row */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#0f172a]">Commercial Line Items</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {readOnly
              ? "Configured products, tier discounts, and net pricing"
              : "Configure quantities, negotiated discount tiers, and custom commercial services"}
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {onAddCustomItem && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onAddCustomItem}
                className="text-xs h-8 px-3 border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                + Custom Item
              </Button>
            )}
            {onOpenCatalog && (
              <Button
                size="sm"
                onClick={onOpenCatalog}
                className="text-xs h-8 px-3 bg-[#ff5e3a] hover:bg-[#e04e2b] text-white flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle size={14} />
                <span>Add from Catalog</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table or Empty State */}
      {items.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-[#ff5e3a] flex items-center justify-center mb-3">
            <Package size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Line Items Added</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Select standard catalog packages or add custom commercial services to build this proposal.
          </p>
          {onOpenCatalog && (
            <Button
              size="sm"
              onClick={onOpenCatalog}
              className="bg-[#ff5e3a] hover:bg-[#e04e2b] text-white text-xs h-8 px-4"
            >
              Browse Product Catalog
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Item Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit List</th>
                <th className="py-3 px-4 text-center min-w-[160px]">Discount</th>
                <th className="py-3 px-5 text-right">Net Total</th>
                {!readOnly && <th className="py-3 px-4 text-center w-12"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => {
                const gross = item.unitPrice * item.quantity;
                const discountAmount = gross * (item.discountPercent / 100);
                const net = gross - discountAmount;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md font-medium capitalize text-[10px] border",
                          getCategoryColor(item.category)
                        )}
                      >
                        {item.category}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {readOnly ? (
                        <div className="text-center font-bold text-slate-900">{item.quantity}</div>
                      ) : (
                        <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
                            className="p-1 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              onUpdateQuantity?.(item.id, isNaN(val) || val < 1 ? 1 : val);
                            }}
                            className="w-10 text-center text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                            className="p-1 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-mono text-slate-600">
                      ${item.unitPrice.toLocaleString()}
                    </td>

                    <td className="py-4 px-4">
                      {readOnly ? (
                        <div className="text-center font-semibold text-amber-700">
                          {item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="40"
                            step="1"
                            value={item.discountPercent}
                            onChange={(e) => onUpdateDiscount?.(item.id, Number(e.target.value))}
                            className="w-full accent-[#ff5e3a] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                          />
                          <span
                            className={cn(
                              "text-[11px] font-bold font-mono px-1.5 py-0.5 rounded min-w-[36px] text-center",
                              item.discountPercent > 20
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : item.discountPercent > 10
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            )}
                          >
                            {item.discountPercent}%
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right font-mono font-extrabold text-slate-900 text-sm">
                      ${Math.round(net).toLocaleString()}
                    </td>

                    {!readOnly && (
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItem?.(item.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t border-slate-200 font-semibold text-slate-900">
              <tr>
                <td
                  colSpan={readOnly ? 5 : 5}
                  className="py-3.5 px-5 text-right uppercase text-[11px] text-slate-500 font-bold"
                >
                  Contract Total Net Investment:
                </td>
                <td className="py-3.5 px-5 text-right text-base font-black text-[#ff5e3a]">
                  ${Math.round(totalContract).toLocaleString()}.00
                </td>
                {!readOnly && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
