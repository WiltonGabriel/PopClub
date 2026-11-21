"use client";

import React from "react";
import Image from "next/image";
import { Search, X, RefreshCw, History, Key, Lock, Unlock, Trash2, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { AdminUserListItem, CustomRoleItem } from "@/services/adminUserService";
import { MAX_MEMBERS_PER_CUSTOM_ROLE, resolveEffectivePermissions } from "@/domain/services/RbacDomainService";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { formatShortDate, getRoleColorStyle } from "./roleColorStyles";

interface TeamMembersTabProps {
  users: AdminUserListItem[];
  customRoles: CustomRoleItem[];
  currentUserId?: string | null;
  loading: boolean;
  search: string;
  filter: string;
  statusFilter: string;
  sort: string;
  page: number;
  totalPages: number;
  totalCount: number;
  onSearchChange: (val: string) => void;
  onFilterChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onSortChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onManageUser: (user: AdminUserListItem) => void;
  onViewDossier: (user: AdminUserListItem) => void;
  onResetPassword: (user: AdminUserListItem) => void;
  onToggleBlock: (user: AdminUserListItem) => void;
  onDeactivate: (user: AdminUserListItem) => void;
}

export function TeamMembersTab({
  users,
  customRoles,
  currentUserId,
  loading,
  search,
  filter,
  statusFilter,
  sort,
  page,
  totalPages,
  totalCount,
  onSearchChange,
  onFilterChange,
  onStatusChange,
  onSortChange,
  onPageChange,
  onClearFilters,
  onManageUser,
  onViewDossier,
  onResetPassword,
  onToggleBlock,
  onDeactivate,
}: TeamMembersTabProps) {
  const hasActiveFilters = Boolean(search) || filter !== "team" || statusFilter !== "all" || sort !== "recent";

  const filterChips = [
    { id: "team", label: "Toda a Equipe" },
    { id: "admin", label: "Admins" },
    { id: "editor", label: "Editor Modular" },
    ...customRoles.map((cr) => ({
      id: `custom_${cr.id}`,
      label: cr.name,
      subLabel: `${cr._count?.users ?? 0}/${MAX_MEMBERS_PER_CUSTOM_ROLE}`,
      color: cr.color,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <search className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="search" aria-label="Buscar colaborador por nome, e-mail ou telefone" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Nome, e-mail ou telefone..." className="w-full h-11 pl-10 pr-11 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary" />
            {search && (
              <button type="button" aria-label="Limpar busca" onClick={() => onSearchChange("")} className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select aria-label="Filtrar por status da conta" value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className="h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary cursor-pointer">
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="blocked">Bloqueados</option>
            </select>
            <select aria-label="Ordenar equipe" value={sort} onChange={(e) => onSortChange(e.target.value)} className="h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary cursor-pointer">
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="alphabetical">Alfabética (A-Z)</option>
            </select>
            {hasActiveFilters && (
              <button type="button" onClick={onClearFilters} className="min-h-[44px] px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"><X className="w-3.5 h-3.5" /> Limpar</button>
            )}
          </div>
        </search>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filterChips.map((chip) => {
            const active = filter === chip.id;
            const colorStyle = "color" in chip && chip.color ? getRoleColorStyle(chip.color) : null;
            return (
              <button key={chip.id} type="button" onClick={() => onFilterChange(chip.id)} className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${active ? "bg-primary text-white shadow-xs font-bold" : "bg-gray-100 dark:bg-background text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-white/5 border border-transparent dark:border-border/30"}`}>
                {colorStyle && <span className={`w-2 h-2 rounded-full ${colorStyle.dot}`} />}
                <span>{chip.label}</span>
                {"subLabel" in chip && chip.subLabel && <span className={`text-[10px] font-mono ${active ? "text-white/90" : "text-muted-foreground"}`}>({chip.subLabel})</span>}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Exibindo {users.length} de {totalCount} membros da equipe</p>
      </div>

      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
            <p className="text-xs">Carregando equipe e permissões...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-4">
            <p className="font-heading font-bold text-sm text-foreground">Nenhum colaborador encontrado</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Nenhum membro corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          <div tabIndex={0} role="region" aria-label="Tabela de membros da equipe" className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <caption className="sr-only">Membros da equipe administrativa e suas permissões</caption>
              <thead>
                <tr className="border-b border-gray-100 dark:border-border/30 bg-gray-50/70 dark:bg-background/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Colaborador & Login</th>
                  <th scope="col" className="py-3.5 px-4">Cargo & Acessos</th>
                  <th scope="col" className="py-3.5 px-4">Criado em / Por</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border/30">
                {users.map((u) => {
                  const isStaffAdmin = u.role.toUpperCase() === "ADMIN";
                  const isSelf = currentUserId === u.id;
                  const displayName = u.fullName || u.username || "Sem Nome";
                  const effectiveCount = resolveEffectivePermissions(u).length;
                  const roleStyle = u.customRole ? getRoleColorStyle(u.customRole.color) : null;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Image
                              src={u.avatarUrl || "/avatars/avatar-sorvete.svg"}
                              alt={displayName}
                              width={40}
                              height={40}
                              unoptimized
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-border/40 bg-gray-100 dark:bg-background"
                            />
                            <span className="absolute -bottom-1 -right-1 text-xs" title={isStaffAdmin ? "Administrador" : u.customRole?.name || "Editor"}>
                              {isStaffAdmin ? "👑" : "🛡️"}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground truncate max-w-[200px]">{displayName}</span>
                              {isSelf && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">Você</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                              {u.email && <span>{u.email}</span>}
                              {u.email && u.phone && <span>•</span>}
                              {u.phone && <span>{u.phone}</span>}
                              {!u.email && !u.phone && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold">
                                  <AlertTriangle className="w-3 h-3 shrink-0" /> Sem credencial de login
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isStaffAdmin ? (
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <span>👑</span><span>Administrador</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">Acesso total ({ALL_PERMISSIONS.length}/{ALL_PERMISSIONS.length})</span>
                          </div>
                        ) : u.customRole && roleStyle ? (
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} /><span>{u.customRole.name}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{effectiveCount} de {ALL_PERMISSIONS.length} módulos</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <span>🛡️</span><span>Editor Modular</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{effectiveCount} de {ALL_PERMISSIONS.length} módulos</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-semibold text-foreground text-xs font-mono">{formatShortDate(u.createdAt)}</span>
                          <span className="text-[11px] text-muted-foreground">
                            Por: <strong className="text-foreground/90 font-medium">{u.createdBy?.fullName || u.createdBy?.username || (u.createdById ? "Admin" : "Sistema")}</strong>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" title={u.blockReason || "Bloqueado administrativamente"}>
                            <Lock className="w-3 h-3" /><span>Bloqueado</span>
                          </span>
                        ) : u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span>Ativo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20">
                            <span>Inativo</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <Button type="button" variant="outline" onClick={() => onManageUser(u)} className="min-h-[44px] px-3 rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer">
                            <SlidersHorizontal className="w-3.5 h-3.5" /><span>Gerenciar</span>
                          </Button>
                          <button type="button" onClick={() => onViewDossier(u)} title="Histórico / Dossiê" aria-label={`Ver dossiê e histórico de ${displayName}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                            <History className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => onResetPassword(u)} title="Resetar Senha" aria-label={`Resetar senha de ${displayName}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer">
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => onToggleBlock(u)}
                            title={isSelf ? "Você não pode bloquear sua própria conta" : u.isBlocked ? "Desbloquear" : "Bloquear"}
                            aria-label={u.isBlocked ? `Desbloquear ${displayName}` : `Bloquear ${displayName}`}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${isSelf ? "text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40" : u.isBlocked ? "text-red-500 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"}`}
                          >
                            {u.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => onDeactivate(u)}
                            title={isSelf ? "Você não pode desativar sua própria conta" : "Desativar conta"}
                            aria-label={`Desativar ${displayName}`}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${isSelf ? "text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40" : "text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-border/30 flex items-center justify-between gap-2 text-xs">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="min-h-[44px] px-4 rounded-xl cursor-pointer">Anterior</Button>
            <span className="font-mono text-muted-foreground">Página {page} de {totalPages}</span>
            <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="min-h-[44px] px-4 rounded-xl cursor-pointer">Próxima</Button>
          </div>
        )}
      </div>
    </div>
  );
}
