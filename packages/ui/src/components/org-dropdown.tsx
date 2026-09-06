"use client";

import { useState } from "react";
import { Building2, ChevronDown, Plus } from "lucide-react";

export function OrgDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative z-[100]"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 text-sm font-semibold text-slate-700 transition-colors">
        <Building2 size={16} className="text-slate-500" />
        Orgs
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Plus size={16} className="text-slate-400" />
            Add New
          </a>
        </div>
      )}
    </div>
  );
}
