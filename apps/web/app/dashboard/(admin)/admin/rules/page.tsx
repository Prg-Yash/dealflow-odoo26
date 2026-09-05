"use client";

import { Save } from "lucide-react";

export default function AdminRulesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Discount tiers and approval chains
        </h1>
      </div>

      <div className="bg-[#0f172a] rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl">
        
        {/* Top Grid: Tier Ceilings & Category Ceilings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Tier Discount Ceilings */}
          <div>
            <h2 className="text-[11px] font-medium text-slate-500 mb-2 pl-2">
              Tier Discount Ceilings
            </h2>
            <div className="rounded-2xl border border-slate-700 overflow-hidden">
              <table className="w-full text-left text-sm text-white">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="py-3 px-5 font-medium">Tier</th>
                    <th className="py-3 px-5 font-medium">Max Discount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-5 text-slate-200">Bronze</td>
                    <td className="py-3 px-5 text-slate-400">5 percent</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-5 text-slate-200">Silver</td>
                    <td className="py-3 px-5 text-slate-400">10 percent</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-5 text-slate-200">Gold</td>
                    <td className="py-3 px-5 text-slate-400">15 Percent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Discount ceilings */}
          <div>
            <h2 className="text-[11px] font-medium text-slate-500 mb-2 pl-2">
              Category Discount ceilings
            </h2>
            <div className="rounded-2xl border border-slate-700 overflow-hidden h-full">
              <table className="w-full text-left text-sm text-white">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="py-3 px-5 font-medium">Category</th>
                    <th className="py-3 px-5 font-medium">Max Discount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-5 text-slate-200">Hardware</td>
                    <td className="py-3 px-5 text-slate-400">15 percent</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-5 text-slate-200">Services</td>
                    <td className="py-3 px-5 text-slate-400">10 percent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Approval Chain (Tier Discount Ceilings) */}
        <div>
          <h2 className="text-[11px] font-medium text-slate-500 mb-2 pl-2">
            Tier Discount Ceilings
          </h2>
          <div className="rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm text-white">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="py-3 px-5 font-medium w-1/2">Discount range</th>
                  <th className="py-3 px-5 font-medium w-1/2">Max Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <tr className="hover:bg-slate-800/30">
                  <td className="py-3 px-5 text-slate-200">Within tier/Category limit</td>
                  <td className="py-3 px-5 text-slate-400">No approval needed</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-3 px-5 text-slate-200">Over Limit, blended risk medium</td>
                  <td className="py-3 px-5 text-slate-400">Sales manager</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-3 px-5 text-slate-200">Over limit, blended high risk</td>
                  <td className="py-3 px-5 text-slate-400">Sales manager then finance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-sm font-semibold shadow-sm transition">
            <Save size={16} />
            Save configuration
          </button>
        </div>

        {/* Footer Alert */}
        <div className="bg-[#1e1405] border border-amber-900/50 rounded-xl p-4 mt-6">
          <p className="text-[11px] font-semibold text-amber-500 mb-1">
            When a quote mixes categories with different ceilings, the system must compute a blended risk score and route to the highest required level.
          </p>
          <p className="text-[11px] font-medium text-amber-500/80">
            All approvals, rejections, and edits must be logged with user, timestamp, and reason.
          </p>
        </div>
      </div>
    </div>
  );
}
