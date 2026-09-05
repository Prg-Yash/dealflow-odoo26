"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileQuestion, RefreshCw } from "lucide-react";
import { SalesNav } from "@repo/ui";
import { useQuotation, useProducts } from "../../../../../../lib/query";
import { useDashboardAuth } from "../../../../layout";
import { QuotationDetailView } from "../../../../components/QuotationDetailView";

export default function QuotationDetailPage() {
  const routeParams = useParams();
  const quoteId = (routeParams?.id as string) || "";

  const { user } = useDashboardAuth();
  const { data: quotation, isLoading, isError, refetch } = useQuotation(quoteId, {
    enabled: Boolean(quoteId),
  });
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
        <Loader2 size={28} className="animate-spin text-[#ff5e3a]" />
        <span className="text-xs text-slate-500 font-medium">Loading quotation details...</span>
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <FileQuestion size={28} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Quotation Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          The requested quotation could not be located in this organization or is not assigned to your account.
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
            href="/dashboard/sale-ref/quotations"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066cc] text-white text-xs font-bold shadow-xs hover:bg-[#0052a3] transition"
          >
            <ArrowLeft size={13} />
            <span>Back to Quotations List</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
      {/* Role-Aware Navigation Bar */}
      <SalesNav
        onSignOut={signOut}
        activeTab="quotations"
        userName={user?.name || "Sales Representative"}
        userInitials={userInitials}
        roleLabel={user?.role === "SALES_REP" ? "Sales Representative" : user?.role || "Sales Rep"}
        linkComponent={Link}
      />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <QuotationDetailView
          quotation={quotation}
          currentUser={user}
          userRole={user?.role || "SALES_REP"}
          catalogProducts={products || []}
          onRefresh={refetch}
          backHref="/dashboard/sale-ref/quotations"
        />
      </main>
    </div>
  );
}
