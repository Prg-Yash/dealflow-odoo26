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
  LogOut,
} from "lucide-react";


// Pre-seeded demo tokens for fast switching
export const DEMO_TOKENS = [
  {
    token: "portal-token-acme-confirmed-05",
    label: "Acme Confirmed",
    stage: "CONFIRMED",
    customer: "Acme Corporation",
  },
  {
    token: "portal-token-acme-draft-01",
    label: "Acme Q3 Expansion (Draft)",
    stage: "DRAFT",
    customer: "Acme Corporation",
  },
  {
    token: "portal-token-devally-09944bea306b2c0d",
    label: "Devally Enterprise",
    stage: "APPROVED",
    customer: "Client Enterprise Corp",
  },
  {
    token: "portal-token-omni-approved-03",
    label: "OmniCorp Dynamics",
    stage: "APPROVED",
    customer: "OmniCorp Dynamics",
  },
  {
    token: "portal-token-quantum-04",
    label: "QuantumLeap Labs",
    stage: "UNDER_NEGOTIATION",
    customer: "QuantumLeap Labs",
  },
  {
    token: "portal-token-beta-pending-02",
    label: "Beta Industries",
    stage: "PENDING_APPROVAL",
    customer: "Beta Industries",
  },
];

export interface PortalProps {
  initialToken?: string;
}

