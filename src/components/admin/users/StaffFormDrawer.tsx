"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, UserPlus, Edit2, Eye, EyeOff, Wand2, AlertTriangle, Crown, Shield, ShieldCheck, CheckCircle2 } from "lucide-react";
import { AdminUserListItem, CustomRoleItem, adminUserService } from "@/services/adminUserService";
import {
  MAX_ACTIVE_ADMINS,
  MAX_MEMBERS_PER_CUSTOM_ROLE,
  describeAccessibleAreas,
  resolveEffectivePermissions,
} from "@/domain/services/RbacDomainService";
import { DEFAULT_EDITOR_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastNotification";
import { PermissionMatrixEditor } from "./PermissionMatrixEditor";
import { generateReadablePassword, getRoleColorStyle } from "./roleColorStyles";

interface StaffFormDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  userToEdit: AdminUserListItem | null;
  initialCustomRoleId?: string | null;
  customRoles: CustomRoleItem[];
  activeAdminsCount: number;
  onSuccess: () => Promise<void> | void;
  onEditLinkedRole?: (role: CustomRoleItem) => void;
}

export function StaffFormDrawer({
  open,
  onClose,
  mode,
  userToEdit,
  initialCustomRoleId = null,
  customRoles,
  activeAdminsCount,
  onSuccess,
  onEditLinkedRole,
}: StaffFormDrawerProps) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [customRoleId, setCustomRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([...DEFAULT_EDITOR_PERMISSIONS]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditingExistingAdmin = mode === "edit" && userToEdit?.role.toUpperCase() === "ADMIN";
  const adminLimitBlocked = !isEditingExistingAdmin && activeAdminsCount >= MAX_ACTIVE_ADMINS;

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setPassword("");
    setShowPassword(false);
    if (mode === "create") {
      const preselected = initialCustomRoleId ? customRoles.find((r) => r.id === initialCustomRoleId) || null : null;
      setFullName("");
      setEmail("");
      setPhone("");
      setRole("EDITOR");
      setCustomRoleId(preselected ? preselected.id : null);
      setPermissions(preselected ? [...preselected.permissions] : [...DEFAULT_EDITOR_PERMISSIONS]);
    } else if (userToEdit) {
      const normalizedRole = userToEdit.role.toUpperCase() === "ADMIN" ? "ADMIN" : "EDITOR";
      setFullName(userToEdit.fullName || userToEdit.username || "");
      setEmail(userToEdit.email || "");
      setPhone(userToEdit.phone || "");
      setRole(normalizedRole);
      setCustomRoleId(normalizedRole === "EDITOR" ? (userToEdit.customRoleId ?? null) : null);
      setPermissions(resolveEffectivePermissions(userToEdit));
    }
  }, [open, mode, userToEdit, initialCustomRoleId, customRoles]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  const selectedCustomRole = useMemo(
    () => (customRoleId ? customRoles.find((r) => r.id === customRoleId) || null : null),
    [customRoleId, customRoles]
  );
  const adminAreas = useMemo(() => describeAccessibleAreas("ADMIN", []), []);

  if (!open) return null;

  const handleSelectRole = (nextType: "ADMIN" | "EDITOR_MODULAR" | string) => {
    if (isEditingExistingAdmin && nextType !== "ADMIN") return;
    if (nextType === "ADMIN") {
      if (!adminLimitBlocked) {
        setRole("ADMIN");
        setCustomRoleId(null);
      }
      return;
    }
    if (nextType === "EDITOR_MODULAR") {
      if (selectedCustomRole) setPermissions([...selectedCustomRole.permissions]);
      setRole("EDITOR");
      setCustomRoleId(null);
      return;
    }
    const found = customRoles.find((r) => r.id === nextType);
    if (!found) return;
    setRole("EDITOR");
    setCustomRoleId(found.id);
    setPermissions([...found.permissions]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (fullName.trim().length < 2) return setFormError("Informe o nome completo (mínimo 2 caracteres).");
    if (!email.trim() && !phone.trim() && (mode === "create" || !userToEdit?.username)) {
      return setFormError("Obrigatório informar ao menos um e-mail ou WhatsApp para login.");
    }
    if (mode === "create" && password.length < 6) return setFormError("A senha inicial deve ter no mínimo 6 caracteres.");
    if (mode === "edit" && password.trim().length > 0 && password.trim().length < 6) return setFormError("A nova senha deve ter no mínimo 6 caracteres se informada.");
    if (role === "ADMIN" && adminLimitBlocked) return setFormError(`Limite máximo de ${MAX_ACTIVE_ADMINS} Administradores ativos atingido.`);

    setSaving(true);
    try {
      if (mode === "create") {
        await adminUserService.createTeamMember({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          password,
          role,
          customRoleId: role === "EDITOR" ? customRoleId : null,
          permissions: role === "EDITOR" && !customRoleId ? permissions : undefined,
        });
        showToast({ title: "Colaborador criado!", message: `${fullName.trim()} adicionado à equipe.`, type: "success" });
      } else if (userToEdit) {
        await adminUserService.updateUser(userToEdit.id, {
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          password: password.trim() ? password.trim() : undefined,
          role,
          customRoleId: role === "EDITOR" ? customRoleId : null,
          permissions: role === "EDITOR" && !customRoleId ? permissions : undefined,
        });
        showToast({ title: "Alterações salvas", message: `Perfil de ${fullName.trim()} atualizado.`, type: "success" });
      }
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar colaborador.";
      setFormError(msg);
      showToast({ title: "Falha ao salvar", message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="staff-drawer-title" onClick={() => !saving && onClose()}>
      <div className="bg-card border-l border-border w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50/70 dark:bg-background/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {mode === "create" ? <UserPlus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 id="staff-drawer-title" className="font-heading font-bold text-base text-foreground truncate">
                {mode === "create" ? "Novo Colaborador da Equipe" : `Gerenciar: ${userToEdit?.fullName || userToEdit?.username || "Colaborador"}`}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {mode === "create" ? "Defina login, cargo e módulos liberados." : "Edite dados cadastrais, vínculo de cargo e permissões."}
              </p>
            </div>
          </div>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Fechar gaveta" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="staff-member-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {formError && (
            <div role="alert" aria-live="assertive" className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" /><span>{formError}</span>
            </div>
          )}

          <section className="space-y-4">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">1. Dados & Credenciais de Acesso</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="staff-fullname" className="block text-xs font-bold text-foreground mb-1.5">Nome Completo <span aria-hidden="true" className="text-red-500">*</span></label>
                <input id="staff-fullname" type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: Maria Clara Oliveira" className="w-full h-11 px-3.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary" />
              </div>
              <div>
                <label htmlFor="staff-email" className="block text-xs font-bold text-foreground mb-1.5">E-mail de Login</label>
                <input id="staff-email" type="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="equipe@popshake.com" className="w-full h-11 px-3.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary" />
              </div>
              <div>
                <label htmlFor="staff-phone" className="block text-xs font-bold text-foreground mb-1.5">WhatsApp / Telefone</label>
                <input id="staff-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full h-11 px-3.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary" />
              </div>
              <p className="sm:col-span-2 text-[11px] text-muted-foreground">Obrigatório informar ao menos um e-mail ou WhatsApp para login.</p>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label htmlFor="staff-password" className="block text-xs font-bold text-foreground">{mode === "create" ? "Senha de Acesso *" : "Nova Senha (opcional)"}</label>
                  <button type="button" onClick={() => { setPassword(generateReadablePassword(10)); setShowPassword(true); }} className="min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 cursor-pointer">
                    <Wand2 className="w-3.5 h-3.5" /> Gerar senha
                  </button>
                </div>
                <div className="relative">
                  <input id="staff-password" type={showPassword ? "text" : "password"} required={mode === "create"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "create" ? "Mínimo 6 caracteres" : "Deixe em branco para manter a senha atual"} className="w-full h-11 pl-3.5 pr-12 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary" />
                  <button type="button" aria-pressed={showPassword} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((p) => !p)} className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <fieldset className="space-y-3 pt-4 border-t border-border/40">
            <legend className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">2. Perfil & Cargo</legend>
            {isEditingExistingAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 font-medium">
                O cargo de Administrador é soberano e imutável.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button type="button" disabled={adminLimitBlocked} onClick={() => handleSelectRole("ADMIN")} className={`min-h-[44px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${role === "ADMIN" ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30" : "bg-gray-50/70 dark:bg-background/40 border-gray-200 dark:border-border/40 hover:border-gray-300"}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-bold text-xs text-foreground inline-flex items-center gap-1.5"><Crown className="w-4 h-4 text-amber-500" /> Administrador</span><span className="text-[10px] font-mono font-bold text-muted-foreground">{activeAdminsCount}/{MAX_ACTIVE_ADMINS}</span></div>
                <span className="text-[11px] text-muted-foreground block mt-1">{adminLimitBlocked ? "Limite de administradores atingido" : "Acesso total e irrestrito"}</span>
              </button>
              <button type="button" disabled={isEditingExistingAdmin} onClick={() => handleSelectRole("EDITOR_MODULAR")} className={`min-h-[44px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${role === "EDITOR" && !customRoleId ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/30" : "bg-gray-50/70 dark:bg-background/40 border-gray-200 dark:border-border/40 hover:border-gray-300"}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-bold text-xs text-foreground inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-indigo-500" /> Editor Modular</span><span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Sob medida</span></div>
                <span className="text-[11px] text-muted-foreground block mt-1">Permissões individuais na matriz</span>
              </button>
              {customRoles.map((cr) => {
                const membersCount = cr._count?.users ?? 0;
                const isAlreadyAssigned = mode === "edit" && userToEdit?.customRoleId === cr.id;
                const isFull = membersCount >= MAX_MEMBERS_PER_CUSTOM_ROLE && !isAlreadyAssigned;
                const colorStyle = getRoleColorStyle(cr.color);
                const selected = role === "EDITOR" && customRoleId === cr.id;
                return (
                  <button key={cr.id} type="button" disabled={isEditingExistingAdmin || isFull} onClick={() => handleSelectRole(cr.id)} className={`min-h-[44px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${selected ? "bg-primary/10 border-primary ring-1 ring-primary/30" : "bg-gray-50/70 dark:bg-background/40 border-gray-200 dark:border-border/40 hover:border-gray-300"}`}>
                    <div className="flex items-center justify-between gap-2"><span className="font-bold text-xs text-foreground inline-flex items-center gap-1.5 truncate"><span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorStyle.dot}`} /><span className="truncate">{cr.name}</span></span><span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">{membersCount}/{MAX_MEMBERS_PER_CUSTOM_ROLE}</span></div>
                    <span className="text-[11px] text-muted-foreground block mt-1">{isFull ? "Cargo com lotação máxima" : `${cr.permissions.length} módulos herdados`}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <section className="space-y-3 pt-4 border-t border-border/40">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">3. Permissões & Preview de Telas</h4>
            {role === "ADMIN" ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs"><Shield className="w-4 h-4 shrink-0" /><span>Administrador possui acesso completo, Auditoria & Logs e Gestão da Equipe.</span></div>
                <div className="flex flex-wrap gap-2">
                  {adminAreas.map((area) => (
                    <span key={area.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-[#1E091B] border border-amber-300/60 dark:border-amber-800/50 text-xs font-medium text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {area.title}</span>
                  ))}
                </div>
              </div>
            ) : selectedCustomRole ? (
              <PermissionMatrixEditor role="EDITOR" selectedPermissions={selectedCustomRole.permissions} readOnly readOnlyReason={`Permissões herdadas automaticamente do cargo "${selectedCustomRole.name}".`} onEditLinkedRole={onEditLinkedRole ? () => { onClose(); onEditLinkedRole(selectedCustomRole); } : undefined} />
            ) : (
              <PermissionMatrixEditor role="EDITOR" selectedPermissions={permissions} onChange={setPermissions} previousPermissions={mode === "edit" && userToEdit ? resolveEffectivePermissions(userToEdit) : undefined} />
            )}
          </section>
        </form>

        <div className="px-6 py-4 border-t border-border/50 bg-gray-50/70 dark:bg-background/40 flex justify-end gap-2.5 shrink-0">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose} className="min-h-[44px] px-4 rounded-xl cursor-pointer">Cancelar</Button>
          <Button type="submit" form="staff-member-form" disabled={saving} className="min-h-[44px] px-5 rounded-xl bg-primary text-white font-bold cursor-pointer">
            {saving ? "Salvando..." : mode === "create" ? "Criar Colaborador" : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
