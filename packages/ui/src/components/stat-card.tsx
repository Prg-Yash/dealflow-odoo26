import { type ReactNode } from "react";
import { cn } from "../lib/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
            {label}
          </span>
          <span className="text-3xl font-extrabold tracking-tight text-on-surface">
            {value}
          </span>
        </div>
        {icon && (
          <div className="rounded-xl bg-surface-container-high p-2.5 text-on-surface-variant">
            {icon}
          </div>
        )}
      </div>
      {change && (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            changeType === "positive" && "text-secondary",
            changeType === "negative" && "text-error",
            changeType === "neutral" && "text-on-surface-variant",
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
