"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Search,
  Users,
  Shield,
  Loader2,
  Sparkles,
  ArrowRight,
  Settings,
} from "lucide-react";
import { CreateOrgModal } from "./create-org-modal";

export interface OrgItem {
  id: string;
  name: string;
  slug?: string;
  currency?: string;
  userRole?: string;
  isCurrent?: boolean;
  isCreator?: boolean;
  _count?: {
    users?: number;
    members?: number;
    warehouses?: number;
    products?: number;
    quotations?: number;
  };
}

export interface OrgDropdownProps {
  organizations?: OrgItem[];
  currentOrgId?: string;
  currentOrgName?: string;
  currentRole?: string;
  onSwitchOrg?: (orgId: string) => Promise<void> | void;
  onCreateOrg?: (data: { name: string; slug?: string; currency: string }) => Promise<void> | void;
  onManageTeam?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function OrgDropdown({
  organizations = [],
  currentOrgId,
  currentOrgName,
  currentRole,
  onSwitchOrg,
  onCreateOrg,
  onManageTeam,
  isLoading = false,
  className = "",
}: OrgDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Derive active organization info
  const activeOrg = useMemo(() => {
    if (currentOrgId) {
      const found = organizations.find((o) => o.id === currentOrgId);
      if (found) return found;
    }
    const currentMarked = organizations.find((o) => o.isCurrent);
    if (currentMarked) return currentMarked;
    if (organizations.length > 0) return organizations[0];
    return null;
  }, [organizations, currentOrgId]);

  const activeName = currentOrgName || activeOrg?.name || "Select Org";
  const activeRole = currentRole || activeOrg?.userRole || (activeOrg?.isCreator ? "ADMIN" : "MEMBER");

  const isAdmin = useMemo(() => {
    const role = (activeRole || activeOrg?.userRole || "").toUpperCase();
    return role === "ADMIN" || activeOrg?.isCreator === true;
  }, [activeRole, activeOrg]);

  // Format role tag
  const formatRoleLabel = (role?: string) => {
    if (!role) return "Member";
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "Admin";
      case "SALES_MANAGER":
        return "Manager";
      case "SALES_REP":
        return "Sales Rep";
      case "FINANCE_OPS":
        return "Finance";
      case "CUSTOMER":
        return "Portal";
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "SALES_MANAGER":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "SALES_REP":
        return "bg-orange-50 text-[#ff5e3a] border-orange-200/80";
      case "FINANCE_OPS":
        return "bg-cyan-50 text-cyan-700 border-cyan-200/80";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Filter organizations by search query
  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase().trim();
    return organizations.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.slug && o.slug.toLowerCase().includes(q)) ||
        (o.userRole && o.userRole.toLowerCase().includes(q))
    );
  }, [organizations, searchQuery]);

  const handleSelectOrg = async (orgId: string) => {
    if (orgId === activeOrg?.id || switchingId) return;
    try {
      setSwitchingId(orgId);
      if (onSwitchOrg) {
        await onSwitchOrg(orgId);
      }
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to switch organization:", err);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <>
      <div ref={dropdownRef} className={`relative z-40 ${className}`}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer select-none ${
            isOpen
              ? "bg-slate-100 border-slate-300 shadow-2xs"
              : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs"
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center shrink-0">
            <Building2 size={12} />
          </div>

          <span className="text-xs font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[150px]">
            {activeName}
          </span>

          <span
            className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
              activeRole
            )}`}
          >
            {formatRoleLabel(activeRole)}
          </span>

          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100">
            {/* Header / Search Strip */}
            <div className="px-3 pb-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                <span>Switch Workspace</span>
                <span>{organizations.length} {organizations.length === 1 ? "Org" : "Orgs"}</span>
              </div>

              {organizations.length > 2 && (
                <div className="relative flex items-center mt-1">
                  <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search organizations..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#ff5e3a]"
                  />
                </div>
              )}
            </div>

            {/* Organizations List */}
            <div className="max-h-64 overflow-y-auto py-1 space-y-0.5 px-1.5">
              {filteredOrgs.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  No organizations match &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredOrgs.map((org) => {
                  const isCurrent = org.id === activeOrg?.id || org.isCurrent;
                  const isSwitchingThis = switchingId === org.id;
                  const initials = org.name
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "OR";

                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSelectOrg(org.id)}
                      disabled={isSwitchingThis}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer group ${
                        isCurrent
                          ? "bg-orange-50/70 border border-orange-200/80"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Org Monogram */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isCurrent
                              ? "bg-[#ff5e3a] text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {org.name}
                            </span>
                            {org.isCreator && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                Owner
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${getRoleBadgeStyle(
                                org.userRole
                              )}`}
                            >
                              {formatRoleLabel(org.userRole)}
                            </span>
                            {org.currency && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {org.currency}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Indicator */}
                      <div className="shrink-0 pl-2">
                        {isSwitchingThis ? (
                          <Loader2 size={15} className="animate-spin text-[#ff5e3a]" />
                        ) : isCurrent ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-1.5 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#ff5e3a] hover:bg-orange-50/80 rounded-xl transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center text-[#ff5e3a]">
                  <Plus size={14} strokeWidth={2.5} />
                </div>
                <span>Create New Organization</span>
              </button>

              {/* Manage Team & Permissions (Strictly only visible if viewing an organization you are Admin of) */}
              {isAdmin && onManageTeam && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onManageTeam();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Users size={14} className="text-slate-400" />
                  <span>Manage Team & Permissions</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      <CreateOrgModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateOrg={onCreateOrg}
        isLoading={isLoading}
      />
    </>
  );
}

