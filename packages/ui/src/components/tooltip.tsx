import { type ReactNode } from "react";
import { cn } from "../lib/cn";

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden whitespace-nowrap rounded-lg bg-inverse-surface px-3 py-1.5 text-xs font-medium text-inverse-on-surface shadow-card z-50 group-hover:block">
        {content}
      </span>
    </span>
  );
}
