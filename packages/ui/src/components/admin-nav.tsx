"use client";

import { useState, type ReactNode, type ComponentType } from "react";
import { BrandLogo } from "./brand-logo";
import { Activity, Layers, Sliders, Warehouse, Boxes, BarChart3, CheckCircle2, FileText } from "lucide-react";
import { OrgDropdown, type OrgItem } from "./org-dropdown";
import { ProfileModal } from "./profile-modal";

export interface AdminNavTabItem {
  id: "overview" | "catalog" | "rules" | "warehouses" | "inventory" | "reports" | "approvals" | "quotations";
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export interface AdminNavProps {
  activeTab?: "overview" | "catalog" | "rules" | "warehouses" | "inventory" | "reports" | "approvals" | "quotations";
  currentPath?: string;
  adminName?: string;
  adminEmail?: string;
  adminInitials?: string;
  orgName?: string;
  currentOrgId?: string;
  currentRole?: string;
  organizations?: OrgItem[];
  onSwitchOrg?: (orgId: string) => Promise<void> | void;
  onCreateOrg?: (data: { name: string; slug?: string; currency: string }) => Promise<void> | void;
  onManageTeam?: () => void;
  onSignOut?: () => void;
  className?: string;
  linkComponent?: ComponentType<{ href: string; className?: string; children: ReactNode }>;
}

interface NavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  linkComponent?: ComponentType<{ href: string; className?: string; children: ReactNode }>;
}

function NavLink({ href, className, children, linkComponent: LinkComp }: NavLinkProps) {
  if (LinkComp) {
    return <LinkComp href={href} className={className}>{children}</LinkComp>;
  }
  return <a href={href} className={className}>{children}</a>;
}

