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
  Bell,
  Sparkles,
  ArrowLeft,
  Building2,
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

export default function SubscriptionsListPage() {
  const router = useRouter();
  const { user } = useDashboardAuth();

  // Role Gate: Private to Finance Ops & Admin
  const isAuthorized = user?.role === "FINANCE_OPS" || user?.role === "ADMIN";

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
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]!);
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [enableReminder, setEnableReminder] = useState<boolean>(true);
  const [notes, setNotes] = useState("");
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Status metrics counts
  const metrics = useMemo(() => {
    const list = apiSubscriptions || [];
    const active = list.filter((s) => s.status === "ACTIVE").length;
    const paused = list.filter((s) => s.status === "PAUSED").length;
    const cancelled = list.filter((s) => s.status === "CANCELLED").length;
    const totalMrr = list
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + (s.currentMrr || 0), 0);

    return { active, paused, cancelled, totalMrr, total: list.length };
  }, [apiSubscriptions]);

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    let list = apiSubscriptions || [];

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
  }, [apiSubscriptions, statusFilter, searchQuery]);

  // Auto fill product price when product selected
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = apiProducts?.find((p) => p.id === prodId);
    if (prod) {
      setUnitPrice(prod.basePrice);
      if (!planTitle) {
        setPlanTitle(prod.name);
      }
    }
  };

  // Open modal with clean defaults
  const handleOpenModal = () => {
    if (apiCustomers && apiCustomers.length > 0) {
      setSelectedCustomerId(apiCustomers[0]!.id);
    }
    const recurringProds =
      apiProducts?.filter((p) => p.category?.type === "SUBSCRIPTION" || p.category?.type === "SERVICE") ||
      apiProducts ||
      [];
    if (recurringProds.length > 0) {
      handleProductSelect(recurringProds[0]!.id);
    }
    setIsModalOpen(true);
  };

  // Submit new plan schedule
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedProductId || unitPrice <= 0) {
      setModalFeedback("Please select a customer, product plan, and enter a valid unit price.");
      return;
    }

    try {
      await createSubMutation.mutateAsync({
        customerId: selectedCustomerId,
        productId: selectedProductId,
        planName: planTitle.trim() || undefined,
        billingInterval: billingCycle,
        unitPrice,
        quantity,
        discountPercent,
        startDate,
        autoRenew,
        enableReminder,
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      setPlanTitle("");
      setNotes("");
      refetch();
    } catch (err: any) {
      setModalFeedback(err.message || "Failed to create subscription schedule.");
    }
  };

  // Unauthorized Access Guard
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-black tracking-tight text-white">
          Restricted Access &ndash; Finance Operations Only
        </h1>
        <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
          The Subscriptions &amp; Billing Schedules ledger is private and restricted strictly to Finance Operations and Administrator roles.
        </p>
        <Link
          href="/dashboard/finance"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Return to Finance Overview</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans antialiased">
      {/* ── DEALFLOW 360 NAV BAR (Matching Wireframe 9) ── */}
      <header className="sticky top-0 z-40 bg-[#111827]/90 backdrop-blur-xl border-b border-slate-800 shadow-md">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="DealFlow 360" />

            {/* Wireframe 9 Header Tabs */}
            <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-[#1e293b]/60 border border-slate-800 text-xs font-semibold">
              <Link
                href="/dashboard/finance"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/sale-ref/quotations"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Quotations
              </Link>
              <Link
                href="/dashboard/finance?tab=approvals"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Approvals
              </Link>
              <Link
                href="/dashboard/finance/fulfillment"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Fulfillment
              </Link>
              <Link
                href="/dashboard/finance/subscriptions"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold shadow-xs transition"
              >
                Subscriptions
              </Link>
              <Link
                href="/dashboard/finance/invoices"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Invoices
              </Link>
              <Link
                href="/dashboard/admin/reports"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Deal Health
              </Link>
              <Link
                href="/dashboard/admin/reports"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Reports
              </Link>
              <Link
                href="/dashboard/admin/catalog"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Product
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 font-mono hidden sm:inline-block">
              Finance &amp; Admin Ops
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center text-xs font-black">
              {user?.name?.[0]?.toUpperCase() || "F"}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (Matching Wireframe 9) ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-blue-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Subscriptions (List)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Every recurring plan across every customer, regardless of which order it came from
          </p>
        </div>

        {/* ── STATUS PILLS MATCHING WIREFRAME 9 ── */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
            className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md"
                : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900/60"
            }`}
          >
            <span className="text-sm font-extrabold">{metrics.active}</span>
            <span>Active</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "PAUSED" ? "ALL" : "PAUSED")}
            className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === "PAUSED"
                ? "bg-amber-600 text-white ring-2 ring-amber-400 shadow-md"
                : "bg-amber-950/80 text-amber-400 border border-amber-800/80 hover:bg-amber-900/60"
            }`}
          >
            <span className="text-sm font-extrabold">{metrics.paused}</span>
            <span>Paused</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "CANCELLED" ? "ALL" : "CANCELLED")}
            className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === "CANCELLED"
                ? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-md"
                : "bg-rose-950/80 text-rose-400 border border-rose-800/80 hover:bg-rose-900/60"
            }`}
          >
            <span className="text-sm font-extrabold">{metrics.cancelled}</span>
            <span>Cancelled</span>
          </button>

          {statusFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className="text-xs text-slate-400 hover:text-white transition underline cursor-pointer ml-2"
            >
              Clear filter (Showing all {metrics.total})
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 bg-[#1e293b]/60 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-[11px] text-slate-400">Total Live MRR:</span>
            <span className="text-xs font-black text-emerald-400">
              ₹{metrics.totalMrr.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── SEARCH & FILTER BAR ── */}
        <div className="bg-[#111827] p-3.5 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer, plan name, or SUB number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b]/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition font-medium"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline-block">
            {filteredSubscriptions.length} subscriptions listed
          </span>
        </div>

        {/* ── SUBSCRIPTIONS TABLE (Matching Wireframe 9) ── */}
        <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-md overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#1e293b]/60 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <th className="py-4 px-6 min-w-[200px]">Customer</th>
                <th className="py-4 px-6 min-w-[180px]">Plan</th>
                <th className="py-4 px-4 text-center">Cycle</th>
                <th className="py-4 px-6 text-center">Next Bill</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                    <span>Loading recurring subscriptions ledger...</span>
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Package size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="font-bold text-slate-300">No subscriptions found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {statusFilter !== "ALL"
                        ? `No ${statusFilter.toLowerCase()} subscriptions matching your search.`
                        : "Click '+ New Plan (Admin)' below or confirm a quote with subscription items to spawn recurring schedules."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const customerName = sub.customer?.name || sub.customer?.companyName || "Corporate Client";
                  const planName = sub.lines?.[0]?.product?.name || sub.notes || "Standard Plan";
                  const nextBillDate = sub.nextBillingDate
                    ? new Date(sub.nextBillingDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-";

                  const isActive = sub.status === "ACTIVE";
                  const isPaused = sub.status === "PAUSED";
                  const isCancelled = sub.status === "CANCELLED";

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => router.push(`/dashboard/finance/subscriptions/${sub.id}`)}
                      className="hover:bg-[#1e293b]/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                          <span>{customerName}</span>
                          <ChevronRight size={13} className="text-slate-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {sub.subscriptionNumber} &bull; {sub.customer?.email || ""}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-200">{planName}</div>
                        <div className="text-[11px] text-emerald-400 font-mono font-medium">
                          ₹{(sub.currentMrr || 0).toLocaleString()} / mo
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-medium capitalize text-slate-300">
                        {sub.billingInterval.toLowerCase()}
                      </td>

                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-300">
                        {isPaused ? "-" : nextBillDate}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                            isActive
                              ? "bg-emerald-950/90 text-emerald-400 border-emerald-800"
                              : isPaused
                              ? "bg-amber-950/90 text-amber-400 border-amber-800"
                              : "bg-rose-950/90 text-rose-400 border-rose-800"
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
        <div className="p-4 bg-amber-950/50 border border-amber-800/80 rounded-2xl text-xs text-amber-300 flex items-center gap-2.5 shadow-xs">
          <span className="text-base">⚠️</span>
          <span className="font-semibold">
            Click a subscription row to open its billing detail and proration history.
          </span>
        </div>

        {/* ── BOTTOM BUTTON (Matching Wireframe 9) ── */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-extrabold shadow-md hover:border-blue-500 transition-all cursor-pointer group active:scale-95"
          >
            <Plus size={16} className="text-blue-400 group-hover:rotate-90 transition-transform duration-200" />
            <span>+ New Plan (Admin / Finance)</span>
          </button>
        </div>
      </main>

      {/* ── CREATE SUBSCRIPTION PLAN / SCHEDULE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111827] rounded-3xl border border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-auto text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Subscription Plan Schedule</h3>
                  <p className="text-[11px] text-slate-400">
                    Assign a recurring service/SaaS contract with BullMQ automated reminders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalFeedback && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-center justify-between">
                <span>{modalFeedback}</span>
                <button type="button" onClick={() => setModalFeedback(null)} className="text-rose-400 hover:text-rose-200">
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-400" />
                  <span>Customer Account</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  {(apiCustomers || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.name} &ndash; {c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Catalog Plan Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Package size={13} className="text-blue-400" />
                  <span>Catalog Plan / Service Item</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                >
                  {(apiProducts || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category?.name || "Standard"}) &ndash; ₹{p.basePrice.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Custom Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Plan Display Title
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g. Care Plan 2yr (24/7 Enterprise Support)"
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Billing Cycle & Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Recurring Rate (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Quantity & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Seat / License Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Schedule Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Schedule Activation Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* BullMQ Bus Reminder Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#1e293b]/60 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableReminder}
                    onChange={(e) => setEnableReminder(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-400" />
                    <span>Enable BullMQ Automated Renewal Reminder</span>
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
                  Uses BullMQ background worker bus channel to automatically schedule and dispatch a renewal notice 7 days prior to the next billing cycle.
                </p>
              </div>

              {/* Auto Renew */}
              <label className="flex items-center gap-2 cursor-pointer select-none pl-1">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span className="font-medium text-slate-300 text-xs">
                  Auto-Renew plan indefinitely until explicitly cancelled
                </span>
              </label>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Contract Notes / SLA Details
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional agreement notes or SLA terms..."
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
