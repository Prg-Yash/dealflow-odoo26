"use client";

import { Plus, Settings } from "lucide-react";

const MOCK_PRODUCTS = [
  { id: 1, name: "Enterprise SLA - Platinum", sku: "SLA-PLAT-01", category: "Services", variants: 0, price: "$5,000", unit: "YEAR", tax: "0%", status: "Active" },
  { id: 2, name: "NextGen Firewall HW200", sku: "HW-FW-200", category: "Hardware", variants: 4, price: "$2,400", unit: "UNIT", tax: "8%", status: "Active" },
  { id: 3, name: "Consulting - Senior Architect", sku: "CONS-SA-01", category: "Consulting", variants: 0, price: "$250", unit: "HOUR", tax: "0%", status: "Active" },
  { id: 4, name: "Cloud Storage 1TB (Add-on)", sku: "SW-STG-1TB", category: "Software", variants: 3, price: "$120", unit: "MONTH", tax: "0%", status: "Active" },
  { id: 5, name: "Implementation Package", sku: "PKG-IMP-01", category: "Services", variants: 2, price: "$15,000", unit: "PROJECT", tax: "0%", status: "Active" },
  { id: 6, name: "Premium Support Seat", sku: "SUP-PREM-01", category: "Software", variants: 0, price: "$45", unit: "USER_MONTH", tax: "0%", status: "Active" },
];

export default function AdminCatalogPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Product Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage master SKU list and standard pricing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold shadow-xs flex items-center gap-1.5 transition">
            <Settings size={14} />
            Manage Price fields
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition">
            <Plus size={15} />
            New Product
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-32">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Products</h3>
          <div className="text-4xl font-black text-[#0f172a] mb-1">1,402</div>
        </div>
        
        <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-32">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pricelists</h3>
          <div className="text-4xl font-black text-[#0f172a] mb-1">8</div>
        </div>
        
        <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-32">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Variants</h3>
          <div className="text-4xl font-black text-[#0f172a] mb-1">4,021</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-black/[0.06] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-black/[0.06] text-slate-500 font-semibold text-xs">
                <th className="py-4 pl-6 font-semibold">Product name</th>
                <th className="py-4">Category</th>
                <th className="py-4">Variants</th>
                <th className="py-4 text-right">Price</th>
                <th className="py-4 text-center">Unit</th>
                <th className="py-4 text-center">Tax</th>
                <th className="py-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {MOCK_PRODUCTS.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 pl-6">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{p.sku}</div>
                  </td>
                  <td className="py-4 text-slate-600">
                    <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-medium">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-4 text-slate-600">
                    {p.variants > 0 ? (
                      <span className="font-mono text-xs">{p.variants}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 text-right font-mono font-medium text-slate-900">
                    {p.price}
                  </td>
                  <td className="py-4 text-center text-xs text-slate-500 font-medium">
                    {p.unit}
                  </td>
                  <td className="py-4 text-center text-xs text-slate-500">
                    {p.tax}
                  </td>
                  <td className="py-4 pr-6 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
