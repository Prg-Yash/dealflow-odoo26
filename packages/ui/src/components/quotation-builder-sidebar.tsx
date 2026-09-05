"use client";

import { useState } from "react";
import {
  Search,
  GripVertical,
  Plus,
  Package,
  Layers,
  FileCheck2,
  CalendarDays,
  PenTool,
  StickyNote,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/cn";
import { type CatalogProduct } from "./catalog-modal";

export interface DocumentBlockDefinition {
  id: string;
  blockType: "milestones" | "terms" | "signatures" | "notes";
  title: string;
  description: string;
  iconName: "milestones" | "terms" | "signatures" | "notes";
}

export const MODULAR_BLOCK_DEFINITIONS: DocumentBlockDefinition[] = [
  {
    id: "block-milestones",
    blockType: "milestones",
    title: "Payment Milestones",
    description: "Structured billing schedule (50% upfront, 30% delivery, 20% go-live)",
    iconName: "milestones",
  },
  {
    id: "block-terms",
    blockType: "terms",
    title: "Commercial Terms & SLA",
    description: "Standard Net-30 billing terms, 99.9% uptime SLA, and liability clauses",
    iconName: "terms",
  },
  {
    id: "block-signatures",
    blockType: "signatures",
    title: "Client Sign-off & PO",
    description: "Dual signature fields for Vendor Account Rep and Client Authorized Signer",
    iconName: "signatures",
  },
  {
    id: "block-notes",
    blockType: "notes",
    title: "Special Project Scope",
    description: "Custom delivery timelines, prerequisites, and non-standard commitments",
    iconName: "notes",
  },
];

export interface QuotationBuilderSidebarProps {
  products: CatalogProduct[];
  onAddProduct: (product: CatalogProduct) => void;
  onAddBlock: (blockType: DocumentBlockDefinition["blockType"]) => void;
  onOpenCustomItemModal: () => void;
  className?: string;
}

export function QuotationBuilderSidebar({
  products,
  onAddProduct,
  onAddBlock,
  onOpenCustomItemModal,
  className,
}: QuotationBuilderSidebarProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "blocks">("catalog");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = ["all", "license", "services", "support", "hardware"];

  const filteredProducts = products.filter((p) => {
    const matchesCat = activeCategory === "all" || p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getBlockIcon = (iconName: DocumentBlockDefinition["iconName"]) => {
    switch (iconName) {
      case "milestones":
        return <CalendarDays size={16} className="text-[#ff5e3a]" />;
      case "terms":
        return <FileCheck2 size={16} className="text-emerald-500" />;
      case "signatures":
        return <PenTool size={16} className="text-amber-500" />;
      case "notes":
        return <StickyNote size={16} className="text-sky-500" />;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "license":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "services":
        return "bg-orange-50 text-[#ff5e3a] border-orange-200";
      case "support":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-140px)] sticky top-24",
        className
      )}
    >
      {/* Top Tabs */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === "catalog"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Package size={13} />
            <span>Catalog Items</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blocks")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === "blocks"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Layers size={13} />
            <span>Doc Blocks</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "catalog" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search and Categories */}
          <div className="p-3 space-y-2.5 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize transition-all cursor-pointer",
                    activeCategory === cat
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Draggable Catalog Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Drag to Canvas ({filteredProducts.length})</span>
              <span className="text-slate-400 font-normal">or click &quot;+&quot;</span>
            </div>

            {filteredProducts.map((product) => (
              <div
                key={product.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ type: "product", data: product })
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group relative flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#ff5e3a]/50 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing text-left select-none"
              >
                <div className="mt-0.5 text-slate-300 group-hover:text-slate-500 shrink-0">
                  <GripVertical size={14} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate group-hover:text-[#ff5e3a] transition-colors">
                      {product.name}
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900 shrink-0">
                      ${product.unitPrice.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{product.description}</p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border",
                        getCategoryBadge(product.category)
                      )}
                    >
                      {product.category}
                    </span>

                    <button
                      type="button"
                      onClick={() => onAddProduct(product)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff5e3a] hover:underline cursor-pointer"
                      title="Add to quotation"
                    >
                      <Plus size={12} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom custom item trigger */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onOpenCustomItemModal}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#ff5e3a] bg-white hover:bg-orange-50/50 text-xs font-semibold text-slate-700 hover:text-[#ff5e3a] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className="text-[#ff5e3a]" />
              <span>+ Add Custom Line Item</span>
            </button>
          </div>
        </div>
      ) : (
        /* Modular Document Blocks Tab */
        <div className="flex-1 flex flex-col p-3 space-y-2.5 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Modular Proposal Sections
          </div>

          {MODULAR_BLOCK_DEFINITIONS.map((block) => (
            <div
              key={block.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ type: "block", data: block.blockType })
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="group flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:border-[#ff5e3a]/50 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing text-left select-none"
            >
              <div className="mt-0.5 text-slate-300 group-hover:text-slate-500 shrink-0">
                <GripVertical size={14} />
              </div>

              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                {getBlockIcon(block.iconName)}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#ff5e3a] transition-colors block">
                  {block.title}
                </span>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{block.description}</p>

                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => onAddBlock(block.blockType)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff5e3a] hover:underline cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add to Canvas</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/60 text-[11px] text-slate-600 leading-relaxed mt-auto">
            <strong className="text-slate-900 font-semibold block mb-0.5">Drag to Insert:</strong>
            Drag any block onto the document canvas to automatically position it in the executive proposal view.
          </div>
        </div>
      )}
    </aside>
  );
}
