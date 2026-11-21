"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X, History, RefreshCw, Lock, ShoppingBag } from "lucide-react";
import { AdminUserListItem, UserDossier, adminUserService } from "@/services/adminUserService";
import { useToast } from "@/components/ui/ToastNotification";
import { formatShortDate } from "./roleColorStyles";

interface UserDossierDrawerProps {
  open: boolean;
  user: AdminUserListItem | null;
  onClose: () => void;
}

export function UserDossierDrawer({ open, user, onClose }: UserDossierDrawerProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<UserDossier | null>(null);

  useEffect(() => {
    if (!open || !user) {
      setDossier(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    adminUserService
      .getUserHistory(user.id)
      .then((data) => {
        if (!cancelled) setDossier(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          showToast({
            title: "Erro ao carregar dossiê",
            message: err instanceof Error ? err.message : "Não foi possível carregar o histórico.",
            type: "error",
          });
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user, showToast, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !user) return null;

  const displayName = user.fullName || user.username || "Usuário";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-drawer-title"
      onClick={onClose}
    >
      <div
        className="bg-card border-l border-border w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50/70 dark:bg-background/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="dossier-drawer-title" className="font-heading font-bold text-base text-foreground truncate">
                Dossiê do Usuário
              </h3>
              <p className="text-xs text-muted-foreground truncate">{displayName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar dossiê"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Resumo da Conta */}
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-border/40 bg-gray-50/60 dark:bg-background/30 flex items-center gap-3.5">
            <Image
              src={user.avatarUrl || "/avatars/avatar-sorvete.svg"}
              alt={displayName}
              width={48}
              height={48}
              unoptimized
              className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-border/40 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-foreground truncate">{displayName}</span>
                {user.isBlocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    <Lock className="w-3 h-3" />
                    Bloqueado
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {[user.email, user.phone].filter(Boolean).join(" • ") || "Sem contato registrado"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Conta criada em <span className="font-mono">{formatShortDate(user.createdAt)}</span>
              </p>
            </div>
          </div>

          {user.isBlocked && user.blockReason && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300">
              <strong>Motivo do bloqueio:</strong> {user.blockReason}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
              <p className="text-xs">Carregando histórico analítico...</p>
            </div>
          ) : dossier ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-border/40 bg-gray-50/60 dark:bg-background/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Total de Pedidos
                  </span>
                  <span className="font-heading font-bold text-lg text-foreground mt-0.5 block">
                    {dossier.metrics.totalOrders}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {dossier.metrics.completedOrders} concl. · {dossier.metrics.cancelledOrders} canc.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-border/40 bg-gray-50/60 dark:bg-background/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Gasto Total
                  </span>
                  <span className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    R$ {dossier.metrics.totalSpent.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-border/40 bg-gray-50/60 dark:bg-background/40 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Ticket Médio
                  </span>
                  <span className="font-heading font-bold text-lg text-primary mt-0.5 block">
                    R$ {dossier.metrics.averageTicket.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                  <span>Histórico de Pedidos ({dossier.orders.length})</span>
                </h4>

                {dossier.orders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-gray-200 dark:border-border/40 rounded-2xl">
                    Nenhum pedido registrado para este usuário.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dossier.orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-xl border border-gray-200 dark:border-border/40 bg-gray-50/40 dark:bg-background/20 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-foreground">
                            Pedido #{ord.id.slice(0, 8)}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {formatShortDate(ord.createdAt)} · {ord.status}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {ord.items.map((item) => (
                            <div key={item.id} className="flex justify-between">
                              <span>
                                {item.quantity}x {item.productName}
                              </span>
                              <span className="font-mono">
                                R$ {(item.priceAtTime * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-border/30 flex justify-between items-center text-xs font-bold text-foreground">
                          <span>Total Pago:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                            R$ {ord.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Informações indisponíveis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
