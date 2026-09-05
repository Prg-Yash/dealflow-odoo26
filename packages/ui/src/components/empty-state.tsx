import { type ReactNode } from "react";
import { cn } from "../lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-16 text-center", className)}>
      {icon && (
        <div className="rounded-2xl bg-surface-container-high p-4 text-on-surface-variant">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-on-surface-variant">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
