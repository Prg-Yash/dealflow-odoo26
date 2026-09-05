import { type ReactNode, type ComponentType } from "react";

export interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
  as?: ComponentType<{ href: string; className?: string; children: ReactNode }>;
}

export function BrandLogo({ href = "/", size = "md", subtitle, className, as: LinkComp }: BrandLogoProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className || ""}`}>
      {/* Monogram Box */}
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-[#ff7a50] to-[#ea4e28] text-white font-extrabold shadow-sm shadow-[#ff5e3a]/25 shrink-0 ${
          isSm ? "w-7 h-7 text-xs" : isLg ? "w-11 h-11 text-base" : "w-8 h-8 text-sm"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isSm ? "w-4 h-4" : isLg ? "w-6 h-6" : "w-5 h-5"}
        >
          <path d="M4 4h9a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H4z" />
          <path d="M4 14h6a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H4z" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-extrabold tracking-tight text-slate-900 ${
            isSm ? "text-sm" : isLg ? "text-xl" : "text-base"
          }`}
        >
          DealFlow<span className="text-[#ff5e3a]">360</span>
        </span>
        {subtitle && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 -mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return content;

  if (LinkComp) {
    return (
      <LinkComp href={href} className="hover:opacity-90 transition-opacity inline-block">
        {content}
      </LinkComp>
    );
  }

  return (
    <a href={href} className="hover:opacity-90 transition-opacity inline-block">
      {content}
    </a>
  );
}
