import { type InputHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-on-surface">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-[1rem] border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors duration-150",
              "focus:border-primary-container focus:ring-2 focus:ring-primary-container/30",
              error && "border-error focus:border-error focus:ring-error/30",
              icon && "pl-10",
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
