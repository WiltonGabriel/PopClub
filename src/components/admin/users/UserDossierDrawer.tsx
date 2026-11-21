"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X, History, RefreshCw, Lock, ShoppingBag, ShieldCheck, KeyRound, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { AdminUserListItem, CustomRoleItem, UserDossier, adminUserService } from "@/services/adminUserService";
import { useToast } from "@/components/ui/ToastNotification";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "./roleColorStyles";

interface UserDossierDrawerProps {
  open: boolean;
  user: AdminUserListItem | null;
  onClose: () => void;
  isAdmin?: boolean;
  customRoles?: CustomRoleItem[];
  activeAdminsCount?: number;
  maxAdmins?: number;
  initialOpenPromote?: boolean;
  onPromoted?: () => Promise<void> | void;
}

export function UserDossierDrawer({
  open,
  user,
  onClose,
  isAdmin = false,
  customRoles = [],
  activeAdminsCount = 1,
  maxAdmins = 2,
  initialOpenPromote = false,
  onPromoted,
}: UserDossierDrawerProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<UserDossier | null>(null);

  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [targetRoleChoice, setTargetRoleChoice] = useState<string>("ADMIN");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setIsPromoteOpen(Boolean(initialOpenPromote));
      setTargetRoleChoice(activeAdminsCount >= maxAdmins ? "EDITOR" : "ADMIN");
      setAdminPassword("");
      setShowAdminPassword(false);
      setPromoteError(null);
    } else {
      setIsPromoteOpen(false);
      setAdminPassword("");
      setPromoteError(null);
    }
  }, [open, user, initialOpenPromote, activeAdminsCount, maxAdmins]);

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
  const isClientAccount = String(user.role).toUpperCase() === "CLIENT";
  const canPromoteClient = isAdmin && isClientAccount && user.isRegistered && user.isActive && !user.isBlocked;
  const adminLimitReached = activeAdminsCount >= maxAdmins;

  const handleConfirmPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setPromoteError("Informe sua senha atual de administrador para autorizar a promoção.");
      return;
    }

    setPromoting(true);
    setPromoteError(null);
    try {
      const isCustomRole = targetRoleChoice.startsWith("custom:");
      const customRoleId = isCustomRole ? targetRoleChoice.replace("custom:", "") : null;
      const role = isCustomRole ? "EDITOR" : targetRoleChoice;

      await adminUserService.updateUser(user.id, {
        role,
        customRoleId,
        adminPassword: adminPassword.trim(),
      });

      showToast({
        type: "success",
        title: "Conta promovida com sucesso!",
        message: `${displayName} agora faz parte da equipe (${role === "ADMIN" ? "Administrador" : "Equipe / Operação"}).`,
      });

      if (onPromoted) {
        await onPromoted();
      }
      onClose();
    } catch (err: unknown) {
      setPromoteError(err instanceof Error ? err.message : "Não foi possível promover a conta.");
    } finally {
      setPromoting(false);
    }
  };

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

          {/* Seção Exclusiva para Administradores: Promover Conta de Cliente Registrado */}
          {isAdmin && isClientAccount && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <span>Promover Conta (Admin / Equipe)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {user.isRegistered
                      ? "Converte este cliente registrado em Administrador ou membro operacional com verificação de segurança."
                      : "Apenas clientes com cadastro completo (e-mail e senha registrados) podem ser promovidos."}
                  </p>
                </div>

                {canPromoteClient && !isPromoteOpen && (
                  <Button
                    type="button"
                    onClick={() => setIsPromoteOpen(true)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Promover Conta</span>
                  </Button>
                )}
              </div>

              {canPromoteClient && isPromoteOpen && (
                <form
                  onSubmit={handleConfirmPromote}
                  className="pt-3 border-t border-primary/20 space-y-3.5 animate-in fade-in duration-150"
                >
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Verificação de Segurança Obrigatória:</strong> Esta operação concede acesso ao painel administrativo. Confirme o cargo de destino e digite sua senha atual de administrador.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="promote-role-select"
                      className="block text-[11px] font-bold uppercase tracking-wider text-foreground"
                    >
                      Cargo de Destino
                    </label>
                    <select
                      id="promote-role-select"
                      value={targetRoleChoice}
                      onChange={(e) => setTargetRoleChoice(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-background border border-gray-200 dark:border-border/50 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <option value="ADMIN" disabled={adminLimitReached}>
                        👑 Administrador (Acesso Total){adminLimitReached ? ` — Limite (${activeAdminsCount}/${maxAdmins})` : ""}
                      </option>
                      <option value="EDITOR">
                        🛠️ Editor / Operação (Permissões Padrão)
                      </option>
                      {customRoles.map((cr) => (
                        <option key={cr.id} value={`custom:${cr.id}`}>
                          🛡️ Cargo: {cr.name} ({cr.permissions.length} permissões)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="promote-admin-password"
                      className="block text-[11px] font-bold uppercase tracking-wider text-foreground"
                    >
                      Sua Senha Atual de Administrador
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="promote-admin-password"
                        type={showAdminPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          if (promoteError) setPromoteError(null);
                        }}
                        placeholder="Digite sua senha de administrador..."
                        className="w-full h-10 pl-9 pr-10 rounded-xl bg-white dark:bg-background border border-gray-200 dark:border-border/50 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword((p) => !p)}
                        aria-label={showAdminPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {promoteError && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-semibold text-red-600 dark:text-red-400">
                      {promoteError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={promoting}
                      onClick={() => {
                        setIsPromoteOpen(false);
                        setAdminPassword("");
                        setPromoteError(null);
                      }}
                      className="min-h-[38px] px-3 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={promoting || !adminPassword.trim()}
                      className="min-h-[38px] px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{promoting ? "Verificando e Promovendo..." : "Confirmar Promoção"}</span>
                    </Button>
                  </div>
                </form>
              )}
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
