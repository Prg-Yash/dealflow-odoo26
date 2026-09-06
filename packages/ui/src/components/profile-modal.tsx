"use client";

import { LogOut, ShieldCheck, Target, Users } from "lucide-react";

export interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    initials: string;
    role: string;
  };
  orgName?: string;
  onSignOut: () => void;
}

export function ProfileModal({ open, onClose, user, orgName, onSignOut }: ProfileModalProps) {
  if (!open) return null;

  // Map internal roles to display labels and themes
  const getRoleConfig = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin": return { label: "System Admin", bg: "bg-purple-100", text: "text-purple-700" };
      case "manager": return { label: "Sales Manager", bg: "bg-amber-100", text: "text-amber-700" };
      case "finance": return { label: "Finance Ops", bg: "bg-emerald-100", text: "text-emerald-700" };
      case "sales_rep": return { label: "Sales Rep", bg: "bg-blue-100", text: "text-blue-700" };
      default: return { label: "Customer", bg: "bg-slate-100", text: "text-slate-700" };
    }
  };

  const cfg = getRoleConfig(user.role);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50">
        {/* Profile Header */}
          <a href="/profile" className="flex items-center gap-3 pb-4 border-b border-slate-100 hover:bg-slate-50 transition-colors -mx-4 px-4 -mt-4 pt-4 rounded-t-2xl cursor-pointer">
            <div className="w-12 h-12 shrink-0 rounded-full bg-slate-900 flex items-center justify-center text-white font-extrabold shadow-sm relative">
              {user.initials}
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
          <div className="flex flex-col text-left overflow-hidden">
            <h2 className="text-sm font-bold text-slate-900 truncate">{user.name}</h2>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <div className={`mt-1 self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </div>
          </div>
        </a>

        {/* Role-Specific Dynamic Data */}
        <div className="py-3 flex flex-col gap-2 border-b border-slate-100">
          {user.role.toLowerCase() === "admin" ? (
            <>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="text-[#ff5e3a]" size={16} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Organization</span>
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{orgName || "Acme Corp"}</span>
                </div>
              </div>
              <a href="/dashboard/admin/team" className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors cursor-pointer" onClick={onClose}>
                <Users className="text-[#2563eb]" size={16} />
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] text-slate-500 font-medium">Team & Access</span>
                  <span className="text-xs font-bold text-slate-900">Manage Users</span>
                </div>
              </a>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Target className="text-[#ff5e3a]" size={16} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Monthly Quota</span>
                  <span className="text-xs font-bold text-slate-900">₹450k / ₹500k (90%)</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3">
          <button
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
