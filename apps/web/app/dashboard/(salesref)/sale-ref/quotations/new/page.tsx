"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Share2,
  Printer,
} from "lucide-react";
import {
  SalesNav,
  QuotationMarginCard,
  QuotationBuilderSidebar,
  QuotationBuilderCanvas,
  ShareQuotationModal,
  type LineItem,
  type CatalogProduct,
  type DocumentBlockDefinition,
  Modal,
  Button,
} from "@repo/ui";
import { CATALOG_PRODUCTS } from "../../../../../../lib/sales-data";

const DEFAULT_ACCOUNTS = [
  { name: "Acme Corporation", contact: "David Harrison", email: "d.harrison@acme.com", tier: "Enterprise" },
  { name: "Apex Logic Systems", contact: "Elena Vance", email: "e.vance@apexlogic.io", tier: "Gold" },
  { name: "OmniRetail Global", contact: "Marcus Brody", email: "m.brody@omniretail.com", tier: "Enterprise" },
  { name: "Beta Industries", contact: "Robert Thorne", email: "r.thorne@betaind.com", tier: "Silver" },
];

export default function NewQuotationPage() {
  const router = useRouter();

  // Customer & Deal state
  const [selectedAccount, setSelectedAccount] = useState(DEFAULT_ACCOUNTS[0]!.name);
  const [contactName, setContactName] = useState(DEFAULT_ACCOUNTS[0]!.contact);
  const [contactEmail, setContactEmail] = useState(DEFAULT_ACCOUNTS[0]!.email);
  const [dealTier, setDealTier] = useState<"Standard" | "Silver" | "Gold" | "Enterprise">("Enterprise");
  const [validUntil, setValidUntil] = useState("2026-04-15");
  const [paymentTerms, setPaymentTerms] = useState("Net-30 with Annual Upfront billing");

  // Line items state
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "item-init-1",
      name: "DealFlow360 Enterprise Seats",
      description: "Full sales ops workspace, quoting engine & kanban deals board",
      category: "license",
      quantity: 25,
      unitPrice: 720,
      costPrice: 280,
      discountPercent: 12,
    },
    {
      id: "item-init-2",
      name: "Dedicated Custom Integration & SSO",
      description: "PostgreSQL enterprise sync, SAML/Okta directory connector",
      category: "services",
      quantity: 1,
      unitPrice: 8500,
      costPrice: 3500,
      discountPercent: 5,
    },
  ]);

  // Modular Document Blocks (milestones, terms, signatures, notes)
  const [activeBlocks, setActiveBlocks] = useState<Set<DocumentBlockDefinition["blockType"]>>(
    new Set(["milestones", "terms", "signatures"])
  );

  // Canvas display mode (edit vs preview)
  const [builderMode, setBuilderMode] = useState<"edit" | "preview">("edit");

  // Custom Item Modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCategory, setCustomCategory] = useState<"license" | "services" | "support" | "hardware">("services");
  const [customPrice, setCustomPrice] = useState("2500");
  const [customCost, setCustomCost] = useState("1000");

  // Modals & Action states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const quoteId = "DF-Q1048";

  // Financial calculations
  const grossSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity * (item.discountPercent / 100),
    0
  );
  const netTotal = grossSubtotal - totalDiscount;
  const totalCost = items.reduce(
    (sum, item) => sum + (item.costPrice ?? item.unitPrice * 0.45) * item.quantity,
    0
  );
  const marginAmount = netTotal - totalCost;
  const marginPercent = netTotal > 0 ? (marginAmount / netTotal) * 100 : 0;

  // Handle Account Change
  const handleAccountChange = (orgName: string) => {
    setSelectedAccount(orgName);
    const found = DEFAULT_ACCOUNTS.find((a) => a.name === orgName);
    if (found) {
      setContactName(found.contact);
      setContactEmail(found.email);
      setDealTier(found.tier as "Standard" | "Silver" | "Gold" | "Enterprise");
    }
  };

  // Add item from catalog
  const handleAddItem = (product: CatalogProduct) => {
    const existingIndex = items.findIndex((i) => i.name === product.name);
    if (existingIndex > -1) {
      setItems((prev) =>
        prev.map((item, idx) => (idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item))
      );
    } else {
      const newItem: LineItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: product.name,
        description: product.description,
        category: product.category,
        quantity: 1,
        unitPrice: product.unitPrice,
        costPrice: product.costPrice,
        discountPercent: 0,
      };
      setItems((prev) => [...prev, newItem]);
    }
  };

  // Add custom line item
  const handleAddCustomItem = () => {
    if (!customName.trim()) return;
    const unitPrice = parseFloat(customPrice) || 0;
    const costPrice = parseFloat(customCost) || unitPrice * 0.4;

    const newItem: LineItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      description: customDescription.trim() || "Custom tailored commercial deliverable",
      category: customCategory,
      quantity: 1,
      unitPrice,
      costPrice,
      discountPercent: 0,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomName("");
    setCustomDescription("");
    setCustomPrice("2500");
    setCustomCost("1000");
    setCustomModalOpen(false);
  };

  // Modular Blocks management
  const handleAddBlock = (blockType: DocumentBlockDefinition["blockType"]) => {
    setActiveBlocks((prev) => new Set([...prev, blockType]));
  };

  const handleRemoveBlock = (blockType: DocumentBlockDefinition["blockType"]) => {
    setActiveBlocks((prev) => {
      const next = new Set(prev);
      next.delete(blockType);
      return next;
    });
  };

  // Item field handlers
  const handleUpdateQuantity = (id: string, qty: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item)));
  };

  const handleUpdateDiscount = (id: string, discount: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, discountPercent: discount } : item)));
  };

  const handleUpdateUnitPrice = (id: string, price: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, unitPrice: price } : item)));
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Export PDF via clean browser print
  const handleExportPDF = () => {
    setBuilderMode("preview");
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Save Draft
  const handleSaveDraft = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(`Quotation draft ${quoteId} saved successfully. You can resume editing anytime.`);
      setSuccessModalOpen(true);
    }, 500);
  };

  // Submit for Approval
  const handleSubmitForApproval = () => {
    if (items.length === 0) {
      alert("Please add at least one line item to submit this quote.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(
        marginPercent < 35 || (totalDiscount / grossSubtotal) * 100 > 20
          ? `Proposal ${quoteId} submitted for Tier 2 Finance & Executive sign-off.`
          : (totalDiscount / grossSubtotal) * 100 > 10 || netTotal > 50000
          ? `Proposal ${quoteId} submitted to Marcus Vance (Sales Director) for approval.`
          : `Proposal ${quoteId} auto-approved under standard commercial policy! Ready for customer delivery.`
      );
      setSuccessModalOpen(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      {/* Navigation Header (hidden on print) */}
      <div className="print:hidden">
        <SalesNav activeTab="new-quote" linkComponent={Link} />
      </div>

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Breadcrumbs & Action Toolbar (hidden on print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-slate-200 print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-medium">
              <Link href="/dashboard/sale-ref/quotations" className="hover:text-[#ff5e3a] transition-colors flex items-center gap-1">
                <ArrowLeft size={13} />
                <span>Quotations</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">Drag &amp; Drop Proposal Builder</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                Quotation Builder
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#ff5e3a] text-xs font-semibold border border-orange-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e3a] animate-pulse"></span>
                Interactive Session &bull; {quoteId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Share2 size={14} />
              <span>Share Proposal</span>
            </button>

            <Link
              href="/quotations"
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* ── 3-COLUMN SPLIT WORKSPACE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Data Showcase & Draggable Catalog Sidebar (3 cols) */}
          <div className="lg:col-span-3 print:hidden">
            <QuotationBuilderSidebar
              products={CATALOG_PRODUCTS}
              onAddProduct={handleAddItem}
              onAddBlock={handleAddBlock}
              onOpenCustomItemModal={() => setCustomModalOpen(true)}
            />
          </div>

          {/* CENTER: Document Canvas (6 cols) */}
          <div className="lg:col-span-6 print:w-full print:col-span-12">
            <QuotationBuilderCanvas
              quoteId={quoteId}
              accountName={selectedAccount}
              contactName={contactName}
              contactEmail={contactEmail}
              validUntil={validUntil}
              dealTier={dealTier}
              paymentTerms={paymentTerms}
              items={items}
              activeBlocks={activeBlocks}
              onAccountChange={handleAccountChange}
              onContactChange={setContactName}
              onEmailChange={setContactEmail}
              onValidUntilChange={setValidUntil}
              onPaymentTermsChange={setPaymentTerms}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateDiscount={handleUpdateDiscount}
              onUpdateUnitPrice={handleUpdateUnitPrice}
              onDeleteItem={handleDeleteItem}
              onDropItem={handleAddItem}
              onDropBlock={handleAddBlock}
              onRemoveBlock={handleRemoveBlock}
              mode={builderMode}
              onModeChange={setBuilderMode}
            />
          </div>

          {/* RIGHT: Live Financial Economics & Deal Execution (3 cols) */}
          <div className="lg:col-span-3 space-y-4 print:hidden sticky top-24">
            <QuotationMarginCard
              grossSubtotal={grossSubtotal}
              totalDiscount={totalDiscount}
              netTotal={netTotal}
              totalCost={totalCost}
              marginAmount={marginAmount}
              marginPercent={marginPercent}
              isSubmitting={isSubmitting}
              onSaveDraft={handleSaveDraft}
              onSubmitForApproval={handleSubmitForApproval}
            />
          </div>
        </div>
      </main>

      {/* Share Proposal Modal */}
      <ShareQuotationModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        quoteId={quoteId}
        accountName={selectedAccount}
        totalValue={netTotal}
      />

      {/* Custom Item Modal */}
      <Modal open={customModalOpen} onClose={() => setCustomModalOpen(false)} title="Add Custom Commercial Deliverable">
        <div className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Deliverable Name *</label>
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Custom ERP Pipeline Connector"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Description</label>
            <textarea
              rows={2}
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Provide deliverable details, SLA parameters, or scope boundary..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={customCategory}
                onChange={(e) =>
                  setCustomCategory(e.target.value as "license" | "services" | "support" | "hardware")
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all cursor-pointer"
              >
                <option value="services">Services</option>
                <option value="license">License</option>
                <option value="support">Support</option>
                <option value="hardware">Hardware</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Unit Price ($)</label>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Est. Cost ($)</label>
              <input
                type="number"
                value={customCost}
                onChange={(e) => setCustomCost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCustomModalOpen(false)}
              className="text-xs h-9 px-4 border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddCustomItem}
              disabled={!customName.trim()}
              className="text-xs h-9 px-4 bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              Add to Quotation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Notification Modal */}
      <Modal open={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Quotation Workflow Status">
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Operation Successful</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">{successMessage}</p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSuccessModalOpen(false);
                router.push("/dashboard/sale-ref/quotations");
              }}
              className="text-xs px-4 h-9 cursor-pointer"
            >
              View Pipeline
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSuccessModalOpen(false)}
              className="text-xs px-4 h-9 bg-[#ff5e3a] hover:bg-[#ea4e28] text-white cursor-pointer"
            >
              Continue Editing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
