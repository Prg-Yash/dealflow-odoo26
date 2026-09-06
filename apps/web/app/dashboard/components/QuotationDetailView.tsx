"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  AlertTriangle,
  History,
  TrendingUp,
  Sparkles,
  Edit3,
  XCircle,
  Check,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  CornerDownRight,
  Percent,
  Info,
  Lock,
  Zap,
} from "lucide-react";
import { useProductRecommendations } from "../../../lib/query";
import {
  calculateQuotationRisk,
  DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
  type RiskLineItem,
} from "../../../lib/risk-engine";

export interface QuotationDetailViewProps {
  quotation: any;
  currentUser: any;
  userRole?: string;
  catalogProducts?: any[];
  onRefresh?: () => void;
  backHref?: string;
}

export function QuotationDetailView({
  quotation,
  currentUser,
  userRole = "SALES_REP",
  catalogProducts = [],
  onRefresh,
  backHref = "/dashboard/sale-ref/quotations",
}: QuotationDetailViewProps) {
  const router = useRouter();

  // Mode checks
  const isSalesRep = userRole === "SALES_REP";
  const isSalesManager = userRole === "SALES_MANAGER" || userRole === "ADMIN";
  const isFinanceOps = userRole === "FINANCE_OPS" || userRole === "ADMIN";
  const isApprover = isSalesManager || isFinanceOps;

  const rawStage = (quotation?.stage || "DRAFT").toUpperCase();
  const approvalStatus = (quotation?.approvalStatus || "PENDING").toUpperCase();

  // Editable stages for sales rep
  const isEditable =
    isSalesRep &&
    (rawStage === "DRAFT" ||
      rawStage === "NEGOTIATION" ||
      approvalStatus === "REVISION_REQUESTED" ||
      approvalStatus === "REJECTED");

  const isPendingReview = rawStage === "PENDING_APPROVAL" && approvalStatus === "PENDING";

  // Active step evaluation for current approver
  const activeApprovalRequest = quotation?.approvalRequest;
  const currentStep = activeApprovalRequest?.steps?.find(
    (s: any) => s.stepNumber === activeApprovalRequest?.currentStep && s.status === "PENDING"
  );

  const canApproveCurrentStep =
    isApprover &&
    isPendingReview &&
    currentStep &&
    ((currentStep.level === "SALES_MANAGER" && isSalesManager) ||
      (currentStep.level === "FINANCE" && isFinanceOps));

  // Local state for line item edits
  const [lines, setLines] = useState<any[]>(() => quotation?.lines || []);

  useEffect(() => {
    if (quotation?.lines) {
      setLines(quotation.lines);
    }
  }, [quotation?.lines]);

  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reviewer Decision Modal / inline state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState("");
  const [reviewerLineAdjustments, setReviewerLineAdjustments] = useState<Record<string, number>>({});
  const [isReviewing, setIsReviewing] = useState(false);

  // Right-hand Panel Active Tab: 'chat' | 'trails'
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "trails">("chat");

  // Real-Time Chat & Discussion State
  const [chatMessage, setChatMessage] = useState("");
  const [chatLineId, setChatLineId] = useState("");
  const [isPostingChat, setIsPostingChat] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const { data: apiRecommendations } = useProductRecommendations();

  // Organization / Quotation Currency Symbol
  const currencySymbol =
    quotation?.currency === "USD" || currentUser?.organization?.currency === "USD"
      ? "$"
      : quotation?.currency === "EUR" || currentUser?.organization?.currency === "EUR"
        ? "€"
        : "₹";

  // Real-Time Polling: automatically refresh quotation discussion and status every 4 seconds
  useEffect(() => {
    if (!onRefresh) return;
    const timer = setInterval(() => {
      onRefresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeSideTab === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeSideTab, quotation?.comments?.length, quotation?.counterProposals?.length]);

  // Live upsell & cross-sell recommendation candidates for current items (Matching Wireframe 4)
  const upsellSuggestions = useMemo(() => {
    if (!lines || lines.length === 0 || !catalogProducts || catalogProducts.length === 0) return [];
    const currentProductIds = new Set(lines.map((l: any) => l.productId).filter(Boolean));

    // 1. Direct Pairing Rules from DB / API
    const matchingRecs = (apiRecommendations || []).filter(
      (rec: any) =>
        rec.isActive &&
        currentProductIds.has(rec.sourceProductId) &&
        !currentProductIds.has(rec.recommendedProductId)
    );

    const directCandidates = matchingRecs
      .map((rec: any) => {
        const prod = catalogProducts.find((p) => p.id === rec.recommendedProductId);
        if (!prod) return null;
        const margin =
          prod.basePrice > 0 ? ((prod.basePrice - prod.costPrice) / prod.basePrice) * 100 : 0;
        if (margin < rec.minMarginThreshold) return null; // Enforce margin floor
        const marginAmt = Math.round(prod.basePrice - prod.costPrice);
        return {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || "Accessory",
          basePrice: prod.basePrice,
          costPrice: prod.costPrice,
          marginAmount: marginAmt,
          marginPercent: Math.round(margin),
          score: rec.coPurchaseScore,
          promotionalTag: rec.promotionalTag || null,
          isPromoted: prod.isPromoted,
        };
      })
      .filter(Boolean) as any[];

    // 2. Intelligently add complementary high-margin catalog items if pairings are few
    if (directCandidates.length < 3) {
      const addedIds = new Set([
        ...Array.from(currentProductIds),
        ...directCandidates.map((d: any) => d.productId),
      ]);

      const complementary = catalogProducts
        .filter((p) => !addedIds.has(p.id))
        .map((p) => {
          const margin = p.basePrice > 0 ? ((p.basePrice - p.costPrice) / p.basePrice) * 100 : 0;
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category?.name || "Standard",
            basePrice: p.basePrice,
            costPrice: p.costPrice,
            marginAmount: Math.round(p.basePrice - p.costPrice),
            marginPercent: Math.round(margin),
            score: p.isPromoted ? 4.5 : 3.5,
            promotionalTag: p.sku === "ACC-DCK-01" ? "Promo: 12% off" : null,
            isPromoted: p.isPromoted,
          };
        })
        .filter((p) => p.marginPercent >= 15)
        .sort((a: any, b: any) => b.score - a.score || b.marginPercent - a.marginPercent);

      for (const comp of complementary) {
        if (directCandidates.length >= 8) break;
        directCandidates.push(comp);
      }
    }

    return directCandidates.slice(0, 8);
  }, [lines, catalogProducts, apiRecommendations]);

  const handleAddUpsell = async (sug: any) => {
    const prod = catalogProducts.find((p) => p.id === sug.productId);
    if (!prod) return;

    setActionError(null);
    try {
      setIsSaving(true);
      const res = await fetch(`${apiUrl}/api/quotations/${quotation.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: prod.id,
          quantity: 1,
          unitPrice: prod.basePrice,
          discountPercent: 0,
          description: prod.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add recommended product");
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to add recommended line item");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate live risk & margins
  const customerTierCeiling = quotation?.customer?.tier?.discountCeiling ?? 100.0;

  const riskLines: RiskLineItem[] = useMemo(() => {
    return lines.map((l: any) => ({
      id: l.id,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      costPrice: l.costPrice || l.product?.costPrice || 0,
      discountPercent: l.discountPercent,
      categoryCeiling: l.product?.category?.discountCeiling ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
      customerTierCeiling,
    }));
  }, [lines, customerTierCeiling]);

  const liveRiskSummary = useMemo(() => {
    return calculateQuotationRisk(riskLines, DEFAULT_CATEGORY_DISCOUNT_THRESHOLD, customerTierCeiling);
  }, [riskLines, customerTierCeiling]);

  // Detect active / latest customer counter-proposal
  const activeCounterProposal = useMemo(() => {
    if (!quotation?.counterProposals || quotation.counterProposals.length === 0) return null;
    const pending = quotation.counterProposals.find((cp: any) => cp.status === "PENDING");
    return pending || (rawStage === "NEGOTIATION" ? quotation.counterProposals[0] : null);
  }, [quotation?.counterProposals, rawStage]);

  // Handle Add Product Line to Quotation
  const handleAddProduct = async () => {
    if (!selectedCatalogProductId) return;
    const prod = catalogProducts.find((p) => p.id === selectedCatalogProductId);
    if (!prod) return;

    setActionError(null);
    try {
      setIsSaving(true);
      const res = await fetch(`${apiUrl}/api/quotations/${quotation.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: prod.id,
          quantity: 1,
          unitPrice: prod.basePrice,
          discountPercent: 0,
          description: prod.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add product line");
      }

      setSelectedCatalogProductId("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to add line item");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Update Line
  const handleUpdateLine = async (
    lineId: string,
    updates: { quantity?: number; discountPercent?: number; unitPrice?: number }
  ) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...updates } : l))
    );

    try {
      await fetch(`${apiUrl}/api/quotations/${quotation.id}/lines/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Failed to patch line:", err);
    }
  };

  // Handle Delete Line
  const handleDeleteLine = async (lineId: string) => {
    setActionError(null);
    try {
      setIsSaving(true);
      const res = await fetch(`${apiUrl}/api/quotations/${quotation.id}/lines/${lineId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete line");
      }
      setLines((prev) => prev.filter((l) => l.id !== lineId));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to delete line item");
    } finally {
      setIsSaving(false);
    }
  };

  // 1-Click Apply Customer Desired Discount to all line items in draft
  const handleApplyCustomerDiscount = async (targetDiscount: number) => {
    if (!isEditable || lines.length === 0) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      setIsApplyingDiscount(true);
      // Optimistically update local lines state
      const updatedLines = lines.map((l) => ({
        ...l,
        discountPercent: targetDiscount,
      }));
      setLines(updatedLines);

      // Persist discount update across all quotation lines
      await Promise.all(
        lines.map((l) =>
          fetch(`${apiUrl}/api/quotations/${quotation.id}/lines/${l.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ discountPercent: targetDiscount }),
          })
        )
      );

      setActionSuccess(
        `Applied customer target discount of ${targetDiscount}% across line items. Review the updated risk thermometer before submitting.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to apply customer discount across lines");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  // Handle Submit / Resubmit Quotation (Routes through 3-Condition Risk Engine)
  const handleSubmitQuotation = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/api/quotations/${quotation.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit quotation");
      }

      const resData = await res.json();
      const updatedQuote = resData.data || resData;

      if (updatedQuote.stage === "APPROVED") {
        setActionSuccess(
          "Quotation Auto-Approved (Condition 1: 0 Hops). Terms are immediately available in the customer portal."
        );
      } else {
        setActionSuccess("Quotation successfully submitted for management approval routing.");
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to submit quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send Chat / Discussion Message
  const handlePostChatMessage = async (customMessage?: string) => {
    const messageToSend = (customMessage || chatMessage).trim();
    if (!messageToSend) return;

    setActionError(null);
    setIsPostingChat(true);

    try {
      const res = await fetch(`${apiUrl}/api/quotations/${quotation.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: messageToSend,
          quotationLineId: chatLineId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to send message");
      }

      setChatMessage("");
      setChatLineId("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to send discussion message");
    } finally {
      setIsPostingChat(false);
    }
  };

  // Handle Approver Approve Step
  const handleApproveStep = async () => {
    setActionError(null);
    setIsReviewing(true);

    try {
      const res = await fetch(`${apiUrl}/api/approvals/${quotation.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments: "Approved in full compliance with deal policy." }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to approve step");
      }

      setActionSuccess("Approval step recorded successfully.");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve step");
    } finally {
      setIsReviewing(false);
    }
  };

  // Handle Approver Reject Step / Request Revision
  const handleRejectStep = async () => {
    if (!rejectComments.trim()) {
      setActionError("Please provide feedback notes explaining the revision request.");
      return;
    }

    setActionError(null);
    setIsReviewing(true);

    try {
      const lineAdjustments = Object.entries(reviewerLineAdjustments).map(
        ([lineId, discountPercent]) => ({
          lineId,
          discountPercent,
        })
      );

      const res = await fetch(`${apiUrl}/api/approvals/${quotation.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          comments: rejectComments.trim(),
          lineAdjustments,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to reject step");
      }

      setShowRejectModal(false);
      setActionSuccess("Quotation returned to Sales Representative for revision.");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to submit rejection");
    } finally {
      setIsReviewing(false);
    }
  };

  // Build Chronological Real-Time Discussion Feed (Strictly scoped to this quotation)
  const chatFeed = useMemo(() => {
    const items: Array<{
      id: string;
      date: Date;
      type: "comment" | "counter" | "milestone";
      authorName: string;
      authorRole: string;
      message: string;
      lineDescription?: string;
      proposedDiscount?: number;
      badgeClass: string;
      avatarBg: string;
    }> = [];

    // 1. Comments
    (quotation?.comments || []).forEach((c: any) => {
      const role = (c.authorRole || c.author?.role || "USER").toUpperCase();
      let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
      let avatarBg = "bg-slate-700 text-white";

      if (role === "CUSTOMER") {
        badgeClass = "bg-orange-50 text-[#ff5e3a] border-orange-200";
        avatarBg = "bg-[#ff5e3a] text-white";
      } else if (role === "SALES_REP") {
        badgeClass = "bg-blue-50 text-[#0066cc] border-blue-200";
        avatarBg = "bg-[#0066cc] text-white";
      } else if (role === "SALES_MANAGER") {
        badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
        avatarBg = "bg-purple-700 text-white";
      } else if (role === "FINANCE_OPS" || role === "FINANCE") {
        badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        avatarBg = "bg-emerald-700 text-white";
      }

      items.push({
        id: `c-${c.id}`,
        date: new Date(c.createdAt),
        type: "comment",
        authorName:
          c.author?.name ||
          (role === "CUSTOMER" ? quotation.customer?.name : "Representative") ||
          "User",
        authorRole: role,
        message: c.message || c.content || "",
        lineDescription: c.quotationLine?.description,
        proposedDiscount: c.proposedDiscountPercent,
        badgeClass,
        avatarBg,
      });
    });

    // 2. Customer Counter-Proposals
    (quotation?.counterProposals || []).forEach((cp: any) => {
      const alreadyCommented = quotation.comments?.some((c: any) =>
        c.message?.includes(`${cp.proposedDiscountPercent}% discount`)
      );
      if (!alreadyCommented) {
        items.push({
          id: `cp-${cp.id}`,
          date: new Date(cp.createdAt),
          type: "counter",
          authorName: cp.respondedBy?.name || quotation.customer?.name || "Customer",
          authorRole: "CUSTOMER",
          message: `Customer Counter-Proposal: Requested ${cp.proposedDiscountPercent}% discount tier (Target Deal Total: ₹${Number(
            cp.proposedGrandTotal || 0
          ).toLocaleString()}). ${cp.customerNotes ? `Buyer Notes: "${cp.customerNotes}"` : ""}`,
          proposedDiscount: cp.proposedDiscountPercent,
          badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
          avatarBg: "bg-purple-600 text-white",
        });
      }
    });

    // 3. Significant Milestones from Audit Logs
    (quotation?.auditLogs || []).forEach((log: any) => {
      if (
        log.action === "AUTO_APPROVED" ||
        log.action.includes("APPROVED") ||
        log.action.includes("REJECT") ||
        log.action.includes("REVISION")
      ) {
        const alreadyInComments = quotation.comments?.some((c: any) =>
          c.message?.toLowerCase().includes(log.action.toLowerCase().replace(/_/g, " "))
        );
        if (!alreadyInComments) {
          items.push({
            id: `log-${log.id}`,
            date: new Date(log.createdAt),
            type: "milestone",
            authorName: log.actor?.name || "Compliance Engine",
            authorRole: log.actorRole || "SYSTEM",
            message: `${log.action.replace(/_/g, " ")}: ${
              log.reason || "Workflow state progression recorded."
            }`,
            badgeClass: log.action.includes("APPROVED")
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200",
            avatarBg: log.action.includes("APPROVED")
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white",
          });
        }
      }
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [quotation]);

  // Combine Audit Events & Workflow Steps for the Trails Tab
  const combinedTrails = useMemo(() => {
    const events: Array<{
      id: string;
      date: Date;
      type: "audit" | "counter" | "comment";
      title: string;
      description: string;
      actor: string;
      role: string;
      badgeColor: string;
    }> = [];

    // 1. Audit Logs
    (quotation?.auditLogs || []).forEach((log: any) => {
      let badgeColor = "bg-slate-100 text-slate-700";
      if (log.action.includes("APPROVED"))
        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      if (log.action.includes("REJECT") || log.action.includes("REVISION"))
        badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
      if (log.action.includes("SUBMITTED"))
        badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

      events.push({
        id: log.id,
        date: new Date(log.createdAt),
        type: "audit",
        title: log.action.replace(/_/g, " "),
        description: log.reason || "Workflow state progression recorded.",
        actor: log.actor?.name || "System",
        role: log.actorRole || "SYSTEM",
        badgeColor,
      });
    });

    // 2. Customer Counter Proposals
    (quotation?.counterProposals || []).forEach((cp: any) => {
      events.push({
        id: cp.id,
        date: new Date(cp.createdAt),
        type: "counter",
        title: "Customer Counter-Proposal",
        description:
          cp.customerNotes ||
          `Requested discount: ${cp.proposedDiscountPercent || 0}%, target total: ${currencySymbol}${Number(
            cp.proposedGrandTotal || 0
          ).toLocaleString()}`,
        actor: cp.respondedBy?.name || quotation.customer?.name || "Client",
        role: "CUSTOMER",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [quotation]);

  return (
    <div className="space-y-6 text-left font-sans">
      {/* ── TOP BREADCRUMB & HEADER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-medium">
            <Link
              href={backHref}
              className="hover:text-[#0066cc] transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Back to Pipeline</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">
              {quotation.quoteNumber || quotation.id}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              {quotation.title || "Commercial Quotation"}
            </h1>

            {/* Stage Badge */}
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                rawStage === "CONFIRMED"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : rawStage === "APPROVED"
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : rawStage === "PENDING_APPROVAL"
                  ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                  : rawStage === "NEGOTIATION"
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : "bg-slate-200 text-slate-800 border border-slate-300"
              }`}
            >
              {rawStage.replace(/_/g, " ")}
            </span>

            {/* Revision Requested Badge */}
            {approvalStatus === "REVISION_REQUESTED" && (
              <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                Revision Requested
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assigned Sales Rep:{" "}
            <strong>{quotation.salesRep?.user?.name || "Representative"}</strong> &bull; Client:{" "}
            <strong>{quotation.customer?.name || "Customer Org"}</strong> (
            {quotation.customer?.tier?.name || "Standard Tier"})
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {/* In-page Discussion Indicator Chip */}
          <button
            type="button"
            onClick={() => setActiveSideTab("chat")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-xs transition cursor-pointer ${
              activeSideTab === "chat"
                ? "bg-orange-50 border-orange-200 text-[#ff5e3a]"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <MessageSquare size={13} className="text-[#ff5e3a]" />
            <span>Discussion ({chatFeed.length})</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Refresh Quotation"
            >
              <RefreshCw size={14} />
            </button>
          )}

          {isEditable && (
            <button
              type="button"
              disabled={isSubmitting || lines.length === 0}
              onClick={handleSubmitQuotation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-[#0066cc]/25 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>
                {approvalStatus === "REVISION_REQUESTED"
                  ? "Resubmit Proposal"
                  : "Submit for Approval"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-xs">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Read-only Banner for Sales Rep if under approval */}
      {isSalesRep && isPendingReview && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-center gap-2 shadow-xs">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <span>
            This quotation is currently locked in <strong>Read-Only</strong> view awaiting management
            approval sign-off.
          </span>
        </div>
      )}

      {/* ── APPROVER ACTION BAR (Sales Manager / Finance Ops) ── */}
      {canApproveCurrentStep && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h3 className="text-base font-black tracking-tight">
                  Action Required: Step {currentStep.stepNumber} (
                  {currentStep.level === "SALES_MANAGER" ? "Sales Manager" : "Finance Operations"}{" "}
                  Review)
                </h3>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Review line discounts, risk thermometer, and margins below before confirming.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle size={14} />
                <span>Reject / Request Revision</span>
              </button>

              <button
                type="button"
                disabled={isReviewing}
                onClick={handleApproveStep}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-md shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isReviewing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} strokeWidth={3} />
                )}
                <span>Approve Step</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP COMMERCIAL & GOVERNANCE CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Grand Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Net Contract Value
          </span>
          <div className="text-2xl font-black text-[#0066cc]">
            {currencySymbol}{liveRiskSummary.totalOrderValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Gross Subtotal: {currencySymbol}{liveRiskSummary.subtotal.toLocaleString()}
          </div>
        </div>

        {/* Card 2: Total Discount */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Discount
          </span>
          <div className="text-2xl font-black text-rose-600">
            -{currencySymbol}{liveRiskSummary.discountTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Effective Discount: {liveRiskSummary.totalDiscountPercent.toFixed(1)}%
          </div>
        </div>

        {/* Card 3: Gross Margin */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Deal Gross Margin
          </span>
          <div
            className={`text-2xl font-black ${
              liveRiskSummary.grossMarginPercent < 35 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {liveRiskSummary.grossMarginPercent}%
          </div>
          <div className="text-[11px] text-slate-500">
            Margin Amount: {currencySymbol}{liveRiskSummary.grossMargin.toLocaleString()}
          </div>
        </div>

        {/* Card 4: Blended Risk Thermometer */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Blended Risk Score
            </span>
            <span
              className={`text-base font-black ${
                liveRiskSummary.blendedScore === 0
                  ? "text-emerald-600"
                  : liveRiskSummary.blendedScore <= 10
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {liveRiskSummary.blendedScore}%
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-300 ${
                liveRiskSummary.blendedScore === 0
                  ? "bg-emerald-500"
                  : liveRiskSummary.blendedScore <= 10
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, liveRiskSummary.blendedScore * 5))}%` }}
            />
          </div>

          <div className="text-[10px] font-bold text-slate-500">
            {liveRiskSummary.classification.badgeText}
          </div>
        </div>
      </div>

      {/* ── 3-CONDITION GOVERNANCE PATH BANNER ── */}
      <div
        className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs ${
          liveRiskSummary.classification.color === "emerald"
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : liveRiskSummary.classification.color === "amber"
            ? "bg-amber-50/80 border-amber-200 text-amber-900"
            : "bg-rose-50/80 border-rose-200 text-rose-900"
        }`}
      >
        <div className="p-1 rounded-lg bg-white/80 shrink-0">
          {liveRiskSummary.classification.color === "emerald" ? (
            <Check size={18} className="text-emerald-600" />
          ) : (
            <AlertTriangle size={18} className="text-amber-600" />
          )}
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="font-extrabold text-sm">{liveRiskSummary.classification.label}</div>
          <p className="opacity-90 leading-relaxed">{liveRiskSummary.classification.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: PRODUCT LINE ITEMS TABLE (7 cols) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Customer Counter-Proposal Notice & 1-Click Apply */}
          {activeCounterProposal && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-slate-900 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-[#ff5e3a] text-white shrink-0">
                    <SlidersHorizontal size={16} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        Customer Counter-Proposal Active
                      </span>
                      <span className="px-2 py-0.2 rounded-full bg-orange-200 text-[#ff5e3a] text-[10px] font-extrabold">
                        {activeCounterProposal.proposedDiscountPercent}% Desired Tier
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Client requested <strong>{activeCounterProposal.proposedDiscountPercent}%</strong> discount tier (Target Total: <strong>{currencySymbol}{Number(activeCounterProposal.proposedGrandTotal || 0).toLocaleString()}</strong>).
                      {activeCounterProposal.customerNotes && (
                        <span className="italic block text-slate-500 mt-0.5">
                          &ldquo;{activeCounterProposal.customerNotes}&rdquo;
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {isEditable && (
                  <button
                    type="button"
                    disabled={isApplyingDiscount || isSaving}
                    onClick={() =>
                      handleApplyCustomerDiscount(activeCounterProposal.proposedDiscountPercent)
                    }
                    className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isApplyingDiscount ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    <span>Apply {activeCounterProposal.proposedDiscountPercent}% Discount</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-[#0066cc]" />
                <h2 className="text-base font-bold text-slate-900">
                  Quotation Line Items ({lines.length})
                </h2>
              </div>

              {/* Add Product Dropdown for Editable Mode */}
              {isEditable && catalogProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCatalogProductId}
                    onChange={(e) => setSelectedCatalogProductId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer max-w-[220px]"
                  >
                    <option value="">+ Add Catalog Product...</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({currencySymbol}{p.basePrice})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedCatalogProductId || isSaving}
                    className="px-3 py-1.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 min-w-[180px]">Product / Deliverable</th>
                    <th className="py-3 px-2 w-14 text-center">Qty</th>
                    <th className="py-3 px-2 w-20 text-right">Unit Price</th>
                    <th className="py-3 px-2 w-20 text-center">Disc %</th>
                    <th className="py-3 px-2 w-16 text-center">Ceiling</th>
                    <th className="py-3 px-2 w-20 text-center">Status</th>
                    <th className="py-3 px-3 w-24 text-right">Net Total</th>
                    {isEditable && <th className="py-3 px-2 w-8 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={isEditable ? 8 : 7} className="py-8 text-center text-slate-400">
                        No product lines in this quotation.
                      </td>
                    </tr>
                  ) : (
                    lines.map((item, idx) => {
                      const calc = liveRiskSummary.lines[idx];
                      const ceiling = calc?.lineCeiling ?? DEFAULT_CATEGORY_DISCOUNT_THRESHOLD;
                      const isOver = item.discountPercent > ceiling;
                      const overage = isOver
                        ? Math.round((item.discountPercent - ceiling) * 10) / 10
                        : 0;
                      const netAmount =
                        item.unitPrice * item.quantity * (1 - item.discountPercent / 100);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div>{item.description || item.product?.name || "Product Item"}</div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {item.product?.category?.name || "Category"} &bull; SKU:{" "}
                              {item.product?.sku || "N/A"}
                            </div>
                          </td>

                          <td className="py-3.5 px-2 text-center">
                            {isEditable ? (
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateLine(item.id, {
                                    quantity: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="w-12 px-1 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                              />
                            ) : (
                              <span className="font-bold">{item.quantity}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-2 text-right">
                            {isEditable ? (
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateLine(item.id, {
                                    unitPrice: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-18 px-1 py-1 text-right font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                              />
                            ) : (
                              <span className="font-bold">{currencySymbol}{item.unitPrice.toLocaleString()}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-2 text-center">
                            {isEditable ? (
                              <div className="inline-flex items-center gap-0.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.discountPercent}
                                  onChange={(e) =>
                                    handleUpdateLine(item.id, {
                                      discountPercent: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0066cc]"
                                />
                                <span className="text-slate-400 font-semibold text-[11px]">%</span>
                              </div>
                            ) : (
                              <span className="font-bold">{item.discountPercent}%</span>
                            )}
                          </td>

                          <td className="py-3.5 px-2 text-center text-slate-500 font-medium">
                            {ceiling}%
                          </td>

                          <td className="py-3.5 px-2 text-center">
                            {isOver ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                OVER (+{overage}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                OK
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                            {currencySymbol}{Math.round(netAmount).toLocaleString()}
                          </td>

                          {isEditable && (
                            <td className="py-3.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteLine(item.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                                title="Remove Line"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Dedicated Upsell and Cross-Sell Suggestions (Wireframe 4) */}
          {isEditable && upsellSuggestions.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-sky-400 tracking-tight">
                      Upsell and Cross-Sell Suggestions
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      High-margin historical pairings dynamically matched with current proposal items.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-300 bg-blue-950 border border-blue-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Zap size={12} className="text-amber-400 fill-amber-400" />
                  {upsellSuggestions.length} Suggestions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {upsellSuggestions.map((sug: any) => (
                  <button
                    type="button"
                    key={sug.productId}
                    disabled={isSaving}
                    onClick={() => handleAddUpsell(sug)}
                    className="bg-[#0b1120] hover:bg-[#131d33] p-4 rounded-2xl border border-slate-800 hover:border-blue-500 transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors flex items-center gap-1">
                        <span>+ {sug.name}</span>
                      </div>
                      {sug.promotionalTag ? (
                        <div className="text-[11px] font-semibold text-amber-400">
                          {sug.promotionalTag}
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-slate-400">
                          Margin +{currencySymbol}{sug.marginAmount.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div>
                        <div className="text-xs font-extrabold text-white font-mono">
                          {currencySymbol}{sug.basePrice.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold font-mono">
                          {sug.marginPercent}% Margin
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1">
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Add</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: IN-PAGE CLICKUP-STYLE DISCUSSION & TRAILS (5 cols) ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[640px]">
            {/* Tab Header Switcher */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1">
              <button
                type="button"
                onClick={() => setActiveSideTab("chat")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeSideTab === "chat"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <MessageSquare
                  size={14}
                  className={activeSideTab === "chat" ? "text-[#ff5e3a]" : "text-slate-400"}
                />
                <span>Deal Discussion</span>
                {chatFeed.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-[10px] text-[#ff5e3a] font-bold">
                    {chatFeed.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSideTab("trails")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeSideTab === "trails"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <History
                  size={14}
                  className={activeSideTab === "trails" ? "text-[#0066cc]" : "text-slate-400"}
                />
                <span>Governance Trails</span>
                {combinedTrails.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] text-slate-700 font-bold">
                    {combinedTrails.length}
                  </span>
                )}
              </button>
            </div>

            {/* ── TAB 1: DEAL DISCUSSION & REAL-TIME CHAT ── */}
            {activeSideTab === "chat" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Real-Time Stakeholder Info Bar */}
                <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-semibold text-slate-700">Real-Time Stakeholder Thread</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Syncs live across all roles</span>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                  {chatFeed.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <MessageSquare size={18} />
                      </div>
                      <p className="text-xs font-medium">No messages in this quotation thread yet.</p>
                      <p className="text-[11px] text-slate-400">
                        Messages sent here are visible to the Sales Rep, Client, and Approvers in real time.
                      </p>
                    </div>
                  ) : (
                    chatFeed.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-2xl border text-xs space-y-1.5 transition ${
                          msg.authorRole === "CUSTOMER"
                            ? "bg-white border-orange-200 shadow-2xs"
                            : msg.authorRole === "SALES_REP"
                            ? "bg-white border-blue-200 shadow-2xs"
                            : msg.authorRole === "SALES_MANAGER"
                            ? "bg-purple-50/70 border-purple-200 shadow-2xs"
                            : msg.authorRole === "FINANCE_OPS" || msg.authorRole === "FINANCE"
                            ? "bg-emerald-50/70 border-emerald-200 shadow-2xs"
                            : "bg-slate-100 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${msg.avatarBg}`}
                            >
                              {msg.authorName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900">{msg.authorName}</span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase border ${msg.badgeClass}`}
                            >
                              {msg.authorRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {msg.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <p className="text-slate-800 leading-relaxed font-medium pl-8">
                          {msg.message}
                        </p>

                        {/* Optional Line Reference Tag */}
                        {msg.lineDescription && (
                          <div className="pl-8 pt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                              <Tag size={10} />
                              <span>{msg.lineDescription}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Chips */}
                <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      handlePostChatMessage("Customer requested discount applied and updated in draft proposal.")
                    }
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-[#ff5e3a] text-slate-600 text-[10px] font-semibold transition shrink-0 cursor-pointer"
                  >
                    + Applied discount
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePostChatMessage("Proposal submitted for manager approval review.")
                    }
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-[#0066cc] text-slate-600 text-[10px] font-semibold transition shrink-0 cursor-pointer"
                  >
                    + Sent for review
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePostChatMessage("Terms approved and locked. Ready for client e-signature.")
                    }
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[10px] font-semibold transition shrink-0 cursor-pointer"
                  >
                    + Terms approved
                  </button>
                </div>

                {/* Message Composer */}
                <div className="p-3 bg-white border-t border-slate-200 space-y-2">
                  {lines.length > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <select
                        value={chatLineId}
                        onChange={(e) => setChatLineId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[11px] outline-none cursor-pointer max-w-[200px]"
                      >
                        <option value="">Attach Line Item (Optional)...</option>
                        {lines.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.description || l.product?.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400">Enter to send &bull; Shift+Enter for newline</span>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostChatMessage();
                        }
                      }}
                      placeholder="Type message or reply to customer & approvers..."
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#ff5e3a] resize-none"
                    />

                    <button
                      type="button"
                      disabled={isPostingChat || !chatMessage.trim()}
                      onClick={() => handlePostChatMessage()}
                      className="p-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isPostingChat ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: GOVERNANCE TRAILS & AUDIT WORKFLOW ── */}
            {activeSideTab === "trails" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {/* Approval Steps Checklist */}
                {activeApprovalRequest?.steps && activeApprovalRequest.steps.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Sequential Review Workflow
                    </span>
                    <div className="space-y-1.5">
                      {activeApprovalRequest.steps.map((step: any) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            {step.status === "APPROVED" ? (
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            ) : step.status === "REVISION_REQUESTED" ? (
                              <XCircle size={14} className="text-rose-500" />
                            ) : (
                              <Clock size={14} className="text-amber-500" />
                            )}
                            <span className="font-semibold text-slate-800">
                              Step {step.stepNumber}:{" "}
                              {step.level === "SALES_MANAGER" ? "Sales Manager" : "Finance Ops"}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              step.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : step.status === "REVISION_REQUESTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronological Event Feed */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Audit Log Timeline
                  </span>
                  {combinedTrails.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      No audit trail events recorded yet.
                    </div>
                  ) : (
                    combinedTrails.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${ev.badgeColor}`}
                          >
                            {ev.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ev.date.toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed font-medium">
                          {ev.description}
                        </p>
                        <div className="text-[10px] text-slate-400 pt-0.5 font-normal">
                          By <strong>{ev.actor}</strong> ({ev.role})
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── REJECT / REVISION REQUEST MODAL ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-rose-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Request Quotation Revision
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Specify feedback and optionally adjust product line discounts before returning this
              quotation to the sales representative.
            </p>

            {/* Optional Line Discount Adjuster */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Suggested Line Discount Adjustments (Optional)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {lines.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-100"
                  >
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {l.description || l.product?.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">Target:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder={`${l.discountPercent}%`}
                        value={reviewerLineAdjustments[l.id] ?? ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setReviewerLineAdjustments((prev) => ({
                            ...prev,
                            [l.id]: isNaN(val) ? l.discountPercent : val,
                          }));
                        }}
                        className="w-14 px-1.5 py-0.5 text-center font-bold bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-rose-500"
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Comments */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Revision Feedback &amp; Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="e.g. Blended discount is too high for Q3. Please reduce hardware line discount to 8%."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReviewing || !rejectComments.trim()}
                onClick={handleRejectStep}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isReviewing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Send Revision Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
