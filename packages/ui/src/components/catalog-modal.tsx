"use client";

import { useState } from "react";
import { Search, Plus, Check, Filter } from "lucide-react";
import { cn } from "../lib/cn";
import { Modal } from "./modal";
import { Button } from "./button";

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  category: "license" | "services" | "support" | "hardware" | string;
  unitPrice: number;
  costPrice: number;
}

interface CatalogModalProps {
  open: boolean;
  onClose: () => void;
  products: CatalogProduct[];
  onSelectProduct: (product: CatalogProduct) => void;
}

export function CatalogModal({ open, onClose, products, onSelectProduct }: CatalogModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const categories = ["all", "license", "services", "support", "hardware"];

  const filtered = products.filter((p) => {
    const matchesCat = activeCategory === "all" || p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAdd = (product: CatalogProduct) => {
    onSelectProduct(product);
    setRecentlyAddedId(product.id);
    setTimeout(() => {
      setRecentlyAddedId(null);
    }, 1200);
  };

  return (
    <Modal open={open} onClose={onClose} title="Product & Services Catalog" className="max-w-2xl">
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog products, tiers, services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
              <Filter size={11} /> Filter:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer",
                  activeCategory === cat
                    ? "bg-[#ff5e3a] text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No products found matching &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((prod) => {
              const defaultMargin = Math.round(((prod.unitPrice - prod.costPrice) / prod.unitPrice) * 100);
              const isAdded = recentlyAddedId === prod.id;

              return (
                <div
                  key={prod.id}
                  className="pt-3 first:pt-0 flex items-center justify-between gap-4 p-2 hover:bg-slate-50/80 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{prod.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize bg-slate-100 text-slate-600 border border-slate-200">
                        {prod.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{prod.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span>
                        Cost Basis: <strong className="text-slate-600 font-mono">${prod.costPrice}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Standard Margin: <strong className="text-emerald-600 font-mono">{defaultMargin}%</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-sm font-black font-mono text-slate-900">
                      ${prod.unitPrice.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleAdd(prod)}
                      className={cn(
                        "h-7 px-3 text-xs font-semibold flex items-center gap-1 transition-all",
                        isAdded
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-slate-900 text-white hover:bg-[#ff5e3a]"
                      )}
                    >
                      {isAdded ? (
                        <>
                          <Check size={12} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>Add</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
