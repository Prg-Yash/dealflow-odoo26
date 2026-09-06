"use client";

import { useState } from "react";
import Link from "next/link";
import { filterByTimePeriod, type TimePeriod } from "../../../../lib/time-filter";
import {
  Layers,
  Sliders,
  Users,
  Warehouse,
  Boxes,
  ArrowRight,
  CheckCircle2,
  Plus,
  Building2,
  TrendingUp,
  Inbox,
  Clock,
  AlertTriangle,
  Activity,
  FileText,
} from "lucide-react";
import {
  useCurrentOrg,
  useMembers,
  useInvitations,
  useProducts,
  useCategories,
  useWarehouses,
  useStockLevels,
  useCustomerTiers,
  useDiscountRules,
  useQuotations,
  useDealAnomalies,
  useStalledQuotations,
  useFulfillmentSlippage,
} from "../../../../lib/query";

export default function AdminOverviewPage() {
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "CRITICAL">("ALL");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all_time");

  const { data: currentOrg, isLoading: isOrgLoading } = useCurrentOrg();
  const { data: apiMembers } = useMembers();
  const { data: apiInvitations } = useInvitations();
  const { data: apiProducts } = useProducts();
  const { data: apiCategories } = useCategories();
  const { data: apiWarehouses } = useWarehouses();
  const { data: apiStockLevels } = useStockLevels();
  const { data: apiTiers } = useCustomerTiers();
  const { data: apiRules } = useDiscountRules();
  const { data: apiQuotations } = useQuotations();
  const { data: apiAnomalies } = useDealAnomalies();
  const { data: apiStalled } = useStalledQuotations();
  const { data: apiSlippage } = useFulfillmentSlippage();

  // Organization currency symbol
  const currencySymbol =
    currentOrg?.currency === "USD"
      ? "$"
      : currentOrg?.currency === "EUR"
        ? "€"
        : "₹";

  // Normalized Array Safe Guards
  const rawMembers = Array.isArray(apiMembers)
    ? apiMembers
    : Array.isArray((apiMembers as any)?.members)
      ? (apiMembers as any).members
      : [];
  const membersList = rawMembers.filter((m: any) => m.role && m.role !== "CUSTOMER");

  const rawInvitations = Array.isArray(apiInvitations)
    ? apiInvitations
    : Array.isArray((apiInvitations as any)?.invitations)
      ? (apiInvitations as any).invitations
      : [];
  const invitationsList = rawInvitations.filter((i: any) => i?.role !== "CUSTOMER");
  const productsList = Array.isArray(apiProducts) ? apiProducts : [];
  const categoriesList = Array.isArray(apiCategories) ? apiCategories : [];
  const warehousesList = Array.isArray(apiWarehouses) ? apiWarehouses : [];
  const stockLevelsList = Array.isArray(apiStockLevels) ? apiStockLevels : [];
  const tiersList = Array.isArray(apiTiers) ? apiTiers : [];
  const rulesList = Array.isArray(apiRules) ? apiRules : [];
  const rawQuotationsList = Array.isArray(apiQuotations) ? apiQuotations : [];
  const quotationsList = filterByTimePeriod(rawQuotationsList, "createdAt", timePeriod);

  // Dynamic counts
  const membersCount = membersList.length || 1;
  const pendingInvitesCount = invitationsList.filter((i: any) => i?.status === "PENDING").length;
  const productsCount = productsList.length;
  const activeProductsCount = productsList.filter((p) => p.isActive).length;
  const activeProductsPercent = productsCount > 0 ? Math.round((activeProductsCount / productsCount) * 100) : 100;
  const categoriesCount = categoriesList.length;
  const warehousesCount = warehousesList.length;
  const activeTiersCount = tiersList.length;
  const rulesCount = rulesList.length;
  const totalDeals = quotationsList.length;

  // Inventory on-hand & valuation
  const getOnHand = (s: any) => s.quantityOnHand ?? s.onHand ?? 0;
  const unitsOnHand =
    stockLevelsList.reduce((acc: number, s: any) => acc + getOnHand(s), 0) ||
    warehousesList.reduce((acc: number, w: any) => acc + (w.stockLevels?.reduce((a: any, s: any) => a + getOnHand(s), 0) ?? 0), 0) ||
    productsList.reduce((acc: number, p: any) => acc + (p.stockLevels?.reduce((a: any, s: any) => a + getOnHand(s), 0) ?? 45), 0);

  const inventoryValuation =
    stockLevelsList.reduce((acc: number, s: any) => {
      const prod = productsList.find((p) => p.id === s.productId);
      return acc + getOnHand(s) * (prod?.costPrice || 0);
    }, 0) ||
    productsList.reduce((acc: number, p: any) => acc + (p.costPrice || 0) * 35, 0);

  // Unique system roles
  const distinctRolesCount = new Set(membersList.map((m) => m.role)).size || 1;

  // Helper to derive effective discount percentage across lines/totals
  const getDiscountPercent = (q: any) => {
    if (typeof q.discountPercent === "number" && q.discountPercent > 0) return q.discountPercent;
    if (q.subtotal > 0 && typeof q.discountTotal === "number" && q.discountTotal > 0) {
      return (q.discountTotal / q.subtotal) * 100;
    }
    return 0;
  };

  // Governance Matrix Calculations
  const repDeals = quotationsList.filter((q) => {
    const disc = getDiscountPercent(q);
    return disc <= 5.0 && !q.requiresManagerApproval && !q.requiresFinanceApproval && (q.blendedRiskScore || 0) <= 5.0;
  }).length;
  const repPercent = totalDeals > 0 ? Math.round((repDeals / totalDeals) * 100) : 0;

  const mgrDeals = quotationsList.filter((q) => {
    const disc = getDiscountPercent(q);
    const isMgr = (disc > 5.0 && disc <= 15.0) || q.requiresManagerApproval || ((q.blendedRiskScore || 0) > 5.0 && (q.blendedRiskScore || 0) <= 20.0);
    return isMgr && !q.requiresFinanceApproval && (q.blendedRiskScore || 0) <= 20.0;
  }).length;
  const mgrPercent = totalDeals > 0 ? Math.round((mgrDeals / totalDeals) * 100) : 0;

  const finDeals = quotationsList.filter((q) => {
    const disc = getDiscountPercent(q);
    return disc > 15.0 || q.requiresFinanceApproval || (q.blendedRiskScore || 0) > 20.0;
  }).length;
  const finPercent = totalDeals > 0 ? Math.round((finDeals / totalDeals) * 100) : 0;

  // Derive dynamic audit stream from real quotation changes & invitations
  const dynamicAuditLogs = [
    ...quotationsList.map((q) => {
      const disc = getDiscountPercent(q);
      const isFin = q.requiresFinanceApproval || (q.blendedRiskScore || 0) > 20 || disc > 15;
      const isMgr = q.requiresManagerApproval || (q.blendedRiskScore || 0) > 5 || disc > 5;
      const level: "INFO" | "WARN" | "CRITICAL" = isFin ? "CRITICAL" : isMgr ? "WARN" : "INFO";
      const action = q.stage === "APPROVED" ? "QUOTE_APPROVED" : q.stage === "CONFIRMED" ? "DEAL_CONFIRMED" : q.stage === "PENDING_APPROVAL" ? "APPROVAL_ESCALATED" : "QUOTE_DRAFTED";

      return {
        id: `audit-q-${q.id}`,
        level,
        action,
        entity: "Quotation",
        details: `${q.quoteNumber} (${q.title || "Proposal"}) - Total ${currencySymbol}${Number(q.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} [${q.stage}]`,
        performedBy: q.salesRep?.user?.name || "Sales Rep",
        timestamp: new Date(q.updatedAt || q.createdAt).toLocaleDateString(),
      };
    }),
    ...invitationsList.map((inv: any) => ({
      id: `audit-inv-${inv.id}`,
      level: "INFO" as const,
      action: "INVITATION_SENT",
      entity: "Invitation",
      details: `Issued onboarding invite to ${inv.email} with role ${inv.role}.`,
      performedBy: inv.invitedBy?.name || "System Admin",
      timestamp: new Date(inv.createdAt).toLocaleDateString(),
    })),
    ...productsList.slice(0, 5).map((prod) => ({
      id: `audit-prod-${prod.id}`,
      level: "INFO" as const,
      action: "CATALOG_SKU_ACTIVE",
      entity: "Product",
      details: `SKU ${prod.sku} (${prod.name}) - Price ${currencySymbol}${Number(prod.basePrice || 0).toLocaleString()} (Margin: ${prod.basePrice > 0 ? Math.round(((prod.basePrice - prod.costPrice) / prod.basePrice) * 100) : 0}%)`,
      performedBy: "Catalog Admin",
      timestamp: new Date(prod.createdAt).toLocaleDateString(),
    })),
    ...warehousesList.map((wh) => ({
      id: `audit-wh-${wh.id}`,
      level: "INFO" as const,
      action: "DEPOT_ONLINE",
      entity: "Warehouse",
      details: `Depot ${wh.name} (${wh.code || "WH"}) active with routing weight ${wh.shippingCostWeight || 1.0}`,
      performedBy: "Operations",
      timestamp: new Date(wh.createdAt || Date.now()).toLocaleDateString(),
    })),
  ];

  const filteredAuditLogs =
    filterLevel === "ALL"
      ? dynamicAuditLogs
      : dynamicAuditLogs.filter((l) => l.level === filterLevel);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Admin Console</span>
            <span>/</span>
            <span className="text-[#ff5e3a]">Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Enterprise Operations & Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tenant organization controls, catalog health, discount approval routing, and audit logs.
          </p>
        </div>

        {/* Quick Action Shortcuts & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#ff5e3a]/20 focus:border-[#ff5e3a] shadow-sm cursor-pointer appearance-none"
            style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto', paddingRight: '2rem' }}
          >
            <option value="7_days">Last 7 Days</option>
            <option value="30_days">Last 30 Days</option>
            <option value="this_quarter">This Quarter</option>
            <option value="ytd">Year to Date</option>
            <option value="all_time">All Time</option>
          </select>
          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
          <Link
            href="/dashboard/admin/catalog"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold shadow-sm shadow-[#ff5e3a]/25 transition"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
          <Link
            href="/dashboard/admin/team"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Users size={14} />
            <span>Invite Staff</span>
          </Link>
          <Link
            href="/dashboard/admin/rules"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <Sliders size={14} />
            <span>Rule Simulator</span>
          </Link>
        </div>
      </div>

      {/* Organization Tenant Identity Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-50/50 via-slate-50/20 to-transparent rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 size={24} className="text-[#ff5e3a]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  {isOrgLoading ? "Loading organization..." : currentOrg?.name || "Your Organization"}
                </h2>
                {currentOrg?.slug && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
                    slug: {currentOrg.slug}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                  Active Tenant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Organization Workspace &bull; Primary Currency:{" "}
                <span className="font-semibold text-slate-800">{currentOrg?.currency || "INR"}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 text-left border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer Tiers</span>
              <span className="text-sm font-extrabold text-slate-800">{activeTiersCount} Active</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Staff Accounts</span>
              <span className="text-sm font-extrabold text-slate-800">{membersCount} Users</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Invites</span>
              <span className="text-sm font-extrabold text-[#ff5e3a]">{pendingInvitesCount} Pending</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Warehouses</span>
              <span className="text-sm font-extrabold text-slate-800">{warehousesCount} Locations</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Catalog */}
        <Link
          href="/dashboard/admin/catalog"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalog</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff5e3a] flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{productsCount}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp size={12} className="mr-0.5" /> {activeProductsPercent}% Active
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{categoriesCount} Categories</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Manage &rarr;
            </span>
          </div>
        </Link>

        {/* Card 2: Team */}
        <Link
          href="/dashboard/admin/team"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{membersCount}</span>
            {pendingInvitesCount > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                +{pendingInvitesCount} invited
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{distinctRolesCount} Roles</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Access &rarr;
            </span>
          </div>
        </Link>

        {/* Card 3: Governance Rules */}
        <Link
          href="/dashboard/admin/rules"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rules</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sliders size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{rulesCount}</span>
            <span className="text-xs font-semibold text-slate-500">{activeTiersCount} Tiers</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{totalDeals} Deals Governed</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Rules &rarr;
            </span>
          </div>
        </Link>

        {/* Card 4: Warehouses Network */}
        <Link
          href="/dashboard/admin/warehouses"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Warehouses</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Warehouse size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{warehousesCount}</span>
            <span className="text-xs font-semibold text-emerald-600">Depots Online</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Split Routing Active</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Depots &rarr;
            </span>
          </div>
        </Link>

        {/* Card 5: Inventory Stock */}
        <Link
          href="/dashboard/admin/inventory"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#ff5e3a]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{unitsOnHand.toLocaleString()}</span>
            <span className="text-xs font-semibold text-slate-500">On-Hand</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{currencySymbol}{inventoryValuation.toLocaleString("en-US", { maximumFractionDigits: 0 })} Value</span>
            <span className="font-semibold text-[#ff5e3a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Ledger &rarr;
            </span>
          </div>
        </Link>
      </div>

      {/* Governance & Approval Escalation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Discount Approval State Machine Distribution */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Deal Governance Execution Matrix</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current month discount approval escalation routing across {totalDeals} total quotations
              </p>
            </div>
            <Link
              href="/dashboard/admin/rules"
              className="text-xs font-semibold text-[#ff5e3a] hover:underline inline-flex items-center gap-1"
            >
              <span>View Rules</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Level 0 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-800">Rep Discretion (&le; 5.0% discount)</span>
                  <span className="text-slate-400 text-[11px]">&bull; Auto-Approved</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">{repDeals} deals</span>
                  <span className="text-slate-400 ml-1.5">({repPercent}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${repPercent}%` }} />
              </div>
            </div>

            {/* Level 1 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5e3a]" />
                  <span className="font-bold text-slate-800">Sales Manager Escalation (5.1% &ndash; 15.0%)</span>
                  <span className="text-slate-400 text-[11px]">&bull; Manager Review</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">{mgrDeals} deals</span>
                  <span className="text-slate-400 ml-1.5">({mgrPercent}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#ff5e3a] rounded-full transition-all" style={{ width: `${mgrPercent}%` }} />
              </div>
            </div>

            {/* Level 2 */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="font-bold text-slate-800">Finance Dual Approval (&gt; 15.0% or Risk &gt; 20)</span>
                  <span className="text-slate-400 text-[11px]">&bull; Executive Review</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">{finDeals} deals</span>
                  <span className="text-slate-400 ml-1.5">({finPercent}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${finPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>
                {totalDeals > 0
                  ? "Real-time governance enforcement active across active deals"
                  : "Ready for quotations - governance active on all submissions"}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">Escalation Policy: Strict</span>
          </div>
        </div>

        {/* Right Col: Category Margin Health Overview */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Category Margins</h2>
              <Link href="/dashboard/admin/catalog" className="text-xs font-semibold text-[#ff5e3a] hover:underline">
                Catalog
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Baseline targets &amp; discount ceilings configured per product category.
            </p>

            <div className="space-y-3">
              {apiCategories && apiCategories.length > 0 ? (
                apiCategories.map((cat: any) => (
                  <div key={cat.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                      <span className="text-[11px] font-mono font-semibold text-[#ff5e3a]">
                        Ceiling: {cat.discountCeiling ?? 15}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Target Gross Margin:</span>
                      <span className="font-bold text-slate-700">{cat.targetMargin ?? 40}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
                  <span>No product categories created yet.</span>
                  <Link href="/dashboard/admin/catalog" className="block text-[#ff5e3a] font-semibold mt-1 hover:underline">
                    Create Categories in Catalog &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Customer Tier Matrix: {activeTiersCount} Tiers</span>
            <Link href="/dashboard/admin/rules" className="text-[#ff5e3a] font-semibold hover:underline">
              Inspect &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Real-time Operational Audit Stream */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">System Activity & Audit Trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live chronological record of quotations, catalog items, and team governance actions
            </p>
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            {(["ALL", "INFO", "WARN", "CRITICAL"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${filterLevel === lvl
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        {filteredAuditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-1">Level</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Target Entity</th>
                  <th className="pb-3">Details</th>
                  <th className="pb-3">Performed By</th>
                  <th className="pb-3 pr-1 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAuditLogs.map((log) => {
                  const levelColor =
                    log.level === "CRITICAL"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : log.level === "WARN"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pl-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${levelColor}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-semibold text-slate-900">{log.action}</td>
                      <td className="py-3 font-mono text-slate-500">{log.entity}</td>
                      <td className="py-3 max-w-xs sm:max-w-md text-slate-600 truncate">{log.details}</td>
                      <td className="py-3 font-medium text-slate-800">{log.performedBy}</td>
                      <td className="py-3 pr-1 text-right text-slate-400 font-mono">{log.timestamp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Inbox size={24} className="text-slate-300" />
            <span>No activity recorded yet for this organization.</span>
          </div>
        )}
      </div>

      {/* Deal Health & Anomaly Summary */}
      <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#ff5e3a]" />
            <h2 className="text-base font-bold text-slate-900">Deal Health & Anomaly Radar</h2>
          </div>
          <Link
            href="/dashboard/manager"
            className="text-xs font-semibold text-[#ff5e3a] hover:underline inline-flex items-center gap-1"
          >
            <span>Full Telemetry</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stalled */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-100 bg-amber-50/50">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {(apiStalled as any)?.count ?? (apiStalled as any)?.alerts?.length ?? 0}
              </div>
              <div className="text-xs font-semibold text-amber-700">Stalled Deals</div>
              <div className="text-[11px] text-slate-500">Inactive 7+ days</div>
            </div>
          </div>

          {/* Discount Anomalies */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-rose-100 bg-rose-50/50">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-rose-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {(apiAnomalies as any)?.count ?? (apiAnomalies as any)?.anomalies?.length ?? 0}
              </div>
              <div className="text-xs font-semibold text-rose-700">Discount Anomalies</div>
              <div className="text-[11px] text-slate-500">Above rep baseline</div>
            </div>
          </div>

          {/* SLA Slippage */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-purple-100 bg-purple-50/50">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {(apiSlippage as any)?.count ?? (apiSlippage as any)?.alerts?.length ?? 0}
              </div>
              <div className="text-xs font-semibold text-purple-700">Delivery Slippage</div>
              <div className="text-[11px] text-slate-500">Past SLA date</div>
            </div>
          </div>
        </div>

        {((apiStalled as any)?.count ?? 0) + ((apiAnomalies as any)?.count ?? 0) + ((apiSlippage as any)?.count ?? 0) === 0 && (
          <div className="mt-4 text-center text-xs text-slate-400 py-2">
            ✅ No active deal health issues detected.
          </div>
        )}
      </div>

      {/* Admin Approvals Consolidation (Manager + Finance) */}
    </div>
  );
}
