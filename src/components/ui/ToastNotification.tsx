"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Bell, X } from "lucide-react";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (
    toastOrTitle: Omit<Toast, "id"> | string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      toastOrTitle: Omit<Toast, "id"> | string,
      typeParam?: "info" | "success" | "warning" | "error"
    ) => {
      let toastObj: Omit<Toast, "id">;
      if (typeof toastOrTitle === "string") {
        toastObj = {
          title: toastOrTitle,
          type: typeParam || "info",
          duration: 5000,
        };
      } else {
        toastObj = toastOrTitle;
      }

      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = {
        id,
        title: toastObj.title,
        message: toastObj.message,
        type: toastObj.type || "info",
        duration: toastObj.duration ?? 5000,
      };

      setToasts((prev) => [...prev, newToast]);

      if ((newToast.duration ?? 0) > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Container de Toasts flutuantes */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0">
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isSuccess = toast.type === "success";
          const isWarning = toast.type === "warning";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 animate-in slide-in-from-bottom-5 ${
                isError
                  ? "bg-red-50/95 dark:bg-[#2A0F14]/95 border-red-200 dark:border-red-900/50 text-red-950 dark:text-red-100"
                  : isSuccess
                  ? "bg-emerald-50/95 dark:bg-[#0E261A]/95 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100"
                  : isWarning
                  ? "bg-amber-50/95 dark:bg-[#2A1E0E]/95 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-100"
                  : "bg-white/95 dark:bg-[#1F0B22]/95 border-gray-200 dark:border-border/50 text-foreground dark:text-foreground"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isError && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                {isWarning && <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                {!isError && !isSuccess && !isWarning && (
                  <Bell className="w-5 h-5 text-primary dark:text-muted-foreground animate-bounce" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-heading font-bold text-sm leading-tight">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs mt-1 opacity-90 leading-relaxed break-words">{toast.message}</p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
                title="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
