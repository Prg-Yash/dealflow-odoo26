"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { useDashboardAuth } from "../../../layout";

export default function CustomerQuotationsPage() {
  const router = useRouter();
  const { user } = useDashboardAuth();
  
  const [customerQuotations, setCustomerQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayLayout, setDisplayLayout] = useState<"grid" | "table">("table");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [timePeriodFilter, setTimePeriodFilter] = useState<string>("ALL");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const fetchCustomerQuotations = useCallback(
    async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/portal/me`, {
          headers: {
            "Content-Type": "application/json",
            "x-portal-token": "me",
          },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load quotations");
        }

        const json = await res.json();
        const data = json.data || json;
        if (data.customerQuotations && Array.isArray(data.customerQuotations)) {
          setCustomerQuotations(data.customerQuotations);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load quotations");
      } finally {
        setLoading(false);
      }
    },
    [API_BASE]
  );

  useEffect(() => {
    fetchCustomerQuotations();
  }, [fetchCustomerQuotations]);

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

  const renderStatusBadge = (stage: string) => {
    switch (stage) {
      case "CONFIRMED":
      case "WON":
      case "FULFILLED":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Status: Confirmed</span>
          </div>
        );
      case "NEGOTIATION":
      case "UNDER_NEGOTIATION":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Status: Negotiation</span>
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
            <span>Status: Approved</span>
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

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Quotations</h1>
          <p className="text-sm text-slate-500">View and negotiate all your active and past deals.</p>
        </div>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setDisplayLayout("grid")}
            className={`p-1.5 rounded-lg transition ${
              displayLayout === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
            title="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setDisplayLayout("table")}
            className={`p-1.5 rounded-lg transition ${
              displayLayout === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
            title="Table View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
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

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-[#ff5e3a] mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Retrieving quotations...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Error Loading Quotations</h3>
          <p className="text-xs text-slate-600">{error}</p>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">No quotations found matching your criteria.</p>
        </div>
      ) : displayLayout === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotations.map((q) => (
            <div
              key={q.id}
              onClick={() => router.push(`/dashboard/customer/quotations/${q.portalToken || q.quoteNumber}`)}
              className="bg-white border border-slate-200 hover:border-[#ff5e3a] p-5 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer space-y-4 flex flex-col justify-between"
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
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
                    onClick={() => router.push(`/dashboard/customer/quotations/${q.portalToken || q.quoteNumber}`)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-4 px-4 font-bold text-slate-900">{q.quoteNumber}</td>
                    <td className="py-4 px-4 text-slate-700">{q.title}</td>
                    <td className="py-4 px-4">{renderStatusBadge(q.stage)}</td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-[#ff5e3a]">
                      ₹{Number(q.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button className="px-3 py-1.5 rounded-lg bg-orange-50 text-[#ff5e3a] font-semibold text-xs hover:bg-orange-100">
                        Open
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
  );
}
