"use client";

import { useState, useRef, useEffect, type ReactNode, type ComponentType } from "react";
import { Search, Bell, X, ArrowRight } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { NotificationModal } from "./notification-modal";

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
  title?: string;
  linkComponent?: ComponentType<{ href: string; className?: string; title?: string; children: ReactNode }>;
}

function NavLink({ href, className, children, title, linkComponent: LinkComp }: NavLinkProps) {
  if (LinkComp) {
    return <LinkComp href={href} className={className} title={title}>{children}</LinkComp>;
  }
  return <a href={href} className={className} title={title}>{children}</a>;
}

const DEFAULT_TABS: NavTabItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard/sale-ref" },
  { id: "quotations", label: "Quotations", href: "/dashboard/sale-ref/quotations" },
  { id: "new-quote", label: "+ New Quote", href: "/dashboard/sale-ref/quotations/new" },
];

const SEARCHABLE_DEALS = [
  { id: "Q-1042", org: "Acme Corporation", value: "₹68,500", stage: "Pending Approval" },
  { id: "Q-1043", org: "Apex Logic Systems", value: "₹34,000", stage: "Draft" },
  { id: "Q-1044", org: "OmniRetail Global", value: "₹114,200", stage: "Pending Approval" },
  { id: "Q-1045", org: "Strata Logistics", value: "₹45,000", stage: "Approved" },
  { id: "Q-1046", org: "Northstar Labs", value: "₹96,500", stage: "Confirmed / PO" },
  { id: "Q-1047", org: "Beta Industries", value: "₹72,000", stage: "Negotiation" },
];

export function SalesNav({
  activeTab = "dashboard",
  userInitials = "SJ",
  userName = "Sarah Jenkins",
  roleLabel = "Sales Rep",
  className = "",
  linkComponent: LinkComp,
}: SalesNavProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim() === ""
    ? []
    : SEARCHABLE_DEALS.filter(
        (deal) =>
          deal.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.org.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${className}`}>
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Segmented Pill Navigation */}
          <div className="flex items-center gap-5 lg:gap-8">
            <BrandLogo href="/dashboard/sale-ref" as={LinkComp} />

            <nav className="hidden md:flex items-center gap-1 p-1 h-10 rounded-full bg-slate-100 border border-slate-200">
              {DEFAULT_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <NavLink
                    key={tab.id}
                    href={tab.href}
                    linkComponent={LinkComp}
                    className={`inline-flex items-center px-4 h-8 rounded-full text-xs font-semibold whitespace-nowrap tracking-tight transition-all shrink-0 ${
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

          {/* Right: Search, Nav Key, Notifications, and User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Fixed Search Bar with interactive results dropdown */}
            <div ref={searchContainerRef} className="relative hidden sm:block">
              <div className="h-9 px-3.5 rounded-full border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus-within:border-[#ff5e3a] focus-within:ring-2 focus-within:ring-[#ff5e3a]/20 shadow-2xs transition-all w-52 md:w-64 lg:w-72 flex items-center gap-2">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search deals, quotes..."
                  className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                    }}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                  >
                    <X size={12} />
                  </button>
                ) : (
                  <kbd className="hidden lg:inline-block text-[10px] text-slate-400 font-mono px-1 py-0.5 rounded bg-slate-100 border border-slate-200">
                    ⌘K
                  </kbd>
                )}
              </div>

              {/* Quick Search Dropdown */}
              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-11 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 divide-y divide-slate-100 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {searchResults.length > 0 ? "Deals & Quotations" : "No matches found"}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                    {searchResults.map((deal) => (
                      <NavLink
                        key={deal.id}
                        href={`/dashboard/sale-ref/quotations/${deal.id}`}
                        linkComponent={LinkComp}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50/70 transition-colors group cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-[#ff5e3a] transition-colors flex items-center gap-1.5">
                            <span>{deal.org}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-normal">({deal.id})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{deal.stage}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900">{deal.value}</div>
                          <div className="text-[10px] text-[#ff5e3a] font-semibold flex items-center gap-0.5 justify-end">
                            <span>Open</span>
                            <ArrowRight size={10} />
                          </div>
                        </div>
                      </NavLink>
                    ))}
                  </div>

                  <div className="pt-2 px-2">
                    <NavLink
                      href={`/dashboard/sale-ref/quotations?q=${encodeURIComponent(searchQuery)}`}
                      linkComponent={LinkComp}
                      className="block text-center text-xs font-semibold text-[#ff5e3a] hover:underline py-1"
                    >
                      View all results in Quotations &rarr;
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell with Badge */}
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Notifications"
              title="Deal Notifications"
            >
              <Bell size={17} />
              <span
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  width: "7px",
                  height: "7px",
                  backgroundColor: "#ff5e3a",
                  borderRadius: "9999px",
                  boxShadow: "0 0 0 2px #ffffff",
                }}
              />
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

      {/* Notification Modal */}
      <NotificationModal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onNavigateToQuote={(id) => {
          window.location.href = `/dashboard/sale-ref/quotations/${id}`;
        }}
      />
    </>
  );
}