const ADMIN_TABS: AdminNavTabItem[] = [
  { id: "overview", label: "Overview", href: "/dashboard/admin", icon: Activity },
  { id: "catalog", label: "Products", href: "/dashboard/admin/catalog", icon: Layers },
  { id: "rules", label: "Discount Rules", href: "/dashboard/admin/rules", icon: Sliders },
  { id: "approvals", label: "Approvals", href: "/dashboard/admin/approvals", icon: CheckCircle2 },
  { id: "quotations", label: "Quotations", href: "/dashboard/admin/quotations", icon: FileText },
  { id: "warehouses", label: "Warehouses", href: "/dashboard/admin/warehouses", icon: Warehouse },
  { id: "reports", label: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
];

export function AdminNav({
  activeTab,
  currentPath = "",
  adminName = "",
  adminEmail = "",
  adminInitials = "AD",
  orgName = "",
  currentOrgId,
  currentRole = "ADMIN",
  organizations,
  onSwitchOrg,
  onCreateOrg,
  onManageTeam,
  onSignOut,
  className = "",
  linkComponent: LinkComp,
}: AdminNavProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const getIsActive = (tab: AdminNavTabItem) => {
    if (activeTab) return activeTab === tab.id;
    if (!currentPath) return tab.id === "overview";
    if (tab.id === "overview") {
      return currentPath === "/dashboard/admin" || currentPath === "/admin";
    }
    if (tab.id === "warehouses") {
      return currentPath.startsWith("/dashboard/admin/warehouses") || currentPath.startsWith("/dashboard/admin/inventory");
    }
    return currentPath.startsWith(tab.href);
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${className}`}>
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand Monogram & Org Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <BrandLogo href="/dashboard/admin" as={LinkComp} />
            <div className="hidden sm:block h-4 w-px bg-slate-200 mx-1"></div>
            <div className="hidden sm:block">
              <OrgDropdown
                organizations={organizations}
                currentOrgId={currentOrgId}
                currentOrgName={orgName}
                currentRole={currentRole}
                onSwitchOrg={onSwitchOrg}
                onCreateOrg={onCreateOrg}
                onManageTeam={onManageTeam}
              />
            </div>
          </div>

          {/* Center: Admin Module Pill Navigation with Uniform Height and nowrap */}
          <nav className="hidden lg:flex items-center gap-1 p-1 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
            {ADMIN_TABS.map((tab) => {
              const isActive = getIsActive(tab);
              const Icon = tab.icon;
              if (tab.id === "approvals") {
                return (
                  <div key={tab.id} className="relative group">
                    <NavLink
                      href="/dashboard/admin/approvals/manager"
                      linkComponent={LinkComp}
                      className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 ${
                        isActive
                          ? "bg-[#ff5e3a] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-white" : "text-slate-500"} />
                      <span>{tab.label}</span>
                    </NavLink>
                    
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-1.5 flex flex-col min-w-[160px]">
                        <NavLink
                          href="/dashboard/admin/approvals/manager"
                          linkComponent={LinkComp}
                          className="px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-[#ff5e3a] hover:bg-slate-50 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
                        >
                          <CheckCircle2 size={13} className="opacity-50" />
                          Manager Queue
                        </NavLink>
                        <NavLink
                          href="/dashboard/admin/approvals/finance"
                          linkComponent={LinkComp}
                          className="px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-[#ff5e3a] hover:bg-slate-50 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
                        >
                          <CheckCircle2 size={13} className="opacity-50" />
                          Finance Queue
                        </NavLink>
                      </div>
                    </div>
                  </div>
                );
              }

              if (tab.id === "warehouses") {
                return (
                  <div key={tab.id} className="relative group">
                    <NavLink
                      href={tab.href}
                      linkComponent={LinkComp}
                      className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 ${
                        isActive
                          ? "bg-[#ff5e3a] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-white" : "text-slate-500"} />
                      <span>{tab.label}</span>
                    </NavLink>
                    
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-1.5 flex flex-col min-w-[160px]">
                        <NavLink
                          href="/dashboard/admin/warehouses"
                          linkComponent={LinkComp}
                          className="px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-[#ff5e3a] hover:bg-slate-50 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
                        >
                          <Warehouse size={13} className="opacity-50" />
                          All Warehouses
                        </NavLink>
                        <NavLink
                          href="/dashboard/admin/inventory"
                          linkComponent={LinkComp}
                          className="px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-[#ff5e3a] hover:bg-slate-50 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
                        >
                          <Boxes size={13} className="opacity-50" />
                          Inventory Tracker
                        </NavLink>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <NavLink
                  key={tab.id}
                  href={tab.href}
                  linkComponent={LinkComp}
                  className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 ${
                    isActive
                      ? "bg-[#ff5e3a] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-white" : "text-slate-500"} />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: Admin Profile Trigger */}
          <div className="flex items-center gap-3 shrink-0 relative">
            {/* Minimal Avatar Trigger */}
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 px-2.5 sm:border-l sm:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-extrabold shadow-sm hover:scale-105 transition-transform">
                {adminInitials || "AD"}
              </div>
              {(adminName || adminEmail) ? (
                <div className="hidden md:flex flex-col text-left">
                  {adminName ? <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">{adminName}</span> : null}
                  {adminEmail ? <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">{adminEmail}</span> : null}
                </div>
              ) : null}
            </button>
            <ProfileModal
              open={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              user={{
                name: adminName || "Administrator",
                email: adminEmail,
                initials: adminInitials,
                role: "admin",
              }}
              orgName={orgName}
              onSignOut={onSignOut || (() => {})}
            />
          </div>
        </div>

        {/* Mobile Sub-Navigation Strip */}
        <div className="lg:hidden flex items-center gap-1 px-4 sm:px-6 lg:px-8 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto scrollbar-none">
          {ADMIN_TABS.map((tab) => {
            const isActive = getIsActive(tab);
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                href={tab.href}
                linkComponent={LinkComp}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#ff5e3a] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80"
                }`}
              >
                <Icon size={12} className={isActive ? "text-white" : "text-slate-500"} />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </header>
    </>
  );
}
