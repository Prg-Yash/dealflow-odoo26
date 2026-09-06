"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileQuestion, RefreshCw } from "lucide-react";
import { useQuotation, useProducts } from "../../../../../../lib/query";
import { useDashboardAuth } from "../../../../layout";
import { QuotationDetailView } from "../../../../components/QuotationDetailView";

export default function QuotationDetailPage() {
  const routeParams = useParams();
  const quoteId = (routeParams?.id as string) || "";
  const { user, signOut } = useDashboardAuth();
  const { data: quotation, isLoading, error, refetch } = useQuotation(quoteId);
  const { data: products } = useProducts();

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SR";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-[#ff5e3a]" />
        <span className="text-xs text-slate-500 font-semibold">Loading proposal details...</span>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <FileQuestion size={28} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Quotation Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          The requested quotation could not be found or you do not have permission to view it.
        </p>
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
          <Link
            href="/dashboard/admin/quotations"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] text-white text-xs font-bold shadow-xs hover:bg-[#ea4e28] transition cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Quotations</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">

      <div>
        <QuotationDetailView
          quotation={quotation}
          currentUser={user}
          userRole={user?.role || "SALES_REP"}
          catalogProducts={products || []}
          onRefresh={refetch}
          backHref="/dashboard/admin/quotations"
        />
      </div>
    </div>
  );
}
