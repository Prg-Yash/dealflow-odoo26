"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { StatCard, Card } from "@repo/ui";
import { useDashboardAuth } from "../../layout";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user } = useDashboardAuth();
  
  const [customerQuotations, setCustomerQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const metrics = useMemo(() => {
    const totalCount = customerQuotations.length;
    const totalValue = customerQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const activeNegotiations = customerQuotations.filter(
      (q) => q.stage === "NEGOTIATION" || q.stage === "PENDING_APPROVAL" || q.stage === "APPROVED"
    ).length;
    const confirmedCount = customerQuotations.filter((q) => q.stage === "CONFIRMED" || q.stage === "WON" || q.stage === "FULFILLED").length;

    return { totalCount, totalValue, activeNegotiations, confirmedCount };
  }, [customerQuotations]);

  const recentQuotations = useMemo(() => {
    return [...customerQuotations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [customerQuotations]);

  const renderStatusBadge = (stage: string) => {
    switch (stage) {
      case "CONFIRMED":
      case "WON":
      case "FULFILLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
            Confirmed
          </span>
        );
      case "NEGOTIATION":
      case "UNDER_NEGOTIATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
            In Negotiation
          </span>
        );
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider border border-orange-200">
            Internal Review
          </span>
        );
      case "APPROVED":
      case "SENT_TO_CUSTOMER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            Approved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
            {stage || "Draft"}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "Customer"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Here's an overview of your active deals and recent quotations.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-[#ff5e3a] mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Retrieving your data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Failed to load dashboard</h4>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Proposals"
              value={metrics.totalCount.toString()}
              icon={<FileText size={18} className="text-blue-500" />}
            />
            <StatCard
              label="Pipeline Value"
              value={`₹${metrics.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              icon={<TrendingUp size={18} className="text-emerald-500" />}
            />
            <StatCard
              label="In Negotiation"
              value={metrics.activeNegotiations.toString()}
              icon={<AlertTriangle size={18} className="text-amber-500" />}
            />
            <StatCard
              label="Confirmed Deals"
              value={metrics.confirmedCount.toString()}
              icon={<CheckCircle2 size={18} className="text-emerald-500" />}
            />
          </div>

          {/* Recent Quotations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Quotations</h2>
              <Link 
                href="/dashboard/customer/quotations"
                className="text-sm font-semibold text-[#ff5e3a] hover:text-[#ea4e28] flex items-center gap-1 group transition-colors"
              >
                View all proposals
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Quote #</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No quotations found.
                        </td>
                      </tr>
                    ) : (
                      recentQuotations.map((q) => (
                        <tr
                          key={q.id}
                          onClick={() => router.push(`/dashboard/customer/quotations/${q.portalToken || q.quoteNumber}`)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
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
                            <button className="px-3 py-1 rounded-lg bg-orange-50 text-[#ff5e3a] font-semibold text-xs hover:bg-orange-100 transition-colors">
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
