import { cn } from "../lib/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[1rem] bg-surface-container-high",
        className,
      )}
    />
  );
}
