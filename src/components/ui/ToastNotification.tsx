"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
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

const DEFAULT_DURATION = 3000; // 3 segundos conforme requisito da Etapa 7

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const duration = toast.duration ?? DEFAULT_DURATION;
  const [isPaused, setIsPaused] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(duration);
  const lastStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Controle de Timer com Pausa no toque/hover
  useEffect(() => {
    if (duration <= 0) return;

    if (!isPaused && !isDismissing) {
      lastStartTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        setIsDismissing(true);
        setTimeout(() => onDismiss(toast.id), 250);
      }, remainingTimeRef.current);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (lastStartTimeRef.current > 0) {
          const elapsed = Date.now() - lastStartTimeRef.current;
          remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
        }
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, isDismissing, duration, onDismiss, toast.id]);

  // Gestos de Swipe-to-Dismiss no Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const diffX = e.touches[0].clientX - startXRef.current;
    const diffY = e.touches[0].clientY - startYRef.current;

    // Se o movimento for predominantemente vertical, não ativa swipe lateral
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffX) < 10) return;

    setOffsetX(diffX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;

    // Se arrastou mais de 75px para qualquer lado, dispensa
    if (Math.abs(offsetX) > 75) {
      const exitDirection = offsetX > 0 ? 350 : -350;
      setOffsetX(exitDirection);
      setIsDismissing(true);
      setTimeout(() => onDismiss(toast.id), 200);
    } else {
      // Retorna à posição original com mola
      setOffsetX(0);
    }
  };

  const handleManualClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissing(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  const isError = toast.type === "error";
  const isSuccess = toast.type === "success";
  const isWarning = toast.type === "warning";

  const opacity = isSwiping ? Math.max(0.2, 1 - Math.abs(offsetX) / 250) : 1;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        transform: `translateX(${offsetX}px)`,
        opacity: isDismissing ? 0 : opacity,
        transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
      }}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-xl animate-in slide-in-from-top-4 fade-in duration-300 select-none ${
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

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="font-heading font-bold text-sm leading-tight">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs mt-1 opacity-90 leading-relaxed break-words">{toast.message}</p>
        )}
      </div>

      {/* Botão explícito de fechar com área de toque mínima de 24x24 px (28x28 px real) */}
      <button
        onClick={handleManualClose}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 active:scale-90 hover:bg-black/10 dark:hover:bg-white/10 transition-all touch-manipulation"
        title="Fechar notificação"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
}

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
          duration: DEFAULT_DURATION,
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
        duration: toastObj.duration ?? DEFAULT_DURATION,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Container de Toasts flutuantes: Topo no mobile com pt-safe para não cobrir BottomNav ou Botão de Ação */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[9999] flex flex-col gap-2.5 w-[92vw] sm:w-auto sm:max-w-sm pointer-events-none pt-[env(safe-area-inset-top,0px)]">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
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
