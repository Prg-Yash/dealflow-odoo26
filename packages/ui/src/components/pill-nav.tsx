import { type ReactNode } from "react";
import { cn } from "../lib/cn";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface PillNavProps {
  brand: ReactNode;
  items: NavItem[];
  actions?: ReactNode;
  className?: string;
}

/**
 * Pill-shaped floating nav for landing/marketing pages.
 * Glassmorphism backdrop with rounded-full shape.
 */
export function PillNav({ brand, items, actions, className }: PillNavProps) {
  return (
    <nav
      className={cn(
        "mx-auto mt-4 flex w-fit max-w-4xl items-center gap-2 rounded-full border border-outline-variant/40 bg-white/70 px-4 py-2 shadow-card backdrop-blur-[16px]",
        className,
      )}
    >
      <div className="flex items-center gap-2 pr-4 border-r border-outline-variant/30">
        {brand}
      </div>

      <div className="flex items-center gap-1 px-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              item.active
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            {item.label}
          </a>
        ))}
      </div>

      {actions && <div className="flex items-center gap-2 pl-2">{actions}</div>}
    </nav>
  );
}
