"use client";

import React from "react";
import Image from "next/image";
import { Search, X, RefreshCw, History, Key, Lock, Unlock, Trash2, Info, ShieldCheck } from "lucide-react";
import { AdminUserListItem } from "@/services/adminUserService";
import { LoyaltyBadgeConfig, formatLoyaltyBadgeRequirement } from "@/services/loyaltyBadgeService";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "./roleColorStyles";

interface ClientsTabProps {
  users: AdminUserListItem[];
  isAdmin: boolean;
  loading: boolean;
  search: string;
  filter: string;
  profileLoyalty: string;
  sort: string;
  loyaltyBadges: LoyaltyBadgeConfig[];
  page: number;
  totalPages: number;
  totalCount: number;
  onSearchChange: (val: string) => void;
  onFilterChange: (val: string) => void;
  onProfileLoyaltyChange: (val: string) => void;
  onSortChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onViewDossier: (user: AdminUserListItem) => void;
  onPromoteClient?: (user: AdminUserListItem) => void;
  onResetPassword: (user: AdminUserListItem) => void;
  onToggleBlock: (user: AdminUserListItem) => void;
  onDeactivate: (user: AdminUserListItem) => void;
}

const CLIENT_FILTER_PILLS = [
  { id: "clients", label: "Todos os Clientes" },
  { id: "registered", label: "Cadastrados" },
  { id: "fast_access", label: "Acesso Rápido ⚡" },
  { id: "blocked", label: "Bloqueados" },
];

export function ClientsTab({
  users,
  isAdmin,
  loading,
  search,
  filter,
  profileLoyalty,
  sort,
  loyaltyBadges,
  page,
  totalPages,
  totalCount,
  onSearchChange,
  onFilterChange,
  onProfileLoyaltyChange,
  onSortChange,
  onPageChange,
  onClearFilters,
  onViewDossier,
  onPromoteClient,
  onResetPassword,
  onToggleBlock,
  onDeactivate,
}: ClientsTabProps) {
  const hasActiveFilters = Boolean(search) || filter !== "clients" || profileLoyalty !== "all" || sort !== "recent";

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/30 px-4 py-3 flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <span>
            <strong>Modo Moderação:</strong> você visualiza e modera apenas contas de clientes. Contas da equipe e cargos são gerenciados apenas por Administradores.
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <search className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              aria-label="Buscar cliente por nome, e-mail ou telefone"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar cliente por nome, e-mail ou telefone..."
              className="w-full h-11 pl-10 pr-11 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
            {search && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => onSearchChange("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              aria-label="Filtrar por fidelidade ou frequência"
              value={profileLoyalty}
              onChange={(e) => onProfileLoyaltyChange(e.target.value)}
              className="h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary cursor-pointer max-w-[240px]"
            >
              <option value="all">Perfil & Fidelidade</option>
              <optgroup label="Selos de Fidelidade (Clientes)">
                {loyaltyBadges.map((b) => (
                  <option key={`badge_${b.level}`} value={`badge_${b.level}`}>
                    {b.icon} {b.name} ({formatLoyaltyBadgeRequirement(b)})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Frequência de Compras">
                <option value="recurrent">🔁 Clientes Recorrentes (3+ compras)</option>
                <option value="recent">🛍️ Compradores Recentes (1 a 2 compras)</option>
                <option value="inactive">💤 Sem compras (0 pedidos)</option>
              </optgroup>
            </select>

            <select
              aria-label="Ordenar clientes"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="orders">Mais compras</option>
              <option value="alphabetical">Alfabética (A-Z)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="min-h-[44px] px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>
        </search>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {CLIENT_FILTER_PILLS.map((pill) => {
            const active = filter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onFilterChange(pill.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-gray-100 dark:bg-background text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-white/5 border border-transparent dark:border-border/30"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">Exibindo {users.length} de {totalCount} clientes encontrados</p>
      </div>

      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
            <p className="text-xs">Carregando clientes...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-4">
            <p className="font-heading font-bold text-sm text-foreground">Nenhum cliente encontrado</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Nenhum registro corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          <div tabIndex={0} role="region" aria-label="Tabela de clientes" className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <caption className="sr-only">Lista de clientes e moderação de contas</caption>
              <thead>
                <tr className="border-b border-gray-100 dark:border-border/30 bg-gray-50/70 dark:bg-background/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Cliente & Contato</th>
                  <th scope="col" className="py-3.5 px-4">Cadastro</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Compras</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border/30">
                {users.map((u) => {
                  const displayName = u.fullName || u.username || "Cliente";
                  const isClientAccount = u.role.toUpperCase() === "CLIENT";
                  const isFastAccess = isClientAccount && !u.isRegistered;
                  const canModerate = isAdmin || isClientAccount;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <Image
                            src={u.avatarUrl || "/avatars/avatar-sorvete.svg"}
                            alt={displayName}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-border/40 bg-gray-100 dark:bg-background shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-foreground truncate max-w-[220px] block">{displayName}</span>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                              {u.email && <span>{u.email}</span>}
                              {u.email && u.phone && <span>•</span>}
                              {u.phone && <span>{u.phone}</span>}
                              {!u.email && !u.phone && <span>Sem contato registrado</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-foreground text-xs font-mono">{formatShortDate(u.createdAt)}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${isFastAccess ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10"}`}>
                            {isFastAccess ? "Acesso Rápido ⚡" : "Cadastrado"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.isBlocked ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" title={u.blockReason || "Bloqueado administrativamente"}>
                              <Lock className="w-3 h-3" /><span>Bloqueado</span>
                            </span>
                            {u.blockReason && <p className="text-[10px] text-muted-foreground truncate max-w-[160px]" title={u.blockReason}>{u.blockReason}</p>}
                          </div>
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

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-background border border-gray-200 dark:border-border/40 text-foreground">
                          {u._count?.orders ?? 0}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          {isAdmin && isClientAccount && u.isRegistered && !u.isBlocked && u.isActive && onPromoteClient && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => onPromoteClient(u)}
                              title="Promover cliente para Administrador ou Equipe"
                              className="min-h-[44px] px-3 rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                              <span>Promover</span>
                            </Button>
                          )}
                          <Button type="button" variant="outline" onClick={() => onViewDossier(u)} className="min-h-[44px] px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
                            <History className="w-3.5 h-3.5 text-primary" /><span>Dossiê & Pedidos</span>
                          </Button>
                          <button type="button" disabled={!canModerate} onClick={() => onResetPassword(u)} title={canModerate ? "Resetar Senha" : "Apenas Administradores podem alterar equipe"} aria-label={`Resetar senha de ${displayName}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed">
                            <Key className="w-4 h-4" />
                          </button>
                          <button type="button" disabled={!canModerate} onClick={() => onToggleBlock(u)} title={u.isBlocked ? "Desbloquear cliente" : "Bloquear cliente"} aria-label={u.isBlocked ? `Desbloquear ${displayName}` : `Bloquear ${displayName}`} className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${u.isBlocked ? "text-red-500 hover:text-emerald-500 hover:bg-emerald-500/10" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"}`}>
                            {u.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button type="button" disabled={!canModerate} onClick={() => onDeactivate(u)} title="Desativar conta" aria-label={`Desativar conta de ${displayName}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed">
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
