"use client";

import { useState } from "react";
import {
  Eye,
  Edit3,
  Trash2,
  CalendarDays,
  FileCheck2,
  PenTool,
  StickyNote,
  Building2,
  User,
  Calendar,
  ArrowDownToLine,
  X,
} from "lucide-react";
import { cn } from "../lib/cn";
import { BrandLogo } from "./brand-logo";
import { type LineItem } from "./quotation-line-items";
import { type CatalogProduct } from "./catalog-modal";
import { type DocumentBlockDefinition } from "./quotation-builder-sidebar";

export interface QuotationBuilderCanvasProps {
  quoteId: string;
  accountName: string;
  contactName: string;
  contactEmail: string;
  validUntil: string;
  dealTier: string;
  paymentTerms: string;
  items: LineItem[];
  activeBlocks: Set<DocumentBlockDefinition["blockType"]>;
  onAccountChange: (account: string) => void;
  onContactChange: (contact: string) => void;
  onEmailChange: (email: string) => void;
  onValidUntilChange: (date: string) => void;
  onPaymentTermsChange: (terms: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateDiscount: (id: string, discount: number) => void;
  onUpdateUnitPrice: (id: string, price: number) => void;
  onDeleteItem: (id: string) => void;
  onDropItem: (product: CatalogProduct) => void;
  onDropBlock: (blockType: DocumentBlockDefinition["blockType"]) => void;
  onRemoveBlock: (blockType: DocumentBlockDefinition["blockType"]) => void;
  mode: "edit" | "preview";
  onModeChange: (mode: "edit" | "preview") => void;
  className?: string;
}

export function QuotationBuilderCanvas({
  quoteId,
  accountName,
  contactName,
  contactEmail,
  validUntil,
  dealTier,
  paymentTerms,
  items,
  activeBlocks,
  onAccountChange,
  onContactChange,
  onEmailChange,
  onValidUntilChange,
  onPaymentTermsChange,
  onUpdateQuantity,
  onUpdateDiscount,
  onUpdateUnitPrice,
  onDeleteItem,
  onDropItem,
  onDropBlock,
  onRemoveBlock,
  mode,
  onModeChange,
  className,
}: QuotationBuilderCanvasProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [notesText, setNotesText] = useState(
    "Standard implementation includes dedicated solutions architect, SSO directory sync, and automated rollback testing. Training sessions to be conducted within 14 days of contract execution."
  );

  // Totals calculations
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalDiscount = items.reduce(
    (acc, item) => acc + (item.quantity * item.unitPrice * item.discountPercent) / 100,
    0
  );
  const netTotal = subtotal - totalDiscount;

  // HTML5 Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only toggle if leaving the actual canvas
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const parsed = JSON.parse(dataStr);

      if (parsed.type === "product" && parsed.data) {
        onDropItem(parsed.data);
      } else if (parsed.type === "block" && parsed.data) {
        onDropBlock(parsed.data);
      }
    } catch (err) {
      console.warn("Failed to parse dropped element:", err);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Canvas Top Bar / Mode Switcher */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#ff5e3a] uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
            {quoteId}
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Interactive Drag &amp; Drop Proposal Canvas
          </span>
        </div>

        {/* Edit / Client Preview Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => onModeChange("edit")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              mode === "edit" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Edit3 size={13} />
            <span>Edit Canvas</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("preview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              mode === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Eye size={13} />
            <span>Client Preview</span>
          </button>
        </div>
      </div>

      {/* Main Document Canvas */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "bg-white rounded-2xl border transition-all relative",
          isDragOver
            ? "border-2 border-dashed border-[#ff5e3a] bg-orange-50/20 shadow-lg shadow-orange-500/10"
            : "border-slate-200/90 shadow-sm",
          mode === "preview" ? "p-8 sm:p-12" : "p-6 sm:p-8"
        )}
      >
        {/* Visual Drop Overlay Hint */}
        {isDragOver && (
          <div className="absolute inset-0 bg-[#ff5e3a]/5 rounded-2xl z-20 flex items-center justify-center pointer-events-none backdrop-blur-[1px]">
            <div className="bg-white px-5 py-3 rounded-xl border border-[#ff5e3a] shadow-lg flex items-center gap-2 text-xs font-bold text-[#ff5e3a]">
              <ArrowDownToLine size={16} className="animate-bounce" />
              <span>Drop to add to Quotation</span>
            </div>
          </div>
        )}

