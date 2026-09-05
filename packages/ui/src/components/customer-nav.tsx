"use client";

import { useState, type ReactNode, type ComponentType } from "react";
import { Bell } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { NotificationModal } from "./notification-modal";
import { ProfileModal } from "./profile-modal";

export interface NavTabItem {
  id: string;
  label: string;
  href: string;
}

export interface CustomerNavProps {
  activeTab?: "dashboard" | "quotations" | "settings";
  userInitials?: string;
  userName?: string;
  userEmail?: string;
  roleLabel?: string;
  onSignOut?: () => void;
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
  { id: "dashboard", label: "Dashboard", href: "/dashboard/customer" },
  { id: "quotations", label: "Quotations", href: "/dashboard/customer/quotations" },
];

export function CustomerNav({
  activeTab = "dashboard",
  userInitials = "JW",
  userName = "Johnathan Ward",
  userEmail = "buyer@acmecorp.com",
  roleLabel = "Customer",
  onSignOut,
  className = "",
  linkComponent: LinkComp,
}: CustomerNavProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${className}`}>
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Segmented Pill Navigation */}
          <div className="flex items-center gap-5 lg:gap-8">
            <BrandLogo href="/dashboard/customer" as={LinkComp} subtitle="Customer Portal" />

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

          {/* Right: Notifications and User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </button>

            {/* User Avatar + Role Badge */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 px-2.5 border-l border-slate-200 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#ff5e3a] flex items-center justify-center text-white text-xs font-extrabold shadow-sm shadow-[#ff5e3a]/25 hover:scale-105 transition-transform">
                  {userInitials}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight">{userName}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{roleLabel}</span>
                </div>
              </button>
              
              <ProfileModal
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                user={{
                  name: userName,
                  email: userEmail,
                  initials: userInitials,
                  role: "customer",
                }}
                onSignOut={onSignOut || (() => {})}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Notification Modal */}
      <NotificationModal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onNavigateToQuote={(id) => {
          window.location.href = `/dashboard/customer/quotations/${id}`;
        }}
      />
    </>
  );
}
