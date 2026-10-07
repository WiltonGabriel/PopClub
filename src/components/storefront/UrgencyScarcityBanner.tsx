"use client";

import React, { useState, useEffect } from "react";
import { Flame, Timer, Sparkles } from "lucide-react";
import { Product } from "../../services/productService";

interface UrgencyScarcityBannerProps {
  product: Product;
}

export function UrgencyScarcityBanner({ product }: UrgencyScarcityBannerProps) {
  const promo = product.promotion;

  // Extrair propriedades com prioridade para a promoção ativa vinculada
  const showScarcity = Boolean(promo ? promo.showScarcity : product.showScarcity);
  const scarcityUnits = promo?.scarcityUnits ?? product.scarcityUnits;
  const scarcityInitial = promo?.scarcityInitial ?? product.scarcityInitial ?? (scarcityUnits ? Math.max(scarcityUnits, 10) : 10);
  const showProgressBar = promo?.showProgressBar !== undefined ? Boolean(promo.showProgressBar) : (product.showProgressBar !== undefined ? Boolean(product.showProgressBar) : true);

  const showDuration = Boolean(promo ? (promo.showDuration || promo.expiresAt) : (product.showDuration || product.expiresAt));
  const urgencyType = (promo?.urgencyType || product.urgencyType || "date") as "date" | "day" | "session";
  const expiresAt = promo?.expiresAt || product.expiresAt;
  const sessionMinutes = promo?.sessionMinutes || product.sessionMinutes || 45;

  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
    label: string;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
    label: "",
  });

  // Cronômetro em tempo real
  useEffect(() => {
    if (!showDuration) return;

    function calculateRemaining() {
      const now = new Date();
      let targetTime = 0;
      let modeLabel = "Termina em:";

      if (urgencyType === "day") {
        modeLabel = "Válido apenas hoje até o fechamento:";
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        targetTime = endOfDay.getTime();
      } else if (urgencyType === "session") {
        modeLabel = "Oferta reservada para sua sessão:";
        const sessionKey = `pop_session_timer_${product.id}`;
        const storedTarget = typeof window !== "undefined" ? sessionStorage.getItem(sessionKey) : null;
        if (!storedTarget) {
          const newTarget = Date.now() + sessionMinutes * 60 * 1000;
          if (typeof window !== "undefined") sessionStorage.setItem(sessionKey, String(newTarget));
          targetTime = newTarget;
        } else {
          targetTime = parseInt(storedTarget);
        }
      } else {
        // Data limite oficial
        modeLabel = "Oferta por tempo limitado:";
        if (expiresAt) {
          targetTime = new Date(expiresAt).getTime();
        } else {
          // Fallback: fim do dia
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          targetTime = endOfDay.getTime();
        }
      }

      const diff = Math.max(0, targetTime - now.getTime());
      if (diff <= 0) {
        return {
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
          label: "Oferta encerrada",
        };
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        hours,
        minutes,
        seconds,
        expired: false,
        label: modeLabel,
      };
    }

    setTimeLeft(calculateRemaining());
    const interval = setInterval(() => {
      setTimeLeft(calculateRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [showDuration, urgencyType, expiresAt, sessionMinutes, product.id]);

  if (!showScarcity && !showDuration) {
    return null;
  }

  // Progresso do lote reservado
  const remaining = scarcityUnits !== undefined && scarcityUnits !== null ? Math.max(0, scarcityUnits) : null;
  const initial = scarcityInitial && scarcityInitial > 0 ? scarcityInitial : (remaining ? remaining + 5 : 10);
  const claimedPercent = remaining !== null ? Math.min(100, Math.max(10, Math.round(((initial - remaining) / initial) * 100))) : 75;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30 border border-orange-500/30 dark:border-orange-500/20 p-3.5 sm:p-4 space-y-3 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Lado do Estoque / Escassez */}
        {showScarcity && remaining !== null ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            </div>
            <span>
              Restam apenas <strong className="font-extrabold text-orange-700 dark:text-orange-300 font-mono text-sm sm:text-base">{remaining}</strong> unidades com desconto!
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">
            <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Condição Especial PopClub</span>
          </div>
        )}

        {/* Lado do Cronômetro Regressivo */}
        {showDuration && (
          <div className="flex items-center gap-1.5 shrink-0 bg-white/80 dark:bg-black/40 border border-orange-500/20 px-3 py-1.5 rounded-xl shadow-2xs">
            <Timer className="w-3.5 h-3.5 text-red-500 shrink-0 animate-spin" style={{ animationDuration: "12s" }} />
            <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden xs:inline">
              Termina em:
            </span>
            {timeLeft.expired ? (
              <span className="text-xs font-bold text-red-500">Expirada</span>
            ) : (
              <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm text-foreground">
                <span className="bg-orange-500/10 dark:bg-orange-500/20 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-300">
                  {String(timeLeft.hours).padStart(2, "0")}h
                </span>
                <span>:</span>
                <span className="bg-orange-500/10 dark:bg-orange-500/20 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-300">
                  {String(timeLeft.minutes).padStart(2, "0")}m
                </span>
                <span>:</span>
                <span className="bg-red-500/10 dark:bg-red-500/20 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, "0")}s
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de Progresso de Escassez */}
      {showScarcity && showProgressBar && (
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
            <span>🔥 Alta demanda: Lote promocional reservado</span>
            <span className="font-mono">{claimedPercent}% reservado</span>
          </div>
          <div className="w-full h-2 rounded-full bg-orange-200/50 dark:bg-orange-950/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${claimedPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
