"use client";

import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Trash2, X } from "lucide-react";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary" | "success";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Diálogo acessível de confirmação para ações destrutivas ou sensíveis,
 * substituindo `window.confirm` e `alert` nativos.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onOpenChange]);

  if (!open) return null;

  const iconStyle =
    variant === "danger"
      ? "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400"
      : variant === "warning"
      ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
      : variant === "success"
      ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
      : "bg-primary/10 text-primary";

  const confirmBtnStyle =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-700 text-white"
      : variant === "success"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : "bg-primary hover:bg-primary/90 text-white";

  const Icon =
    variant === "danger"
      ? Trash2
      : variant === "warning"
      ? AlertTriangle
      : variant === "success"
      ? CheckCircle2
      : ShieldAlert;

  return (
    <div
      data-testid="confirm-dialog"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={() => {
        if (!loading) onOpenChange(false);
      }}
    >
      <div
        className="bg-white dark:bg-[#1E091B] border border-gray-200 dark:border-border/60 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconStyle}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3
                id="confirm-dialog-title"
                className="font-heading font-bold text-base text-foreground leading-snug"
              >
                {title}
              </h3>
              <p
                id="confirm-dialog-desc"
                className="text-xs sm:text-sm text-muted-foreground leading-relaxed"
              >
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            aria-label="Fechar diálogo"
            className="p-2 -mr-1 -mt-1 text-muted-foreground hover:text-foreground rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            data-testid="confirm-dialog-cancel"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="rounded-xl min-h-[44px] px-4 text-xs font-semibold cursor-pointer"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            data-testid="confirm-dialog-confirm"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-xl min-h-[44px] px-5 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${confirmBtnStyle}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
