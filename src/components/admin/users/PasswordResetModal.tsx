"use client";

import React, { useEffect, useState } from "react";
import { Key, Eye, EyeOff, Wand2, X, AlertTriangle } from "lucide-react";
import { AdminUserListItem, adminUserService } from "@/services/adminUserService";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastNotification";
import { generateReadablePassword } from "./roleColorStyles";

interface PasswordResetModalProps {
  open: boolean;
  user: AdminUserListItem | null;
  onClose: () => void;
}

export function PasswordResetModal({ open, user, onClose }: PasswordResetModalProps) {
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNewPassword("");
    setShowPassword(false);
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

  const displayName = user.fullName || user.username || "Usuário";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setSaving(true);
    try {
      await adminUserService.updateUser(user.id, { password: newPassword });
      showToast({
        title: "Senha redefinida!",
        message: `A senha de ${displayName} foi atualizada com sucesso.`,
        type: "success",
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao resetar senha.";
      setErrorMsg(msg);
      showToast({ title: "Erro ao resetar senha", message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-reset-title"
      onClick={() => !saving && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="password-reset-title" className="font-heading font-bold text-base text-foreground">
                Resetar Senha
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {displayName} {user.email ? `· ${user.email}` : ""}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="reset-password-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nova Senha (mín. 6 caracteres)
            </label>
            <button
              type="button"
              onClick={() => {
                setNewPassword(generateReadablePassword(10));
                setShowPassword(true);
              }}
              className="min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Gerar senha
            </button>
          </div>

          <div className="relative">
            <input
              id="reset-password-input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha"
              className="w-full h-11 pl-3.5 pr-12 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
            <button
              type="button"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

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
            className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer"
          >
            {saving ? "Salvando..." : "Confirmar Nova Senha"}
          </Button>
        </div>
      </form>
    </div>
  );
}
