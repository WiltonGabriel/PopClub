"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { navigationHistoryService } from "@/services/navigationHistoryService";

export function RouteHistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const fullUrl =
      typeof window !== "undefined"
        ? `${pathname}${window.location.search}`
        : pathname;
    navigationHistoryService.recordNavigation(fullUrl);
  }, [pathname]);

  return null;
}
