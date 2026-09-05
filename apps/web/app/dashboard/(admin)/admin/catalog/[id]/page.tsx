"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <Link href="/dashboard/admin/catalog" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3 transition">
          <ArrowLeft size={14} />
          Back to Catalog
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Product and pricelist
        </h1>
      </div>

      {/* General Info */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-xl">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
          General Info
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="w-1/3 text-sm font-medium text-slate-300">Product name</label>
              <input 
                type="text" 
                defaultValue="Enterprise SLA" 
                className="w-2/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a]"
              />
            </div>
            
            <div className="flex items-center">
              <label className="w-1/3 text-sm font-medium text-slate-300">Category</label>
              <input 
                type="text" 
                defaultValue="Services" 
                className="w-2/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a]"
              />
            </div>
            
            <div className="flex items-center">
              <label className="w-1/3 text-sm font-medium text-slate-300">Price</label>
              <input 
                type="text" 
                defaultValue="$5,000" 
                className="w-2/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a]"
              />
            </div>
            
            <div className="flex items-center">
              <label className="w-1/3 text-sm font-medium text-slate-300">Unit</label>
              <input 
                type="text" 
                defaultValue="YEAR" 
                className="w-2/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a]"
              />
            </div>
            
            <div className="flex items-start">
              <label className="w-1/3 text-sm font-medium text-slate-300 pt-2">Description</label>
              <textarea 
                rows={2}
                defaultValue="Premium enterprise service level agreement." 
                className="w-2/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a]"
              />
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="w-1/3 text-sm font-medium text-slate-300">Tax %</label>
              <input 
                type="text" 
                defaultValue="0" 
                className="w-1/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a]"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center flex-1">
                <label className="w-1/3 text-sm font-medium text-slate-300">Subscription</label>
                <select className="w-1/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a] appearance-none">
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <span className="text-[11px] text-slate-400 w-1/3">
                If subscription yes then recurring will be visible
              </span>
            </div>
            
            <div className="flex items-center">
              <label className="w-1/3 text-sm font-medium text-slate-300">Recurring</label>
              <select className="w-2/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a] appearance-none">
                <option>Yearly</option>
                <option>Monthly</option>
                <option>Weekly</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center flex-1">
                <label className="w-1/3 text-sm font-medium text-slate-300">Quantity on hand</label>
                <input 
                  type="number" 
                  defaultValue="999" 
                  className="w-1/3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5e3a]"
                />
              </div>
              <span className="text-[11px] text-slate-400 w-1/3">
                (Integer field)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Variants */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 pl-2">
          Product Variants
        </h2>
        <div className="rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl overflow-hidden">
          <table className="w-full text-left text-sm text-white">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 font-semibold text-xs">
                <th className="py-4 pl-6">Attribute</th>
                <th className="py-4">Values</th>
                <th className="py-4 pr-6 text-right">Extra price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 pl-6 font-medium text-slate-200">Color</td>
                <td className="py-4 text-slate-300">Blue, Black</td>
                <td className="py-4 pr-6 text-right text-slate-300">0</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 pl-6 font-medium text-slate-200">RAM</td>
                <td className="py-4 text-slate-300">4GB, 8GB</td>
                <td className="py-4 pr-6 text-right font-mono text-emerald-400">+$30</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 pl-6 font-medium text-slate-200">Manufacturer</td>
                <td className="py-4 text-slate-300">Dell, HP</td>
                <td className="py-4 pr-6 text-right font-mono text-emerald-400">+$10/+$30</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricelists */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 pl-2">
          Pricelists
        </h2>
        <div className="rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl overflow-hidden">
          <table className="w-full text-left text-sm text-white">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 font-semibold text-xs">
                <th className="py-4 pl-6">Tier</th>
                <th className="py-4">Currency</th>
                <th className="py-4 pr-6">Price Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 pl-6 font-medium text-slate-200">Bronze</td>
                <td className="py-4 text-slate-300 font-mono">USD</td>
                <td className="py-4 pr-6 text-slate-300">Price, no adjustmeent</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 pl-6 font-medium text-slate-200">Gold</td>
                <td className="py-4 text-slate-300 font-mono">USD/EUR</td>
                <td className="py-4 pr-6 text-slate-300">Price minus 10 percent base</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Alert */}
      <div className="bg-[#1e1405] border border-amber-900/50 rounded-xl p-4 mt-8 flex items-start gap-3">
        <div>
          <p className="text-[11px] font-semibold text-amber-500">
            Product details should be filled.
          </p>
          <p className="text-[11px] font-medium text-amber-500/80">
            Recurring order with this product will be invoiced at the beginning of the period.
          </p>
        </div>
      </div>
    </div>
  );
}
