import { type ReactNode, type ComponentType } from "react";
import { Search, Bell } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export interface NavTabItem {
  id: string;
  label: string;
  href: string;
}

export interface SalesNavProps {
  activeTab?: "dashboard" | "quotations" | "new-quote" | "approvals" | "invoices";
  userInitials?: string;
  userName?: string;
  roleLabel?: string;
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

const DEFAULT_TABS: NavTabItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "quotations", label: "Quotations", href: "/quotations" },
  { id: "new-quote", label: "+ New Quote", href: "/quotations/new" },
];

export function SalesNav({
  activeTab = "dashboard",
  userInitials = "SJ",
  userName = "Sarah Jenkins",
  roleLabel = "Sales Rep",
  className = "",
  linkComponent: LinkComp,
}: SalesNavProps) {
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${className}`}>
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Segmented Pill Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <BrandLogo href="/dashboard" as={LinkComp} />

          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200">
            {DEFAULT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <NavLink
                  key={tab.id}
                  href={tab.href}
                  linkComponent={LinkComp}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all ${
                    isActive
                      ? "bg-[#ff5e3a] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  }`}
                >
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right: Live Sync, Search & User Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync</span>
          </div>

          <div className="relative hidden sm:flex items-center">
            <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search deals, quotes..."
              className="w-48 lg:w-64 pl-9 pr-4 py-1.5 rounded-full bg-slate-100 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#ff5e3a]/30 border border-transparent transition-all"
            />
          </div>

          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={17} />
          </button>

          {/* User Avatar + Role Badge */}
          <NavLink href="/profile" linkComponent={LinkComp} className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[#ff5e3a] flex items-center justify-center text-white text-xs font-extrabold shadow-sm shadow-[#ff5e3a]/25">
              {userInitials}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">{userName}</span>
              <span className="text-[10px] text-slate-500 font-medium">{roleLabel}</span>
            </div>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
