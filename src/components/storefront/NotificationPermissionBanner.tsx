"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle2 } from "lucide-react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendWebNotification,
} from "@/lib/notifications";
import { playDingSound, initAudioUnlock } from "@/lib/sound";
import { useToast } from "@/components/ui/ToastNotification";

interface NotificationPermissionBannerProps {
  className?: string;
  onActivated?: () => void;
}

export function NotificationPermissionBanner({
  className = "",
  onActivated,
}: NotificationPermissionBannerProps) {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    initAudioUnlock();

    if (!isNotificationSupported()) return;

    const dismissed = sessionStorage.getItem("popshake_dismiss_notif_banner");
    if (!dismissed && Notification.permission === "default") {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("popshake_dismiss_notif_banner", "true");
  };

  const handleEnableNotifications = async () => {
    setRequesting(true);
    try {
      const permission = await requestNotificationPermission();

      if (permission === "granted") {
        playDingSound();
        showToast({
          title: "Notificações Ativadas! 🔔",
          message: "Você receberá avisos em tempo real a cada avanço do seu pedido.",
          type: "success",
          duration: 6000,
        });

        // Teste amigável imediato
        await sendWebNotification("Pop Shake Sorveteria 🍧", {
          body: "Notificações ativadas! Você será avisado quando o status do pedido mudar.",
          icon: "/icon.png",
        });

        setVisible(false);
        onActivated?.();
      } else if (permission === "denied") {
        showToast({
          title: "Notificações Não Autorizadas",
          message: "Você pode permitir as notificações clicando no cadeado ao lado do endereço do site.",
          type: "warning",
          duration: 7000,
        });
        setVisible(false);
      }
    } catch (err) {
      console.error("Erro ao ativar notificações:", err);
    } finally {
      setRequesting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`relative p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-[#9306CF]/10 via-[#940068]/10 to-purple-500/5 dark:from-[#9306CF]/20 dark:via-[#940068]/20 dark:to-transparent border-2 border-[#9306CF]/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9306CF] to-[#940068] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#9306CF]/20 mt-0.5">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>

        <div className="space-y-0.5 min-w-0">
          <h4 className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] leading-tight">
            Acompanhamento em Tempo Real
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deseja receber avisos quando seu pedido mudar de status? (Mesmo em segundo plano)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/60 transition-colors"
        >
          Agora não
        </button>

        <button
          type="button"
          disabled={requesting}
          onClick={handleEnableNotifications}
          className="px-4 py-2 bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm shadow-[#9306CF]/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{requesting ? "Ativando..." : "Ativar Notificações"}</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors hidden sm:inline-flex"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
