"use client";

import { useState } from "react";
import { Download, FileText, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { useQuotations, useMembers, useProducts } from "../../../../../lib/query";
import { filterByTimePeriod, type TimePeriod } from "../../../../../lib/time-filter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminReportsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("this_quarter");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  const { data: apiQuotations, isLoading } = useQuotations();
  const { data: apiMembers } = useMembers();
  const { data: apiProducts } = useProducts();

  const rawQuotationsList = Array.isArray(apiQuotations) ? apiQuotations : [];
  const membersList = Array.isArray(apiMembers) ? apiMembers : [];
  const productsList = Array.isArray(apiProducts) ? apiProducts : [];

  // 1. Filter by Time Period
  let filteredQuotations = filterByTimePeriod(rawQuotationsList, "createdAt", timePeriod);

  // 2. Filter by Sales Team (Member ID)
  if (teamFilter !== "all") {
    filteredQuotations = filteredQuotations.filter((q) => q.salesRepId === teamFilter);
  }

  // 3. Filter by Approval Status
  if (statusFilter !== "all") {
    filteredQuotations = filteredQuotations.filter((q) => {
      if (statusFilter === "APPROVED") return q.approvalStatus === "APPROVED";
      if (statusFilter === "PENDING") return q.approvalStatus === "PENDING" || q.stage === "PENDING_APPROVAL";
      if (statusFilter === "REJECTED") return q.approvalStatus === "REJECTED";
      return true;
    });
  }

  // 4. Filter by Product
  if (productFilter !== "all") {
    filteredQuotations = filteredQuotations.filter((q) =>
      q.lines?.some((line: any) => line.productId === productFilter)
    );
  }

  const exportCSV = () => {
    const headers = ["Quote ID", "Date", "Sales Rep ID", "Value", "Discount %", "Status"];
    const rows = filteredQuotations.map((q) => [
      q.quoteNumber || q.id,
      new Date(q.createdAt).toLocaleDateString(),
      q.salesRepId || "N/A",
      q.grandTotal?.toString() || "0",
      q.discountTotal ? ((q.discountTotal / (q.subtotal || 1)) * 100).toFixed(1) : "0",
      q.stage || q.approvalStatus,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dealflow-report-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  // KPIs
  const quotesCreated = filteredQuotations.length;
  const totalValue = filteredQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  const totalDiscount = filteredQuotations.reduce((sum, q) => sum + (q.discountTotal || 0), 0);
  const avgDiscount = totalValue > 0 ? ((totalDiscount / (totalValue + totalDiscount)) * 100).toFixed(1) : "0.0";
  const pendingApprovals = filteredQuotations.filter(
    (q) => q.approvalStatus === "PENDING" || q.stage === "PENDING_APPROVAL"
  ).length;

  // --- Graph Data Calculations ---
  // 1. Quotations by Stage
  const stageCounts = filteredQuotations.reduce((acc, q) => {
    const stage = q.stage || "UNKNOWN";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stageData = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const COLORS: Record<string, string> = {
    APPROVED: "#10b981", // emerald-500
    DRAFT: "#94a3b8", // slate-400
    REJECTED: "#ef4444", // red-500
    PENDING: "#f59e0b", // amber-500
    PENDING_APPROVAL: "#f59e0b",
  };

  // 2. Revenue by Sales Rep
  const repRevenue = filteredQuotations.reduce((acc, q) => {
    if (!q.salesRepId) return acc;
    acc[q.salesRepId] = (acc[q.salesRepId] || 0) + (q.grandTotal || 0);
    return acc;
  }, {} as Record<string, number>);

  const topRepsData = Object.entries(repRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, val]) => {
      const member = membersList.find((m: any) => m.id === id);
      const name = member?.name || member?.user?.name || member?.email || id;
      return { name: name.split(" ")[0], fullName: name, value: val };
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Admin Reporting Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cross-team insights and exportable data
          </p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={exportPDF} className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer">
            <FileText size={14} />
            Export PDF
          </button>
          <button onClick={exportCSV} className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Period</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer appearance-none truncate"
            style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 top 50%', backgroundSize: '0.65rem auto', paddingRight: '1.25rem' }}
          >
            <option value="7_days">Last 7 Days</option>
            <option value="30_days">Last 30 Days</option>
            <option value="this_quarter">This Quarter</option>
            <option value="ytd">Year to Date</option>
            <option value="all_time">All Time</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sales Team</label>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer appearance-none truncate"
            style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 top 50%', backgroundSize: '0.65rem auto', paddingRight: '1.25rem' }}
          >
            <option value="all">All Teams</option>
            {membersList.filter((m: any) => m.role === "SALES_REP" || m.role === "SALES_MANAGER").map((member: any) => (
              <option key={member.id} value={member.id}>{member.name || member.user?.name || member.email || member.id}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Approval Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer appearance-none truncate"
            style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 top 50%', backgroundSize: '0.65rem auto', paddingRight: '1.25rem' }}
          >
            <option value="all">Any Status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Product</label>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer appearance-none truncate"
            style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 top 50%', backgroundSize: '0.65rem auto', paddingRight: '1.25rem' }}
          >
            <option value="all">All Products</option>
            {productsList.map((product: any) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quotes Created</h3>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? "-" : quotesCreated}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">In selected period</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Value</h3>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? "-" : `₹${totalValue.toLocaleString()}`}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Total deal value</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Discount</h3>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? "-" : `${avgDiscount}%`}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Across all quotes</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</h3>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? "-" : pendingApprovals}</div>
            <div className="text-xs font-semibold text-amber-600 mt-1">Require attention</div>
          </div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
        {/* Graph 1: Deal Pipeline Stages (Pie Chart) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 h-[350px] flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Deal Pipeline Stages</h2>
          <div className="flex-1 w-full relative">
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} quotes`, 'Count']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">No data for selected period</div>
            )}
          </div>
        </div>

        {/* Graph 2: Top Revenue by Rep (Bar Chart) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 h-[350px] flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Top Performers (Revenue)</h2>
          <div className="flex-1 w-full relative">
            {topRepsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRepsData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">No data for selected period</div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recent Quotations ({filteredQuotations.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">Quote ID</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Value</th>
                <th className="px-6 py-3 font-semibold">Discount</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.slice(0, 10).map((q: any) => (
                <tr key={q.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{q.quoteNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">₹{q.grandTotal?.toLocaleString() || "0"}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {q.discountTotal ? ((q.discountTotal / (q.subtotal || 1)) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      q.stage === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      q.stage === "DRAFT" ? "bg-slate-100 text-slate-700 border border-slate-200" :
                      "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {q.stage}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No quotations found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
