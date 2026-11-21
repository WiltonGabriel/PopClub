"use client";

import React, { useMemo } from "react";
import { CheckCircle2, Info, Lock, PlusCircle, MinusCircle, Shield, Sparkles } from "lucide-react";
import {
  PERMISSION_UI_GROUPS,
  ROLE_TEMPLATES,
  computePermissionDiff,
  describeAccessibleAreas,
} from "@/domain/services/RbacDomainService";
import { ALL_PERMISSIONS, PERMISSION_DEFINITIONS, PermissionKey } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

interface PermissionMatrixEditorProps {
  role: "ADMIN" | "EDITOR";
  selectedPermissions: string[];
  onChange?: (nextPermissions: string[]) => void;
  readOnly?: boolean;
  readOnlyReason?: string;
  onEditLinkedRole?: () => void;
  previousPermissions?: string[];
}

const PERM_LABEL_MAP = new Map<string, string>(PERMISSION_DEFINITIONS.map((p) => [p.id, p.label]));

export function PermissionMatrixEditor({
  role,
  selectedPermissions,
  onChange,
  readOnly = false,
  readOnlyReason,
  onEditLinkedRole,
  previousPermissions,
}: PermissionMatrixEditorProps) {
  const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);
  const accessibleAreas = useMemo(
    () => describeAccessibleAreas(role, selectedPermissions),
    [role, selectedPermissions]
  );
  const diff = useMemo(
    () => (previousPermissions ? computePermissionDiff(previousPermissions, selectedPermissions) : null),
    [previousPermissions, selectedPermissions]
  );
  const hasDiff = Boolean(diff && (diff.added.length > 0 || diff.removed.length > 0));

  const toggleSingle = (permId: PermissionKey) => {
    if (readOnly || !onChange) return;
    onChange(selectedSet.has(permId) ? selectedPermissions.filter((p) => p !== permId) : [...selectedPermissions, permId]);
  };

  const toggleGroup = (groupPermIds: PermissionKey[]) => {
    if (readOnly || !onChange) return;
    const allSelected = groupPermIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      const groupSet = new Set<string>(groupPermIds);
      onChange(selectedPermissions.filter((p) => !groupSet.has(p)));
    } else {
      onChange(Array.from(new Set<string>([...selectedPermissions, ...groupPermIds])));
    }
  };

  const isTemplateActive = (templatePerms: PermissionKey[]) =>
    templatePerms.length === selectedPermissions.length && templatePerms.every((p) => selectedSet.has(p));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <h4 className="font-heading font-bold text-sm text-foreground">Matriz de Permissões</h4>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
          {selectedPermissions.length} de {ALL_PERMISSIONS.length} permissões ativas
        </span>
      </div>

      {readOnly && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
              {readOnlyReason || "Permissões bloqueadas para edição direta."}
            </p>
          </div>
          {onEditLinkedRole && (
            <Button
              type="button"
              variant="outline"
              onClick={onEditLinkedRole}
              className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 shrink-0 cursor-pointer"
            >
              Editar cargo
            </Button>
          )}
        </div>
      )}

      {!readOnly && onChange && (
        <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-background/50 border border-gray-200 dark:border-border/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Modelos Rápidos (1 clique)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange([...ALL_PERMISSIONS])}
                className="min-h-[44px] px-3 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                Marcar Todas
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="min-h-[44px] px-3 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_TEMPLATES.map((tpl) => {
              const active = isTemplateActive(tpl.permissions);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  title={tpl.description}
                  onClick={() => onChange([...tpl.permissions])}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-left ${
                    active
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-white dark:bg-[#230E26] text-foreground border-gray-200 dark:border-border/40 hover:border-primary/50"
                  }`}
                >
                  {tpl.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5">
        {PERMISSION_UI_GROUPS.map((group) => {
          const groupIds = group.permissions.map((p) => p.id);
          const activeInGroup = groupIds.filter((id) => selectedSet.has(id)).length;
          const allGroupSelected = activeInGroup === groupIds.length && groupIds.length > 0;

          return (
            <div key={group.id} className="rounded-2xl border border-gray-200 dark:border-border/40 bg-white dark:bg-[#230E26] overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/80 dark:bg-background/40 border-b border-gray-100 dark:border-border/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-heading font-bold text-xs sm:text-sm text-foreground">{group.label}</h5>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-white/10 text-foreground">
                      {activeInGroup}/{groupIds.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{group.description}</p>
                </div>
                {!readOnly && onChange && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupIds)}
                    aria-pressed={allGroupSelected}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border shrink-0 transition-colors cursor-pointer ${
                      allGroupSelected
                        ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                        : "bg-white dark:bg-background text-muted-foreground border-gray-200 dark:border-border/40 hover:text-foreground"
                    }`}
                  >
                    {allGroupSelected ? "Desmarcar" : "Todos"}
                  </button>
                )}
              </div>

              <div className="p-3 grid grid-cols-1 gap-2">
                {group.permissions.map((perm) => {
                  const checked = selectedSet.has(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className={`min-h-[44px] flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        readOnly ? "cursor-default opacity-90" : "cursor-pointer"
                      } ${
                        checked
                          ? "bg-primary/5 border-primary/40 text-foreground"
                          : "bg-gray-50/50 dark:bg-background/30 border-gray-200/80 dark:border-border/30 text-muted-foreground hover:border-gray-300 dark:hover:border-border/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={() => toggleSingle(perm.id)}
                        className="mt-1 w-4 h-4 rounded accent-primary focus-visible:outline-2 focus-visible:outline-primary shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-foreground">{perm.label}</span>
                          {perm.id === "STOCK_CONTROL" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Tela de Estoque
                            </span>
                          )}
                          {perm.id === "users_manage" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                              Apenas Clientes
                            </span>
                          )}
                          {perm.id === "storefront_edit" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                              Vitrine (/)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">{perm.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-2.5">
        <h5 className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>O que este perfil acessa</span>
        </h5>
        {accessibleAreas.length === 0 ? (
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Nenhuma tela administrativa selecionada. Este colaborador terá acesso apenas à conta pessoal.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accessibleAreas.map((area) => (
              <div
                key={area.id}
                title={`${area.route} — ${area.detail}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1E091B] border border-emerald-300/80 dark:border-emerald-800/60 text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">{area.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{area.route}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasDiff && diff && (
        <div className="rounded-2xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
            Alterações pendentes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {diff.added.map((permId) => (
              <span key={`add-${permId}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <PlusCircle className="w-3 h-3 shrink-0" />
                <span>Ganha {PERM_LABEL_MAP.get(permId) || permId}</span>
              </span>
            ))}
            {diff.removed.map((permId) => (
              <span key={`rem-${permId}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                <MinusCircle className="w-3 h-3 shrink-0" />
                <span>Perde {PERM_LABEL_MAP.get(permId) || permId}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
