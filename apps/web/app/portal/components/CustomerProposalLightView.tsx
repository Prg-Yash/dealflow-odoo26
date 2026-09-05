"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Check,
  CheckCircle2,
  MessageSquare,
  Send,
  Building,
  Calendar,
  User,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  PenTool,
  HelpCircle,
  RefreshCw,
  Sliders,
  X,
} from "lucide-react";
import { BrandLogo, Badge } from "@repo/ui";
import {
  usePortalQuote,
  useAddPortalComment,
  useSubmitCounterProposal,
  useConfirmQuotation,
  useSignQuotation,
} from "../../../lib/query/hooks/use-portal";

function formatCurrency(amount: number | undefined | null, currency = "USD"): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getStageBadge(stage: string) {
  switch (stage) {
    case "CONFIRMED":
      return <Badge variant="success" className="bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmed &amp; Accepted</Badge>;
    case "APPROVED":
      return <Badge variant="success" className="bg-blue-50 text-blue-700 border border-blue-200">Approved by Sales</Badge>;
    case "NEGOTIATION":
      return <Badge variant="warning" className="bg-amber-50 text-amber-700 border border-amber-200">In Negotiation</Badge>;
    case "PENDING_APPROVAL":
      return <Badge variant="warning" className="bg-orange-50 text-orange-700 border border-orange-200">Internal Review</Badge>;
    case "FULFILLED":
      return <Badge variant="info" className="bg-purple-50 text-purple-700 border border-purple-200">Fulfilled</Badge>;
    default:
      return <Badge variant="default" className="bg-slate-100 text-slate-700 border border-slate-200">{stage}</Badge>;
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case "CUSTOMER":
      return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Customer</span>;
    case "SALES_REP":
      return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">Sales Rep</span>;
    case "FINANCE_OPS":
      return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Finance</span>;
    default:
      return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{role}</span>;
  }
}

