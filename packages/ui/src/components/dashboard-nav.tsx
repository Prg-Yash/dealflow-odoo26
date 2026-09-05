"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../lib/cn";

interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: string;
}

interface DashboardNavProps {
  brand: ReactNode;
  groups: NavGroup[];
  footer?: ReactNode;
  className?: string;
}

/**
 * Sidebar navigation for dashboard pages.
 * Collapsible on mobile, fixed on desktop.
 * Styled to match the Quotation Detail page nav from Stitch.
 */
export function DashboardNav({ brand, groups, footer, className }: DashboardNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl bg-surface-container-lowest p-2 shadow-card lg:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-inverse-surface/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col border-r border-outline-variant/30 bg-surface-container-lowest transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-outline-variant/30">
          {brand}
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1 lg:hidden cursor-pointer text-on-surface-variant hover:text-on-surface"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group, gi) => (
            <div key={gi} className="mb-4">
              {group.label && (
                <span className="mb-2 block px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/60">
                  {group.label}
                </span>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-100",
                        item.active
                          ? "bg-primary-container/15 text-primary"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                      )}
                    >
                      {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-bold text-on-primary-container">
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="border-t border-outline-variant/30 px-4 py-4">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
