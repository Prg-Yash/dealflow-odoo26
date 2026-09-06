"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Box,
  Truck,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ArrowLeft,
  ChevronRight,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { useDashboardAuth } from "../../../layout";
import {
  useFulfillmentOrders,
  useQuotations,
} from "../../../../../lib/query";

export default function FulfillmentListPage() {
  const router = useRouter();
  const { user } = useDashboardAuth();

  // Role Gate: Private to Finance Ops & Admin
  const isAuthorized = !user || user.role === "FINANCE_OPS" || user.role === "ADMIN";

  // Data fetching
  const { data: apiFulfillment, isLoading: isLoadingFulfillment } = useFulfillmentOrders();
  const { data: allQuotes, isLoading: isLoadingQuotes } = useQuotations();

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SPLIT_PENDING" | "PARTIALLY_SHIPPED" | "SHIPPED" | "BACKORDER">("ALL");

  // Dynamic list merging fulfillment orders + any confirmed quotations needing auto-split
  const ordersList = useMemo(() => {
    const list: Array<{
      id: string;
      orderNumber: string;
      customerName: string;
      status: string;
      rawStatus: string;
      warehouses: string;
      shipmentCount: number;
      backordersCount: number;
      isQuotationDirect?: boolean;
      itemsCount: number;
    }> = [];

    if (apiFulfillment && apiFulfillment.length > 0) {
      for (const fo of apiFulfillment) {
        const uniqueWarehouses = Array.from(
          new Set(fo.shipments?.map((s) => s.warehouse?.name).filter(Boolean))
        );
        const whText =
          uniqueWarehouses.length > 1
            ? `${uniqueWarehouses[0]} + ${uniqueWarehouses.length - 1} more`
            : uniqueWarehouses[0] || "Pending Assignment";

        const hasBackorders = fo.backorders && fo.backorders.length > 0;
        const allShipped = fo.shipments && fo.shipments.length > 0 && fo.shipments.every((s) => s.status === "SHIPPED" || s.status === "DELIVERED");

        let displayStatus = "Split Pending";
        if (fo.status === "FULFILLED" || allShipped) {
          displayStatus = "Shipped";
        } else if (fo.status === "PARTIALLY_FULFILLED" || (fo.shipments && fo.shipments.length > 0)) {
          displayStatus = "Partially Shipped";
        } else if (hasBackorders) {
          displayStatus = "Backorder";
        }

        list.push({
          id: fo.id,
          orderNumber: fo.quotation?.quoteNumber || fo.fulfillmentNumber || `FO-${fo.id.slice(-4)}`,
          customerName: fo.quotation?.customer?.name || "Corporate Customer",
          status: displayStatus,
          rawStatus: fo.status,
          warehouses: whText,
          shipmentCount: fo.shipments?.length || 0,
          backordersCount: fo.backorders?.length || 0,
          itemsCount: fo.lines?.length || 0,
        });
      }
    }

    // Add confirmed quotes with hardware that don't have fulfillment orders yet
    if (allQuotes && allQuotes.length > 0) {
      const confirmedWithoutFO = allQuotes.filter(
        (q) =>
          (q.stage === "CONFIRMED" || q.stage === "APPROVED") &&
          q.lines?.some((l) => l.itemType === "HARDWARE") &&
          !apiFulfillment?.some((fo) => fo.quotationId === q.id)
      );

      for (const q of confirmedWithoutFO) {
        list.push({
          id: q.id,
          orderNumber: q.quoteNumber || `QT-${q.id.slice(-4)}`,
          customerName: q.customer?.name || "Corporate Customer",
          status: "Split Pending",
          rawStatus: "PENDING_SPLIT",
          warehouses: "Auto-Split Available",
          shipmentCount: 0,
          backordersCount: 0,
          isQuotationDirect: true,
          itemsCount: q.lines?.filter((l) => l.itemType === "HARDWARE").length || 1,
        });
      }
    }

    return list;
  }, [apiFulfillment, allQuotes]);

  // Filtered
  const filteredOrders = useMemo(() => {
    let list = ordersList;

    if (statusFilter !== "ALL") {
      if (statusFilter === "SPLIT_PENDING") list = list.filter((o) => o.status === "Split Pending");
      else if (statusFilter === "PARTIALLY_SHIPPED") list = list.filter((o) => o.status === "Partially Shipped");
      else if (statusFilter === "SHIPPED") list = list.filter((o) => o.status === "Shipped");
      else if (statusFilter === "BACKORDER") list = list.filter((o) => o.status === "Backorder");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.warehouses.toLowerCase().includes(q)
      );
    }

    return list;
  }, [ordersList, statusFilter, searchQuery]);

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
          Warehouse fulfillment routing and shipment dispatch are restricted strictly to Finance Operations.
        </p>
        <Link
          href="/dashboard/finance"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
        >
          <ArrowLeft size={14} />
          <span>Return to Finance Overview</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans antialiased">
      {/* ── DEALFLOW 360 NAV BAR ── */}
      <header className="sticky top-0 z-40 bg-[#111827]/90 backdrop-blur-xl border-b border-slate-800 shadow-md">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="DealFlow 360" />

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
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold shadow-xs transition"
              >
                Fulfillment
              </Link>
              <Link
                href="/dashboard/finance/subscriptions"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Subscriptions
              </Link>
              <Link
                href="/dashboard/finance/invoices"
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                Invoices
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/finance"
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 font-semibold"
            >
              <ArrowLeft size={13} />
              <span>Back to Finance</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
        {/* Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Multi-Warehouse Waterfall Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Fulfillment &amp; Shipment Dispatch
            </h1>
            <p className="text-xs text-slate-400">
              Auto-split orders across warehouses, execute manual line overrides, consolidate backorders, and trigger fulfillment invoices.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Search order number, client, or warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1e293b] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              All ({ordersList.length})
            </button>
            <button
              onClick={() => setStatusFilter("SPLIT_PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "SPLIT_PENDING"
                  ? "bg-amber-600 text-white"
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              Split Pending
            </button>
            <button
              onClick={() => setStatusFilter("SHIPPED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "SHIPPED"
                  ? "bg-emerald-600 text-white"
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              Shipped
            </button>
            <button
              onClick={() => setStatusFilter("BACKORDER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "BACKORDER"
                  ? "bg-purple-600 text-white"
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              Backorders
            </button>
          </div>
        </div>

        {/* Fulfillment Orders Table */}
        <div className="bg-[#111827] rounded-3xl border border-slate-800 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package size={16} className="text-blue-400" />
              <span>Orders Awaiting Fulfillment</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredOrders.length} orders
            </span>
          </div>

          {isLoadingFulfillment ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <span className="animate-spin text-blue-500">⏳</span>
              <span>Loading fulfillment records...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No fulfillment orders found matching current criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#1e293b]/60 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <th className="py-3.5 px-6">Order #</th>
                    <th className="py-3.5 px-6">Customer / Account</th>
                    <th className="py-3.5 px-4 text-center">Assigned Warehouses</th>
                    <th className="py-3.5 px-4 text-center">Shipments / Backorders</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredOrders.map((order) => {
                    const isShipped = order.status === "Shipped";
                    const isBackorder = order.status === "Backorder";

                    return (
                      <tr key={order.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-4 px-6 font-bold text-white font-mono">
                          <Link
                            href={`/dashboard/finance/fulfillment/${order.id}`}
                            className="hover:text-blue-400 transition"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-white">
                            {order.customerName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {order.itemsCount} hardware item{order.itemsCount > 1 ? "s" : ""}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <WarehouseIcon size={12} className="text-slate-400" />
                            <span>{order.warehouses}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-300">
                          {order.shipmentCount} Shipment{order.shipmentCount !== 1 ? "s" : ""} &bull; {order.backordersCount} Backorder{order.backordersCount !== 1 ? "s" : ""}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                              isShipped
                                ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                                : isBackorder
                                ? "bg-purple-950/80 text-purple-400 border-purple-800"
                                : "bg-amber-950/80 text-amber-400 border-amber-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/dashboard/finance/fulfillment/${order.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                          >
                            <span>Manage Split &rarr;</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
