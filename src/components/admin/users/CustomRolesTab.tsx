"use client";

import React from "react";
import { Shield, Plus, UserPlus, Edit2, Trash2, Crown, ShieldCheck, RefreshCw } from "lucide-react";
import { CustomRoleItem } from "@/services/adminUserService";
import {
  MAX_ACTIVE_ADMINS,
  MAX_CUSTOM_ROLES,
  MAX_MEMBERS_PER_CUSTOM_ROLE,
  isCustomRoleLimitReached,
} from "@/domain/services/RbacDomainService";
import { ALL_PERMISSIONS, PERMISSION_DEFINITIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { getRoleColorStyle } from "./roleColorStyles";

interface CustomRolesTabProps {
  customRoles: CustomRoleItem[];
  loading: boolean;
  onCreateRole: () => void;
  onEditRole: (role: CustomRoleItem) => void;
  onDeleteRole: (role: CustomRoleItem) => void;
  onCreateMemberWithRole: (roleId: string) => void;
}

const PERMISSION_LABEL_BY_ID = new Map<string, string>(
  PERMISSION_DEFINITIONS.map((p) => [p.id, p.label])
);

export function CustomRolesTab({
  customRoles,
  loading,
  onCreateRole,
  onEditRole,
  onDeleteRole,
  onCreateMemberWithRole,
}: CustomRolesTabProps) {
  const limitReached = isCustomRoleLimitReached(customRoles.length);

  return (
    <div className="space-y-6">
      {/* Banner superior */}
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">
              Cargos Criados: {customRoles.length} de {MAX_CUSTOM_ROLES} permitidos
            </h3>
            <p className="text-xs text-muted-foreground">
              Até {MAX_MEMBERS_PER_CUSTOM_ROLE} membros por cargo · Alterar um cargo sincroniza todos os colaboradores vinculados.
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={limitReached}
          onClick={onCreateRole}
          title={limitReached ? `Limite máximo de ${MAX_CUSTOM_ROLES} cargos personalizados atingido.` : "Criar novo cargo personalizado"}
          className="min-h-[44px] px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Cargo</span>
        </Button>
      </div>

      {/* Grid de Cargos Personalizados */}
      {loading && customRoles.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground space-y-2 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-xs">Carregando cargos personalizados...</p>
        </div>
      ) : customRoles.length === 0 ? (
        <div className="py-12 text-center space-y-3 px-4 bg-white dark:bg-[#230E26] border border-dashed border-gray-300 dark:border-border/50 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h4 className="font-heading font-bold text-sm text-foreground">
            Nenhum cargo personalizado criado
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Crie cargos como Atendente de Balcão, Estoquista ou Gerente de Turno para atribuir permissões padronizadas com 1 clique.
          </p>
          <Button
            type="button"
            onClick={onCreateRole}
            className="min-h-[44px] px-5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
          >
            Criar Primeiro Cargo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customRoles.map((role) => {
            const colorStyle = getRoleColorStyle(role.color);
            const membersCount = role._count?.users ?? 0;
            const isFull = membersCount >= MAX_MEMBERS_PER_CUSTOM_ROLE;
            const occupancyPct = Math.min(100, Math.round((membersCount / MAX_MEMBERS_PER_CUSTOM_ROLE) * 100));
            const visiblePerms = role.permissions.slice(0, 6);
            const extraCount = Math.max(0, role.permissions.length - visiblePerms.length);

            return (
              <article
                key={role.id}
                className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${colorStyle.dot}`} />
                      <span>{role.name}</span>
                    </span>

                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                        isFull
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : "bg-gray-100 dark:bg-background text-foreground border-gray-200 dark:border-border/40"
                      }`}
                    >
                      {membersCount}/{MAX_MEMBERS_PER_CUSTOM_ROLE} membros
                    </span>
                  </div>

                  {/* Barra de ocupação */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-background overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : colorStyle.dot}`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      {role.permissions.length} de {ALL_PERMISSIONS.length} módulos liberados
                    </span>
                  </div>

                  {/* Permissões desbloqueadas */}
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.length === 0 ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Nenhuma permissão configurada
                      </span>
                    ) : (
                      <>
                        {visiblePerms.map((permId) => (
                          <span
                            key={permId}
                            className="text-[11px] font-medium px-2 py-1 rounded-lg bg-gray-100 dark:bg-background text-foreground border border-gray-200/80 dark:border-border/30"
                          >
                            {PERMISSION_LABEL_BY_ID.get(permId) || permId}
                          </span>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            +{extraCount}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Barra de Ações */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-border/30">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isFull}
                    onClick={() => onCreateMemberWithRole(role.id)}
                    title={isFull ? `Lotação máxima de ${MAX_MEMBERS_PER_CUSTOM_ROLE} membros atingida.` : `Cadastrar colaborador já vinculado a ${role.name}`}
                    className="min-h-[44px] px-3 rounded-xl text-xs font-bold gap-1.5 flex-1 cursor-pointer disabled:opacity-45"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                    <span>+ Novo Membro neste Cargo</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onEditRole(role)}
                    className="min-h-[44px] px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Permissões</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={membersCount > 0}
                    onClick={() => onDeleteRole(role)}
                    title={
                      membersCount > 0
                        ? `Não é possível excluir: existem ${membersCount} membro(s) vinculados a este cargo.`
                        : `Excluir cargo ${role.name}`
                    }
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                      membersCount > 0
                        ? "opacity-45 cursor-not-allowed"
                        : "text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-200 dark:border-red-900/40"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cards de referência dos cargos fixos do sistema */}
      <section aria-label="Cargos fixos do sistema" className="space-y-3">
        <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
          Perfis Fixos do Sistema
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/15 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h5 className="font-heading font-bold text-sm text-foreground">Administrador</h5>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                  Máx. {MAX_ACTIVE_ADMINS} ativos
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Acesso irrestrito e imutável a todos os {ALL_PERMISSIONS.length} módulos, Auditoria & Logs e gestão completa da equipe.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/15 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h5 className="font-heading font-bold text-sm text-foreground">Editor Modular</h5>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                  Sob medida
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Colaborador sem vínculo a cargo personalizado, com permissões individuais escolhidas diretamente na matriz de acessos.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
