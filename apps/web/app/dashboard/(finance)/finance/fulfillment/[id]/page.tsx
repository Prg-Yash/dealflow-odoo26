"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Box, Check, XCircle } from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { MOCK_FULFILLMENT_DETAIL, type FulfillmentDetailRecord } from "../../../../../../lib/finance-data";

export default function FulfillmentDetailPage({ params }: { params: { id: string } }) {
  // In a real app, we'd fetch this based on params.id
  const [record] = useState<FulfillmentDetailRecord>(MOCK_FULFILLMENT_DETAIL);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#0f172a] font-sans antialiased">
      {/* Isolated Finance Topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandLogo href="/dashboard/finance" subtitle="Finance Operations" />

            <nav className="hidden md:flex items-center gap-1 p-1 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
              <Link
                href="/dashboard/finance?tab=fulfillment"
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 bg-[#ff5e3a] text-white shadow-sm"
              >
                <Box size={13} className="text-white" />
                <span>Fulfillment</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/finance"
              className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-1 border-b border-black/[0.06] pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Fulfillment Detail: {record.quoteId} ({record.account})
          </h1>
          <p className="text-xs text-slate-500">
            Opened by clicking an order row on the Fulfillment list.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 font-semibold">
                <th className="py-4 px-6 rounded-tl-2xl">Warehouse</th>
                <th className="py-4 px-6">Qty Fulfilled</th>
                <th className="py-4 px-6">Est. Shipments</th>
                <th className="py-4 px-6 rounded-tr-2xl">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {record.warehouseSplits.map((split, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">
                    {split.warehouse}
                  </td>
                  <td className="py-4 px-6 text-slate-700">
                    {split.qtyFulfilled} units
                  </td>
                  <td className="py-4 px-6 text-slate-700">
                    {split.estShipments}
                  </td>
                  <td className="py-4 px-6 text-slate-900 font-mono font-bold">
                    ${split.cost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/50 text-xs font-semibold shadow-xs">
          "Consolidate Remaining Backorder" prompt appears automatically once East Depot restocks.
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button className="px-5 py-2.5 rounded-full bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-sm cursor-pointer transition active:translate-y-0.5">
            Accept Suggested Split
          </button>
          <button className="px-5 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs cursor-pointer transition">
            Manual Override
          </button>
        </div>
      </main>
    </div>
  );
}
