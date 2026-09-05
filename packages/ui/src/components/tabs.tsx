"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id || "");
  const activeTab = tabs.find((t) => t.id === active);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex gap-1 rounded-full bg-surface-container-high p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
              active === tab.id
                ? "bg-surface-container-lowest text-on-surface shadow-card"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}
