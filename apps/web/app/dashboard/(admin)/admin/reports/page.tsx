"use client";

import { Download, FileText, ChevronDown } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Admin Reporting Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Cross-team insights and exportable data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold shadow-xs flex items-center gap-1.5 transition">
              <FileText size={14} />
              Export PDF
            </button>
            <button className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold shadow-xs flex items-center gap-1.5 transition">
              <Download size={14} />
              Export XLS
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Period</label>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>This Quarter</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sales Team</label>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>All Teams</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Approval Status</label>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Any</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Product</label>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>All Products</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-32">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quotes Created</h3>
            <div>
              <div className="text-4xl font-black text-[#0f172a] mb-1">142</div>
              <div className="text-xs font-bold text-emerald-600">+12% vs last month</div>
            </div>
          </div>
          
          <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-32">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Approval Time</h3>
            <div>
              <div className="text-4xl font-black text-[#0f172a] mb-1">18 hours</div>
              <div className="text-xs font-bold text-emerald-600">-2 hours vs last month</div>
            </div>
          </div>
          
          <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-32">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Upsold Product</h3>
            <div>
              <div className="text-2xl font-black text-[#0f172a] mb-1 leading-tight">Enterprise SLA</div>
              <div className="text-xs font-bold text-slate-500">45 inclusions</div>
            </div>
          </div>
        </div>
    </div>
  );
}
