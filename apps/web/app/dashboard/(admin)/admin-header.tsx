"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@repo/ui";

export function AdminHeader() {
  const pathname = usePathname();
  return <AdminNav currentPath={pathname} />;
}
