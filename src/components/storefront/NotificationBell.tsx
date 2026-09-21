"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Ticket,
  Check,
  Copy,
  ArrowRight,
  Sparkles,
  CheckCheck,
  Clock,
  Inbox,
} from "lucide-react";
import { notificationService, AppNotification } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../ui/ToastNotification";
import { playDingSound } from "../../lib/sound";
import { CompleteRegistrationModal } from "@/components/auth/CompleteRegistrationModal";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);
  const [isCompleteRegModalOpen, setIsCompleteRegModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const data = await notificationService.getNotifications();
      // Filtra estritamente as novas e não lidas para exibição rápida no dropdown da Home
      const unreadList = data.notifications.filter((n) => !n.isRead);
      setNotifications(unreadList);
      setUnreadCount(data.unreadCount);
      setNotificationsEnabled(data.notificationsEnabled);
    } catch (err) {
      console.error("Erro ao carregar notificações no sino:", err);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Polling a cada 30s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (notification: AppNotification) => {
    try {
      await notificationService.markAsRead(notification.id);
      // Remove da gaveta de não lidas e atualiza contador
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCoupon = (e: React.MouseEvent, code: string, notification: AppNotification) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCouponId(notification.id);
    playDingSound();
    showToast(`Cupom ${code} copiado com sucesso!`, "success");
    handleMarkAsRead(notification);
    setTimeout(() => setCopiedCouponId(null), 2500);
  };

  const handleApplyCouponToCart = (e: React.MouseEvent, code: string, notification: AppNotification) => {
    e.stopPropagation();
    handleMarkAsRead(notification);
    setIsOpen(false);
    showToast(`Cupom ${code} pronto para uso no carrinho!`, "success");
    // Salva no storage de cupom ativo para o checkout resgatar
    try {
      localStorage.setItem("popclub_applied_coupon", code);
      window.dispatchEvent(new CustomEvent("popclub_coupon_applied", { detail: { code } }));
    } catch {}
    router.push("/carrinho");
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
      showToast("Todas as notificações foram marcadas como lidas.", "info");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Se o usuário desativou notificações em preferências, a badge não deve vibrar/aparecer
  const showBadge = notificationsEnabled && unreadCount > 0;

  return (
    <div className="relative shrink-0" ref={containerRef}>
      {/* Botão Sino */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={`Notificações${unreadCount > 0 ? `: ${unreadCount} não lidas` : ""}`}
        title={unreadCount > 0 ? `${unreadCount} nova(s) notificação(ões)` : "Notificações"}
        className={`
          relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border transition-all cursor-pointer select-none
          ${
            isOpen
              ? "bg-[#9306CF]/15 border-[#9306CF] text-[#9306CF] dark:text-[#F9F5F9] ring-2 ring-[#9306CF]/30 shadow-md"
              : "bg-white/70 dark:bg-[#230E26]/70 border-border/60 hover:border-[#9306CF]/50 text-gray-700 dark:text-gray-200 hover:text-[#9306CF] dark:hover:text-white hover:bg-muted/80 shadow-xs"
          }
        `}
      >
        <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${unreadCount > 0 ? "animate-pulse" : ""}`} />

        {/* Badge vibrante estritamente para não lidas */}
        {showBadge && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 to-fuchsia-600 text-white text-[11px] font-black leading-none shadow-sm shadow-fuchsia-500/40 border-2 border-background animate-in zoom-in-75 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown / Gaveta Flutuante de Novas e Não Lidas */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/50 shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Topo da Gaveta */}
          <div className="p-3.5 sm:p-4 border-b border-gray-100 dark:border-[#512B54]/30 flex items-center justify-between bg-gray-50/70 dark:bg-[#1C0920]/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#9306CF]/15 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4C264F] dark:text-[#F9F5F9]">
                  Novidades & Alertas
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} aviso(s) não lido(s)` : "Nenhum novo aviso"}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] font-semibold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar lidas
              </button>
            )}
          </div>

          {/* Card de Boas-vindas para clientes em Acesso Rápido */}
          {user && !user.isRegistered && (
            <div className="p-3.5 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border-b border-purple-200/50 dark:border-purple-900/40 flex flex-col gap-2">
              <p className="text-xs text-foreground leading-relaxed">
                🎁 <strong>Seja bem-vindo ao PopShake!</strong> Complete seu cadastro adicionando e-mail e senha para liberar cupons de desconto e ofertas exclusivas.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsCompleteRegModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] text-white text-[11px] font-bold shadow-xs hover:opacity-95 transition-opacity cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Completar meu cadastro
                </button>
              </div>
            </div>
          )}

          {/* Lista de Não Lidas */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-[#512B54]/20">
            {notifications.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-[#9306CF] dark:text-[#C7A9C9]">
                  <Inbox className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tudo limpo por aqui!
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  Você não possui notificações não lidas no momento.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif)}
                  className="p-3.5 hover:bg-gray-50/80 dark:hover:bg-[#1A081E]/60 transition-colors cursor-pointer group relative"
                >
                  {/* Ponto indicador de não lida */}
                  <span className="absolute left-2.5 top-4.5 w-2 h-2 rounded-full bg-pink-500 shadow-xs shadow-pink-500/50" />

                  <div className="pl-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-heading font-bold text-xs text-[#4C264F] dark:text-[#F9F5F9] leading-snug">
                        {notif.title}
                      </h5>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                      {notif.message}
                    </p>

                    {/* Card de Cupom Anexado se houver */}
                    {notif.coupon && (
                      <div className="mt-2 p-2.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-[#9306CF]/30 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-black text-[#9306CF] dark:text-[#C7A9C9]">
                            <Ticket className="w-3.5 h-3.5 text-[#9306CF]" />
                            {notif.coupon.code}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {notif.coupon.discountType === "percentage"
                              ? `${notif.coupon.discountValue}% OFF`
                              : `R$ ${notif.coupon.discountValue.toFixed(2).replace(".", ",")} OFF`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-purple-200/50 dark:border-purple-800/30">
                          <button
                            type="button"
                            onClick={(e) => handleCopyCoupon(e, notif.coupon!.code, notif)}
                            className="flex-1 py-1 px-2 rounded-lg bg-white dark:bg-[#200B22] border border-purple-200 dark:border-purple-800/50 text-[11px] font-bold text-[#4C264F] dark:text-[#F9F5F9] hover:bg-purple-100 dark:hover:bg-purple-900/40 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedCouponId === notif.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#9306CF]" /> Copiar
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleApplyCouponToCart(e, notif.coupon!.code, notif)}
                            className="flex-1 py-1 px-2 rounded-lg bg-gradient-to-r from-[#9306CF] to-[#940068] text-[11px] font-bold text-white hover:opacity-95 flex items-center justify-center gap-1 shadow-xs transition-opacity cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" /> Aplicar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé com Link Direto para Meu Perfil */}
          <div className="p-3 bg-gray-50/80 dark:bg-[#1C0920]/90 border-t border-gray-100 dark:border-[#512B54]/30 text-center">
            <Link
              href="/conta?tab=notificacoes"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9306CF] dark:text-[#C7A9C9] hover:text-[#4C264F] dark:hover:text-white transition-colors"
            >
              <span>Ver histórico completo em Meu Perfil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <CompleteRegistrationModal
        isOpen={isCompleteRegModalOpen}
        onClose={() => setIsCompleteRegModalOpen(false)}
        onSuccess={loadNotifications}
      />
    </div>
  );
}
