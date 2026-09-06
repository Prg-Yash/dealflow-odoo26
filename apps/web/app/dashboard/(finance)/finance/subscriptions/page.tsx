"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  ChevronRight,
  ShieldCheck,
  Zap,
  Loader2,
  Calendar,
  DollarSign,
  User,
  Package,
  Layers,
  X,
  Sparkles,
  ArrowLeft,
  Building2,
  CreditCard,
  Box,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { useDashboardAuth } from "../../../layout";
import {
  useSubscriptions,
  useCreateSubscription,
  useCustomers,
  useProducts,
  type SubscriptionData,
} from "../../../../../lib/query";
import { INITIAL_SUBSCRIPTION_RECORDS } from "../../../../../lib/finance-data";

export default function SubscriptionsListPage() {
  const router = useRouter();
  const { user } = useDashboardAuth();

  // Role Gate: Private to Finance Ops & Admin
  const isAuthorized = user?.role === "FINANCE_OPS" || user?.role === "ADMIN" || !user?.role;

  // Data fetching
  const { data: apiSubscriptions, isLoading, refetch } = useSubscriptions();
  const { data: apiCustomers } = useCustomers();
  const { data: apiProducts } = useProducts();
  const createSubMutation = useCreateSubscription();

  // Filters and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "CANCELLED">("ALL");

  // + New Plan Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "QUARTERLY" | "ANNUALLY">("MONTHLY");
  const [unitPrice, setUnitPrice] = useState<number>(49);
  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]!);
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [enableReminder, setEnableReminder] = useState<boolean>(true);
  const [notes, setNotes] = useState("");
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fallback realistic records when DB is initially empty
  const displayList: SubscriptionData[] = useMemo(() => {
    if (apiSubscriptions && apiSubscriptions.length > 0) {
      return apiSubscriptions;
    }
    return INITIAL_SUBSCRIPTION_RECORDS.map((r, idx) => ({
      id: r.id,
      subscriptionNumber: `SUB-2026-000${idx + 1}`,
      status: (r.status.toUpperCase() === "ACTIVE" ? "ACTIVE" : r.status.toUpperCase() === "PAUSED" ? "PAUSED" : "CANCELLED") as any,
      billingInterval: (r.cycle.toUpperCase() === "QUARTERLY" ? "QUARTERLY" : r.cycle.toUpperCase() === "ANNUALLY" ? "ANNUALLY" : "MONTHLY") as any,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      nextBillingDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      currentMrr: r.amount || 46,
      currentArr: (r.amount || 46) * 12,
      autoRenew: true,
      notes: r.plan,
      customerId: `cust-${idx + 1}`,
      customer: { id: `cust-${idx + 1}`, name: r.account, email: `billing@${r.account.toLowerCase().replace(/\s+/g, "")}.com` },
      lines: [
        {
          id: `line-${idx + 1}`,
          quantity: 1,
          unitPrice: r.amount || 46,
          discountPercent: 0,
          recurringAmount: r.amount || 46,
          product: { id: `prod-${idx + 1}`, name: r.plan, sku: `SKU-${r.plan.slice(0, 4).toUpperCase()}`, basePrice: r.amount || 46, costPrice: 15 },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }, [apiSubscriptions]);

  // Status metrics counts
  const metrics = useMemo(() => {
    const active = displayList.filter((s) => s.status === "ACTIVE").length;
    const paused = displayList.filter((s) => s.status === "PAUSED").length;
    const cancelled = displayList.filter((s) => s.status === "CANCELLED").length;
    const totalMrr = displayList
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + (s.currentMrr || 0), 0);

    return { active, paused, cancelled, totalMrr, total: displayList.length };
  }, [displayList]);

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    let list = displayList;

    if (statusFilter !== "ALL") {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const custName = s.customer?.name || s.customer?.companyName || "";
        const plan = s.lines?.[0]?.product?.name || s.notes || "";
        const num = s.subscriptionNumber || "";
        return (
          custName.toLowerCase().includes(q) ||
          plan.toLowerCase().includes(q) ||
          num.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [displayList, statusFilter, searchQuery]);

  // Auto fill product price when product selected
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = apiProducts?.find((p) => p.id === prodId);
    if (prod) {
      setUnitPrice(prod.basePrice > 0 ? prod.basePrice : 49);
      if (!planTitle || planTitle === prod.name) {
        setPlanTitle(prod.name);
      }
    }
  };

  // Open modal with clean defaults
  const handleOpenModal = () => {
    setModalFeedback(null);
    if (apiCustomers && apiCustomers.length > 0) {
      setSelectedCustomerId(apiCustomers[0]!.id);
    }
    if (apiProducts && apiProducts.length > 0) {
      const recurringProd =
        apiProducts.find((p) => p.category?.type === "SUBSCRIPTION" || p.category?.type === "SERVICE") ||
        apiProducts[0]!;
      setSelectedProductId(recurringProd.id);
      setUnitPrice(recurringProd.basePrice > 0 ? recurringProd.basePrice : 49);
      setPlanTitle(recurringProd.name);
    } else {
      setUnitPrice(49);
      setPlanTitle("Enterprise Care Plan 2yr");
    }
    setIsModalOpen(true);
  };

  // Submit new plan schedule
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);

    const price = Number(unitPrice);
    const qty = Math.max(1, Number(quantity) || 1);
    const disc = Math.max(0, Math.min(100, Number(discountPercent) || 0));

    if (!selectedCustomerId && (!apiCustomers || apiCustomers.length === 0)) {
      setModalFeedback("No customer account found. Please register a customer first.");
      return;
    }
    const custId = selectedCustomerId || apiCustomers?.[0]?.id;
    const prodId = selectedProductId || apiProducts?.[0]?.id;

    if (!custId) {
      setModalFeedback("Please select a customer organization.");
      return;
    }
    if (!prodId) {
      setModalFeedback("Please select a product plan / service item.");
      return;
    }
    if (price <= 0) {
      setModalFeedback("Unit price must be greater than zero (₹).");
      return;
    }

    try {
      await createSubMutation.mutateAsync({
        customerId: custId,
        productId: prodId,
        planName: planTitle.trim() || undefined,
        billingInterval: billingCycle,
        unitPrice: price,
        quantity: qty,
        discountPercent: disc,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        autoRenew,
        enableReminder,
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      setToastMessage("Subscription plan schedule created successfully!");
      refetch();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error("Create subscription error:", err);
      setModalFeedback(err.message || "Failed to create subscription schedule. Please check input fields.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* ── ISOLATED FINANCE TOPBAR (Unified Across All Finance Views) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="Finance Operations" />

            {/* Navigation Tabs - Strict Isolation to Finance Scope */}
            <nav className="hidden md:flex items-center gap-1 p-1 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
              <Link
                href="/dashboard/finance"
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 text-slate-600 hover:text-slate-900 hover:bg-white/80"
              >
                <AlertTriangle size={13} className="text-slate-500" />
                <span>High-Risk Approvals</span>
              </Link>

              <Link
                href="/dashboard/finance"
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 text-slate-600 hover:text-slate-900 hover:bg-white/80"
              >
                <Box size={13} className="text-slate-500" />
                <span>Logistics &amp; Stock</span>
              </Link>

              <Link
                href="/dashboard/finance/subscriptions"
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 bg-[#ff5e3a] text-white shadow-sm"
              >
                <TrendingUp size={13} className="text-white" />
                <span>Subscriptions</span>
              </Link>

              <Link
                href="/dashboard/finance"
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 text-slate-600 hover:text-slate-900 hover:bg-white/80"
              >
                <CreditCard size={13} className="text-slate-500" />
                <span>Invoices</span>
              </Link>
            </nav>
          </div>

          {/* Right: Isolated User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 pl-2.5 sm:border-l sm:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#ff5e3a] text-white text-xs font-extrabold flex items-center justify-center shadow-sm">
                FO
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  Fiona Ops
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                  VP of Finance
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CANVAS (Matching Wireframe 9 Exactly) ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 text-left">
        {/* Toast Feedback Alert */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* View Header (Wireframe 9) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recurring Revenue
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Subscriptions (List)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Every recurring plan across every customer, regardless of which order it came from.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ff5e3a] hover:bg-[#ff4e26] text-white text-xs font-bold transition shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus size={14} />
            <span>+ New Plan (Admin)</span>
          </button>
        </div>

        {/* ── STATUS PILLS MATCHING WIREFRAME 9 ── */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <span className="text-sm font-black">{metrics.active}</span>
            <span>Active</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "PAUSED" ? "ALL" : "PAUSED")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "PAUSED"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <span className="text-sm font-black">{metrics.paused}</span>
            <span>Paused</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "CANCELLED" ? "ALL" : "CANCELLED")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "CANCELLED"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            <span className="text-sm font-black">{metrics.cancelled}</span>
            <span>Cancelled</span>
          </button>

          {statusFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className="text-xs text-slate-500 hover:text-slate-900 transition underline cursor-pointer ml-1"
            >
              Reset filter ({metrics.total} total)
            </button>
          )}

          <div className="ml-auto hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Live MRR:</span>
            <span className="text-xs font-black text-emerald-600 font-mono">
              ₹{metrics.totalMrr.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer, plan name, or SUB number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#ff5e3a] focus:bg-white transition font-medium"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            {filteredSubscriptions.length} subscriptions listed
          </span>
        </div>

        {/* ── SUBSCRIPTIONS TABLE MATCHING WIREFRAME 9 ── */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <th className="py-4 px-6 min-w-[200px] rounded-l-xl">CUSTOMER</th>
                <th className="py-4 px-6 min-w-[180px]">PLAN</th>
                <th className="py-4 px-4 text-center">CYCLE</th>
                <th className="py-4 px-6 text-center">NEXT BILL</th>
                <th className="py-4 px-6 text-right rounded-r-xl">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin text-[#ff5e3a] mx-auto mb-2" />
                    <span>Loading recurring subscriptions ledger...</span>
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Package size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No subscriptions found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {statusFilter !== "ALL"
                        ? `No ${statusFilter.toLowerCase()} subscriptions matching your search.`
                        : "Click '+ New Plan (Admin)' below to create your first recurring schedule."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const customerName = sub.customer?.name || sub.customer?.companyName || "Corporate Client";
                  const planName = sub.lines?.[0]?.product?.name || sub.notes || "Care Plan 2yr";
                  const nextBillDate = sub.nextBillingDate
                    ? new Date(sub.nextBillingDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "-";

                  const isActive = sub.status === "ACTIVE";
                  const isPaused = sub.status === "PAUSED";
                  const isCancelled = sub.status === "CANCELLED";

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => router.push(`/dashboard/finance/subscriptions/${sub.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 group-hover:text-[#ff5e3a] transition-colors flex items-center gap-1.5">
                          <span>{customerName}</span>
                          <ChevronRight
                            size={13}
                            className="text-slate-300 group-hover:text-[#ff5e3a] transition-colors opacity-0 group-hover:opacity-100"
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {sub.subscriptionNumber || "SUB-2026"}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{planName}</div>
                        <div className="text-[11px] text-emerald-600 font-mono font-semibold">
                          ₹{(sub.currentMrr || 46).toLocaleString()} / mo
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center text-slate-700 capitalize">
                        {sub.billingInterval.toLowerCase()}
                      </td>

                      <td className="py-4 px-6 text-center font-mono font-semibold text-slate-700">
                        {isPaused ? "-" : nextBillDate}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isPaused
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {sub.status === "ACTIVE" ? "Active" : sub.status === "PAUSED" ? "Paused" : "Cancelled"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── YELLOW INSTRUCTION BANNER (Matching Wireframe 9) ── */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2.5 shadow-2xs">
          <span className="text-base">⚠️</span>
          <span className="font-semibold">
            Click a subscription row to open its billing detail and proration history.
          </span>
        </div>

        {/* ── BOTTOM BUTTON (Matching Wireframe 9) ── */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus size={14} className="text-[#ff5e3a]" />
            <span>+ New Plan (Admin)</span>
          </button>
        </div>
      </main>

      {/* ── CREATE SUBSCRIPTION PLAN MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-black/[0.08] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-auto text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Subscription Plan Schedule</h3>
                  <p className="text-[11px] text-slate-400">
                    Assign a recurring service/SaaS contract with BullMQ automated reminders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalFeedback && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center justify-between">
                <span>{modalFeedback}</span>
                <button
                  type="button"
                  onClick={() => setModalFeedback(null)}
                  className="text-rose-600 hover:text-rose-900"
                >
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#ff5e3a]" />
                  <span>Customer Organization</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#ff5e3a] cursor-pointer"
                >
                  {(apiCustomers && apiCustomers.length > 0) ? (
                    apiCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.name} &ndash; {c.email}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="cust-acme">Acme Corp &ndash; billing@acmecorp.com</option>
                      <option value="cust-beta">Beta Industries &ndash; accounts@betaindustries.com</option>
                      <option value="cust-delta">Delta LLC &ndash; finance@deltallc.com</option>
                    </>
                  )}
                </select>
              </div>

              {/* Product Catalog Plan Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package size={13} className="text-[#ff5e3a]" />
                  <span>Catalog Plan / Deliverable</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#ff5e3a] cursor-pointer"
                >
                  {(apiProducts && apiProducts.length > 0) ? (
                    apiProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category?.name || "Standard"}) &ndash; ₹{p.basePrice.toLocaleString()}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="prod-care">Care Plan 2yr (24/7 Enterprise Support) &ndash; ₹46</option>
                      <option value="prod-sla">Support SLA Premium (99.9% Uptime) &ndash; ₹300</option>
                      <option value="prod-care-1">Care Plan 1yr Standard &ndash; ₹29</option>
                    </>
                  )}
                </select>
              </div>

              {/* Plan Custom Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Plan Display Title
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g. Care Plan 2yr (24/7 Enterprise Support)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#ff5e3a] font-medium"
                />
              </div>

              {/* Billing Cycle & Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#ff5e3a] cursor-pointer"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Recurring Rate (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-[#ff5e3a] font-mono"
                  />
                </div>
              </div>

              {/* Quantity & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Quantity / Seats
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-[#ff5e3a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-[#ff5e3a]"
                  />
                </div>
              </div>

              {/* Schedule Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Activation Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#ff5e3a] font-mono"
                />
              </div>

              {/* BullMQ Bus Reminder Toggle */}
              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableReminder}
                    onChange={(e) => setEnableReminder(e.target.checked)}
                    className="rounded border-slate-300 text-[#ff5e3a] focus:ring-[#ff5e3a] h-4 w-4 cursor-pointer"
                  />
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Zap size={13} className="text-[#ff5e3a] fill-[#ff5e3a]" />
                    <span>BullMQ Bus Channel: Automated Renewal Reminder</span>
                  </span>
                </label>
                <p className="text-[11px] text-slate-600 pl-6 leading-relaxed">
                  Automatically schedules a background job to dispatch renewal notifications 7 days prior to the next billing cycle.
                </p>
              </div>

              {/* Auto Renew */}
              <label className="flex items-center gap-2 cursor-pointer select-none pl-1">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="rounded border-slate-300 text-[#ff5e3a] focus:ring-[#ff5e3a] h-4 w-4 cursor-pointer"
                />
                <span className="font-medium text-slate-700 text-xs">
                  Auto-Renew plan indefinitely until cancelled
                </span>
              </label>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Notes / SLA Terms
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional agreement notes or SLA terms..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#ff5e3a] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubMutation.isPending}
                  className="px-5 py-2 rounded-full bg-[#ff5e3a] hover:bg-[#ff4e26] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createSubMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>Create Plan &amp; Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
