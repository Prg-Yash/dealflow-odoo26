import { cn } from "../lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-container-high text-on-surface",
  success: "bg-secondary-container text-on-secondary-container",
  warning: "bg-primary-container/30 text-on-primary-container",
  error: "bg-error-container text-on-error-container",
  info: "bg-tertiary-container/30 text-on-tertiary-container",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
