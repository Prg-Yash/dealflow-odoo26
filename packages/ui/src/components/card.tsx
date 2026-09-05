import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[2rem] border border-outline-variant/50 p-6 md:p-8 lg:p-10 transition-shadow duration-200",
        glass
          ? "bg-white/75 backdrop-blur-[20px] shadow-glass"
          : "bg-surface-container-lowest shadow-card hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
