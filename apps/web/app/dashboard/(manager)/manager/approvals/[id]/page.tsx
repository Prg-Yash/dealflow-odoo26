"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileQuestion, RefreshCw } from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { useQuotation, useProducts } from "../../../../../../lib/query";
import { useDashboardAuth } from "../../../../layout";
import { QuotationDetailView } from "../../../../components/QuotationDetailView";

export default function ManagerApprovalDetailPage() {
  const routeParams = useParams();
  const quoteId = (routeParams?.id as string) || "";

  const { user } = useDashboardAuth();
  const { data: quotation, isLoading, isError, refetch } = useQuotation(quoteId, {
    enabled: Boolean(quoteId),
  });
  const { data: products } = useProducts();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#ff5e3a]" />
        <span className="text-xs text-slate-500 font-medium">Loading approval details...</span>
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <FileQuestion size={28} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Quotation Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          The requested quotation could not be located in this organization or is not pending sales manager approval.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>
          <Link
            href="/dashboard/manager"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f172a] text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition"
          >
            <ArrowLeft size={13} />
            <span>Back to Approvals</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/manager" subtitle="Sales Director Hub" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/manager"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3.5 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Approvals</span>
            </Link>

            <Link href="/profile" className="flex items-center gap-2.5 pl-2.5 sm:border-l sm:border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#ff5e3a] text-white text-xs font-extrabold flex items-center justify-center shadow-sm">
                EV
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  {user?.name || "Elena Vance"}
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                  Sales Director
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuotationDetailView
          quotation={quotation}
          currentUser={user}
          userRole="SALES_MANAGER"
          catalogProducts={products || []}
          onRefresh={refetch}
          backHref="/dashboard/manager"
        />
      </main>
    </div>
  );
}
