"use client";

import { type ReactNode, type ComponentType } from "react";
import { BrandLogo } from "./brand-logo";
import { Activity, Layers, Sliders, Users, Warehouse } from "lucide-react";

export interface AdminNavTabItem {
  id: "overview" | "catalog" | "rules" | "team" | "inventory" | "reports";
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export interface AdminNavProps {
  activeTab?: "overview" | "catalog" | "rules" | "team" | "inventory" | "reports";
  currentPath?: string;
  adminName?: string;
  adminEmail?: string;
  adminInitials?: string;
  orgName?: string;
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
  { id: "reports", label: "Reports", href: "/dashboard/admin/reports", icon: Layers },
  { id: "catalog", label: "Products", href: "/dashboard/admin/catalog", icon: Layers },
  { id: "rules", label: "Discount Rules", href: "/dashboard/admin/rules", icon: Sliders },
  { id: "team", label: "Team & Access", href: "/dashboard/admin/team", icon: Users },
  { id: "inventory", label: "Warehouses", href: "/dashboard/admin/inventory", icon: Warehouse },
];

export function AdminNav({
  activeTab,
  currentPath = "",
  adminName = "System Administrator",
  adminEmail = "admin@dealflow360.com",
  adminInitials = "SA",
  orgName = "Apex Enterprise",
  className = "",
  linkComponent: LinkComp,
}: AdminNavProps) {
  const getIsActive = (tab: AdminNavTabItem) => {
    if (activeTab) return activeTab === tab.id;
    if (!currentPath) return tab.id === "overview";
    if (tab.id === "overview") {
      return currentPath === "/dashboard/admin" || currentPath === "/admin";
    }
    return currentPath.startsWith(tab.href);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${className}`}>
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Brand Monogram (Admin Console badge removed) */}
        <div className="flex items-center gap-3 shrink-0">
          <BrandLogo href="/dashboard/admin" as={LinkComp} />
        </div>

        {/* Center: Admin Module Pill Navigation with Uniform Height and nowrap */}
        <nav className="hidden lg:flex items-center gap-1 p-1 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
          {ADMIN_TABS.map((tab) => {
            const isActive = getIsActive(tab);
            const Icon = tab.icon;
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

        {/* Right: Org Indicator and Admin Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Tenant Org Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[130px]">{orgName}</span>
          </div>

          {/* Admin Avatar */}
          <NavLink href="/profile" linkComponent={LinkComp} className="flex items-center gap-2.5 pl-2.5 sm:border-l sm:border-slate-200 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
              {adminInitials}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">{adminName}</span>
              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{adminEmail}</span>
            </div>
          </NavLink>
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
  );
}
