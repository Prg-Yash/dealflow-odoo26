"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Activity,
  History,
  CornerDownRight,
  Users,
  CreditCard,
  Truck,
  Package,
  Box,
  RotateCcw,
  Download,
  Receipt,
  Printer,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";

export interface PortalProps {
  initialToken?: string;
  initialTab?: "quotation" | "trails" | "profile";
  customerEmail?: string;
}

export function CustomerNegotiationPortal({
  initialToken = "DF-Q1042",
  initialTab = "quotation",
  customerEmail,
}: PortalProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"quotation" | "trails" | "profile">(initialTab);
  const [token, setToken] = useState<string>(initialToken);
  const [tokenInput, setTokenInput] = useState<string>(initialToken);
  const [showTokenSelector, setShowTokenSelector] = useState<boolean>(false);

  // Sync initialTab when props change
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("df360_user_role");
        sessionStorage.clear();
        document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie =
          "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie =
          "__Secure-better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
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

  // ClickUp Chat & Trails State
  const [generalMessage, setGeneralMessage] = useState<string>("");
  const [sendingGeneralMessage, setSendingGeneralMessage] = useState<boolean>(false);
  const [chatFilterLineId, setChatFilterLineId] = useState<string | null>(null);

  // Sign & Confirm Modal State
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [signerName, setSignerName] = useState<string>("");
  const [signerEmail, setSignerEmail] = useState<string>("");
  const [signerTitle, setSignerTitle] = useState<string>("Procurement Director");
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = useState<string>("");
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [isSigning, setIsSigning] = useState<boolean>(false);

  // 1-Click Confirm state
  const [isConfirmingOneClick, setIsConfirmingOneClick] = useState<boolean>(false);

  // Invoice Modal & Portal Payment State
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isPayingInvoice, setIsPayingInvoice] = useState<boolean>(false);
  const [portalPaymentMethod, setPortalPaymentMethod] = useState<string>("ACH_TRANSFER");

  // Feedback Notification Banner
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedQuotationRef = useRef<boolean>(false);
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
    if (activeTab === "trails" && messagesEndRef.current) {
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

  // Primary live data fetching (silent background update whenever quotation is already loaded)
  const fetchQuotationData = useCallback(
    async (currentToken: string, isBackground: boolean = false) => {
      if (!isBackground && !hasLoadedQuotationRef.current) {
        setLoading(true);
      }
      setError(null);
      try {
        // When no explicit token, use "me" so portalAuth resolves via session
        const effectiveLookup =
          !currentToken || currentToken === "current" || currentToken === "my"
            ? "me"
            : currentToken;
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
        hasLoadedQuotationRef.current = true;
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
        if (!isBackground && !hasLoadedQuotationRef.current) {
          setError(err.message || "Failed to load quotation from DealFlow360 API.");
        }
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, customerEmail, router]
  );

  // Initial load
  useEffect(() => {
    if (token) {
      fetchQuotationData(token, false);
    }
  }, [token, fetchQuotationData]);

  // Real-time synchronization polling for customer portal discussion & quotation state (every 3 seconds)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchQuotationData(token, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [token, fetchQuotationData]);

  // Handler: Switch Quotation within Authenticated Session
  const handleSelectToken = (selectedToken: string) => {
    if (!selectedToken) return;
    hasLoadedQuotationRef.current = false;
    setToken(selectedToken);
    setTokenInput(selectedToken);
    setShowTokenSelector(false);
    setViewMode("detail");
    fetchQuotationData(selectedToken, false);
  };

  // Handler: Submit Counter-Proposal
  const handleSubmitCounterProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    setSubmittingProposal(true);
    try {
      const estimatedNet =
        Math.round(quotation.subtotal * (1 - counterDiscount / 100) * 100) / 100;
      const payload = {
        proposedGrandTotal: estimatedNet,
        proposedDiscountPercent: Number(counterDiscount),
        customerNotes:
          proposalMessage.trim() || `Customer requested ${counterDiscount}% discount tier.`,
        requestedDeliveryDate: requestedDeliveryDate
          ? new Date(requestedDeliveryDate).toISOString()
          : undefined,
        authorName: signerName || quotation.customer?.name || "Customer Representative",
        authorEmail: signerEmail || quotation.customer?.email || customerEmail || undefined,
      };

      const res = await fetch(
        `${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/counter-proposal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": effectiveApiToken,
            ...(customerEmail ? { "x-customer-email": customerEmail } : {}),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to submit counter proposal.");
      }

      setNotification({
        type: "success",
        message: `Counter-proposal for ${counterDiscount}% discount (₹${estimatedNet.toLocaleString(
          "en-IN",
          { minimumFractionDigits: 2 }
        )}) submitted to sales representative.`,
      });

      setProposalMessage("");
      // Refresh live state silently in background (in-place)
      await fetchQuotationData(token, true);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not submit counter-proposal. Please retry.",
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Handler: Submit Line-Level Comment
  const handleSubmitLineComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineForComment || !lineCommentMessage.trim()) return;

    const messageText = lineCommentMessage.trim();
    const lineId = selectedLineForComment.id;
    const authorName = signerName || quotation?.customer?.name || "Customer Lead";
    const authorEmail = signerEmail || quotation?.customer?.email || "customer@client.com";

    // Optimistic local state update for instant UI feedback
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      message: messageText,
      authorRole: "CUSTOMER",
      authorName,
      quotationLineId: lineId,
      createdAt: new Date().toISOString(),
    };

    setQuotation((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: [...(prev.comments || []), optimisticComment],
      };
    });

    setLineCommentMessage("");
    setSelectedLineForComment(null);
    setSubmittingLineComment(true);

    try {
      const payload = {
        message: messageText,
        quotationLineId: lineId,
        authorName,
        authorEmail,
      };

      const res = await fetch(
        `${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": effectiveApiToken,
            ...(customerEmail ? { "x-customer-email": customerEmail } : {}),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to post line item question.");
      }

      setNotification({
        type: "success",
        message: "Question submitted on line item.",
      });

      // Background silent refresh
      await fetchQuotationData(token, true);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not post question. Please try again.",
      });
      await fetchQuotationData(token, true);
    } finally {
      setSubmittingLineComment(false);
    }
  };

  // Handler: Send Message in ClickUp Chat Window (Instant In-Place UI Update)
  const handleSendGeneralMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalMessage.trim()) return;

    const messageText = generalMessage.trim();
    const lineId = chatFilterLineId || undefined;
    const authorName = signerName || quotation?.customer?.name || "Customer Representative";
    const authorEmail = signerEmail || quotation?.customer?.email || "customer@client.com";

    // Instant optimistic comment addition
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      message: messageText,
      authorRole: "CUSTOMER",
      authorName,
      quotationLineId: lineId || null,
      createdAt: new Date().toISOString(),
    };

    setQuotation((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: [...(prev.comments || []), optimisticComment],
      };
    });

    setGeneralMessage("");
    setChatFilterLineId(null);
    setSendingGeneralMessage(true);

    try {
      const payload = {
        message: messageText,
        quotationLineId: lineId,
        authorName,
        authorEmail,
      };

      const res = await fetch(
        `${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": effectiveApiToken,
            ...(customerEmail ? { "x-customer-email": customerEmail } : {}),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to transmit message.");
      }

      const resJson = await res.json().catch(() => ({}));
      if (resJson.data) {
        setQuotation((prev: any) => {
          if (!prev) return prev;
          const comments = (prev.comments || []).map((c: any) =>
            c.id === optimisticComment.id
              ? {
                id: resJson.data.id,
                message: resJson.data.message,
                authorRole: resJson.data.authorRole || "CUSTOMER",
                authorName: resJson.data.author?.name || authorName,
                quotationLineId: resJson.data.quotationLineId,
                createdAt: resJson.data.createdAt,
              }
              : c
          );
          return { ...prev, comments };
        });
      }

      // Silent background state sync
      await fetchQuotationData(token, true);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to transmit message.",
      });
      await fetchQuotationData(token, true);
    } finally {
      setSendingGeneralMessage(false);
    }
  };

  // Handler: 1-Click Instant Confirm
  const handleOneClickConfirm = async () => {
    if (!quotation) return;
    setIsConfirmingOneClick(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": effectiveApiToken,
            ...(customerEmail ? { "x-customer-email": customerEmail } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            customerName: signerName || quotation?.customer?.name,
            customerEmail: signerEmail || quotation?.customer?.email,
            agreedToTerms: true,
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Could not confirm quotation.");
      }

      setNotification({
        type: "success",
        message:
          "Deal confirmed! Order-to-Cash engine has generated billing invoices and fulfillment orders.",
      });

      await fetchQuotationData(token, true);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to confirm deal.",
      });
    } finally {
      setIsConfirmingOneClick(false);
    }
  };

  // Handler: Confirm & E-Sign Quotation
  const handleConfirmSignature = async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      setNotification({
        type: "error",
        message: "Signer Name and Business Email are required.",
      });
      return;
    }

    if (!agreedToTerms) {
      setNotification({
        type: "error",
        message: "You must accept the commercial terms and conditions.",
      });
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

      const res = await fetch(
        `${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": effectiveApiToken,
            ...(customerEmail ? { "x-customer-email": customerEmail } : {}),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "E-Signature confirmation failed.");
      }

      setNotification({
        type: "success",
        message: "Quotation signed and confirmed! Deal has transitioned to CONFIRMED stage.",
      });

      setIsSignModalOpen(false);
      await fetchQuotationData(token, true);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Signature transmission failed. Please retry.",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Handler: Customer Portal Invoice Settlement
  const handlePortalPayInvoice = async (invoiceId: string) => {
    setIsPayingInvoice(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/portal/${encodeURIComponent(effectiveApiToken)}/invoices/${encodeURIComponent(invoiceId)}/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": effectiveApiToken,
            ...(customerEmail ? { "x-customer-email": customerEmail } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            paymentMethod: portalPaymentMethod,
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Invoice settlement failed.");
      }

      setNotification({
        type: "success",
        message: `Invoice ${selectedInvoiceForModal?.invoiceNumber || ""} successfully paid & reconciled!`,
      });

      setIsInvoiceModalOpen(false);
      setSelectedInvoiceForModal(null);
      await fetchQuotationData(token, true);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to process payment. Please try again.",
      });
    } finally {
      setIsPayingInvoice(false);
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
        (statusFilter === "APPROVED" &&
          (q.stage === "APPROVED" || q.stage === "SENT_TO_CUSTOMER")) ||
        (statusFilter === "UNDER_NEGOTIATION" && q.stage === "NEGOTIATION") ||
        (statusFilter === "CONFIRMED" &&
          (q.stage === "CONFIRMED" || q.stage === "WON" || q.stage === "FULFILLED"));

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
    const confirmedCount = customerQuotations.filter(
      (q) => q.stage === "CONFIRMED" || q.stage === "WON" || q.stage === "FULFILLED"
    ).length;

    return { totalCount, totalValue, activeNegotiations, confirmedCount };
  }, [customerQuotations]);

  // Unified Chronological Quotation Trails
  const quotationTrails = useMemo(() => {
    if (!quotation) return [];
    const trails: Array<{
      id: string;
      date: Date;
      type: "audit" | "approval" | "counter" | "comment" | "signature";
      title: string;
      description: string;
      actor: string;
      role: string;
      badgeColor: string;
    }> = [];

    // 1. Audit Logs
    (quotation.auditLogs || []).forEach((log: any) => {
      let badgeColor = "bg-slate-100 text-slate-700";
      if (log.action.includes("APPROVED"))
        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      if (log.action.includes("REJECT") || log.action.includes("REVISION"))
        badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
      if (log.action.includes("SUBMITTED"))
        badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

      trails.push({
        id: `audit-${log.id}`,
        date: new Date(log.createdAt),
        type: "audit",
        title: log.action.replace(/_/g, " "),
        description: log.reason || "Governance workflow progression recorded.",
        actor: log.actor?.name || "Compliance Engine",
        role: log.actorRole || "SYSTEM",
        badgeColor,
      });
    });

    // 2. Approval Request Steps
    (quotation.approvalRequest?.steps || []).forEach((st: any) => {
      if (st.actionedAt) {
        trails.push({
          id: `step-${st.id}`,
          date: new Date(st.actionedAt),
          type: "approval",
          title: `Milestone: ${st.level.replace(/_/g, " ")} ${st.status}`,
          description: st.comments || `Approval condition completed by authorized signatory.`,
          actor: st.reviewer?.name || "Signatory Director",
          role: "DIRECTOR",
          badgeColor:
            st.status === "APPROVED"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200",
        });
      }
    });

    // 3. Counter Proposals
    (quotation.counterProposals || []).forEach((cp: any) => {
      trails.push({
        id: `cp-${cp.id}`,
        date: new Date(cp.createdAt),
        type: "counter",
        title: "Customer Counter-Proposal Submitted",
        description:
          cp.customerNotes ||
          `Proposed ${cp.proposedDiscountPercent}% discount (Target Total: ₹${Number(
            cp.proposedGrandTotal || 0
          ).toLocaleString()})`,
        actor: cp.respondedBy || quotation.customer?.name || "Customer",
        role: "CUSTOMER",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      });
    });

    // 4. E-Signature
    if (quotation.signature) {
      trails.push({
        id: `sig-${quotation.id}`,
        date: new Date(quotation.signature.signedAt || quotation.updatedAt),
        type: "signature",
        title: "Commercial Contract E-Signed",
        description: `Legally executed by ${quotation.signature.signedByName} (${quotation.signature.signedByEmail})`,
        actor: quotation.signature.signedByName,
        role: "AUTHORIZED_SIGNER",
        badgeColor: "bg-emerald-600 text-white font-bold",
      });
    }

    // 5. Initial Creation
    if (quotation.createdAt) {
      trails.push({
        id: `init-${quotation.id}`,
        date: new Date(quotation.createdAt),
        type: "audit",
        title: "Quotation Generated",
        description: `Commercial proposal initialized for ${quotation.customer?.name || "client account"}.`,
        actor: quotation.salesRep?.user?.name || "Sales Rep",
        role: "SALES_REP",
        badgeColor: "bg-slate-100 text-slate-700",
      });
    }

    return trails.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [quotation]);

  // Calculate live proposed savings for the counter discount
  const originalSubtotal = quotation?.subtotal || 0;
  const estimatedCounterTotal =
    Math.round(originalSubtotal * (1 - counterDiscount / 100) * 100) / 100;
  const estimatedSavings = Math.round((originalSubtotal - estimatedCounterTotal) * 100) / 100;

  // Render Status Badge
  const renderStatusBadge = (stage: string) => {
    switch (stage) {
      case "CONFIRMED":
      case "WON":
      case "FULFILLED":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Status: Confirmed &amp; Accepted</span>
          </div>
        );
      case "NEGOTIATION":
      case "UNDER_NEGOTIATION":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Status: Under Negotiation</span>
          </div>
        );
      case "PENDING_APPROVAL":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Status: Internal Review</span>
          </div>
        );
      case "APPROVED":
      case "SENT_TO_CUSTOMER":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>Status: Approved Terms</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
            <span>Status: {stage || "Draft"}</span>
          </div>
        );
    }
  };

  // Lifecycle status flags:
  const isTermsApproved =
    quotation?.stage === "APPROVED" || quotation?.stage === "SENT_TO_CUSTOMER";
  const isConfirmed =
    quotation?.stage === "CONFIRMED" ||
    quotation?.stage === "WON" ||
    quotation?.stage === "FULFILLED" ||
    Boolean(quotation?.signature);
  const isCompleted = isTermsApproved || isConfirmed;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* ── TOP NAV / HEADER ── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <BrandLogo href="/portal" size="sm" subtitle="Customer Quotation Portal" />
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab("quotation")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "quotation"
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
              onClick={() => setActiveTab("trails")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "trails"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <MessageSquare size={14} className={activeTab === "trails" ? "text-[#ff5e3a]" : ""} />
              <span>Trails &amp; Messages</span>
              {quotation?.comments?.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-orange-100 text-[10px] text-[#ff5e3a] font-bold">
                  {quotation.comments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "profile"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <User size={14} className={activeTab === "profile" ? "text-[#ff5e3a]" : ""} />
              <span>Company Profile</span>
            </button>
          </div>

          {/* Quotation Reference Badge & Switcher & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setShowTokenSelector(!showTokenSelector)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-semibold text-[#ff5e3a] hover:bg-orange-100/80 transition cursor-pointer"
                title="Active Proposal Reference"
              >
                <ShieldCheck size={14} />
                <span className="truncate max-w-[140px] sm:max-w-[200px] font-mono font-bold">
                  {quotation?.quoteNumber || token}
                </span>
                {customerQuotations.length > 1 && (
                  <RefreshCw size={12} className="text-slate-400" />
                )}
              </button>

              {/* Proposal Selector Dropdown */}
              {showTokenSelector && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">
                      Your Assigned Quotations
                    </span>
                    <button
                      onClick={() => setShowTokenSelector(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {customerQuotations.map((item) => {
                      const itemToken = item.quoteNumber || item.portalToken || item.id;
                      const isActive =
                        token === item.quoteNumber ||
                        token === item.portalToken ||
                        token === item.id ||
                        quotation?.quoteNumber === item.quoteNumber ||
                        quotation?.portalToken === item.portalToken;

                      return (
                        <button
                          key={item.id || item.portalToken || item.quoteNumber}
                          onClick={() => handleSelectToken(itemToken)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs flex flex-col gap-0.5 transition cursor-pointer ${isActive
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
                            ₹
                            {Number(item.grandTotal || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Enter Quote Number..."
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
              <span className="hidden sm:inline">
                {loggingOut ? "Signing out..." : "Sign Out"}
              </span>
              <span className="sm:hidden">{loggingOut ? "..." : "Exit"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── NOTIFICATION BANNER ── */}
      {notification && (
        <div
          className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between transition-all ${notification.type === "success"
              ? "bg-emerald-50 border-b border-emerald-200 text-emerald-800"
              : notification.type === "error"
                ? "bg-red-50 border-b border-red-200 text-red-800"
                : "bg-blue-50 border-b border-blue-200 text-blue-800"
            }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {notification.type === "success" && (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            )}
            {notification.type === "error" && (
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
            )}
            {notification.type === "info" && (
              <Info size={16} className="text-blue-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-500 hover:text-slate-800"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 space-y-6">
        {loading && !quotation ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw size={32} className="animate-spin text-[#ff5e3a] mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              Retrieving official quotation from DealFlow360...
            </p>
          </div>
        ) : error && !quotation ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-5 shadow-sm">
            <div className="w-14 h-14 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mx-auto text-[#ff5e3a]">
              <Sparkles size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">
                Welcome to DealFlow 360 Customer Portal
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your customer account is registered and verified. When your assigned sales
                representative publishes a proposal for your company, it will automatically appear
                here for your review, live negotiation, and discussion.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Logged in Account:</span>
                <span className="font-semibold text-slate-900">
                  {customerEmail || signerEmail || "Customer Account"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Portal Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                  <CheckCircle2 size={11} /> Verified Customer
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => fetchQuotationData(token)}
                className="px-5 py-2.5 bg-[#ff5e3a] text-white text-xs font-semibold rounded-xl hover:bg-[#ea4e28] shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Refresh Proposals</span>
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <User size={13} />
                <span>View Profile</span>
              </button>
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-red-200"
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
                      <h2 className="text-base font-bold text-slate-900">
                        Company Proposals Catalog
                      </h2>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {viewMode === "list" && (
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button
                          onClick={() => setDisplayLayout("grid")}
                          className={`p-1.5 rounded-lg transition ${displayLayout === "grid"
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-500 hover:text-slate-900"
                            }`}
                          title="Grid View"
                        >
                          <LayoutGrid size={15} />
                        </button>
                        <button
                          onClick={() => setDisplayLayout("table")}
                          className={`p-1.5 rounded-lg transition ${displayLayout === "table"
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-500 hover:text-slate-900"
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
                    {/* Metrics Overview Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Total Proposals
                        </span>
                        <div className="text-2xl font-extrabold text-slate-900">
                          {metrics.totalCount}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Pipeline Value
                        </span>
                        <div className="text-2xl font-extrabold text-[#ff5e3a]">
                          ₹
                          {metrics.totalValue.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          In Negotiation
                        </span>
                        <div className="text-2xl font-extrabold text-amber-600">
                          {metrics.activeNegotiations}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Confirmed Deals
                        </span>
                        <div className="text-2xl font-extrabold text-emerald-600">
                          {metrics.confirmedCount}
                        </div>
                      </div>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                      <div className="relative w-full md:w-72">
                        <Search
                          size={15}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
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
                          className="bg-[#f8fafc] border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer"
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
                          className="bg-[#f8fafc] border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer"
                        >
                          <option value="ALL">All Time</option>
                          <option value="30_DAYS">Last 30 Days</option>
                          <option value="90_DAYS">Last 90 Days</option>
                          <option value="THIS_YEAR">This Year</option>
                        </select>
                      </div>
                    </div>

                    {/* Empty State vs Grid / Table Layout of Quotations */}
                    {filteredQuotations.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-900">
                            {customerQuotations.length === 0
                              ? "No Quotations Found"
                              : "No Quotations Found"}
                          </h3>
                          <p className="text-xs text-slate-500 max-w-sm">
                            {customerQuotations.length === 0
                              ? "There are no proposals or quotations assigned to your customer account at this time."
                              : "No proposals match your current filter criteria."}
                          </p>
                        </div>
                        {(searchQuery || statusFilter !== "ALL" || timePeriodFilter !== "ALL") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("ALL");
                              setTimePeriodFilter("ALL");
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ff5e3a] text-xs font-semibold border border-orange-200 transition cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            <span>Reset Filters</span>
                          </button>
                        )}
                      </div>
                    ) : displayLayout === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredQuotations.map((q) => (
                          <div
                            key={q.id}
                            onClick={() => handleSelectToken(q.portalToken || q.quoteNumber)}
                            className="bg-white border border-slate-200 hover:border-[#ff5e3a] p-5 rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 font-mono">
                                  {q.quoteNumber}
                                </span>
                                {renderStatusBadge(q.stage)}
                              </div>
                              <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                                {q.title}
                              </h3>
                              <p className="text-xs text-slate-500">
                                Created on {new Date(q.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                  Total Investment
                                </span>
                                <span className="text-base font-extrabold text-[#ff5e3a]">
                                  ₹
                                  {Number(q.grandTotal || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
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
                                <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                                  {q.quoteNumber}
                                </td>
                                <td className="py-3 px-4 text-slate-700">{q.title}</td>
                                <td className="py-3 px-4">{renderStatusBadge(q.stage)}</td>
                                <td className="py-3 px-4 text-slate-500">
                                  {new Date(q.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-[#ff5e3a]">
                                  ₹
                                  {Number(q.grandTotal || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
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
                {viewMode === "detail" && !quotation && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">No Quotation Selected</h3>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Please select a quotation from the catalog list to review details.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <ArrowLeft size={12} />
                      <span>Back to Proposals Catalog</span>
                    </button>
                  </div>
                )}
                {viewMode === "detail" && quotation && (
                  <div className="space-y-6">
                    {/* Proposal Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h1 className="text-xl font-extrabold text-slate-900 font-mono">
                            {quotation.quoteNumber}
                          </h1>
                          {renderStatusBadge(quotation.stage)}
                        </div>
                        <p className="text-sm text-slate-600 font-medium">{quotation.title}</p>
                        <p className="text-xs text-slate-400">
                          Prepared for <strong>{quotation.customer?.name}</strong> &bull; Valid
                          through {new Date(quotation.expiresAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action Buttons: 1-Click Accept & E-Sign for Approved terms; status badges for other stages */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isConfirmed ? (
                          <div className="px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 shadow-xs">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span>Executed &amp; Confirmed</span>
                          </div>
                        ) : isTermsApproved ? (
                          <>
                            <button
                              onClick={handleOneClickConfirm}
                              disabled={isConfirmingOneClick}
                              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {isConfirmingOneClick ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Check size={15} />
                              )}
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
                        ) : quotation.stage === "PENDING_APPROVAL" ? (
                          <div className="px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2 shadow-xs">
                            <Clock size={16} className="text-amber-600 animate-pulse" />
                            <span>Awaiting Internal Review</span>
                          </div>
                        ) : (
                          <div className="px-5 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-2 shadow-xs">
                            <SlidersHorizontal size={16} className="text-purple-600" />
                            <span>In Negotiation with Sales Rep</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Gross Subtotal
                        </span>
                        <div className="text-xl font-extrabold text-slate-900 mt-1">
                          ₹
                          {(quotation.subtotal || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Standard Discount
                        </span>
                        <div className="text-xl font-extrabold text-emerald-600 mt-1">
                          -₹
                          {(quotation.discountTotal || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Estimated Tax
                        </span>
                        <div className="text-xl font-extrabold text-slate-700 mt-1">
                          +₹
                          {(quotation.taxTotal || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs bg-linear-to-br from-orange-50/50 to-white">
                        <span className="text-[11px] font-semibold text-[#ff5e3a] uppercase tracking-wider block">
                          Net Total Investment
                        </span>
                        <div className="text-2xl font-black text-[#ff5e3a] mt-1">
                          ₹
                          {(quotation.grandTotal || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Quotation Line Items Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">
                          Configured Products &amp; Subscriptions
                        </h3>
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
                              const lineComments =
                                line.comments ||
                                quotation.comments?.filter(
                                  (c: any) => c.quotationLineId === line.id
                                ) ||
                                [];
                              return (
                                <tr key={line.id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900">
                                      {line.product?.name || line.description}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {line.description}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {line.itemType || "SUBSCRIPTION"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                                    {line.quantity}
                                  </td>
                                  <td className="py-3.5 px-4 text-right text-slate-600">
                                    ₹
                                    {Number(line.unitPrice || 0).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                                    {line.discountPercent || 0}%
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                                    ₹
                                    {Number(line.netPrice || 0).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}
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

                    {/* Counter-Proposal Section: Only locked if deal is confirmed/executed */}
                    {!isConfirmed ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal size={18} className="text-[#ff5e3a]" />
                          <h3 className="text-sm font-bold text-slate-900">
                            Request Commercial Adjustments / Counter Discount
                          </h3>
                        </div>

                        <form onSubmit={handleSubmitCounterProposal} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Discount Slider */}
                            <div className="space-y-3 bg-[#f8fafc] border border-slate-200 p-4 rounded-xl">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-700">
                                  Target Commercial Discount Tier
                                </span>
                                <span className="text-sm font-extrabold text-[#ff5e3a]">
                                  {counterDiscount}%
                                </span>
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
                                <span className="font-semibold text-slate-800">
                                  ₹
                                  {originalSubtotal.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between text-emerald-600 font-semibold">
                                <span>Proposed Total Savings:</span>
                                <span>
                                  -₹
                                  {estimatedSavings.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                                <span>Proposed Deal Total:</span>
                                <span className="text-[#ff5e3a]">
                                  ₹
                                  {estimatedCounterTotal.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">
                              Buyer Justification / Procurement Notes
                            </label>
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
                              {submittingProposal ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Send size={14} />
                              )}
                              <span>Submit Counter-Proposal</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        {/* 1. Execution & E-Sign Stamp Banner */}
                        <div className="p-5 bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                              <ShieldCheck size={22} className="text-emerald-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  Commercial Agreement Executed &amp; Bound
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  VERIFIED
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Signed by{" "}
                                <strong>{quotation.signature?.signedByName || quotation.customer?.name}</strong>{" "}
                                ({quotation.signature?.signedByEmail || quotation.customer?.email})
                                {quotation.signature?.signedAt && (
                                  <> on {new Date(quotation.signature.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Printer size={13} />
                              <span>Print Agreement</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. Grid of Invoices, Subscriptions & Logistics */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          {/* Card A: Invoices & Receipts Ledger */}
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CreditCard size={15} className="text-[#ff5e3a]" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  Invoices &amp; Billing
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                                {quotation.invoices?.length || 0} Issued
                              </span>
                            </div>

                            <div className="p-4 flex-1 space-y-3">
                              {(!quotation.invoices || quotation.invoices.length === 0) ? (
                                <div className="text-center py-6 text-slate-400 text-xs">
                                  <Receipt size={24} className="mx-auto text-slate-300 mb-2" />
                                  <span>Invoices will be generated upon shipment dispatch or contract activation.</span>
                                </div>
                              ) : (
                                quotation.invoices.map((inv: any) => {
                                  const isPaid = inv.status === "PAID";
                                  return (
                                    <div
                                      key={inv.id}
                                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 hover:border-[#ff5e3a]/40 transition"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-xs text-slate-900">
                                          {inv.invoiceNumber}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                            isPaid
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {inv.status}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 text-[11px]">
                                          Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Net 30"}
                                        </span>
                                        <span className="font-extrabold text-slate-900 font-mono">
                                          ₹{Number(inv.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>

                                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedInvoiceForModal(inv);
                                            setIsInvoiceModalOpen(true);
                                          }}
                                          className="text-[11px] font-bold text-[#ff5e3a] hover:underline cursor-pointer flex items-center gap-1"
                                        >
                                          <span>View Statement</span>
                                          <ChevronRight size={11} />
                                        </button>

                                        {!isPaid && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedInvoiceForModal(inv);
                                              setIsInvoiceModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                          >
                                            Pay Now
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Card B: Active Subscriptions */}
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrendingUp size={15} className="text-[#ff5e3a]" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  Active Subscriptions
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                                {quotation.subscriptions?.length || 0} Schedule(s)
                              </span>
                            </div>

                            <div className="p-4 flex-1 space-y-3">
                              {(!quotation.subscriptions || quotation.subscriptions.length === 0) ? (
                                <div className="text-center py-6 text-slate-400 text-xs">
                                  <Layers size={24} className="mx-auto text-slate-300 mb-2" />
                                  <span>No recurring subscription lines attached to this contract.</span>
                                </div>
                              ) : (
                                quotation.subscriptions.map((sub: any) => {
                                  const planName = sub.lines?.[0]?.product?.name || sub.notes || "Recurring SaaS Plan";
                                  const seats = sub.lines?.[0]?.quantity || 1;
                                  return (
                                    <div
                                      key={sub.id}
                                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]">
                                          {planName}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                            sub.status === "ACTIVE"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : sub.status === "PAUSED"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-rose-50 text-rose-700 border-rose-200"
                                          }`}
                                        >
                                          {sub.status}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                                        <div>
                                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cadence</span>
                                          <span className="font-semibold text-slate-800 capitalize">{sub.billingInterval?.toLowerCase() || "Monthly"}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Allocated Seats</span>
                                          <span className="font-semibold text-slate-800">{seats} user license(s)</span>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">
                                          Next Renewal: {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Active Cycle"}
                                        </span>
                                        <span className="font-bold text-emerald-600 font-mono">
                                          ₹{Number(sub.currentMrr || 0).toLocaleString("en-IN")}/mo
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Card C: Fulfillment Logistics & Shipments */}
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Truck size={15} className="text-[#ff5e3a]" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  Delivery &amp; Tracking
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                                {quotation.fulfillmentOrder?.shipments?.length || 0} Package(s)
                              </span>
                            </div>

                            <div className="p-4 flex-1 space-y-3">
                              {(!quotation.fulfillmentOrder?.shipments || quotation.fulfillmentOrder.shipments.length === 0) ? (
                                <div className="text-center py-6 text-slate-400 text-xs">
                                  <Box size={24} className="mx-auto text-slate-300 mb-2" />
                                  <span>No physical hardware items requiring logistics dispatch.</span>
                                </div>
                              ) : (
                                quotation.fulfillmentOrder.shipments.map((shipment: any) => {
                                  return (
                                    <div
                                      key={shipment.id}
                                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-xs text-slate-900">
                                          {shipment.shipmentNumber}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                            shipment.status === "DELIVERED"
                                              ? "bg-sky-50 text-sky-700 border-sky-200"
                                              : shipment.status === "SHIPPED"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {shipment.status}
                                        </span>
                                      </div>

                                      <div className="text-[11px] text-slate-600 space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-slate-400">Depot:</span>
                                          <span className="font-semibold text-slate-800">{shipment.warehouse?.name || "Main Warehouse"}</span>
                                        </div>
                                        {shipment.trackingNumber && (
                                          <div className="flex justify-between font-mono">
                                            <span className="text-slate-400">Tracking #:</span>
                                            <span className="font-bold text-[#ff5e3a]">{shipment.trackingNumber}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Dispatched Lines */}
                                      {shipment.lines && shipment.lines.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 space-y-1">
                                          {shipment.lines.map((l: any, idx: number) => (
                                            <div key={l.id || idx} className="flex justify-between">
                                              <span className="truncate max-w-[150px]">{l.product?.name || "Hardware Line"}</span>
                                              <span className="font-bold font-mono text-slate-700">x{l.quantity}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}

                              {/* Backorders notice if present */}
                              {quotation.fulfillmentOrder?.backorders && quotation.fulfillmentOrder.backorders.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                    <AlertTriangle size={13} className="text-amber-600" />
                                    <span>Backordered Items</span>
                                  </div>
                                  {quotation.fulfillmentOrder.backorders.map((bo: any) => (
                                    <div key={bo.id} className="flex justify-between text-[11px]">
                                      <span>{bo.product?.name || "Hardware item"}</span>
                                      <span className="font-bold font-mono">x{bo.quantityBackordered} awaiting stock</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 2: TRAILS & MESSAGES — CLICKUP-STYLE DUAL CHAT & AUDIT TIMELINE
            ══════════════════════════════════════════════════════ */}
            {activeTab === "trails" && quotation && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── LEFT / CENTER: QUOTATION AUDIT TRAILS TIMELINE (6 cols) ── */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <History size={18} className="text-[#ff5e3a]" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Quotation Trails &amp; Milestone Timeline
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {quotation.quoteNumber}
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                    {quotationTrails.length === 0 ? (
                      <div className="text-xs text-slate-400 py-6 text-center">
                        No activity trails recorded yet.
                      </div>
                    ) : (
                      quotationTrails.map((trail) => (
                        <div key={trail.id} className="relative group">
                          {/* Timeline node icon */}
                          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#ff5e3a] flex items-center justify-center shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e3a]" />
                          </div>

                          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 space-y-1 hover:border-[#ff5e3a]/30 transition">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900">{trail.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {trail.date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {trail.description}
                            </p>

                            <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                              <span>Actor:</span>
                              <strong className="text-slate-700">{trail.actor}</strong>
                              <span
                                className={`px-1.5 py-0.2 rounded border font-semibold ${trail.badgeColor}`}
                              >
                                {trail.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── RIGHT: CLICKUP-STYLE CHAT WINDOW (6 cols) ── */}
                <div
                  className="lg:col-span-6 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden"
                  style={{ minHeight: "560px", maxHeight: "85vh" }}
                >
                  {/* ClickUp Chat Header */}
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#ff5e3a] to-[#ea4e28] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(quotation.salesRep?.user?.name || "SR")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {quotation.salesRep?.user?.name || "DealFlow Sales Representative"}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Deal Discussion Channel ({quotation.quoteNumber})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchQuotationData(token, true)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Refresh messages"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <span className="text-[11px] font-mono text-slate-400">
                        {quotation.comments?.length || 0} messages
                      </span>
                    </div>
                  </div>

                  {/* Line item filter tag if active */}
                  {chatFilterLineId && (
                    <div className="px-4 py-1.5 bg-orange-50 border-b border-orange-100 text-[11px] font-semibold text-[#ff5e3a] flex items-center justify-between">
                      <span>Tagging inquiry on specific line item</span>
                      <button
                        onClick={() => setChatFilterLineId(null)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  {/* Messages Scroll Area */}
                  <div
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#f8fafc]"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    {!quotation.comments || quotation.comments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                          <MessageSquare size={24} className="text-[#ff5e3a]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                          <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
                            Broadcast a message or question regarding this proposal to your assigned
                            sales rep.
                          </p>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        let lastDate = "";
                        return quotation.comments.map((msg: any, idx: number) => {
                          const isCustomer = msg.authorRole === "CUSTOMER";
                          const msgDate = new Date(msg.createdAt);
                          const dateLabel = msgDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          });
                          const timeLabel = msgDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const showDateSep = dateLabel !== lastDate;
                          lastDate = dateLabel;

                          const prevMsg = idx > 0 ? quotation.comments[idx - 1] : null;
                          const isSameAuthor =
                            prevMsg && prevMsg.authorRole === msg.authorRole && !showDateSep;

                          const initials = (msg.authorName || (isCustomer ? "C" : "S"))
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

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
                              <div
                                className={`flex items-end gap-2 mt-1 ${isCustomer ? "flex-row-reverse" : "flex-row"
                                  }`}
                              >
                                {!isSameAuthor ? (
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mb-0.5 ${isCustomer
                                        ? "bg-linear-to-br from-[#ff5e3a] to-[#ea4e28] text-white"
                                        : "bg-slate-200 text-slate-700"
                                      }`}
                                  >
                                    {initials}
                                  </div>
                                ) : (
                                  <div className="w-7 shrink-0" />
                                )}

                                <div
                                  className={`max-w-[75%] flex flex-col ${isCustomer ? "items-end" : "items-start"
                                    }`}
                                >
                                  {!isSameAuthor && (
                                    <span className="text-[10px] font-semibold text-slate-500 mb-0.5 px-1">
                                      {msg.authorName ||
                                        (isCustomer
                                          ? quotation.customer?.name || "You"
                                          : quotation.salesRep?.user?.name || "Sales Rep")}
                                    </span>
                                  )}

                                  <div
                                    className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${isCustomer
                                        ? "bg-[#ff5e3a] text-white rounded-br-sm shadow-sm shadow-[#ff5e3a]/20"
                                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-xs"
                                      }`}
                                  >
                                    {(() => {
                                      const attachedLine = msg.quotationLineId
                                        ? (quotation.lines || []).find((l: any) => l.id === msg.quotationLineId)
                                        : null;

                                      if (!msg.quotationLineId) return null;

                                      return (
                                        <div
                                          className={`mb-2.5 p-2.5 rounded-xl text-left transition-all ${isCustomer
                                              ? "bg-black/20 border border-white/25 text-white shadow-2xs backdrop-blur-xs"
                                              : "bg-slate-50 border border-slate-200/90 text-slate-800 shadow-2xs"
                                            }`}
                                        >
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                              <span className={isCustomer ? "text-orange-100" : "text-slate-500"}>
                                                📎 Attached Line Item
                                              </span>
                                              {attachedLine?.itemType && (
                                                <span
                                                  className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${isCustomer
                                                      ? "bg-white/20 text-white"
                                                      : "bg-slate-200 text-slate-700"
                                                    }`}
                                                >
                                                  {attachedLine.itemType}
                                                </span>
                                              )}
                                            </div>
                                            {attachedLine?.product?.sku && (
                                              <span
                                                className={`text-[9px] font-mono ${isCustomer ? "text-orange-200" : "text-slate-400"
                                                  }`}
                                              >
                                                {attachedLine.product.sku}
                                              </span>
                                            )}
                                          </div>

                                          {attachedLine ? (
                                            <div className="space-y-1">
                                              <div
                                                className={`font-bold text-xs leading-snug ${isCustomer ? "text-white" : "text-slate-900"
                                                  }`}
                                              >
                                                {attachedLine.product?.name || attachedLine.description || "Product Item"}
                                              </div>
                                              {attachedLine.description &&
                                                attachedLine.description !== attachedLine.product?.name && (
                                                  <div
                                                    className={`text-[10px] truncate max-w-[280px] ${isCustomer ? "text-orange-100/80" : "text-slate-500"
                                                      }`}
                                                  >
                                                    {attachedLine.description}
                                                  </div>
                                                )}
                                              <div
                                                className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] pt-1.5 mt-1 border-t ${isCustomer
                                                    ? "border-white/15 text-orange-100"
                                                    : "border-slate-200 text-slate-600"
                                                  }`}
                                              >
                                                <span>
                                                  Qty:{" "}
                                                  <strong className={isCustomer ? "text-white font-bold" : "text-slate-900 font-bold"}>
                                                    {attachedLine.quantity || 1}
                                                  </strong>
                                                </span>
                                                <span>
                                                  Unit:{" "}
                                                  <strong className={isCustomer ? "text-white font-bold" : "text-slate-900 font-bold"}>
                                                    ₹{Number(attachedLine.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                  </strong>
                                                </span>
                                                {Number(attachedLine.discountPercent || 0) > 0 && (
                                                  <span>
                                                    Disc:{" "}
                                                    <strong className={isCustomer ? "text-white font-bold" : "text-emerald-600 font-bold"}>
                                                      {attachedLine.discountPercent}%
                                                    </strong>
                                                  </span>
                                                )}
                                                <span>
                                                  Net:{" "}
                                                  <strong className={isCustomer ? "text-white font-black" : "text-slate-900 font-black"}>
                                                    ₹{Number(attachedLine.netPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                  </strong>
                                                </span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className={`text-[10px] ${isCustomer ? "text-orange-100" : "text-slate-500"}`}>
                                              Line Item Ref: {msg.quotationLineId}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {msg.message}
                                  </div>

                                  <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                                    {timeLabel}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* ClickUp Input Area */}
                  <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0 space-y-2">
                    {/* Quick response chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setGeneralMessage(
                            "Thank you for the update. We are reviewing the commercial terms."
                          )
                        }
                        className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 cursor-pointer"
                      >
                        Reviewing Terms
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGeneralMessage(
                            "Could we schedule a brief 10-minute sync to finalize deployment details?"
                          )
                        }
                        className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 cursor-pointer"
                      >
                        Request Sync
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGeneralMessage(
                            "Pricing looks good. Ready to execute upon delivery schedule confirmation."
                          )
                        }
                        className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 cursor-pointer"
                      >
                        Confirm Schedule
                      </button>
                    </div>

                    <form onSubmit={handleSendGeneralMessage} className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          rows={1}
                          value={generalMessage}
                          onChange={(e) => {
                            setGeneralMessage(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendGeneralMessage(e as any);
                            }
                          }}
                          placeholder="Message sales team... (Enter to send, Shift+Enter for newline)"
                          className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#ff5e3a] resize-none transition-all"
                          style={{ minHeight: "40px", maxHeight: "120px" }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sendingGeneralMessage || !generalMessage.trim()}
                        className="w-10 h-10 rounded-2xl bg-[#ff5e3a] hover:bg-[#ea4e28] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition shadow-md shadow-[#ff5e3a]/20 shrink-0 cursor-pointer"
                      >
                        {sendingGeneralMessage ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 3: COMPANY PROFILE (Customer-Centric Only)
            ══════════════════════════════════════════════════════ */}
            {activeTab === "profile" && quotation && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building size={18} className="text-[#ff5e3a]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Your Customer Profile &amp; Connected Organizations
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Organization Profile */}
                  <div className="bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500">
                      Customer Organization Details
                    </span>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block">Company Name</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {quotation.customer?.companyName ||
                            quotation.customer?.name ||
                            "Client Organization"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Primary Contact Person</span>
                        <span className="font-semibold text-slate-800">
                          {quotation.customer?.name || "Account Representative"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Email Address</span>
                        <span className="font-semibold text-slate-800">
                          {quotation.customer?.email || customerEmail || "customer@client.com"}
                        </span>
                      </div>
                      {quotation.customer?.phone && (
                        <div>
                          <span className="text-slate-400 block">Phone</span>
                          <span className="font-semibold text-slate-800">
                            {quotation.customer?.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connected Organization Summary */}
                  <div className="bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500">
                      Connected Vendor Organization
                    </span>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block">Connected Organization</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {quotation.organization?.name || "DealFlow 360 Enterprise"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Account Status</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                          <CheckCircle2 size={11} /> Active Customer Account
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* All Quotations Assigned to Customer Profile */}
                  <div className="md:col-span-2 bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                          <FileText size={14} className="text-[#ff5e3a]" />
                          <span>
                            All Quotations Assigned to Your Profile ({customerQuotations.length})
                          </span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Active proposals and commercial quotes created for your organization
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setViewMode("list");
                          setActiveTab("quotation");
                        }}
                        className="text-xs font-bold text-[#ff5e3a] hover:underline cursor-pointer"
                      >
                        View in Catalog &rarr;
                      </button>
                    </div>

                    {customerQuotations.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No active quotations found for your account yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {customerQuotations.map((q: any) => (
                          <div
                            key={q.id || q.quoteNumber}
                            className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#ff5e3a]/40 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-slate-900">
                                  {q.quoteNumber || q.id}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  {q.stage || "DRAFT"}
                                </span>
                              </div>
                              <div className="text-xs text-slate-700 font-semibold">{q.title}</div>
                              <div className="text-[11px] text-slate-400">
                                Total:{" "}
                                <strong className="text-slate-800">
                                  ₹{(Number(q.grandTotal) || 0).toLocaleString()}
                                </strong>{" "}
                                &bull; Valid:{" "}
                                {q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : "—"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectToken(q.portalToken || q.quoteNumber || q.id);
                                setActiveTab("quotation");
                              }}
                              className="px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-xs active:translate-y-0.5 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Open Proposal</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                          Signed in as{" "}
                          <span className="text-[#ff5e3a] font-medium">
                            {customerEmail ||
                              quotation.customer?.email ||
                              signerEmail ||
                              "customer@client.com"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      disabled={loggingOut}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold transition-all shadow-xs active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                    >
                      {loggingOut ? (
                        <RefreshCw size={14} className="animate-spin text-red-500" />
                      ) : (
                        <LogOut size={14} className="text-red-500" />
                      )}
                      <span>
                        {loggingOut ? "Signing Out..." : "Sign Out of Customer Portal"}
                      </span>
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
              <button
                onClick={() => setSelectedLineForComment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-slate-900 leading-tight">
                  {selectedLineForComment.product?.name || selectedLineForComment.description || "Quotation Line Item"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 font-mono">
                  {selectedLineForComment.itemType || "ITEM"}
                </span>
              </div>
              {selectedLineForComment.description && selectedLineForComment.description !== selectedLineForComment.product?.name && (
                <div className="text-[11px] text-slate-500">
                  {selectedLineForComment.description}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1.5 border-t border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Quantity</span>
                  <span className="font-bold text-slate-900">{selectedLineForComment.quantity || 1}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Unit Price</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(selectedLineForComment.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Discount</span>
                  <span className="font-bold text-emerald-600">{selectedLineForComment.discountPercent || 0}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Net Price</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(selectedLineForComment.netPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitLineComment} className="space-y-4">
              <textarea
                rows={3}
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
                  {submittingLineComment ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
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
                <h3 className="text-base font-bold text-slate-900">
                  Execute Commercial Agreement
                </h3>
              </div>
              <button
                onClick={() => setIsSignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-orange-50/70 border border-orange-200/80 p-3.5 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Quotation: {quotation?.quoteNumber}</span>
                <span className="text-[#ff5e3a]">
                  ₹
                  {(quotation?.grandTotal || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Upon signature, commercial invoices, subscriptions, and fulfillment orders are
                automatically generated.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Signer Legal Name
                  </label>
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
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Signer Email
                  </label>
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
                      className={`px-2.5 py-0.5 rounded-md ${signatureMode === "type"
                          ? "bg-white font-bold text-slate-900 shadow-xs"
                          : "text-slate-600"
                        }`}
                    >
                      Typed
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      className={`px-2.5 py-0.5 rounded-md ${signatureMode === "draw"
                          ? "bg-white font-bold text-slate-900 shadow-xs"
                          : "text-slate-600"
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
                  I confirm that I am an authorized representative of{" "}
                  <strong>{quotation?.customer?.name}</strong> and agree to execute this commercial
                  agreement.
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
                {isSigning ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                <span>Execute &amp; Confirm Deal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICE DETAIL & SETTLEMENT MODAL ── */}
      {isInvoiceModalOpen && selectedInvoiceForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ff5e3a]/10 text-[#ff5e3a] flex items-center justify-center font-bold">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Invoice Statement: {selectedInvoiceForModal.invoiceNumber}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Terms: {selectedInvoiceForModal.paymentTerms || "Net 30"} &bull; Due:{" "}
                    {selectedInvoiceForModal.dueDate
                      ? new Date(selectedInvoiceForModal.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Upon Receipt"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsInvoiceModalOpen(false);
                  setSelectedInvoiceForModal(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Billed Items &amp; Charges
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-500 font-semibold border-b border-slate-200/70 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 font-medium">
                    {selectedInvoiceForModal.lines && selectedInvoiceForModal.lines.length > 0 ? (
                      selectedInvoiceForModal.lines.map((l: any, idx: number) => (
                        <tr key={l.id || idx}>
                          <td className="py-2.5 px-3 text-slate-800">{l.description || l.product?.name || "Billed item"}</td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-600">{l.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{Number(l.totalAmount || l.unitPrice * l.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-3 px-3 text-center text-slate-400">
                          {selectedInvoiceForModal.notes || "Commercial invoice charges for confirmed quotation."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary & Balance */}
            <div className="p-3.5 bg-[#f8fafc] border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Invoice Total:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  ₹{Number(selectedInvoiceForModal.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Settled / Paid:</span>
                <span className="font-semibold text-emerald-600 font-mono">
                  -₹{Number(selectedInvoiceForModal.amountPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Remaining Balance Due:</span>
                <span className={selectedInvoiceForModal.status === "PAID" ? "text-emerald-600" : "text-[#ff5e3a]"}>
                  ₹{Number(selectedInvoiceForModal.amountRemaining ?? (selectedInvoiceForModal.status === "PAID" ? 0 : selectedInvoiceForModal.totalAmount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Options if unpaid */}
            {selectedInvoiceForModal.status !== "PAID" ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                  <select
                    value={portalPaymentMethod}
                    onChange={(e) => setPortalPaymentMethod(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium outline-none focus:border-[#ff5e3a]"
                  >
                    <option value="ACH_TRANSFER">Direct Corporate ACH (Instant Settlement)</option>
                    <option value="CREDIT_CARD">Corporate Visa / Mastercard</option>
                    <option value="WIRE_TRANSFER">Domestic / International Wire</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInvoiceModalOpen(false);
                      setSelectedInvoiceForModal(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePortalPayInvoice(selectedInvoiceForModal.id)}
                    disabled={isPayingInvoice}
                    className="px-5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#ff5e3a]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isPayingInvoice ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <CreditCard size={13} />
                    )}
                    <span>Settle Invoice Online</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-bold">This invoice has been settled in full.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceModalOpen(false);
                    setSelectedInvoiceForModal(null);
                  }}
                  className="font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 py-4 px-6 bg-white text-center text-xs text-slate-500">
        DealFlow360 Enterprise Customer Negotiation Portal &copy; 2026 &bull; Secure Cryptographic
        Token Authentication
      </footer>
    </div>
  );
}
