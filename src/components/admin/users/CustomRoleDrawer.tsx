"use client";

import React, { useEffect, useState } from "react";
import { X, Shield, Check, AlertTriangle } from "lucide-react";
import { CustomRoleItem, adminUserService } from "@/services/adminUserService";
import { DEFAULT_EDITOR_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastNotification";
import { ROLE_COLOR_STYLES } from "./roleColorStyles";
import { PermissionMatrixEditor } from "./PermissionMatrixEditor";

interface CustomRoleDrawerProps {
  open: boolean;
  onClose: () => void;
  roleToEdit: CustomRoleItem | null;
  onSuccess: () => Promise<void> | void;
}

export function CustomRoleDrawer({
  open,
  onClose,
  roleToEdit,
  onSuccess,
}: CustomRoleDrawerProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [permissions, setPermissions] = useState<string[]>([...DEFAULT_EDITOR_PERMISSIONS]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const membersCount = roleToEdit?._count?.users ?? 0;

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (roleToEdit) {
      setName(roleToEdit.name);
      setColor(roleToEdit.color || "blue");
      setPermissions(Array.isArray(roleToEdit.permissions) ? [...roleToEdit.permissions] : []);
    } else {
      setName("");
      setColor("blue");
      setPermissions([...DEFAULT_EDITOR_PERMISSIONS]);
    }
  }, [open, roleToEdit]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (name.trim().length < 2) {
      setFormError("O nome do cargo deve ter ao menos 2 caracteres.");
      return;
    }

    setSaving(true);
    try {
      if (roleToEdit) {
        await adminUserService.updateCustomRole(roleToEdit.id, {
          name: name.trim(),
          color,
          permissions,
        });
        showToast({
          title: "Cargo atualizado!",
          message: `Cargo "${name.trim()}" atualizado e sincronizado.`,
          type: "success",
        });
      } else {
        await adminUserService.createCustomRole({
          name: name.trim(),
          color,
          permissions,
        });
        showToast({
          title: "Cargo criado!",
          message: `Cargo "${name.trim()}" criado com sucesso.`,
          type: "success",
        });
      }
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar cargo personalizado.";
      setFormError(msg);
      showToast({ title: "Erro ao salvar cargo", message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-role-drawer-title"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-card border-l border-border w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50/70 dark:bg-background/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="custom-role-drawer-title" className="font-heading font-bold text-base text-foreground truncate">
                {roleToEdit ? `Editar Cargo: ${roleToEdit.name}` : "Novo Cargo Personalizado"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Defina nome, cor do badge e matriz de acessos reutilizável.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Fechar gaveta"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="custom-role-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {formError && (
            <div role="alert" aria-live="assertive" className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {roleToEdit && membersCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Este cargo possui <strong>{membersCount}</strong> {membersCount === 1 ? "membro vinculado" : "membros vinculados"}. As alterações serão sincronizadas imediatamente para todos eles.
              </span>
            </div>
          )}

          <div>
            <label htmlFor="custom-role-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Nome do Cargo <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="custom-role-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Atendente de Balcão"
              className="w-full h-11 px-3.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>

          <fieldset>
            <legend className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Cor do Badge de Identificação
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(ROLE_COLOR_STYLES).map(([key, style]) => {
                const isSelected = color === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setColor(key)}
                    className={`min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? `ring-2 ring-primary border-primary ${style.bg} ${style.text}`
                        : "border-gray-200 dark:border-border/40 hover:border-gray-300 text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${style.dot}`} />
                      <span className="truncate">{style.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="pt-3 border-t border-border/40">
            <PermissionMatrixEditor
              role="EDITOR"
              selectedPermissions={permissions}
              onChange={setPermissions}
              previousPermissions={roleToEdit?.permissions}
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-border/50 bg-gray-50/70 dark:bg-background/40 flex justify-end gap-2.5 shrink-0">
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
            form="custom-role-form"
            disabled={saving}
            className="min-h-[44px] px-5 rounded-xl bg-primary text-white font-bold cursor-pointer"
          >
            {saving ? "Salvando..." : roleToEdit ? "Salvar Cargo" : "Criar Cargo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
