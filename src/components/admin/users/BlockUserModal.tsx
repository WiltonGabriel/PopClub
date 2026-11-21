"use client";

import React, { useEffect, useState } from "react";
import { Lock, Unlock, X, AlertTriangle } from "lucide-react";
import { AdminUserListItem, adminUserService } from "@/services/adminUserService";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastNotification";

interface BlockUserModalProps {
  open: boolean;
  user: AdminUserListItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const BLOCK_REASON_SUGGESTIONS = [
  "Suspeita de fraude / chargeback",
  "Solicitação do cliente",
  "Abuso de cancelamentos",
];

export function BlockUserModal({ open, user, onClose, onSuccess }: BlockUserModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason(user?.blockReason || "");
    setErrorMsg(null);
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  if (!open || !user) return null;

  const isCurrentlyBlocked = user.isBlocked;
  const displayName = user.fullName || user.username || "Usuário";

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      const willBlock = !isCurrentlyBlocked;
      await adminUserService.updateUser(user.id, {
        isBlocked: willBlock,
        blockReason: willBlock ? (reason.trim() || "Bloqueio administrativo.") : null,
      });
      showToast({
        title: willBlock ? "Conta bloqueada" : "Conta desbloqueada",
        message: willBlock
          ? `O acesso de ${displayName} foi suspenso imediatamente.`
          : `O acesso de ${displayName} foi restaurado.`,
        type: "success",
      });
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar status de bloqueio.";
      setErrorMsg(msg);
      showToast({ title: "Erro ao atualizar bloqueio", message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-user-title"
      onClick={() => !saving && onClose()}
    >
      <form
        onSubmit={handleConfirm}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isCurrentlyBlocked
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-600 dark:text-red-400"
              }`}
            >
              {isCurrentlyBlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 id="block-user-title" className="font-heading font-bold text-base text-foreground">
                {isCurrentlyBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {isCurrentlyBlocked
                  ? `Restaurar acesso de ${displayName}`
                  : `Suspender acesso de ${displayName}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Fechar janela"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isCurrentlyBlocked ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground space-y-1">
            <p className="font-semibold">A conta voltará a ficar ativa imediatamente.</p>
            {user.blockReason && (
              <p className="text-muted-foreground">
                Motivo registrado: <strong>{user.blockReason}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Sugestões rápidas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_REASON_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setReason(suggestion)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer text-left ${
                      reason === suggestion
                        ? "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40"
                        : "bg-gray-50 dark:bg-background text-muted-foreground border-gray-200 dark:border-border/40 hover:text-foreground"
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="block-reason-textarea" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Motivo do Bloqueio
              </label>
              <textarea
                id="block-reason-textarea"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio administrativo..."
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className={`min-h-[44px] px-5 rounded-xl text-white font-bold cursor-pointer ${
              isCurrentlyBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {saving
              ? "Processando..."
              : isCurrentlyBlocked
              ? "Confirmar Desbloqueio"
              : "Confirmar Bloqueio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