export function CustomerProposalLightView({ token = "DF-Q1042" }: { token?: string }) {
  const router = useRouter();

  const { data: quote, isLoading, isError } = usePortalQuote(token);
  const addCommentMutation = useAddPortalComment(token);
  const counterProposalMutation = useSubmitCounterProposal(token);
  const confirmMutation = useConfirmQuotation(token);
  const signMutation = useSignQuotation(token);

  const [activeTab, setActiveTab] = useState<"items" | "negotiate" | "discussions">("items");
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [lineCommentInput, setLineCommentInput] = useState<Record<string, string>>({});
  const [generalComment, setGeneralComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [proposedDiscount, setProposedDiscount] = useState(15);
  const [counterNotes, setCounterNotes] = useState("");

  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signAgreed, setSignAgreed] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (quote?.customer) {
      if (!customerName) setCustomerName(quote.customer.name || "");
      if (!customerEmail) setCustomerEmail(quote.customer.email || "");
      if (!signerName) setSignerName(quote.customer.name || "");
      if (!signerEmail) setSignerEmail(quote.customer.email || "");
      if (!typedSignature) setTypedSignature(quote.customer.name || "");
    }
  }, [quote, customerName, customerEmail, signerName, signerEmail, typedSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const touch = "touches" in e && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = "touches" in e && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleAddLineComment = async (lineId: string) => {
    const message = lineCommentInput[lineId]?.trim();
    if (!message) return;

    await addCommentMutation.mutateAsync({
      quotationLineId: lineId,
      message,
      authorName: customerName || "Customer Representative",
      authorEmail: customerEmail || "buyer@customer.com",
    });

    setLineCommentInput((prev) => ({ ...prev, [lineId]: "" }));
  };

  const handleAddGeneralComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalComment.trim()) return;

    await addCommentMutation.mutateAsync({
      message: generalComment.trim(),
      authorName: customerName || "Customer Representative",
      authorEmail: customerEmail || "buyer@customer.com",
    });

    setGeneralComment("");
  };

  const handleCounterProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;

    const proposedTotal = Math.round(quote.subtotal * (1 - proposedDiscount / 100) * 100) / 100;

    await counterProposalMutation.mutateAsync({
      proposedDiscountPercent: proposedDiscount,
      proposedGrandTotal: proposedTotal,
      customerNotes: counterNotes.trim() || undefined,
    });

    setShowCounterModal(false);
    setActiveTab("negotiate");
  };

  const handleOneClickConfirm = async () => {
    if (!quote) return;
    await confirmMutation.mutateAsync({
      customerName: customerName || quote.customer?.name || "Customer Representative",
      customerEmail: customerEmail || quote.customer?.email || "buyer@customer.com",
      agreedToTerms: true,
      notes: "Accepted directly via Customer Portal One-Click Confirmation.",
    });
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !signerEmail.trim() || !signAgreed) return;

    let signatureData = "";
    if (signatureMode === "draw" && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL("image/png");
    } else {
      signatureData = `TYPED_SIGNATURE:${typedSignature || signerName}`;
    }

    await signMutation.mutateAsync({
      signedByName: signerName.trim(),
      signedByEmail: signerEmail.trim().toLowerCase(),
      signatureData,
    });

    setShowSignModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <BrandLogo href="/" size="sm" subtitle="Customer Quotation Portal" />
            <div className="h-6 w-32 bg-slate-200 animate-pulse rounded-full" />
          </div>
        </header>

        <main className="max-w-5xl mx-auto w-full px-6 py-10 flex-1 space-y-6">
          <div className="h-44 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs animate-pulse" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs animate-pulse" />
        </main>
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <BrandLogo href="/" size="sm" subtitle="Customer Quotation Portal" />
            <Link href="/portal/login" className="text-xs font-semibold text-[#ff5e3a] hover:underline">
              Sign In with Token
            </Link>
          </div>
        </header>

        <main className="max-w-md mx-auto w-full px-6 py-20 flex-1 text-center">
          <div className="w-14 h-14 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#ff5e3a]">
            <AlertCircle size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Quotation Link Not Found</h1>
          <p className="text-sm text-slate-500 mt-2">
            The quote reference <strong>{token}</strong> could not be located or has expired.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("reToken") as HTMLInputElement).value;
              if (input.trim()) {
                router.push(`/portal?token=${encodeURIComponent(input.trim())}`);
              }
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              name="reToken"
              type="text"
              placeholder="e.g. DF-Q1042 or buyer@acmecorp.com"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-[#ff5e3a] focus:ring-2 focus:ring-orange-100 outline-none"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#ff5e3a] text-white font-semibold text-sm hover:bg-[#ea4c28] transition shadow-md shadow-orange-500/20 cursor-pointer"
            >
              Access Proposal
            </button>
          </form>
        </main>
      </div>
    );
  }

  const isConfirmed = quote.stage === "CONFIRMED" || Boolean(quote.signature);
  const isPendingApproval = quote.stage === "PENDING_APPROVAL";
  const previewProposedTotal = Math.round(quote.subtotal * (1 - proposedDiscount / 100) * 100) / 100;
  const savings = Math.max(0, quote.subtotal - previewProposedTotal);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-3.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <BrandLogo href="/" size="sm" subtitle="Customer Quotation Portal" />
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-[#ff5e3a]">
              <ShieldCheck size={14} />
              <span>Quote: {quote.quoteNumber || token}</span>
            </div>
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>
            <Link href="/dashboard" className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
              Internal View
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1 space-y-6">
        {isConfirmed && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-3.5 text-left">
            <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-900">Quotation Confirmed &amp; Legally Accepted</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                This proposal has been accepted. Recurring subscriptions and fulfillment orders have been generated.
                {quote.signature && (
                  <span className="block mt-1 font-medium text-emerald-800">
                    Digitally signed by <strong>{quote.signature.signedByName}</strong> on {formatDate(quote.signature.signedAt)}.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {isPendingApproval && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-left">
            <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">Pending Internal Discount Approval</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Our sales leadership and finance team are finalizing approved concessions for this quotation.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs text-left">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {getStageBadge(quote.stage)}
                <span className="text-xs font-medium text-slate-400">Quote #{quote.quoteNumber || "QT-2026"}</span>
                {quote.customer?.tier && (
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                    {quote.customer.tier.name} Tier
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {quote.title || "Commercial Proposal & Contract Terms"}
              </h1>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <Building size={14} className="text-slate-400" />
                  <span>Client: <strong className="text-slate-800">{quote.customer?.name || "Valued Customer"}</strong></span>
                </div>
                {quote.salesRep?.user && (
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" />
                    <span>Account Executive: <strong className="text-slate-800">{quote.salesRep.user.name}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>Valid for 30 days</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 min-w-[220px] text-left sm:text-right">
              <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Total Net Investment</div>
              <div className="text-3xl font-extrabold text-[#ff5e3a] tracking-tight mt-0.5">
                {formatCurrency(quote.grandTotal)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex flex-col sm:items-end">
                <span>Subtotal: {formatCurrency(quote.subtotal)}</span>
                {quote.discountTotal > 0 && (
                  <span className="text-emerald-600 font-semibold">Saved: -{formatCurrency(quote.discountTotal)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("items")}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "items" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Line Items ({quote.lines?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("negotiate")}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "negotiate" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Negotiations</span>
                {quote.counterProposals && quote.counterProposals.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-[#ff5e3a] text-[10px] flex items-center justify-center font-bold">
                    {quote.counterProposals.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("discussions")}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "discussions" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Questions</span>
                {quote.comments && quote.comments.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                    {quote.comments.length}
                  </span>
                )}
              </button>
            </div>

            {!isConfirmed && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowCounterModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <Sliders size={14} className="text-slate-500" />
                  <span>Counter Offer</span>
                </button>
                <button
                  onClick={() => setShowSignModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100/60 text-[#ff5e3a] text-xs font-semibold transition cursor-pointer"
                >
                  <PenTool size={14} />
                  <span>E-Sign</span>
                </button>
                <button
                  onClick={handleOneClickConfirm}
                  disabled={confirmMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4c28] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {confirmMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>1-Click Accept</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === "items" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden text-left">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Included Products &amp; Services</h2>
                <p className="text-xs text-slate-500 mt-0.5">Expand any item to ask line-level questions.</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">{quote.lines?.length || 0} items</span>
            </div>

            <div className="divide-y divide-slate-100">
              {quote.lines && quote.lines.length > 0 ? (
                quote.lines.map((line, idx) => {
                  const isExpanded = expandedLineId === line.id;
                  const commentCount = line.comments?.length || 0;

                  return (
                    <div key={line.id || idx} className="p-5 transition hover:bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {line.description || line.product?.name || `Item #${idx + 1}`}
                            </h3>
                            {line.product?.category?.name && (
                              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                {line.product.category.name}
                              </span>
                            )}
                            {line.isRecurring && (
                              <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                                {line.billingCadence || "Annual Subscription"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Quantity: <strong>{line.quantity}</strong></span>
                            <span>Unit Price: {formatCurrency(line.unitPrice)}</span>
                            {line.discountPercent > 0 && (
                              <span className="text-emerald-600 font-medium">Discount: {line.discountPercent}%</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">{formatCurrency(line.netPrice)}</div>
                          </div>
                          <button
                            onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                              commentCount > 0 ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <MessageSquare size={13} />
                            <span>{commentCount > 0 ? `${commentCount} questions` : "Ask Question"}</span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-5 rounded-b-2xl space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <HelpCircle size={13} className="text-blue-600" />
                            <span>Line Discussion</span>
                          </h4>
                          {line.comments && line.comments.length > 0 ? (
                            <div className="space-y-2">
                              {line.comments.map((c) => (
                                <div key={c.id} className="bg-white rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-800">{c.authorName || "User"}</span>
                                    <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                                  </div>
                                  <p className="text-slate-600">{c.message}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No questions asked for this item yet.</p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={lineCommentInput[line.id] || ""}
                              onChange={(e) => setLineCommentInput((prev) => ({ ...prev, [line.id]: e.target.value }))}
                              placeholder="Ask a question on this line..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-[#ff5e3a] outline-none"
                            />
                            <button
                              onClick={() => handleAddLineComment(line.id)}
                              disabled={!lineCommentInput[line.id]?.trim() || addCommentMutation.isPending}
                              className="px-3.5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4c28] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "negotiate" && (
          <div className="space-y-6 text-left">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Commercial Counter-Offers</h2>
                <p className="text-xs text-slate-500 mt-0.5">Propose revised discount terms or overall pricing directly.</p>
              </div>
              {!isConfirmed && (
                <button
                  onClick={() => setShowCounterModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4c28] text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Sliders size={14} />
                  <span>Submit New Counter-Offer</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
              {quote.counterProposals && quote.counterProposals.length > 0 ? (
                quote.counterProposals.map((cp) => (
                  <div key={cp.id} className="p-5 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-700">
                        {cp.status}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        Proposed: {formatCurrency(cp.proposedGrandTotal)}
                      </span>
                      <span className="text-xs text-slate-500">({cp.proposedDiscountPercent}% discount)</span>
                    </div>
                    {cp.customerNotes && <p className="text-xs text-slate-600">{cp.customerNotes}</p>}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No counter-proposals submitted yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "discussions" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden text-left">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Proposal Questions &amp; Clarifications</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[480px] overflow-y-auto">
              {quote.comments && quote.comments.length > 0 ? (
                quote.comments.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{c.authorName || "Representative"}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-slate-700">{c.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No questions yet.</div>
              )}
            </div>
            <form onSubmit={handleAddGeneralComment} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:border-[#ff5e3a] outline-none"
              />
              <button
                type="submit"
                disabled={!generalComment.trim() || addCommentMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4c28] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </main>

      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Propose Counter-Terms</h3>
              <button onClick={() => setShowCounterModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCounterProposalSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">
                  Target Discount: {proposedDiscount}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={proposedDiscount}
                  onChange={(e) => setProposedDiscount(Number(e.target.value))}
                  className="w-full accent-[#ff5e3a]"
                />
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Proposed Total:</span>
                  <span className="text-[#ff5e3a]">{formatCurrency(previewProposedTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Savings:</span>
                  <span>{formatCurrency(savings)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:border-[#ff5e3a] outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowCounterModal(false)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#ff5e3a] text-white text-xs font-bold cursor-pointer">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Electronic Agreement &amp; Signature</h3>
              <button onClick={() => setShowSignModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSignSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => {
                      setSignerName(e.target.value);
                      if (signatureMode === "type") setTypedSignature(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Format</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("type")}
                    className={`px-3 py-1 rounded-md ${signatureMode === "type" ? "bg-white font-bold" : "text-slate-500"}`}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("draw")}
                    className={`px-3 py-1 rounded-md ${signatureMode === "draw" ? "bg-white font-bold" : "text-slate-500"}`}
                  >
                    Draw
                  </button>
                </div>
              </div>
              {signatureMode === "type" ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="w-full text-center bg-transparent text-2xl font-serif italic text-slate-800 outline-none"
                  />
                </div>
              ) : (
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 cursor-crosshair touch-none"
                  />
                </div>
              )}
              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={signAgreed}
                  onChange={(e) => setSignAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#ff5e3a]"
                />
                <span>I confirm that I am authorized to bind the client company.</span>
              </label>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowSignModal(false)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={signMutation.isPending || !signAgreed} className="px-5 py-2 rounded-xl bg-[#ff5e3a] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                  {signMutation.isPending ? "Signing..." : "Sign & Accept"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-slate-200 py-4 px-6 bg-white text-center text-xs text-slate-400">
        DealFlow360 Customer Quotation &amp; Negotiation Portal &copy; 2026
      </footer>
    </div>
  );
}