        {/* ── MODE 1: EDIT CANVAS ── */}
        {mode === "edit" ? (
          <div className="space-y-6">
            {/* Header Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Building2 size={12} /> Target Account
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#ff5e3a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User size={12} /> Primary Contact
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => onContactChange(e.target.value)}
                    placeholder="Contact Name"
                    className="w-1/2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                  />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="Email"
                    className="w-1/2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Calendar size={12} /> Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => onValidUntilChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                />
              </div>
            </div>

            {/* Line Items Pricing Table with Drop Zone */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Commercial Line Items</h3>
                  <p className="text-xs text-slate-500">
                    Drag catalog products from the left or adjust quantities &amp; discounts below.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-orange-50 text-[#ff5e3a] flex items-center justify-center mx-auto">
                    <ArrowDownToLine size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No line items in proposal yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Drag products and services from the Catalog Showcase on the left and drop them here.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Product / Service</th>
                        <th className="p-3 text-center w-24">Qty</th>
                        <th className="p-3 text-right w-28">Unit Price</th>
                        <th className="p-3 text-center w-28">Discount %</th>
                        <th className="p-3 text-right w-28">Line Total</th>
                        <th className="p-3 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">{item.description}</div>
                            </td>

                            {/* Qty Stepper */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 py-1 font-mono font-bold text-slate-900 text-xs">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                  className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td className="p-3 text-right font-mono font-semibold text-slate-900">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => onUpdateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs font-mono outline-none focus:border-[#ff5e3a]"
                              />
                            </td>

                            {/* Discount Slider/Input */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discountPercent}
                                  onChange={(e) =>
                                    onUpdateDiscount(
                                      item.id,
                                      Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                    )
                                  }
                                  className="w-12 text-center bg-white border border-slate-200 rounded-md px-1 py-1 text-xs font-mono outline-none focus:border-[#ff5e3a]"
                                />
                                <span className="text-slate-400 font-bold">%</span>
                              </div>
                            </td>

                            {/* Line Total */}
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              ₹{Math.round(lineTotal).toLocaleString()}
                            </td>

                            {/* Delete */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => onDeleteItem(item.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove line item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dropped Modular Content Blocks Section */}
            <div className="space-y-3 pt-2 text-left">
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Modular Document Sections</h3>
                  <p className="text-xs text-slate-500">
                    Drag blocks from the Doc Blocks tab to add governance, payment schedules, and sign-offs.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {activeBlocks.size} of 4 blocks active
                </span>
              </div>

              {/* Block 1: Payment Milestones */}
              {activeBlocks.has("milestones") && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-[#ff5e3a]" />
                      <span className="text-xs font-bold text-slate-900">Payment Milestones Schedule</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBlock("milestones")}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="Remove block"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phase 1: 50%</span>
                      <p className="font-bold text-slate-900 mt-0.5">Execution &amp; Provisioning</p>
                      <span className="text-[11px] font-mono text-[#ff5e3a] font-bold">
                        ₹{Math.round(netTotal * 0.5).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phase 2: 30%</span>
                      <p className="font-bold text-slate-900 mt-0.5">UAT &amp; Directory Sync</p>
                      <span className="text-[11px] font-mono text-slate-700 font-bold">
                        ₹{Math.round(netTotal * 0.3).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phase 3: 20%</span>
                      <p className="font-bold text-slate-900 mt-0.5">Final Go-Live Sign-off</p>
                      <span className="text-[11px] font-mono text-slate-700 font-bold">
                        ₹{Math.round(netTotal * 0.2).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Block 2: Terms & SLA */}
              {activeBlocks.has("terms") && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold text-slate-900">Commercial Terms &amp; SLA Commitment</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBlock("terms")}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="Remove block"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Billing Terms
                      </label>
                      <input
                        type="text"
                        value={paymentTerms}
                        onChange={(e) => onPaymentTermsChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        SLA Guarantee
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="99.95% Enterprise SLA with 1-Hour Incident Response"
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Block 3: Sign-off & Signatures */}
              {activeBlocks.has("signatures") && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PenTool size={16} className="text-amber-500" />
                      <span className="text-xs font-bold text-slate-900">Executive Signature &amp; PO Sign-off</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBlock("signatures")}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="Remove block"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        DealFlow360 Vendor Signatory
                      </span>
                      <div className="border-b border-dashed border-slate-300 h-8"></div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Authorized Representative</span>
                        <span>Date: ____________</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {accountName} (Client Signatory)
                      </span>
                      <div className="border-b border-dashed border-slate-300 h-8"></div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{contactName || "Authorized Buyer"}</span>
                        <span>Date: ____________</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Block 4: Special Scope & Notes */}
              {activeBlocks.has("notes") && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StickyNote size={16} className="text-sky-500" />
                      <span className="text-xs font-bold text-slate-900">Special Scope &amp; Deliverables</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBlock("notes")}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="Remove block"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-[#ff5e3a] leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── MODE 2: CLIENT PREVIEW (A4 PROPOSAL SHEET) ── */
          <div className="max-w-3xl mx-auto space-y-8 text-left print:max-w-none print:p-0">
            {/* Formal Brand Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-6">
              <div>
                <BrandLogo href="/" />
                <p className="text-xs text-slate-500 mt-2">B2B Dealflow &amp; Enterprise CPQ Platform</p>
                <p className="text-xs text-slate-500">dealflow360.com &bull; proposals@dealflow360.com</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-widest text-[#ff5e3a] block">
                  Commercial Quotation
                </span>
                <span className="font-mono text-xl font-extrabold text-slate-900 block mt-1">{quoteId}</span>
                <span className="text-xs text-slate-500 block mt-1">Date: {new Date().toLocaleDateString()}</span>
                <span className="text-xs font-medium text-slate-600 block">Valid Until: {validUntil}</span>
              </div>
            </div>

            {/* Prepared For / Prepared By Cards */}
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Prepared For (Client)
                </span>
                <h4 className="text-sm font-bold text-slate-900">{accountName}</h4>
                <p className="text-xs text-slate-600">{contactName}</p>
                <p className="text-xs text-slate-500">{contactEmail}</p>
                <div className="pt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                    Tier: {dealTier}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Prepared By (Vendor)
                </span>
                <h4 className="text-sm font-bold text-slate-900">DealFlow360 Enterprise Team</h4>
                <p className="text-xs text-slate-600">Sarah Jenkins &bull; Account Executive</p>
                <p className="text-xs text-slate-500">s.jenkins@dealflow360.com</p>
                <div className="pt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                    Terms: {paymentTerms}
                  </span>
                </div>
              </div>
            </div>

            {/* Commercial Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Itemized Proposal Scope
              </h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5">Scope Description</th>
                    <th className="py-2.5 text-center w-16">Qty</th>
                    <th className="py-2.5 text-right w-24">Unit Price</th>
                    <th className="py-2.5 text-center w-20">Discount</th>
                    <th className="py-2.5 text-right w-28">Net Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => {
                    const lineNet = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
                    return (
                      <tr key={item.id}>
                        <td className="py-3 pr-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                        </td>
                        <td className="py-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-3 text-right font-mono">₹{item.unitPrice.toLocaleString()}</td>
                        <td className="py-3 text-center font-mono">
                          {item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(lineNet).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Box */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-2 border-t border-slate-200 pt-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono font-semibold">₹{subtotal.toLocaleString()}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Applied Discounts:</span>
                    <span className="font-mono font-semibold">-₹{Math.round(totalDiscount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Investment:</span>
                  <span className="font-mono text-[#ff5e3a]">₹{Math.round(netTotal).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Optional Blocks in Preview */}
            {activeBlocks.has("milestones") && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                  Milestone Billing Schedule
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Phase 1 (50%)</span>
                    <p className="font-bold text-slate-900">₹{Math.round(netTotal * 0.5).toLocaleString()}</p>
                    <span className="text-[10px] text-slate-500">Upfront Execution</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Phase 2 (30%)</span>
                    <p className="font-bold text-slate-900">₹{Math.round(netTotal * 0.3).toLocaleString()}</p>
                    <span className="text-[10px] text-slate-500">Integration UAT</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Phase 3 (20%)</span>
                    <p className="font-bold text-slate-900">₹{Math.round(netTotal * 0.2).toLocaleString()}</p>
                    <span className="text-[10px] text-slate-500">Go-Live Signoff</span>
                  </div>
                </div>
              </div>
            )}

            {activeBlocks.has("notes") && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                  Special Project Scope
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">{notesText}</p>
              </div>
            )}

            {activeBlocks.has("terms") && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                  Commercial Terms &amp; SLA
                </span>
                <p className="text-slate-600 text-[11px]">
                  All fees are quoted in INR (₹). Invoices payable under {paymentTerms}. Service is backed by a 99.95%
                  monthly service level agreement.
                </p>
              </div>
            )}

            {activeBlocks.has("signatures") && (
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-4">
                  <span className="font-bold text-slate-900 block">Accepted for DealFlow360:</span>
                  <div className="border-b border-slate-400 h-10"></div>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <div>Authorized Signature</div>
                    <div>Date: ________________________</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="font-bold text-slate-900 block">Accepted for {accountName}:</span>
                  <div className="border-b border-slate-400 h-10"></div>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <div>Authorized Signature ({contactName})</div>
                    <div>Date: ________________________</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="pt-6 text-center text-[10px] text-slate-400 border-t border-slate-100">
              DealFlow360 CPQ Proposal Document &bull; Generated dynamically for client negotiation
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
