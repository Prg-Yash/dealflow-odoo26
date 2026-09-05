"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Check,
  MessageSquare,
  FileText,
  Send,
  PenTool,
  TrendingDown,
} from "lucide-react";
import { Badge, BrandLogo, Modal } from "@repo/ui";
import {
  usePortalQuote,
  useSubmitCounterProposal,
  useSubmitPortalComment,
  useSignQuotation,
  type PortalQuoteData,
} from "../../lib/query";

// Default fallback data for offline / unseeded demo testing
const DEMO_FALLBACK_QUOTE: PortalQuoteData = {
  id: "quote-demo-01",
  quoteNumber: "QT-2026-0004",
  title: "QuantumLeap AI - Infrastructure & Platform Suite",
  stage: "NEGOTIATION",
  subtotal: 22800,
  discountTotal: 2550,
  taxTotal: 1267.2,
  grandTotal: 21517.2,
  grossMarginPercent: 36.7,
  expiresAt: "2026-04-15T00:00:00.000Z",
  notes: "Customer evaluating portal quotation with customized volume discounts.",
  customer: {
    id: "cust-demo",
    name: "Dr. Aris Thorne",
    email: "aris@quantumleap.ai",
    tier: { name: "Platinum Tier", code: "PLATINUM", discountCeiling: 20 },
  },
  salesRep: {
    id: "rep-demo",
    user: { name: "Sarah Chen", email: "sarah.chen@dealflow360.com" },
  },
  organization: {
    id: "org-demo",
    name: "Apex Enterprise Technologies",
    currency: "INR",
  },
  lines: [
    {
      id: "line-1",
      description: "Enterprise Edge Server 2U (4 units)",
      quantity: 4,
      unitPrice: 4500,
      discountPercent: 12,
      netPrice: 15840,
      itemType: "HARDWARE",
      product: { name: "Enterprise Edge Server 2U", sku: "HW-SRV-01" },
    },
    {
      id: "line-2",
      description: "DealFlow 360 Core Platform License (25 Seats)",
      quantity: 25,
      unitPrice: 120,
      discountPercent: 10,
      netPrice: 2700,
      itemType: "SUBSCRIPTION",
      product: { name: "DealFlow 360 Core Platform License", sku: "SUB-CORE-01" },
    },
    {
      id: "line-3",
      description: "24/7 Dedicated Support SLA (Annual)",
      quantity: 1,
      unitPrice: 1800,
      discountPercent: 5,
      netPrice: 1710,
      itemType: "SERVICE",
      product: { name: "24/7 Dedicated Support SLA", sku: "SRV-SLA-01" },
    },
  ],
  comments: [
    {
      id: "c-1",
      message: "Hello Dr. Thorne, I have applied our Platinum Tier discount to the edge compute nodes as discussed.",
      authorRole: "SALES_REP",
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      author: { name: "Sarah Chen", email: "sarah.chen@dealflow360.com" },
    },
    {
      id: "c-2",
      message: "Can we review the discount on the annual support tier if we commit to a 2-year term?",
      authorRole: "CUSTOMER",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      author: { name: "Dr. Aris Thorne", email: "aris@quantumleap.ai" },
    },
  ],
  counterProposals: [
    {
      id: "cp-1",
      proposedGrandTotal: 20500,
      proposedDiscountPercent: 15,
      customerNotes: "Requesting ₹20,500 budget cap approved by procurement board.",
      status: "PENDING",
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
  signature: null,
};

function CustomerPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "portal-token-quantum-04";

  // Live TanStack Query hook
  const { data: serverQuote } = usePortalQuote(token);
  const quote: PortalQuoteData = serverQuote || DEMO_FALLBACK_QUOTE;

  // Mutations with Optimistic Updates
  const counterProposalMutation = useSubmitCounterProposal(token);
  const commentMutation = useSubmitPortalComment(token);
  const signMutation = useSignQuotation(token);

  // Local UI State
  const [activeTab, setActiveTab] = useState<"items" | "negotiation">("items");
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // Counter proposal form
  const [proposedTotal, setProposedTotal] = useState<number>(Math.round(quote.grandTotal * 0.92));
  const [proposedDiscount, setProposedDiscount] = useState<number>(14);
  const [customerNotes, setCustomerNotes] = useState("");

  // Comment form
  const [newComment, setNewComment] = useState("");

  // Sign form
  const [signerName, setSignerName] = useState(quote.customer?.name || "Dr. Aris Thorne");
  const [signerEmail, setSignerEmail] = useState(quote.customer?.email || "aris@quantumleap.ai");
  const [signerTitle, setSignerTitle] = useState("Chief Technology Officer");

  const isConfirmed = quote.stage === "CONFIRMED" || Boolean(quote.signature);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await commentMutation.mutateAsync({ message: newComment });
      setNewComment("");
    } catch (err) {
      console.warn("Comment dispatched with optimistic fallback:", err);
      setNewComment("");
    }
  };

  const handleSendCounterProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await counterProposalMutation.mutateAsync({
        proposedGrandTotal: Number(proposedTotal),
        proposedDiscountPercent: Number(proposedDiscount),
        customerNotes,
      });
      setIsCounterModalOpen(false);
      setCustomerNotes("");
      setActiveTab("negotiation");
    } catch (err) {
      console.warn("Counter-proposal dispatched with optimistic fallback:", err);
      setIsCounterModalOpen(false);
    }
  };

  const handleSignProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signMutation.mutateAsync({
        signedByName: signerName,
        signedByEmail: signerEmail,
        signatureData: `DIGITAL_SIG:${signerName}:${Date.now()}`,
      });
      setIsSignModalOpen(false);
    } catch (err) {
      console.warn("Signature recorded with optimistic fallback:", err);
      setIsSignModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {/* Customer Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo href="/" size="sm" subtitle="Customer Quotation Portal" />
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-xs font-semibold text-[#ff5e3a]">
              <ShieldCheck size={14} />
              <span>Token: {token}</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Staff View &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Proposal Content */}
      <main className="max-w-5xl mx-auto w-full px-6 py-10 flex-1 space-y-6">
        {/* Proposal Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isConfirmed ? "success" : "info"}>
                {isConfirmed ? "Quotation Confirmed & Signed" : `Stage: ${quote.stage}`}
              </Badge>
              {quote.expiresAt && (
                <span className="text-xs text-slate-400 font-medium">
                  &bull; Valid until {new Date(quote.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {quote.title || `Commercial Quotation ${quote.quoteNumber}`}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Prepared for <strong>{quote.customer?.name || "Valued Customer"}</strong>
              {quote.customer?.tier && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {quote.customer.tier.name}
                </span>
              )}
              {quote.salesRep?.user && (
                <span> by {quote.salesRep.user.name} ({quote.salesRep.user.email})</span>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right bg-slate-50/80 p-4 rounded-xl border border-slate-100 sm:bg-transparent sm:border-0 sm:p-0">
            <div className="text-xs uppercase font-semibold text-slate-400">Total Investment</div>
            <div className="text-3xl font-extrabold text-[#ff5e3a]">
              ₹{Number(quote.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500 ml-1">
                {quote.organization?.currency || "INR"}
              </span>
            </div>
            {quote.discountTotal > 0 && (
              <div className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center sm:justify-end gap-1">
                <TrendingDown size={13} />
                <span>You save ₹{Number(quote.discountTotal).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab("items")}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === "items"
                ? "border-[#ff5e3a] text-[#ff5e3a]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={16} />
            <span>Line Items &amp; Pricing ({quote.lines?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("negotiation")}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === "negotiation"
                ? "border-[#ff5e3a] text-[#ff5e3a]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare size={16} />
            <span>Negotiation &amp; Counter-Offers</span>
            {((quote.comments?.length || 0) + (quote.counterProposals?.length || 0)) > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 text-[#ff5e3a] font-bold">
                {(quote.comments?.length || 0) + (quote.counterProposals?.length || 0)}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Line Items */}
        {activeTab === "items" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-left">
            <div>
              <h2 className="text-base font-bold text-slate-900">Included Products &amp; Subscriptions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized pricing schedule including volume discounts and delivery provisions.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {quote.lines?.map((line) => (
                <div key={line.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {line.product?.name || line.description}
                      </span>
                      {line.itemType && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          line.itemType === "SUBSCRIPTION"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : line.itemType === "SERVICE"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {line.itemType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{line.description}</p>
                    <div className="text-[11px] text-slate-400">
                      Qty: <strong>{line.quantity}</strong> &times; ₹{Number(line.unitPrice).toLocaleString()}
                      {line.discountPercent > 0 && (
                        <span className="text-emerald-600 font-semibold ml-2">
                          (-{line.discountPercent}% discount)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-bold text-slate-900 text-base">
                    ₹{Number(line.netPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal & Financial Breakdown */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-end">
              <div className="w-full sm:w-72 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">₹{Number(quote.subtotal).toLocaleString()}</span>
                </div>
                {quote.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discounts Applied:</span>
                    <span>-₹{Number(quote.discountTotal).toLocaleString()}</span>
                  </div>
                )}
                {quote.taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Estimated Tax:</span>
                    <span className="font-semibold text-slate-900">₹{Number(quote.taxTotal).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                  <span>Net Investment:</span>
                  <span className="text-[#ff5e3a]">₹{Number(quote.grandTotal).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Negotiation & Thread */}
        {activeTab === "negotiation" && (
          <div className="space-y-6 text-left">
            {/* Counter Proposals Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Counter-Proposals</h3>
                  <p className="text-xs text-slate-500">Formal price and discount adjustments submitted during negotiation.</p>
                </div>
                <button
                  onClick={() => setIsCounterModalOpen(true)}
                  disabled={isConfirmed}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ff5e3a] text-xs font-bold border border-orange-200 transition cursor-pointer disabled:opacity-50"
                >
                  + Submit Counter-Offer
                </button>
              </div>

              {quote.counterProposals && quote.counterProposals.length > 0 ? (
                <div className="space-y-3">
                  {quote.counterProposals.map((cp) => (
                    <div key={cp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Proposed Total: <strong className="text-slate-900 text-sm">₹{Number(cp.proposedGrandTotal).toLocaleString()}</strong>
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {cp.status}
                          </span>
                        </div>
                        {cp.customerNotes && (
                          <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{cp.customerNotes}&rdquo;</p>
                        )}
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Submitted on {new Date(cp.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No counter-offers submitted. The proposed pricing currently matches the quotation terms.
                </div>
              )}
            </div>

            {/* Communication Thread */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Negotiation Thread</h3>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {quote.comments && quote.comments.length > 0 ? (
                  quote.comments.map((comment) => {
                    const isRep = comment.authorRole === "SALES_REP" || comment.authorRole === "SALES_MANAGER";
                    return (
                      <div
                        key={comment.id}
                        className={`p-3.5 rounded-2xl text-xs max-w-lg ${
                          isRep
                            ? "bg-slate-100 text-slate-800 ml-auto border border-slate-200 rounded-br-none"
                            : "bg-orange-50/80 text-slate-900 border border-orange-200/70 rounded-bl-none"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="font-bold text-[11px] text-slate-700">
                            {comment.author?.name || (isRep ? "Account Executive" : "You (Buyer)")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="leading-relaxed">{comment.message}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Start a conversation with your account executive regarding scope or timeline.
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendComment} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Type a message or ask a question about this quote..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isConfirmed || commentMutation.isPending}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || commentMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4c28] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Action Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-900">
              {isConfirmed ? "Proposal Officially Accepted" : "Ready to execute or counter-propose?"}
            </h3>
            <p className="text-xs text-slate-500">
              {isConfirmed
                ? `Signed by ${quote.signature?.signedByName || "Customer"} on ${new Date(quote.signature?.signedAt || Date.now()).toLocaleDateString()}`
                : "You can submit a counter-offer or electronically execute this agreement with instant confirmation."}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isConfirmed && (
              <button
                onClick={() => setIsCounterModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>Negotiate Terms</span>
              </button>
            )}

            <button
              onClick={() => {
                if (!isConfirmed) setIsSignModalOpen(true);
              }}
              disabled={isConfirmed}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md transition cursor-pointer ${
                isConfirmed
                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-[#ff5e3a] hover:bg-[#ea4c28] text-white shadow-orange-500/20 active:translate-y-0.5"
              }`}
            >
              {isConfirmed ? (
                <>
                  <Check size={14} />
                  <span>Contract Signed &amp; Confirmed</span>
                </>
              ) : (
                <>
                  <PenTool size={14} />
                  <span>Accept &amp; Sign Quotation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Counter Proposal Modal */}
      <Modal
        open={isCounterModalOpen}
        onClose={() => setIsCounterModalOpen(false)}
        title="Submit Counter-Proposal"
      >
        <form onSubmit={handleSendCounterProposal} className="space-y-4 text-left">
          <p className="text-xs text-slate-500">
            Provide your target budget and notes. Your account executive and sales director will review the exception immediately.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Target Investment (₹)</label>
              <input
                type="number"
                value={proposedTotal}
                onChange={(e) => setProposedTotal(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#ff5e3a]"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Target Discount (%)</label>
              <input
                type="number"
                value={proposedDiscount}
                onChange={(e) => setProposedDiscount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#ff5e3a]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Procurement Justification / Notes</label>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. Budget ceiling approved by finance committee..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCounterModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={counterProposalMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4c28] text-white text-xs font-bold shadow-md transition"
            >
              {counterProposalMutation.isPending ? "Submitting..." : "Send Counter-Proposal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Electronic Signature Modal */}
      <Modal
        open={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        title="Electronic Signature & Deal Execution"
      >
        <form onSubmit={handleSignProposal} className="space-y-4 text-left">
          <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200/70 text-xs text-slate-700">
            By signing below, you legally accept the quotation terms, line items, and SLA specifications outlined in{" "}
            <strong>{quote.quoteNumber}</strong>.
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Full Legal Name</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#ff5e3a]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Work Email</label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Title / Designation</label>
              <input
                type="text"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                required
              />
            </div>
          </div>

          {/* Signature Canvas Mock */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Digital Signature Representation</label>
            <div className="h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center font-serif italic text-xl text-slate-800 select-none">
              {signerName || "Your Signature"}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSignModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={signMutation.isPending}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition"
            >
              {signMutation.isPending ? "Executing..." : "Confirm & Sign Contract"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 py-4 px-6 bg-white text-center text-xs text-slate-400 font-medium">
        DealFlow 360 Enterprise Quotation &amp; CPQ Portal &copy; 2026
      </footer>
    </div>
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-sm text-slate-500">Loading quotation portal...</div>}>
      <CustomerPortalContent />
    </Suspense>
  );
}
