"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../../../lib/auth-client";
import {
  FileText,
  MessageSquare,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar,
  Percent,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  Building,
  Mail,
  Phone,
  FileSignature,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  Check,
  X,
  Layers,
  Sparkles,
  Search,
  Filter,
  LayoutGrid,
  List,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Tag,
  Eye,
  SlidersHorizontal,
  Lock,
  LogOut,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { getStoredRole } from "../../../lib/roles";

export interface PortalProps {
  initialToken?: string;
  customerEmail?: string;
}

export function CustomerNegotiationPortal({ initialToken = "DF-Q1042", customerEmail }: PortalProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"quotation" | "messages" | "profile">("quotation");
  const [token, setToken] = useState<string>(initialToken);
  const [tokenInput, setTokenInput] = useState<string>(initialToken);
  const [showTokenSelector, setShowTokenSelector] = useState<boolean>(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("df360_user_role");
        sessionStorage.clear();
        document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie = "__Secure-better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }
      try {
        await signOut();
      } catch (authErr) {
        console.warn("Sign-out API call warning:", authErr);
      }
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };


  // View Mode: 'list' (catalog of all customer quotes) or 'detail' (single quote negotiation)
  const [viewMode, setViewMode] = useState<"detail" | "list">("detail");
  const [displayLayout, setDisplayLayout] = useState<"grid" | "table">("grid");


  // Filter States for Quotations List
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [timePeriodFilter, setTimePeriodFilter] = useState<string>("ALL");

  // Live Data State
  const [quotation, setQuotation] = useState<any>(null);
  const [customerQuotations, setCustomerQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Counter Proposal Form State
  const [counterDiscount, setCounterDiscount] = useState<number>(12);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || ""
  );
  const [proposalMessage, setProposalMessage] = useState<string>("");
  const [submittingProposal, setSubmittingProposal] = useState<boolean>(false);

  // Line Comment State
  const [selectedLineForComment, setSelectedLineForComment] = useState<any | null>(null);
  const [lineCommentMessage, setLineCommentMessage] = useState<string>("");
  const [submittingLineComment, setSubmittingLineComment] = useState<boolean>(false);

  // General Message State (Messages Tab)
  const [generalMessage, setGeneralMessage] = useState<string>("");
  const [sendingGeneralMessage, setSendingGeneralMessage] = useState<boolean>(false);

  // Sign & Confirm Modal State
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [signerName, setSignerName] = useState<string>("");
  const [signerEmail, setSignerEmail] = useState<string>("");
  const [signerTitle, setSignerTitle] = useState<string>("VP of Procurement");
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = useState<string>("");
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [isSigning, setIsSigning] = useState<boolean>(false);

  // 1-Click Confirm state
  const [isConfirmingOneClick, setIsConfirmingOneClick] = useState<boolean>(false);

  // Feedback Notification Banner
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Derive the real portal token from the loaded quotation (never use "current" in API calls)
  const effectiveApiToken = quotation?.portalToken || quotation?.quoteNumber || token;

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-scroll chat window to latest message
  useEffect(() => {
    if (activeTab === "messages" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTab, quotation?.comments?.length]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
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
  };

  // Primary live data fetching
  const fetchQuotationData = useCallback(
    async (currentToken: string) => {
      setLoading(true);
      setError(null);
      try {
        // When no explicit token, use "me" so portalAuth resolves via session
        const effectiveLookup = !currentToken || currentToken === "current" || currentToken === "my" ? "me" : currentToken;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-portal-token": effectiveLookup,
        };
        if (customerEmail) {
          headers["x-customer-email"] = customerEmail;
        }

        const res = await fetch(`${API_BASE}/api/portal/${encodeURIComponent(effectiveLookup)}`, {
          headers,
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.replace("/login");
            return;
          }
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || `Quotation not found (Status: ${res.status})`);
        }

        const json = await res.json();
        const data = json.data || json;
        setQuotation(data);

        // Pre-fill Signer Info from Customer Record
        if (data.customer) {
          setSignerName((prev) => prev || data.customer.name || "");
          setSignerEmail((prev) => prev || data.customer.email || customerEmail || "");
          setTypedSignature((prev) => prev || data.customer.name || "");
        }

        // Populate customer's quotations catalog directly from response
        if (data.customerQuotations && Array.isArray(data.customerQuotations)) {
          setCustomerQuotations(data.customerQuotations);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load quotation from DealFlow360 API.");
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, customerEmail]
  );

  // Fetch all customer quotations for the catalog list
  const fetchCustomerQuotations = useCallback(
    async (currentToken: string) => {
      try {
        const res = await fetch(`${API_BASE}/api/portal/${encodeURIComponent(currentToken)}`, {
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": currentToken,
          },
          credentials: "include",
        });

        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          if (data.customerQuotations && Array.isArray(data.customerQuotations)) {
            setCustomerQuotations(data.customerQuotations);
          }
        }
      } catch (err) {
        console.warn("Could not fetch customer quotations list:", err);
      }
    },
    [API_BASE]
  );

  // Initial load
  useEffect(() => {
    if (token) {
      fetchQuotationData(token);
    }
  }, [token, fetchQuotationData]);

  // Handler: Switch Quotation within Authenticated Session
  const handleSelectToken = (selectedToken: string) => {
    setToken(selectedToken);
    setTokenInput(selectedToken);
    setShowTokenSelector(false);
    setViewMode("detail");
  };

  // Handler: Submit Counter-Proposal (Task 2: Counters a discount)
  const handleSubmitCounterProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    setSubmittingProposal(true);
    try {
      const estimatedNet = Math.round(quotation.subtotal * (1 - counterDiscount / 100) * 100) / 100;
      const payload = {
        proposedGrandTotal: estimatedNet,
        proposedDiscountPercent: Number(counterDiscount),
        customerNotes: proposalMessage.trim() || `Customer requested ${counterDiscount}% discount tier.`,
        requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate).toISOString() : undefined,
      };

      const res = await fetch(`${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/counter-proposal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-token": effectiveApiToken,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to submit counter proposal.");
      }

      setNotification({
        type: "success",
        message: `Counter-proposal for ${counterDiscount}% discount (₹${estimatedNet.toLocaleString("en-IN", { minimumFractionDigits: 2 })}) submitted to sales representative.`,
      });

      setProposalMessage("");
      // Refresh live state
      await fetchQuotationData(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not submit counter-proposal. Please retry.",
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Handler: Submit Line-Level Comment (Task 2: Asks line level questions)
  const handleSubmitLineComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineForComment || !lineCommentMessage.trim()) return;

    setSubmittingLineComment(true);
    try {
      const payload = {
        message: lineCommentMessage.trim(),
        quotationLineId: selectedLineForComment.id,
        authorName: signerName || quotation?.customer?.name || "Customer Lead",
        authorEmail: signerEmail || quotation?.customer?.email || "buyer@acmecorp.com",
      };

      const res = await fetch(`${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-token": effectiveApiToken,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to post line item question.");
      }

      setNotification({
        type: "success",
        message: `Question submitted on ${selectedLineForComment.description || selectedLineForComment.product?.name}.`,
      });

      setLineCommentMessage("");
      setSelectedLineForComment(null);
      await fetchQuotationData(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not post question. Please try again.",
      });
    } finally {
      setSubmittingLineComment(false);
    }
  };

  // Handler: Send General Message (Messages Tab)
  const handleSendGeneralMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalMessage.trim()) return;

    setSendingGeneralMessage(true);
    try {
      const payload = {
        message: generalMessage.trim(),
        authorName: signerName || quotation?.customer?.name || "Customer Lead",
        authorEmail: signerEmail || quotation?.customer?.email || "buyer@acmecorp.com",
      };

      const res = await fetch(`${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-token": effectiveApiToken,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to send message to sales team.");
      }

      setGeneralMessage("");
      setNotification({
        type: "success",
        message: "Message sent to your assigned DealFlow sales representative.",
      });

      await fetchQuotationData(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to transmit message.",
      });
    } finally {
      setSendingGeneralMessage(false);
    }
  };

  // Handler: 1-Click Instant Confirm
  const handleOneClickConfirm = async () => {
    if (!quotation) return;
    setIsConfirmingOneClick(true);
    try {
      const res = await fetch(`${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-token": effectiveApiToken,
        },
        credentials: "include",
        body: JSON.stringify({
          customerName: signerName || quotation?.customer?.name,
          customerEmail: signerEmail || quotation?.customer?.email,
          agreedToTerms: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Could not confirm quotation.");
      }

      setNotification({
        type: "success",
        message: "Deal confirmed with 1-click! Order-to-Cash engine has generated billing invoices and fulfillment orders.",
      });

      await fetchQuotationData(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to confirm deal.",
      });
    } finally {
      setIsConfirmingOneClick(false);
    }
  };

  // Handler: Confirm & E-Sign Quotation (Task 3: Confirms final terms)
  const handleConfirmSignature = async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      setNotification({ type: "error", message: "Signer Name and Business Email are required." });
      return;
    }

    if (!agreedToTerms) {
      setNotification({ type: "error", message: "You must accept the commercial terms and conditions." });
      return;
    }

    setIsSigning(true);
    try {
      let signatureData = "";
      if (signatureMode === "draw" && canvasRef.current) {
        signatureData = canvasRef.current.toDataURL("image/png");
      } else {
        signatureData = `TYPED_LEGAL_SIGNATURE:${typedSignature || signerName}`;
      }

      const payload = {
        signedByName: signerName.trim(),
        signedByEmail: signerEmail.trim().toLowerCase(),
        signatureData,
        title: signerTitle || "Procurement Officer",
        agreedToTerms: true,
      };

      const res = await fetch(`${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-token": effectiveApiToken,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "E-Signature confirmation failed.");
      }

      setNotification({
        type: "success",
        message: "Quotation signed and confirmed! Deal has transitioned to CONFIRMED stage.",
      });

      setIsSignModalOpen(false);
      await fetchQuotationData(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Signature transmission failed. Please retry.",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Filtered list of quotations for the catalog list view
  const filteredQuotations = useMemo(() => {
    return customerQuotations.filter((q) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        q.quoteNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "DRAFT" && (q.stage === "DRAFT" || q.stage === "DRAFT_INTERNAL")) ||
        (statusFilter === "PENDING_APPROVAL" && q.stage === "PENDING_APPROVAL") ||
        (statusFilter === "APPROVED" && (q.stage === "APPROVED" || q.stage === "SENT_TO_CUSTOMER")) ||
        (statusFilter === "UNDER_NEGOTIATION" && q.stage === "NEGOTIATION") ||
        (statusFilter === "CONFIRMED" && (q.stage === "CONFIRMED" || q.stage === "WON" || q.stage === "FULFILLED"));

      let matchesTime = true;
      if (timePeriodFilter !== "ALL" && q.createdAt) {
        const created = new Date(q.createdAt).getTime();
        const now = Date.now();
        if (timePeriodFilter === "30_DAYS") {
          matchesTime = now - created <= 30 * 24 * 60 * 60 * 1000;
        } else if (timePeriodFilter === "90_DAYS") {
          matchesTime = now - created <= 90 * 24 * 60 * 60 * 1000;
        } else if (timePeriodFilter === "THIS_YEAR") {
          const currentYear = new Date().getFullYear();
          matchesTime = new Date(q.createdAt).getFullYear() === currentYear;
        }
      }

      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [customerQuotations, searchQuery, statusFilter, timePeriodFilter]);

  // Aggregate Metrics for Quotations List
  const metrics = useMemo(() => {
    const totalCount = customerQuotations.length;
    const totalValue = customerQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const activeNegotiations = customerQuotations.filter(
      (q) => q.stage === "NEGOTIATION" || q.stage === "PENDING_APPROVAL" || q.stage === "APPROVED"
    ).length;
    const confirmedCount = customerQuotations.filter((q) => q.stage === "CONFIRMED" || q.stage === "WON" || q.stage === "FULFILLED").length;

    return { totalCount, totalValue, activeNegotiations, confirmedCount };
  }, [customerQuotations]);

  // Calculate live proposed savings for the counter discount
  const originalSubtotal = quotation?.subtotal || 0;
  const estimatedCounterTotal = Math.round(originalSubtotal * (1 - counterDiscount / 100) * 100) / 100;
  const estimatedSavings = Math.round((originalSubtotal - estimatedCounterTotal) * 100) / 100;

  // Render Status Badge (Light Mode)
  const renderStatusBadge = (stage: string) => {
    switch (stage) {
      case "CONFIRMED":
      case "WON":
      case "FULFILLED":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Status: Confirmed &amp; Accepted</span>
          </div>
        );
      case "NEGOTIATION":
      case "UNDER_NEGOTIATION":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Status: Under Negotiation</span>
          </div>
        );
      case "PENDING_APPROVAL":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Status: Internal Review</span>
          </div>
        );
      case "APPROVED":
      case "SENT_TO_CUSTOMER":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>Status: Approved Terms</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
            <span>Status: {stage || "Draft"}</span>
          </div>
        );
    }
  };

  const isConfirmed = quotation?.stage === "CONFIRMED" || Boolean(quotation?.signature);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* ── TOP NAV / HEADER (Light Mode) ── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <BrandLogo href="/" size="sm" subtitle="Customer Quotation Portal" />
          </div>

          {/* Navigation Pill Tabs (Light Mode) */}
          <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab("quotation")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "quotation"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <FileText size={14} className={activeTab === "quotation" ? "text-[#ff5e3a]" : ""} />
              <span>My Quotations</span>
              {customerQuotations.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-700 font-mono border border-slate-300">
                  {customerQuotations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "messages"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <MessageSquare size={14} className={activeTab === "messages" ? "text-[#ff5e3a]" : ""} />
              <span>Messages</span>
              {quotation?.comments?.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-orange-100 text-[10px] text-[#ff5e3a] font-bold">
                  {quotation.comments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <User size={14} className={activeTab === "profile" ? "text-[#ff5e3a]" : ""} />
              <span>Company Profile</span>
            </button>
          </div>

          {/* Quick Quote Reference & Selector & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setShowTokenSelector(!showTokenSelector)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-semibold text-[#ff5e3a] hover:bg-orange-100/80 transition cursor-pointer"
                title="Click to switch quotation reference"
              >
                <ShieldCheck size={14} />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  {quotation?.quoteNumber || token}
                </span>
                <RefreshCw size={12} className="text-slate-400" />
              </button>

              {/* Token Selector Modal Dropdown */}
              {showTokenSelector && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Your Company Quotations</span>
                    <button onClick={() => setShowTokenSelector(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {customerQuotations.map((item) => (
                      <button
                        key={item.id || item.portalToken || item.quoteNumber}
                        onClick={() => handleSelectToken(item.portalToken || item.quoteNumber)}
                        className={`w-full text-left p-2 rounded-xl text-xs flex flex-col gap-0.5 transition cursor-pointer ${
                          token === item.portalToken || token === item.quoteNumber
                            ? "bg-orange-50 border border-orange-200 text-[#ff5e3a]"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{item.quoteNumber}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100">
                            {item.stage}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate">{item.title}</span>
                        <span className="text-[11px] font-bold text-[#ff5e3a]">
                          ₹{Number(item.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Enter Token or Quote #..."
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="flex-1 bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                    />
                    <button
                      onClick={() => {
                        if (tokenInput.trim()) handleSelectToken(tokenInput.trim());
                      }}
                      className="px-3 py-1.5 bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold rounded-xl"
                    >
                      Open
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-100/90 transition-all cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-50 shrink-0"
              title="Sign out of Customer Portal"
              aria-label="Sign out of Customer Portal"
            >
              {loggingOut ? (
                <RefreshCw size={13} className="animate-spin text-red-500" />
              ) : (
                <LogOut size={13} className="text-red-500" />
              )}
              <span className="hidden sm:inline">{loggingOut ? "Signing out..." : "Sign Out"}</span>
              <span className="sm:hidden">{loggingOut ? "..." : "Exit"}</span>
            </button>
          </div>
        </div>
      </header>


      {/* ── NOTIFICATION BANNER ── */}
      {notification && (
        <div
          className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 border-b border-emerald-200 text-emerald-800"
              : notification.type === "error"
                ? "bg-red-50 border-b border-red-200 text-red-800"
                : "bg-blue-50 border-b border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {notification.type === "success" && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
            {notification.type === "error" && <AlertTriangle size={16} className="text-red-600 shrink-0" />}
            {notification.type === "info" && <Info size={16} className="text-blue-600 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw size={32} className="animate-spin text-[#ff5e3a] mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Retrieving official quotation from DealFlow360...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Quotation Link Not Found</h3>
            <p className="text-xs text-slate-600">{error}</p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => router.push("/login")}
                className="px-5 py-2.5 bg-[#ff5e3a] text-white text-xs font-semibold rounded-xl hover:bg-[#ea4e28] shadow-sm transition"
              >
                Go to Sign In
              </button>
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════
                TAB 1: MY QUOTATIONS (Catalog View & Detail View)
            ══════════════════════════════════════════════════════ */}
            {activeTab === "quotation" && (
              <div className="space-y-6">
                {/* View Switcher: Detail vs List */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    {viewMode === "detail" ? (
                      <button
                        onClick={() => setViewMode("list")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                      >
                        <ArrowLeft size={14} />
                        <span>All Proposals ({customerQuotations.length})</span>
                      </button>
                    ) : (
                      <h2 className="text-base font-bold text-slate-900">Company Proposals Catalog</h2>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {viewMode === "list" && (
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button
                          onClick={() => setDisplayLayout("grid")}
                          className={`p-1.5 rounded-lg transition ${
                            displayLayout === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                          }`}
                          title="Grid View"
                        >
                          <LayoutGrid size={15} />
                        </button>
                        <button
                          onClick={() => setDisplayLayout("table")}
                          className={`p-1.5 rounded-lg transition ${
                            displayLayout === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                          }`}
                          title="Table View"
                        >
                          <List size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SUB-VIEW A: CATALOG LIST OF ALL QUOTES ── */}
                {viewMode === "list" && (
                  <div className="space-y-6">
                    {/* Metrics Overview Cards (Light Mode) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Proposals</span>
                        <div className="text-2xl font-extrabold text-slate-900">{metrics.totalCount}</div>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pipeline Value</span>
                        <div className="text-2xl font-extrabold text-[#ff5e3a]">
                          ₹{metrics.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Negotiation</span>
                        <div className="text-2xl font-extrabold text-amber-600">{metrics.activeNegotiations}</div>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Confirmed Deals</span>
                        <div className="text-2xl font-extrabold text-emerald-600">{metrics.confirmedCount}</div>
                      </div>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                      <div className="relative w-full md:w-72">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by quote # or title..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-[#f8fafc] border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 outline-none"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="UNDER_NEGOTIATION">In Negotiation</option>
                          <option value="APPROVED">Approved Terms</option>
                          <option value="CONFIRMED">Confirmed Deals</option>
                          <option value="DRAFT">Drafts</option>
                        </select>

                        <select
                          value={timePeriodFilter}
                          onChange={(e) => setTimePeriodFilter(e.target.value)}
                          className="bg-[#f8fafc] border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 outline-none"
                        >
                          <option value="ALL">All Time</option>
                          <option value="30_DAYS">Last 30 Days</option>
                          <option value="90_DAYS">Last 90 Days</option>
                          <option value="THIS_YEAR">This Year</option>
                        </select>
                      </div>
                    </div>

                    {/* Grid Layout of Quotations */}
                    {displayLayout === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredQuotations.map((q) => (
                          <div
                            key={q.id}
                            onClick={() => handleSelectToken(q.portalToken || q.quoteNumber)}
                            className="bg-white border border-slate-200 hover:border-[#ff5e3a] p-5 rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">{q.quoteNumber}</span>
                                {renderStatusBadge(q.stage)}
                              </div>
                              <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{q.title}</h3>
                              <p className="text-xs text-slate-500">
                                Created on {new Date(q.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Investment</span>
                                <span className="text-base font-extrabold text-[#ff5e3a]">
                                  ₹{Number(q.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 hover:text-[#ff5e3a]">
                                <span>Review</span>
                                <ChevronRight size={14} />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Table Layout of Quotations */
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Quote #</th>
                              <th className="py-3 px-4">Title</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Created Date</th>
                              <th className="py-3 px-4 text-right">Grand Total</th>
                              <th className="py-3 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredQuotations.map((q) => (
                              <tr
                                key={q.id}
                                onClick={() => handleSelectToken(q.portalToken || q.quoteNumber)}
                                className="hover:bg-slate-50 cursor-pointer transition"
                              >
                                <td className="py-3 px-4 font-bold text-slate-900">{q.quoteNumber}</td>
                                <td className="py-3 px-4 text-slate-700">{q.title}</td>
                                <td className="py-3 px-4">{renderStatusBadge(q.stage)}</td>
                                <td className="py-3 px-4 text-slate-500">
                                  {new Date(q.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-[#ff5e3a]">
                                  ₹{Number(q.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button className="px-3 py-1 rounded-lg bg-orange-50 text-[#ff5e3a] font-semibold text-xs hover:bg-orange-100">
                                    Open
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SUB-VIEW B: DETAIL QUOTATION & NEGOTIATION ── */}
                {viewMode === "detail" && quotation && (
                  <div className="space-y-6">
                    {/* Proposal Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h1 className="text-xl font-extrabold text-slate-900">{quotation.quoteNumber}</h1>
                          {renderStatusBadge(quotation.stage)}
                        </div>
                        <p className="text-sm text-slate-600 font-medium">{quotation.title}</p>
                        <p className="text-xs text-slate-400">
                          Prepared for <strong>{quotation.customer?.name}</strong> &bull; Valid through{" "}
                          {new Date(quotation.expiresAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action Buttons: 1-Click Accept & E-Sign */}
                      <div className="flex flex-wrap items-center gap-2">
                        {!isConfirmed ? (
                          <>
                            <button
                              onClick={handleOneClickConfirm}
                              disabled={isConfirmingOneClick}
                              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {isConfirmingOneClick ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
                              <span>1-Click Accept Terms</span>
                            </button>

                            <button
                              onClick={() => setIsSignModalOpen(true)}
                              className="px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold transition shadow-md shadow-[#ff5e3a]/20 flex items-center gap-2 cursor-pointer"
                            >
                              <FileSignature size={15} />
                              <span>E-Sign Quotation</span>
                            </button>
                          </>
                        ) : (
                          <div className="px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span>Executed &amp; Confirmed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary Cards (Light Mode) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Gross Subtotal
                        </span>
                        <div className="text-xl font-extrabold text-slate-900 mt-1">
                          ₹{(quotation.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Standard Discount
                        </span>
                        <div className="text-xl font-extrabold text-emerald-600 mt-1">
                          -₹{(quotation.discountTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Estimated Tax
                        </span>
                        <div className="text-xl font-extrabold text-slate-700 mt-1">
                          +₹{(quotation.taxTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs bg-linear-to-br from-orange-50/50 to-white">
                        <span className="text-[11px] font-semibold text-[#ff5e3a] uppercase tracking-wider block">
                          Net Total Investment
                        </span>
                        <div className="text-2xl font-black text-[#ff5e3a] mt-1">
                          ₹{(quotation.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Quotation Line Items (Task 1 & Task 2: Line level questions) */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">Configured Products &amp; Subscriptions</h3>
                        <span className="text-xs text-slate-500">
                          {quotation.lines?.length || 0} line items included
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Item &amp; Description</th>
                              <th className="py-3 px-4">Type</th>
                              <th className="py-3 px-4 text-center">Qty</th>
                              <th className="py-3 px-4 text-right">Unit Price</th>
                              <th className="py-3 px-4 text-right">Disc %</th>
                              <th className="py-3 px-4 text-right">Net Price</th>
                              <th className="py-3 px-4 text-center">Questions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quotation.lines?.map((line: any) => {
                              const lineComments = line.comments || quotation.comments?.filter((c: any) => c.quotationLineId === line.id) || [];
                              return (
                                <tr key={line.id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900">
                                      {line.product?.name || line.description}
                                    </div>
                                    <div className="text-[11px] text-slate-500">{line.description}</div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {line.itemType || "SUBSCRIPTION"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-semibold text-slate-800">{line.quantity}</td>
                                  <td className="py-3.5 px-4 text-right text-slate-600">
                                    ₹{Number(line.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                                    {line.discountPercent || 0}%
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                                    ₹{Number(line.netPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => setSelectedLineForComment(line)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-[#ff5e3a] text-slate-700 text-xs font-semibold transition cursor-pointer"
                                    >
                                      <MessageSquare size={13} />
                                      <span>Ask</span>
                                      {lineComments.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-orange-200 text-[#ff5e3a] text-[10px] font-bold">
                                          {lineComments.length}
                                        </span>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Counter-Proposal Section (Task 2: Counters a discount) */}
                    {!isConfirmed && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal size={18} className="text-[#ff5e3a]" />
                          <h3 className="text-sm font-bold text-slate-900">Request Commercial Adjustments / Counter Discount</h3>
                        </div>

                        <form onSubmit={handleSubmitCounterProposal} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Discount Slider */}
                            <div className="space-y-3 bg-[#f8fafc] border border-slate-200 p-4 rounded-xl">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-700">Target Commercial Discount Tier</span>
                                <span className="text-sm font-extrabold text-[#ff5e3a]">{counterDiscount}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="40"
                                step="1"
                                value={counterDiscount}
                                onChange={(e) => setCounterDiscount(Number(e.target.value))}
                                className="w-full accent-[#ff5e3a] cursor-pointer"
                              />
                              <div className="flex justify-between text-[11px] text-slate-500">
                                <span>0% Standard</span>
                                <span>20% Preferred</span>
                                <span>40% Enterprise Cap</span>
                              </div>
                            </div>

                            {/* Live Calculation Preview */}
                            <div className="bg-[#f8fafc] border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                              <div className="flex justify-between text-slate-600">
                                <span>Original List Price:</span>
                                <span className="font-semibold text-slate-800">₹{originalSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-emerald-600 font-semibold">
                                <span>Proposed Total Savings:</span>
                                <span>-₹{estimatedSavings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                                <span>Proposed Deal Total:</span>
                                <span className="text-[#ff5e3a]">₹{estimatedCounterTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Buyer Justification / Procurement Notes</label>
                            <textarea
                              rows={2}
                              value={proposalMessage}
                              onChange={(e) => setProposalMessage(e.target.value)}
                              placeholder="e.g. Approved budget cap for this quarter is ₹42,000. If granted, we can execute immediately."
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={submittingProposal}
                              className="px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold transition shadow-md shadow-[#ff5e3a]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {submittingProposal ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                              <span>Submit Counter-Proposal</span>
                            </button>
                          </div>
                        </form>

                        {/* Counter-Proposal History */}
                        {quotation.counterProposals && quotation.counterProposals.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock size={13} className="text-slate-400" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Negotiation History</span>
                            </div>
                            <div className="space-y-2">
                              {quotation.counterProposals.map((cp: any) => {
                                const statusConfig: Record<string, { label: string; cls: string }> = {
                                  PENDING:    { label: "Awaiting Review", cls: "bg-amber-50 border-amber-200 text-amber-700" },
                                  ACCEPTED:   { label: "Accepted ✓",      cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                                  REJECTED:   { label: "Declined",        cls: "bg-red-50 border-red-200 text-red-700" },
                                  SUPERSEDED: { label: "Superseded",      cls: "bg-slate-100 border-slate-200 text-slate-500" },
                                };
                                const sc = statusConfig[cp.status as string] ?? { label: "Pending", cls: "bg-amber-50 border-amber-200 text-amber-700" };
                                return (
                                  <div key={cp.id} className="flex items-start justify-between bg-[#f8fafc] border border-slate-200 rounded-xl p-3 text-xs gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-900">
                                          {cp.proposedDiscountPercent}% discount · ₹{Number(cp.proposedGrandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.cls}`}>
                                          {sc.label}
                                        </span>
                                      </div>
                                      {cp.customerNotes && (
                                        <p className="text-slate-500 mt-0.5 truncate">{cp.customerNotes}</p>
                                      )}
                                      <span className="text-slate-400 mt-0.5 block">{new Date(cp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 2: MESSAGES — REAL-TIME CHAT WINDOW
            ══════════════════════════════════════════════════════ */}
            {activeTab === "messages" && quotation && (
              <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden" style={{ minHeight: "560px", maxHeight: "80vh" }}>
                {/* Chat Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff5e3a] to-[#ea4e28] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(quotation.salesRep?.user?.name || "SR").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{quotation.salesRep?.user?.name || "Sales Representative"}</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Active deal rep — {quotation.quoteNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchQuotationData(token)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title="Refresh messages"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {quotation.comments?.length || 0} messages
                    </span>
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#f8fafc]" style={{ scrollBehavior: "smooth" }}>
                  {(!quotation.comments || quotation.comments.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                        <MessageSquare size={24} className="text-[#ff5e3a]" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
                          Start a conversation with your assigned sales representative below.
                        </p>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      // Group messages by date for date separators
                      let lastDate = "";
                      return quotation.comments.map((msg: any, idx: number) => {
                        const isCustomer = msg.authorRole === "CUSTOMER";
                        const msgDate = new Date(msg.createdAt);
                        const dateLabel = msgDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                        const timeLabel = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const showDateSep = dateLabel !== lastDate;
                        lastDate = dateLabel;

                        const prevMsg = idx > 0 ? quotation.comments[idx - 1] : null;
                        const isSameAuthor = prevMsg && prevMsg.authorRole === msg.authorRole && !showDateSep;

                        const initials = (msg.authorName || (isCustomer ? "C" : "S")).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

                        return (
                          <div key={msg.id}>
                            {/* Date Separator */}
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 bg-white rounded-full border border-slate-200">
                                  {dateLabel}
                                </span>
                                <div className="flex-1 h-px bg-slate-200" />
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div className={`flex items-end gap-2 mt-1 ${ isCustomer ? "flex-row-reverse" : "flex-row" }`}>
                              {/* Avatar — only show for first message in a group or date separator */}
                              {!isSameAuthor ? (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mb-0.5 ${
                                  isCustomer
                                    ? "bg-gradient-to-br from-[#ff5e3a] to-[#ea4e28] text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}>
                                  {initials}
                                </div>
                              ) : (
                                <div className="w-7 shrink-0" />
                              )}

                              <div className={`max-w-[72%] flex flex-col ${ isCustomer ? "items-end" : "items-start" }`}>
                                {/* Sender name for first message in group */}
                                {!isSameAuthor && (
                                  <span className="text-[10px] font-semibold text-slate-500 mb-0.5 px-1">
                                    {msg.authorName || (isCustomer ? quotation.customer?.name || "You" : quotation.salesRep?.user?.name || "Sales Rep")}
                                  </span>
                                )}

                                <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                  isCustomer
                                    ? "bg-[#ff5e3a] text-white rounded-br-sm shadow-sm shadow-[#ff5e3a]/20"
                                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-xs"
                                }`}>
                                  {/* Line item reference badge */}
                                  {msg.quotationLineId && (
                                    <div className={`text-[10px] font-bold mb-1 opacity-80 ${ isCustomer ? "text-orange-100" : "text-slate-400" }`}>
                                      📎 Re: Line item
                                    </div>
                                  )}
                                  {msg.message}
                                </div>

                                <span className="text-[10px] text-slate-400 mt-0.5 px-1">{timeLabel}</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                  {/* Anchor for auto-scroll */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
                  <form onSubmit={handleSendGeneralMessage} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        rows={1}
                        value={generalMessage}
                        onChange={(e) => {
                          setGeneralMessage(e.target.value);
                          // Auto-grow textarea
                          e.target.style.height = "auto";
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendGeneralMessage(e as any);
                          }
                        }}
                        placeholder="Message your sales representative… (Enter to send, Shift+Enter for new line)"
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#ff5e3a] resize-none transition-all"
                        style={{ minHeight: "40px", maxHeight: "120px" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sendingGeneralMessage || !generalMessage.trim()}
                      className="w-10 h-10 rounded-2xl bg-[#ff5e3a] hover:bg-[#ea4e28] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition shadow-md shadow-[#ff5e3a]/20 shrink-0 cursor-pointer"
                    >
                      {sendingGeneralMessage ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-400 mt-1.5 px-1">Your messages are shared with your assigned DealFlow360 sales rep for this quotation.</p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 3: COMPANY PROFILE
            ══════════════════════════════════════════════════════ */}
            {activeTab === "profile" && quotation && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building size={18} className="text-[#ff5e3a]" />
                  <h3 className="text-sm font-bold text-slate-900">Client Organization &amp; Account Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500">Procurement Account Details</span>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">Organization Name</span>
                        <span className="font-bold text-slate-900 text-sm">{quotation.customer?.name || "Acme Corporation"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Primary Billing Email</span>
                        <span className="font-semibold text-slate-800">{quotation.customer?.email || "buyer@acmecorp.com"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Customer Tier &amp; Ceiling</span>
                        <span className="font-semibold text-emerald-600">
                          {quotation.customer?.tier?.name || "Enterprise Tier"} &bull; {quotation.customer?.tier?.discountCeiling || 15}% standard ceiling
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500">Assigned Sales Team</span>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">Account Representative</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {quotation.salesRep?.user?.name || "Sarah Jenkins"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Representative Email</span>
                        <span className="font-semibold text-slate-800">
                          {quotation.salesRep?.user?.email || "rep.sarah@dealflow360.com"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Service Level</span>
                        <span className="font-semibold text-blue-600">24/7 Dedicated Deal Architect</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Portal Session Management & Sign Out */}
                  <div className="md:col-span-2 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8fafc] rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ff5e3a] shrink-0">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Active Customer Session</h4>
                        <p className="text-[11px] text-slate-500">
                          Signed in as <span className="text-[#ff5e3a] font-medium">{customerEmail || quotation.customer?.email || "buyer@acmecorp.com"}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      disabled={loggingOut}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold transition-all shadow-xs active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                    >
                      {loggingOut ? <RefreshCw size={14} className="animate-spin text-red-500" /> : <LogOut size={14} className="text-red-500" />}
                      <span>{loggingOut ? "Signing Out..." : "Sign Out of Customer Portal"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </main>

      {/* ── LINE ITEM QUESTION MODAL / DRAWER ── */}
      {selectedLineForComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ask Question on Line Item</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedLineForComment.description || selectedLineForComment.product?.name}
                </p>
              </div>
              <button onClick={() => setSelectedLineForComment(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitLineComment} className="space-y-4">
              <textarea
                rows={4}
                required
                value={lineCommentMessage}
                onChange={(e) => setLineCommentMessage(e.target.value)}
                placeholder="Type your question or request regarding this line item..."
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#ff5e3a]"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLineForComment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLineComment || !lineCommentMessage.trim()}
                  className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingLineComment ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Post Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── E-SIGNATURE MODAL ── */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSignature size={20} className="text-[#ff5e3a]" />
                <h3 className="text-base font-bold text-slate-900">Execute Commercial Agreement</h3>
              </div>
              <button onClick={() => setIsSignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-orange-50/70 border border-orange-200/80 p-3.5 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Quotation: {quotation?.quoteNumber}</span>
                <span className="text-[#ff5e3a]">₹{(quotation?.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Upon signature, commercial invoices, subscriptions, and fulfillment orders are automatically generated.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Signer Legal Name</label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => {
                      setSignerName(e.target.value);
                      if (signatureMode === "type") setTypedSignature(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-[#ff5e3a] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Signer Email</label>
                  <input
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-[#ff5e3a] outline-none"
                  />
                </div>
              </div>

              {/* Signature Mode Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Digital Signature</span>
                  <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setSignatureMode("type")}
                      className={`px-2.5 py-0.5 rounded-md ${
                        signatureMode === "type" ? "bg-white font-bold text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Typed
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      className={`px-2.5 py-0.5 rounded-md ${
                        signatureMode === "draw" ? "bg-white font-bold text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Drawn
                    </button>
                  </div>
                </div>

                {signatureMode === "type" ? (
                  <div className="h-28 bg-[#f8fafc] border border-slate-200 rounded-xl flex items-center justify-center p-4">
                    <span className="font-serif italic text-2xl text-slate-900 select-none tracking-wide">
                      {typedSignature || signerName || "Legal Signer"}
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-28 bg-[#f8fafc] border border-slate-200 rounded-xl cursor-crosshair touch-none"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="absolute right-2 bottom-2 text-[10px] text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded accent-[#ff5e3a]"
                />
                <span>
                  I confirm that I am an authorized representative of <strong>{quotation?.customer?.name}</strong> and agree to execute this commercial agreement.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignature}
                disabled={isSigning || !agreedToTerms || !signerName.trim()}
                className="px-6 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-md shadow-[#ff5e3a]/20"
              >
                {isSigning ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>Execute &amp; Confirm Deal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 py-4 px-6 bg-white text-center text-xs text-slate-500">
        DealFlow360 Enterprise Customer Negotiation Portal &copy; 2026 &bull; Secure Cryptographic Token Authentication
      </footer>
    </div>
  );
}
