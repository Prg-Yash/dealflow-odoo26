import { type ReactNode, type ComponentType } from "react";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export interface AuthCardProps {
  title: string;
  description?: string;
  activeTab?: "login" | "signup";
  headerRightLink?: { label: string; href: string };
  children: ReactNode;
  banner?: ReactNode;
  footerNote?: ReactNode;
  linkComponent?: ComponentType<{ href: string; className?: string; children: ReactNode; role?: string }>;
}

interface NavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  as?: ComponentType<{ href: string; className?: string; children: ReactNode; role?: string }>;
}

function NavLink({ href, className, children, as: LinkComp }: NavLinkProps) {
  if (LinkComp) {
    return (
      <LinkComp href={href} className={className}>
        {children}
      </LinkComp>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function AuthCard({
  title,
  description,
  activeTab,
  headerRightLink = { label: "Customer Portal", href: "/portal/login" },
  children,
  banner,
  footerNote,
  linkComponent: LinkComp,
}: AuthCardProps) {
  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {/* Clean Top Navigation Bar — Wireframe 1 & System Online removed */}
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <BrandLogo href="/" as={LinkComp} />

        {headerRightLink && (
          <NavLink
            href={headerRightLink.href}
            as={LinkComp}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <span>{headerRightLink.label}</span>
            <ArrowRight size={13} />
          </NavLink>
        )}
      </header>

      {/* Centered Main Area — Unified max-w-xl card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-xl">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-xl shadow-slate-200/40 flex flex-col gap-6">
            
            {/* Header Inside Card — SCREEN_01 / SCREEN_02 tag removed */}
            <div className="flex flex-col gap-1 text-left border-b border-slate-100 pb-5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f172a]">
                {title}
              </h1>
              {description && <p className="text-sm text-slate-500">{description}</p>}
            </div>

            {/* Segmented Toggle (Log In / Sign Up) */}
            {activeTab && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200" role="tablist">
                <NavLink
                  href="/login"
                  as={LinkComp}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all ${
                    activeTab === "login"
                      ? "bg-[#ff5e3a] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Log In
                </NavLink>
                <NavLink
                  href="/register"
                  as={LinkComp}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all ${
                    activeTab === "signup"
                      ? "bg-[#ff5e3a] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign Up
                </NavLink>
              </div>
            )}

            {/* Form and Controls */}
            {children}

            {/* Banner */}
            {banner}

            {/* Footer Notes */}
            {footerNote}

          </div>
        </div>
      </main>

      {/* Unified Footer */}
      <footer className="w-full py-4 text-center border-t border-slate-200/80 bg-white text-xs text-slate-400 font-medium">
        DealFlow360 Orchestration Platform &copy; 2025
      </footer>
    </div>
  );
}
