"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Mail,
  User,
  Sparkles,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  SalesNav,
  QuotationLineItems,
  QuotationMarginCard,
  CatalogModal,
  type LineItem,
  type CatalogProduct,
  Modal,
  Button,
} from "@repo/ui";
import { CATALOG_PRODUCTS } from "../../../lib/sales-data";

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
  const [specialNotes, setSpecialNotes] = useState("");

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

  // Catalog & custom item modals
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCategory, setCustomCategory] = useState<"license" | "services" | "support" | "hardware">("services");
  const [customPrice, setCustomPrice] = useState("2500");
  const [customCost, setCustomCost] = useState("1000");

  // Submission state & toast/dialog
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Handle account change
  const handleAccountChange = (orgName: string) => {
    setSelectedAccount(orgName);
    const found = DEFAULT_ACCOUNTS.find((a) => a.name === orgName);
    if (found) {
      setContactName(found.contact);
      setContactEmail(found.email);
      setDealTier(found.tier as "Standard" | "Silver" | "Gold" | "Enterprise");
    }
  };

  // Line item handlers
  const handleUpdateQuantity = (id: string, qty: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item)));
  };

  const handleUpdateDiscount = (id: string, discount: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, discountPercent: discount } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectFromCatalog = (product: CatalogProduct) => {
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

  // Real-time financial calculations
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

  // Actions
  const handleSaveDraft = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage("Quotation draft Q-1048 saved successfully. You can resume editing anytime.");
      setSuccessModalOpen(true);
    }, 600);
  };

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
          ? "Proposal Q-1048 submitted for Tier 2 Finance & Executive sign-off."
          : (totalDiscount / grossSubtotal) * 100 > 10 || netTotal > 50000
          ? "Proposal Q-1048 submitted to Marcus Vance (Sales Director) for approval."
          : "Proposal Q-1048 auto-approved under standard commercial policy! Ready for customer delivery."
      );
      setSuccessModalOpen(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased">
      <SalesNav activeTab="new-quote" linkComponent={Link} />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Breadcrumbs & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-500 font-medium">
              <Link href="/quotations" className="hover:text-[#ff5e3a] transition-colors flex items-center gap-1">
                <ArrowLeft size={13} />
                <span>Quotations</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">New Quotation Canvas</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                Quotation Builder Canvas
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#ff5e3a] text-xs font-semibold border border-orange-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e3a] animate-pulse"></span>
                Draft Session · Q-1048
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/quotations"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Customer & Commercial Parameters Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 size={16} className="text-[#ff5e3a]" />
              <span>Customer &amp; Commercial Terms</span>
            </div>
            <span className="text-xs text-slate-500">Step 1: Stakeholder Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Client Organization</label>
              <select
                value={selectedAccount}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all cursor-pointer"
              >
                {DEFAULT_ACCOUNTS.map((acc) => (
                  <option key={acc.name} value={acc.name}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Person */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <User size={12} className="text-slate-400" />
                <span>Primary Contact</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Mail size={12} className="text-slate-400" />
                <span>Contact Email</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>

            {/* Deal Tier Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                <span>Deal Tier</span>
              </label>
              <select
                value={dealTier}
                onChange={(e) => setDealTier(e.target.value as "Standard" | "Silver" | "Gold" | "Enterprise")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all cursor-pointer"
              >
                <option value="Standard">Standard Tier</option>
                <option value="Silver">Silver Tier</option>
                <option value="Gold">Gold Tier</option>
                <option value="Enterprise">Enterprise Tier</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                <span>Proposal Expiration Date</span>
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Commercial Billing &amp; Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net-30 annual subscription"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Builder Workspace: Modular Line Items (Left 8 cols) & Margin Economics (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Line Items Builder */}
          <div className="lg:col-span-8 space-y-6">
            <QuotationLineItems
              items={items}
              readOnly={false}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateDiscount={handleUpdateDiscount}
              onRemoveItem={handleRemoveItem}
              onOpenCatalog={() => setCatalogOpen(true)}
              onAddCustomItem={() => setCustomModalOpen(true)}
            />

            {/* Scope of Work / Notes textarea */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText size={16} className="text-slate-500" />
                <span>Executive Scope of Work &amp; Delivery Notes</span>
              </div>
              <textarea
                rows={3}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Specify deployment milestones, custom service deliverables, or customer-specific SLAs..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Sticky Margin & Governance Card */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">
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

            {/* Quick Tips */}
            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-[#ff5e3a] flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>Pricing Governance Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Discounts under 10% with margins above 45% trigger automated customer PO generation without requiring
                multi-tier manager escalations.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Product Catalog Modal */}
      <CatalogModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        products={CATALOG_PRODUCTS}
        onSelectProduct={handleSelectFromCatalog}
      />

      {/* Custom Item Modal */}
      <Modal open={customModalOpen} onClose={() => setCustomModalOpen(false)} title="Add Custom Commercial Deliverable">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Deliverable / Service Name</label>
            <input
              type="text"
              placeholder="e.g. Migration & Architecture Review"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Deliverable Description</label>
            <textarea
              rows={2}
              placeholder="Provide context and technical scope..."
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Unit Cost ($)</label>
              <input
                type="number"
                value={customCost}
                onChange={(e) => setCustomCost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ff5e3a] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCustomModalOpen(false)}
              className="text-xs h-8 px-3 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCustomItem}
              className="text-xs h-8 px-4 bg-[#ff5e3a] hover:bg-[#e04e2b] text-white"
            >
              Add Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Confirmation Modal */}
      <Modal open={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Quotation Workflow Status">
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Deal Action Recorded</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">{successMessage}</p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => router.push("/quotations")}
              className="bg-[#ff5e3a] hover:bg-[#e04e2b] text-white text-xs h-8 px-4"
            >
              Return to Quotations List
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