export function CustomerNegotiationPortal({ initialToken = "portal-token-acme-confirmed-05" }: PortalProps) {
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
        document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/login");
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

  // Feedback Notification Banner
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Fetch Quotation Data from API
  const fetchQuotation = useCallback(async (tokenToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/portal/quotations/${tokenToFetch}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Failed to load quotation for this portal token.");
      }

      setQuotation(data.data);
      if (data.data?.customerQuotations && Array.isArray(data.data.customerQuotations)) {
        setCustomerQuotations(data.data.customerQuotations);
      } else {
        setCustomerQuotations([data.data]);
      }

      if (data.data?.customer) {
        setSignerName(data.data.customer.name || "Customer Signer");
        setSignerEmail(data.data.customer.email || "procurement@company.com");
        setTypedSignature(data.data.customer.name || "Customer Signer");
      }
    } catch (err: any) {
      setError(err.message || "Could not connect to the quotation portal server.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (token) {
      fetchQuotation(token);
    }
  }, [token, fetchQuotation]);

  // Handle Canvas Drawing for E-Signature
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches.length > 0 && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    if ("clientX" in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#10B981";
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

  // Submit Counter Proposal
  const handleCounterProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    setSubmittingProposal(true);
    setNotification(null);

    try {
      const payload = {
        proposedDiscount: Number(counterDiscount),
        message: proposalMessage.trim()
          ? `${proposalMessage.trim()} (Requested Delivery Date: ${requestedDeliveryDate})`
          : `We would like to propose a ${counterDiscount}% discount with target delivery by ${requestedDeliveryDate}.`,
        authorName: signerName || quotation.customer?.name || "Customer Representative",
        authorEmail: signerEmail || quotation.customer?.email || "procurement@customer.com",
      };

      const res = await fetch(`${API_BASE}/api/portal/quotations/${token}/counter-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Failed to submit counter-proposal.");
      }

      setNotification({
        type: "success",
        message: "Counter-proposal submitted successfully! Your account executive has been notified.",
      });
      setProposalMessage("");
      fetchQuotation(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to submit counter-proposal.",
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Submit Line-level Comment
  const handleLineComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineForComment || !lineCommentMessage.trim()) return;

    setSubmittingLineComment(true);
    setNotification(null);

    try {
      const res = await fetch(`${API_BASE}/api/portal/quotations/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationLineId: selectedLineForComment.id,
          message: lineCommentMessage.trim(),
          authorName: signerName || quotation?.customer?.name || "Customer Representative",
          authorEmail: signerEmail || quotation?.customer?.email || "procurement@customer.com",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Failed to post comment on this line item.");
      }

      setNotification({
        type: "success",
        message: `Question submitted on line '${selectedLineForComment.description || selectedLineForComment.product?.name}'.`,
      });
      setSelectedLineForComment(null);
      setLineCommentMessage("");
      fetchQuotation(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to post question.",
      });
    } finally {
      setSubmittingLineComment(false);
    }
  };

  // Submit General Message
  const handleSendGeneralMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalMessage.trim()) return;

    setSendingGeneralMessage(true);
    setNotification(null);

    try {
      const res = await fetch(`${API_BASE}/api/portal/quotations/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: generalMessage.trim(),
          authorName: signerName || quotation?.customer?.name || "Customer Representative",
          authorEmail: signerEmail || quotation?.customer?.email || "procurement@customer.com",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Failed to send message.");
      }

      setNotification({
        type: "success",
        message: "Message sent directly to your sales team.",
      });
      setGeneralMessage("");
      fetchQuotation(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to send message.",
      });
    } finally {
      setSendingGeneralMessage(false);
    }
  };

  // Confirm & E-Sign Quotation
  const handleConfirmSignature = async () => {
    if (!signerName.trim() || !signerEmail.trim() || !agreedToTerms) {
      setNotification({
        type: "error",
        message: "Please enter your full legal name, email, and agree to the commercial terms.",
      });
      return;
    }

    setIsSigning(true);
    setNotification(null);

    let signatureData = "";
    if (signatureMode === "draw" && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL("image/png");
    } else {
      signatureData = `data:text/plain;base64,${btoa(typedSignature || signerName)}`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/portal/quotations/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          signerTitle: signerTitle.trim() || "Authorized Signatory",
          signatureData: signatureData || `Signed by ${signerName}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Failed to confirm and sign quotation.");
      }

      setIsSignModalOpen(false);
      setNotification({
        type: "success",
        message: "Quotation Confirmed! Your agreement has been executed and commercial invoices & order provisioning are now generated.",
      });
      fetchQuotation(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to execute signature.",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // One-Click Deal Confirmation
  const handleOneClickConfirm = async () => {
    if (!quotation) return;
    setIsSigning(true);
    setNotification(null);
    try {
      const res = await fetch(`${API_BASE}/api/portal/quotations/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: signerName || quotation.customer?.name || "Customer Representative",
          customerEmail: signerEmail || quotation.customer?.email || "procurement@customer.com",
          agreedToTerms: true,
          notes: "Accepted directly via Customer Portal One-Click Confirmation.",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Failed to confirm quotation.");
      }

      setNotification({
        type: "success",
        message: "Quotation Confirmed! Your agreement has been finalized with 1-click and commercial invoices & order fulfillment are now generated.",
      });
      fetchQuotation(token);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to confirm quotation.",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Filter & Search Logic for Customer Quotations List
  const filteredQuotations = useMemo(() => {
    return customerQuotations.filter((q) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = q.title?.toLowerCase().includes(query);
        const matchesNumber = q.quoteNumber?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNumber) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && q.stage !== "PENDING_APPROVAL" && q.stage !== "UNDER_NEGOTIATION") {
          return false;
        }
        if (statusFilter === "APPROVED" && q.stage !== "APPROVED" && q.stage !== "SENT_TO_CUSTOMER") {
          return false;
        }
        if (statusFilter === "CONFIRMED" && q.stage !== "CONFIRMED" && q.stage !== "WON") {
          return false;
        }
        if (statusFilter === "DRAFT" && q.stage !== "DRAFT") {
          return false;
        }
      }

      // 3. Time Period Filter
      if (timePeriodFilter !== "ALL") {
        const createdAt = new Date(q.createdAt).getTime();
        const now = Date.now();
        if (timePeriodFilter === "30D" && now - createdAt > 30 * 24 * 60 * 60 * 1000) {
          return false;
        }
        if (timePeriodFilter === "90D" && now - createdAt > 90 * 24 * 60 * 60 * 1000) {
          return false;
        }
        if (timePeriodFilter === "YEAR") {
          const currentYear = new Date().getFullYear();
          if (new Date(q.createdAt).getFullYear() !== currentYear) return false;
        }
      }

      return true;
    });
  }, [customerQuotations, searchQuery, statusFilter, timePeriodFilter]);

  // Aggregate Metrics for Quotations List
  const metrics = useMemo(() => {
    const totalCount = customerQuotations.length;
    const totalValue = customerQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const activeNegotiations = customerQuotations.filter(
      (q) => q.stage === "UNDER_NEGOTIATION" || q.stage === "PENDING_APPROVAL" || q.stage === "APPROVED"
    ).length;
    const confirmedCount = customerQuotations.filter((q) => q.stage === "CONFIRMED" || q.stage === "WON").length;

    return { totalCount, totalValue, activeNegotiations, confirmedCount };
  }, [customerQuotations]);

  // Calculate live proposed savings for the counter discount
  const originalSubtotal = quotation?.subtotal || 0;
  const estimatedCounterTotal = Math.round(originalSubtotal * (1 - counterDiscount / 100) * 100) / 100;
  const estimatedSavings = Math.round((originalSubtotal - estimatedCounterTotal) * 100) / 100;

  // Render Status Badge
  const renderStatusBadge = (stage: string) => {
    switch (stage) {
      case "CONFIRMED":
      case "WON":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Status: Confirmed &amp; Signed</span>
          </div>
        );
      case "UNDER_NEGOTIATION":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Status: Under Negotiation</span>
          </div>
        );
      case "PENDING_APPROVAL":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Status: Pending Approval</span>
          </div>
        );
      case "APPROVED":
      case "SENT_TO_CUSTOMER":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-400 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>Status: Approved Terms</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold uppercase tracking-wider">
            <span>Status: {stage || "Draft"}</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#070A0F] text-slate-100 font-sans antialiased flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ── TOP HEADER / NAVBAR ── */}
      <header className="border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/20">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">DealFlow360</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Customer Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Commercial Proposals &amp; Negotiation</p>
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center bg-[#111726] border border-slate-800 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => {
                setActiveTab("quotation");
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "quotation"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <FileText size={14} />
              <span>My Quotations</span>
              {customerQuotations.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-300 border border-emerald-500/30 font-mono">
                  {customerQuotations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "messages"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <MessageSquare size={14} />
              <span>Messages</span>
              {quotation?.comments?.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-400 border border-emerald-500/30">
                  {quotation.comments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <User size={14} />
              <span>Profile</span>
            </button>
          </div>

          {/* Header Action Items (Demo Switcher & Logout Button) */}
          <div className="flex items-center gap-2.5">
            {/* Quick Demo Switcher */}
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setShowTokenSelector(!showTokenSelector)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:border-slate-500 transition cursor-pointer"
                title="Click to switch quotation link"
              >
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="truncate max-w-[110px] sm:max-w-[160px]">{token}</span>
                <RefreshCw size={12} className="text-slate-400" />
              </button>

              {/* Token Switcher Dropdown */}
              {showTokenSelector && (
                <div className="absolute right-0 top-11 w-80 bg-[#111726] border border-slate-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">Switch Demo Token</div>
                  <div className="space-y-1.5 mb-3">
                    {DEMO_TOKENS.map((dt) => (
                      <button
                        key={dt.token}
                        onClick={() => {
                          setToken(dt.token);
                          setTokenInput(dt.token);
                          setShowTokenSelector(false);
                          setViewMode("detail");
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                          token === dt.token ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400"
                        }`}
                      >
                        <span className="font-medium">{dt.label}</span>
                        <span className="text-[10px] text-slate-500">{dt.stage}</span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <label className="text-[11px] text-slate-400 block mb-1">Enter Token:</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="portal-token-..."
                        className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        onClick={() => {
                          if (tokenInput.trim()) {
                            setToken(tokenInput.trim());
                            setShowTokenSelector(false);
                            setViewMode("detail");
                          }
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded cursor-pointer"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs font-semibold text-red-300 hover:bg-red-900/60 hover:text-red-200 hover:border-red-600 transition-all cursor-pointer shadow-sm active:translate-y-0.5 disabled:opacity-50"
              title="Sign out of Customer Portal"
            >
              {loggingOut ? (
                <RefreshCw size={13} className="animate-spin text-red-400" />
              ) : (
                <LogOut size={13} className="text-red-400" />
              )}
              <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
            </button>
          </div>
        </div>
      </header>


      {/* ── NOTIFICATION BANNER ── */}
      {notification && (
        <div
          className={`px-6 py-3 text-xs font-medium border-b flex items-center justify-between transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
              : notification.type === "error"
                ? "bg-rose-950/60 border-rose-800 text-rose-200"
                : "bg-sky-950/60 border-sky-800 text-sky-200"
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            {notification.type === "success" && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {notification.type === "error" && <AlertTriangle size={16} className="text-rose-400 shrink-0" />}
            {notification.type === "info" && <Info size={16} className="text-sky-400 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 flex flex-col gap-6">
        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-slate-400">Loading commercial agreements...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-8 text-center max-w-xl mx-auto my-12">
            <AlertTriangle size={36} className="text-rose-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">Quotation Not Found</h2>
            <p className="text-xs text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => {
                setToken("portal-token-acme-confirmed-05");
                setViewMode("detail");
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Load Acme Demo Quote
            </button>
          </div>
        )}

        {/* Live Content */}
        {!loading && quotation && (
          <>
            {/* ── TAB 1: MY QUOTATIONS ── */}
            {activeTab === "quotation" && (
              <div className="space-y-6">
                {/* ── SUB-HEADER: VIEW TOGGLE (List vs Single Detail) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  {viewMode === "detail" ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewMode("list")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
                      >
                        <ArrowLeft size={14} />
                        <span>All Quotations ({customerQuotations.length})</span>
                      </button>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-xs text-slate-400 font-mono">Viewing: {quotation.quoteNumber}</span>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-2xl font-extrabold text-white tracking-tight">Customer Quotations Portfolio</h1>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Overview of all active, approved, and confirmed quotations for {quotation.customer?.name}
                      </p>
                    </div>
                  )}

                  {/* Mode switcher if in detail mode */}
                  {viewMode === "detail" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewMode("list")}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Browse Other Deals</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    VIEW A: ALL QUOTATIONS CATALOG & FILTER LAYOUT
                ───────────────────────────────────────────────────────────── */}
                {viewMode === "list" && (
                  <div className="space-y-6 animate-in fade-in">
                    {/* Summary Metrics Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#0E1422] border border-slate-800 rounded-xl p-4">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Quotations</span>
                        <div className="text-2xl font-bold text-white font-mono mt-1">{metrics.totalCount}</div>
                        <span className="text-[10px] text-slate-500">Commercial proposals</span>
                      </div>

                      <div className="bg-[#0E1422] border border-slate-800 rounded-xl p-4">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400">Portfolio Value</span>
                        <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                          ${metrics.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-500">Gross contract volume</span>
                      </div>

                      <div className="bg-[#0E1422] border border-slate-800 rounded-xl p-4">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400">Under Review</span>
                        <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{metrics.activeNegotiations}</div>
                        <span className="text-[10px] text-slate-500">Pending or negotiating</span>
                      </div>

                      <div className="bg-[#0E1422] border border-slate-800 rounded-xl p-4">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-sky-400">Confirmed Orders</span>
                        <div className="text-2xl font-bold text-sky-400 font-mono mt-1">{metrics.confirmedCount}</div>
                        <span className="text-[10px] text-slate-500">Executed agreements</span>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="bg-[#0E1422] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
                      {/* Search Bar */}
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search quotations by quote #, title, or keywords..."
                          className="w-full pl-9 pr-4 py-2 bg-[#12192A] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Filter Dropdowns */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Status Filter */}
                        <div className="flex items-center gap-1.5 bg-[#12192A] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
                          <Filter size={13} className="text-emerald-400" />
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                          >
                            <option value="ALL" className="bg-slate-900">All Stages</option>
                            <option value="APPROVED" className="bg-slate-900">Approved Terms</option>
                            <option value="PENDING" className="bg-slate-900">Under Negotiation</option>
                            <option value="CONFIRMED" className="bg-slate-900">Confirmed / Signed</option>
                            <option value="DRAFT" className="bg-slate-900">Draft</option>
                          </select>
                        </div>

                        {/* Time Period Filter */}
                        <div className="flex items-center gap-1.5 bg-[#12192A] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
                          <Calendar size={13} className="text-sky-400" />
                          <select
                            value={timePeriodFilter}
                            onChange={(e) => setTimePeriodFilter(e.target.value)}
                            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                          >
                            <option value="ALL" className="bg-slate-900">All Time</option>
                            <option value="30D" className="bg-slate-900">Last 30 Days</option>
                            <option value="90D" className="bg-slate-900">Last 90 Days</option>
                            <option value="YEAR" className="bg-slate-900">This Year ({new Date().getFullYear()})</option>
                          </select>
                        </div>

                        {/* Layout Toggle */}
                        <div className="flex items-center bg-[#12192A] border border-slate-700 rounded-lg p-0.5">
                          <button
                            onClick={() => setDisplayLayout("grid")}
                            className={`p-1.5 rounded text-xs cursor-pointer ${
                              displayLayout === "grid" ? "bg-slate-800 text-emerald-400" : "text-slate-400"
                            }`}
                            title="Grid Layout"
                          >
                            <LayoutGrid size={14} />
                          </button>
                          <button
                            onClick={() => setDisplayLayout("table")}
                            className={`p-1.5 rounded text-xs cursor-pointer ${
                              displayLayout === "table" ? "bg-slate-800 text-emerald-400" : "text-slate-400"
                            }`}
                            title="Table Layout"
                          >
                            <List size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quotations List View (Grid vs Table) */}
                    {filteredQuotations.length === 0 ? (
                      <div className="bg-[#0E1422] border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-400">
                        <FileText size={36} className="mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-slate-300">No quotations match the selected filters</p>
                        <p className="text-[11px] text-slate-500 mt-1">Try resetting the status or time period filter.</p>
                      </div>
                    ) : displayLayout === "grid" ? (
                      /* ── GRID CARDS LAYOUT ── */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredQuotations.map((q) => (
                          <div
                            key={q.id}
                            className={`bg-[#0E1422] border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all hover:border-slate-600 group ${
                              q.portalToken === token ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-slate-800"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className="font-mono text-xs font-bold text-slate-300 bg-[#12192A] px-2.5 py-1 rounded border border-slate-700">
                                  {q.quoteNumber}
                                </span>
                                {renderStatusBadge(q.stage)}
                              </div>

                              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                                {q.title}
                              </h3>

                              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase">Net Investment</span>
                                  <span className="text-base font-extrabold text-white font-mono">
                                    ${(q.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block uppercase">Created Date</span>
                                  <span className="text-slate-300 font-mono text-[11px]">
                                    {new Date(q.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">
                                {q._count?.lines || "3"} Line Items &bull; {q._count?.comments || "0"} Notes
                              </span>
                              <button
                                onClick={() => {
                                  setToken(q.portalToken);
                                  setViewMode("detail");
                                }}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                              >
                                <span>Review &amp; Negotiate</span>
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* ── TABLE LIST LAYOUT ── */
                      <div className="bg-[#0E1422] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-[#12192A] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                              <tr>
                                <th className="py-3.5 px-6 font-bold">Quote Number</th>
                                <th className="py-3.5 px-6 font-bold">Deal Title</th>
                                <th className="py-3.5 px-4 font-bold">Status</th>
                                <th className="py-3.5 px-4 font-bold text-right">Net Value</th>
                                <th className="py-3.5 px-4 font-bold">Created Date</th>
                                <th className="py-3.5 px-6 font-bold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-sans">
                              {filteredQuotations.map((q) => (
                                <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="py-4 px-6 font-mono font-bold text-emerald-400">{q.quoteNumber}</td>
                                  <td className="py-4 px-6 font-semibold text-white">{q.title}</td>
                                  <td className="py-4 px-4">{renderStatusBadge(q.stage)}</td>
                                  <td className="py-4 px-4 text-right font-mono font-bold text-white">
                                    ${(q.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-4 px-4 font-mono text-slate-400 text-[11px]">
                                    {new Date(q.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <button
                                      onClick={() => {
                                        setToken(q.portalToken);
                                        setViewMode("detail");
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
                                    >
                                      <span>View Terms</span>
                                      <ChevronRight size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    VIEW B: SINGLE QUOTATION NEGOTIATION SCREEN (Matching Wireframe)
                ───────────────────────────────────────────────────────────── */}
                {viewMode === "detail" && (
                  <div className="space-y-6 animate-in fade-in">
                    {/* Header Summary Title Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                          Customer Portal Negotiation Screen
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          Customer reviews and negotiates the quote directly, no email needed
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {renderStatusBadge(quotation.stage)}
                      </div>
                    </div>

                    {/* Executive Summary Card */}
                    <div className="bg-[#0E1422] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                          <Sparkles size={13} />
                          <span>Commercial Deal Proposal</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{quotation.title}</h2>
                        <p className="text-xs text-slate-400">
                          Quote Number: <span className="font-mono text-slate-200 font-semibold">{quotation.quoteNumber}</span> &bull; Prepared for{" "}
                          <strong className="text-slate-200">{quotation.customer?.name}</strong>
                        </p>
                        <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
                          <span>
                            Account Rep:{" "}
                            <strong className="text-slate-300">{quotation.salesRep?.user?.name || "Senior Solution Architect"}</strong>
                          </span>
                          {quotation.salesRep?.user?.email && <span>({quotation.salesRep.user.email})</span>}
                        </div>
                      </div>

                      <div className="bg-[#12192A] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross List Subtotal</span>
                        <div className="text-2xl font-bold text-slate-200 font-mono mt-0.5">
                          ${(quotation.subtotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[11px] text-emerald-400 mt-1">
                          -${(quotation.discountTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} in deal savings
                        </span>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/50 rounded-xl p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Final Net Investment</span>
                        <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-0.5">
                          ${(quotation.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1">
                          {quotation.customer?.paymentTerms || "Net 30 Terms"} &bull; Valid to{" "}
                          {quotation.expiresAt ? new Date(quotation.expiresAt).toLocaleDateString() : "30 Days"}
                        </span>
                      </div>
                    </div>

                    {/* ── LINE LEVEL NEGOTIATION TABLE (Matching Wireframe) ── */}
                    <div className="bg-[#0E1422] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quotation Line Items &amp; Comments</h3>
                          <p className="text-xs text-slate-400">Click &apos;Ask Question&apos; on any row to discuss pricing or scope</p>
                        </div>
                        <span className="text-xs text-slate-400">{quotation.lines?.length || 0} Items</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-[#12192A] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="py-3.5 px-6 font-bold">Line</th>
                              <th className="py-3.5 px-4 font-bold">Type</th>
                              <th className="py-3.5 px-4 font-bold text-right">Qty</th>
                              <th className="py-3.5 px-4 font-bold text-right">Unit Price</th>
                              <th className="py-3.5 px-4 font-bold text-right">Discount</th>
                              <th className="py-3.5 px-4 font-bold text-right">Net Amount</th>
                              <th className="py-3.5 px-6 font-bold w-1/3">Customer Comment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-sans">
                            {quotation.lines?.map((line: any) => {
                              const gross = line.unitPrice * line.quantity;
                              const discountVal = gross * (line.discountPercent / 100);
                              const netVal = gross - discountVal;

                              // Find any comments on this specific line
                              const lineComments = quotation.comments?.filter((c: any) => c.quotationLineId === line.id) || [];

                              return (
                                <tr key={line.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="py-4 px-6 font-semibold text-white">
                                    <div className="text-sm text-slate-100">{line.description || line.product?.name}</div>
                                    {line.product?.sku && <span className="text-[11px] font-mono text-slate-400">{line.product.sku}</span>}
                                  </td>

                                  <td className="py-4 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        line.itemType === "SUBSCRIPTION"
                                          ? "bg-purple-950/60 text-purple-300 border border-purple-800/50"
                                          : line.itemType === "SERVICE"
                                            ? "bg-sky-950/60 text-sky-300 border border-sky-800/50"
                                            : "bg-slate-800 text-slate-300"
                                      }`}
                                    >
                                      {line.itemType || "HARDWARE"}
                                    </span>
                                  </td>

                                  <td className="py-4 px-4 text-right font-mono">{line.quantity}</td>

                                  <td className="py-4 px-4 text-right font-mono text-slate-300">
                                    ${line.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </td>

                                  <td className="py-4 px-4 text-right font-mono text-emerald-400 font-semibold">
                                    {line.discountPercent}%
                                  </td>

                                  <td className="py-4 px-4 text-right font-mono font-bold text-white">
                                    ${netVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </td>

                                  {/* Customer Comment Column */}
                                  <td className="py-4 px-6">
                                    {lineComments.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {lineComments.map((lc: any) => (
                                          <div key={lc.id} className="bg-[#12192A] border border-slate-700/60 rounded-lg p-2 text-xs">
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                                              <span className="font-semibold text-emerald-400">{lc.author?.name || "Customer"}</span>
                                              <span>{new Date(lc.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-200">{lc.message}</p>
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => setSelectedLineForComment(line)}
                                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer pt-1"
                                        >
                                          <PlusCircle size={12} />
                                          <span>Add follow-up</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setSelectedLineForComment(line)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer border border-slate-700"
                                      >
                                        <HelpCircle size={13} className="text-emerald-400" />
                                        <span>Ask Question on this Line</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ── COUNTER PROPOSAL & DELIVERY FORM (Matching Wireframe) ── */}
                    <div className="bg-[#0E1422] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                      <div className="mb-6">
                        <h3 className="text-base font-bold text-white">Negotiate Commercial Terms</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Propose a revised discount percentage or preferred deployment target date for account team review.
                        </p>
                      </div>

                      <form onSubmit={handleCounterProposal} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Counter Discount % Input */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                              <span>Counter Discount %</span>
                              <span className="font-mono text-emerald-400 font-bold">{counterDiscount}% Requested</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="50"
                                step="0.5"
                                value={counterDiscount}
                                onChange={(e) => setCounterDiscount(parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-3 bg-[#12192A] border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
                                placeholder="e.g. 15"
                              />
                              <Percent size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="40"
                              step="0.5"
                              value={counterDiscount}
                              onChange={(e) => setCounterDiscount(parseFloat(e.target.value))}
                              className="w-full accent-emerald-500 cursor-pointer mt-1"
                            />
                          </div>

                          {/* Requested Delivery Date */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300">Requested Delivery Date</label>
                            <div className="relative">
                              <input
                                type="date"
                                value={requestedDeliveryDate}
                                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                                className="w-full px-4 py-3 bg-[#12192A] border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
                              />
                              <Calendar size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                            </div>
                            <span className="text-[11px] text-slate-500 block">Target start date for hardware delivery or SaaS provisioning</span>
                          </div>
                        </div>

                        {/* Proposal Note */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300">Proposal Justification / Note to Sales Team</label>
                          <textarea
                            rows={3}
                            value={proposalMessage}
                            onChange={(e) => setProposalMessage(e.target.value)}
                            placeholder="e.g. We can execute immediately if you match our 12% discount target for Q3 budget alignment."
                            className="w-full px-4 py-2.5 bg-[#12192A] border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                          ></textarea>
                        </div>

                        {/* Live Calculation Preview Banner */}
                        <div className="bg-[#12192A] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="text-slate-400">Proposed Net Total: </span>
                            <strong className="text-white font-mono text-sm">
                              ${estimatedCounterTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Total Anticipated Savings: </span>
                            <strong className="text-emerald-400 font-mono text-sm">
                              ${estimatedSavings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                        </div>

                        {/* ── ACTION BUTTONS (Matching Wireframe) ── */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                          <button
                            type="submit"
                            disabled={submittingProposal}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                          >
                            {submittingProposal ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            <span>Submit Request</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOneClickConfirm}
                            disabled={isSigning}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isSigning ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                            <span>1-Click Accept Deal</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsSignModalOpen(true)}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FileSignature size={15} />
                            <span>E-Sign Quotation</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* ── NOTICE / THRESHOLD WARNING BOX (Matching Wireframe) ── */}
                    <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 text-amber-200 text-xs flex items-center gap-3">
                      <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                      <p>
                        <strong>Commercial Governance Notice:</strong> If final counter terms exceed discount thresholds (e.g. &gt;15%), the quote
                        automatically re-enters managerial approval prior to order execution.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: MESSAGES & TIMELINE ── */}
            {activeTab === "messages" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-[#0E1422] border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="border-b border-slate-800 pb-4 mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Deal Negotiation Thread</h3>
                      <p className="text-xs text-slate-400">Direct message history between your organization and the account executive</p>
                    </div>
                    <span className="text-xs text-slate-500">{quotation.comments?.length || 0} messages</span>
                  </div>

                  {/* Comments Timeline */}
                  <div className="space-y-4 mb-6 max-h-[480px] overflow-y-auto pr-2">
                    {quotation.comments && quotation.comments.length > 0 ? (
                      quotation.comments.map((comment: any) => {
                        const isCustomer = comment.authorRole === "CUSTOMER" || comment.author?.role === "CUSTOMER";
                        return (
                          <div
                            key={comment.id}
                            className={`p-4 rounded-xl text-xs max-w-2xl ${
                              isCustomer
                                ? "bg-[#12192A] border border-slate-800 ml-auto text-right"
                                : "bg-emerald-950/30 border border-emerald-800/40 mr-auto text-left"
                            }`}
                          >
                            <div className={`flex items-center gap-2 mb-1 text-[11px] ${isCustomer ? "justify-end text-slate-400" : "text-emerald-400"}`}>
                              <strong className={isCustomer ? "text-slate-200" : "text-emerald-300"}>
                                {comment.author?.name || (isCustomer ? "Customer" : "Account Executive")}
                              </strong>
                              <span>&bull;</span>
                              <span>{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>

                            {comment.quotationLine && (
                              <div className="mb-1.5 inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-emerald-400 border border-slate-800">
                                Line: {comment.quotationLine.description}
                              </div>
                            )}

                            <p className="text-slate-200 text-xs mt-1 leading-relaxed text-left">{comment.message}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                        <p>No messages yet. Send a question below to start the conversation.</p>
                      </div>
                    )}
                  </div>

                  {/* Send Message Input */}
                  <form onSubmit={handleSendGeneralMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={generalMessage}
                      onChange={(e) => setGeneralMessage(e.target.value)}
                      placeholder="Type a message or negotiation note to the sales team..."
                      className="flex-1 px-4 py-2.5 bg-[#12192A] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="submit"
                      disabled={sendingGeneralMessage || !generalMessage.trim()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
                    >
                      {sendingGeneralMessage ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── TAB 3: CUSTOMER & COMPANY PROFILE ── */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-[#0E1422] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Company Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <Building size={16} />
                      <span>Company Entity &amp; Billing</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Company Name</span>
                        <strong className="text-base text-white">{quotation.customer?.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Primary Contact Email</span>
                        <span className="text-slate-200">{quotation.customer?.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Phone</span>
                        <span className="text-slate-200">{quotation.customer?.phone || "+1 (555) 019-2834"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tax ID / VAT</span>
                        <span className="text-slate-200 font-mono">{quotation.customer?.taxId || "US-EIN-9923841"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Billing Address</span>
                        <span className="text-slate-200">{quotation.customer?.billingAddress || "100 Enterprise Blvd, Suite 400"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Shipping Destination</span>
                        <span className="text-slate-200">{quotation.customer?.shippingAddress || "100 Enterprise Blvd, Tech Receiving Dock"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Sales Team Profile */}
                  <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800 md:pl-8">
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                      <ShieldCheck size={16} />
                      <span>Account Management Team</span>
                    </div>

                    <div className="bg-[#12192A] border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Assigned Representative</span>
                        <strong className="text-sm text-white">{quotation.salesRep?.user?.name || "Senior Account Executive"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Rep Contact Email</span>
                        <span className="text-slate-200">{quotation.salesRep?.user?.email || "rep@dealflow360.com"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Issuing Organization</span>
                        <span className="text-slate-200">{quotation.organization?.name || "Apex Enterprise Technologies Inc"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Authorized Discount Tier</span>
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          {quotation.customer?.tier?.name || "Gold Tier (15% Max Discretion)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Portal Session Management & Log Out */}
                  <div className="md:col-span-2 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111726]/60 rounded-xl p-5 border border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Customer Portal Session</h4>
                        <p className="text-[11px] text-slate-400">
                          Signed in as <span className="text-emerald-300 font-medium">{quotation.customer?.email || "customer@portal.local"}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      disabled={loggingOut}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/20 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                    >
                      {loggingOut ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
                      <span>{loggingOut ? "Signing Out..." : "Sign Out of Customer Portal"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </main>

      {/* ── LINE-LEVEL QUESTION MODAL ── */}
      {selectedLineForComment && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Ask Question / Request Change</h3>
                <span className="text-xs text-emerald-400">{selectedLineForComment.description || selectedLineForComment.product?.name}</span>
              </div>
              <button onClick={() => setSelectedLineForComment(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLineComment} className="space-y-4">
              <div className="text-xs text-slate-400 bg-[#12192A] p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span>Unit Price: ${selectedLineForComment.unitPrice}</span>
                  <span>Quantity: {selectedLineForComment.quantity}</span>
                  <span>Discount: {selectedLineForComment.discountPercent}%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Your Question or Adjustment Request</label>
                <textarea
                  rows={4}
                  required
                  value={lineCommentMessage}
                  onChange={(e) => setLineCommentMessage(e.target.value)}
                  placeholder="e.g. Can this line be discounted by 15% instead of 10% if we commit to an annual term?"
                  className="w-full px-3.5 py-2.5 bg-[#12192A] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLineForComment(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLineComment || !lineCommentMessage.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingLineComment ? <RefreshCw size={14} className="animate-spin" /> : <Send size={13} />}
                  <span>Post Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── E-SIGNATURE CONFIRMATION MODAL ── */}
      {isSignModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-emerald-500/40 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSignature className="text-emerald-400" size={20} />
                <h3 className="text-base font-bold text-white">Execute Commercial Quotation</h3>
              </div>
              <button onClick={() => setIsSignModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#12192A] border border-slate-800 p-4 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-200">
                <span>Quotation Ref: {quotation?.quoteNumber}</span>
                <span className="text-emerald-400">${(quotation?.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Upon digital signature, this deal transitions to CONFIRMED. Commercial invoices, subscription billing, and physical warehouse
                fulfillment orders are created automatically.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Signer Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => {
                      setSignerName(e.target.value);
                      if (signatureMode === "type") setTypedSignature(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-[#12192A] border border-slate-700 rounded-lg text-xs text-white focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Signer Business Email</label>
                  <input
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#12192A] border border-slate-700 rounded-lg text-xs text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Signature Mode Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">Digital E-Signature</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSignatureMode("type")}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                        signatureMode === "type" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-slate-400"
                      }`}
                    >
                      Type Font
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                        signatureMode === "draw" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-slate-400"
                      }`}
                    >
                      Draw Canvas
                    </button>
                  </div>
                </div>

                {signatureMode === "type" ? (
                  <div className="h-28 bg-[#12192A] border border-slate-700 rounded-xl flex items-center justify-center p-4">
                    <span className="font-serif italic text-2xl text-emerald-400 select-none tracking-wide">
                      {typedSignature || signerName || "Signer Name"}
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
                      className="w-full h-28 bg-[#12192A] border border-slate-700 rounded-xl cursor-crosshair touch-none"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="absolute right-2 bottom-2 text-[10px] text-slate-400 hover:text-white bg-slate-800/80 px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 text-[11px] text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded accent-emerald-500"
                />
                <span>
                  I confirm that I am an authorized representative of <strong>{quotation?.customer?.name}</strong> and agree to execute this commercial agreement.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignature}
                disabled={isSigning || !agreedToTerms || !signerName.trim()}
                className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
              >
                {isSigning ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>Execute &amp; Confirm Deal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-800 py-4 px-6 bg-[#0B0F17] text-center text-xs text-slate-500">
        DealFlow360 Enterprise Customer Negotiation Portal &copy; 2026 &bull; Secure Cryptographic Token Authentication
      </footer>
    </div>
  );
}
