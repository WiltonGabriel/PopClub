"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { navigationHistoryService } from "@/services/navigationHistoryService";

interface SmartBackButtonProps {
  label?: string;
  fallbackHref?: string;
  className?: string;
}

export function SmartBackButton({
  label = "Voltar",
  fallbackHref = "/",
  className = "inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer",
}: SmartBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    navigationHistoryService.goBack(router, fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      className={className}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
