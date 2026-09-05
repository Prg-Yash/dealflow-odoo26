import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-container text-on-primary-container hover:brightness-95 active:translate-y-px",
  secondary:
    "border border-outline-variant text-on-surface hover:bg-surface-container-high active:translate-y-px",
  ghost:
    "text-on-surface-variant hover:bg-surface-container active:translate-y-px",
  destructive:
    "bg-error text-on-error hover:brightness-90 active:translate-y-px",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-sm rounded-full",
  md: "px-6 py-2.5 text-sm rounded-full",
  lg: "px-8 py-3 text-base rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
