"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Shield, RefreshCw, ShoppingBag } from "lucide-react";
import { adminUserService, AdminUserListItem, CustomRoleItem, UsersSummary } from "@/services/adminUserService";
import { loyaltyBadgeService, LoyaltyBadgeConfig, DEFAULT_LOYALTY_BADGES } from "@/services/loyaltyBadgeService";
import { MAX_ACTIVE_ADMINS, MAX_CUSTOM_ROLES, isCustomRoleLimitReached } from "@/domain/services/RbacDomainService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastNotification";
import { UsersSummaryCards, UsersSectionTab, SummaryNavigateTarget } from "./users/UsersSummaryCards";
import { TeamMembersTab } from "./users/TeamMembersTab";
import { CustomRolesTab } from "./users/CustomRolesTab";
import { ClientsTab } from "./users/ClientsTab";
import { StaffFormDrawer } from "./users/StaffFormDrawer";
import { CustomRoleDrawer } from "./users/CustomRoleDrawer";
import { UserDossierDrawer } from "./users/UserDossierDrawer";
import { PasswordResetModal } from "./users/PasswordResetModal";
import { BlockUserModal } from "./users/BlockUserModal";

export { ROLE_COLOR_STYLES } from "./users/roleColorStyles";

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export function UsersManagementSection() {
  const { user: currentAuthUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<UsersSectionTab>(() => (isAdmin ? "equipe" : "clientes"));
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleItem[]>([]);
  const [summary, setSummary] = useState<UsersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("team");
  const [clientFilter, setClientFilter] = useState("clients");
  const [statusFilter, setStatusFilter] = useState("all");
  const [profileLoyalty, setProfileLoyalty] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loyaltyBadges, setLoyaltyBadges] = useState<LoyaltyBadgeConfig[]>(DEFAULT_LOYALTY_BADGES);

  const [staffModal, setStaffModal] = useState<{ open: boolean; mode: "create" | "edit"; user: AdminUserListItem | null; initialRoleId?: string | null }>({ open: false, mode: "create", user: null });
  const [roleModal, setRoleModal] = useState<{ open: boolean; role: CustomRoleItem | null }>({ open: false, role: null });
  const [dossierUser, setDossierUser] = useState<AdminUserListItem | null>(null);
  const [dossierPromoteMode, setDossierPromoteMode] = useState(false);
  const [passwordUser, setPasswordUser] = useState<AdminUserListItem | null>(null);
  const [blockUser, setBlockUser] = useState<AdminUserListItem | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin && activeTab !== "clientes") setActiveTab("clientes");
  }, [isAdmin, activeTab]);

  const fetchCustomRoles = useCallback(async () => {
    if (!isAdmin) return;
    setRolesLoading(true);
    try {
      setCustomRoles(await adminUserService.getCustomRoles());
    } catch (err: unknown) {
      showToast({ title: "Erro ao carregar cargos", message: err instanceof Error ? err.message : "Falha ao consultar cargos.", type: "error" });
    } finally {
      setRolesLoading(false);
    }
  }, [isAdmin, showToast]);

  const fetchUsers = useCallback(async () => {
    const effectiveTab: UsersSectionTab = isAdmin ? activeTab : "clientes";
    if (effectiveTab === "cargos") return;
    setLoading(true);
    try {
      let minOrders: number | undefined;
      let maxOrders: number | undefined;
      let loyaltyBadgeLevel: number | undefined;

      if (effectiveTab === "clientes") {
        if (profileLoyalty === "recurrent") minOrders = 3;
        else if (profileLoyalty === "recent") { minOrders = 1; maxOrders = 2; }
        else if (profileLoyalty === "inactive") maxOrders = 0;
        else if (profileLoyalty.startsWith("badge_")) {
          const parsed = parseInt(profileLoyalty.replace("badge_", ""), 10);
          if (!Number.isNaN(parsed)) loyaltyBadgeLevel = parsed;
        }
      }

      const res = await adminUserService.getUsers({
        page,
        limit: 15,
        search,
        filter: effectiveTab === "equipe" ? teamFilter : clientFilter,
        sort,
        status: effectiveTab === "equipe" ? statusFilter : "all",
        minOrders,
        maxOrders,
        loyaltyBadgeLevel,
      });

      setUsers(res.users);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
      if (res.summary) setSummary(res.summary);
    } catch (err: unknown) {
      showToast({ title: "Erro ao carregar usuários", message: err instanceof Error ? err.message : "Erro ao consultar lista.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, activeTab, page, search, teamFilter, clientFilter, statusFilter, profileLoyalty, sort, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchCustomRoles(); }, [fetchCustomRoles]);
  useEffect(() => { loyaltyBadgeService.getBadges().then(setLoyaltyBadges).catch(() => null); }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchUsers(), fetchCustomRoles()]);
  }, [fetchUsers, fetchCustomRoles]);

  const handleTabSwitch = (nextTab: UsersSectionTab) => {
    if (!isAdmin && nextTab !== "clientes") return;
    setActiveTab(nextTab);
    setPage(1);
    setSearch("");
  };

  const handleSummaryNavigate = (target: SummaryNavigateTarget) => {
    if (!isAdmin && target.tab !== "clientes") return;
    setActiveTab(target.tab);
    setPage(1);
    setSearch("");
    if (target.tab === "equipe" && target.filter) setTeamFilter(target.filter);
    if (target.tab === "clientes" && target.filter) setClientFilter(target.filter);
    if (target.status !== undefined) setStatusFilter(target.status);
  };

  const handleRequestDeactivateUser = (targetUser: AdminUserListItem) => {
    if (currentAuthUser?.id === targetUser.id) {
      return showToast({ title: "Ação não permitida", message: "Você não pode desativar sua própria conta.", type: "error" });
    }
    const displayName = targetUser.fullName || targetUser.username || "Usuário";
    setConfirmState({
      title: `Desativar conta de "${displayName}"?`,
      description: "O usuário perderá o acesso imediatamente, mas o histórico de pedidos será integralmente preservado.",
      confirmLabel: "Desativar Conta",
      onConfirm: async () => {
        await adminUserService.deleteUser(targetUser.id);
        showToast({ title: "Conta desativada", message: `Conta de ${displayName} desativada.`, type: "success" });
        await refreshAll();
      },
    });
  };

  const handleRequestDeleteRole = (role: CustomRoleItem) => {
    const membersCount = role._count?.users ?? 0;
    if (membersCount > 0) {
      return showToast({ title: "Cargo em uso", message: `Há ${membersCount} membro(s) vinculados ao cargo "${role.name}".`, type: "warning" });
    }
    setConfirmState({
      title: `Excluir cargo "${role.name}"?`,
      description: "Esta ação remove permanentemente o cargo personalizado da matriz RBAC.",
      confirmLabel: "Excluir Cargo",
      onConfirm: async () => {
        await adminUserService.deleteCustomRole(role.id);
        showToast({ title: "Cargo excluído", message: `Cargo "${role.name}" excluído.`, type: "success" });
        await refreshAll();
      },
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } catch (err: unknown) {
      showToast({ title: "Falha na operação", message: err instanceof Error ? err.message : "Erro ao processar ação.", type: "error" });
    } finally {
      setConfirmBusy(false);
    }
  };

  const activeAdminsCount = summary?.activeAdminsCount ?? users.filter((u) => u.role.toUpperCase() === "ADMIN" && u.isActive && !u.isBlocked).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0"><Users className="w-5 h-5" /></div>
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
              {isAdmin ? "Gestão de Usuários & Equipe" : "Clientes & Moderação"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAdmin ? "Controle granular RBAC, cargos reutilizáveis e histórico analítico de clientes." : "Consulta de histórico de pedidos, bloqueios e moderação de clientes."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button type="button" variant="outline" onClick={refreshAll} className="min-h-[44px] px-3.5 rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1.5 cursor-pointer">
            <RefreshCw className={`w-4 h-4 text-primary ${loading ? "animate-spin" : ""}`} /><span>Atualizar</span>
          </Button>
          {isAdmin && (
            <>
              <Button type="button" variant="outline" disabled={isCustomRoleLimitReached(customRoles.length)} onClick={() => setRoleModal({ open: true, role: null })} className="min-h-[44px] px-4 rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold uppercase tracking-wider gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-primary" /><span>+ Novo Cargo</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono">{MAX_CUSTOM_ROLES !== null ? `${customRoles.length}/${MAX_CUSTOM_ROLES}` : `${customRoles.length}`}</span>
              </Button>
              <Button type="button" onClick={() => setStaffModal({ open: true, mode: "create", user: null })} className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider gap-2 shadow-md shadow-primary/20 cursor-pointer">
                <UserPlus className="w-4 h-4" /><span>+ Novo Colaborador</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <UsersSummaryCards summary={summary} loading={loading} isAdmin={isAdmin} activeTab={activeTab} activeFilter={activeTab === "equipe" ? teamFilter : clientFilter} onNavigate={handleSummaryNavigate} />

      <div role="tablist" aria-label="Seções de gestão de usuários" className="flex items-center gap-2 overflow-x-auto pb-1">
        {isAdmin && (
          <>
            <button type="button" role="tab" aria-selected={activeTab === "equipe"} onClick={() => handleTabSwitch("equipe")} className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === "equipe" ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-[#230E26] text-muted-foreground hover:text-foreground border border-gray-200 dark:border-border/40"}`}>
              <Users className="w-4 h-4" /><span>Equipe & Acessos</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === "cargos"} onClick={() => handleTabSwitch("cargos")} className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === "cargos" ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-[#230E26] text-muted-foreground hover:text-foreground border border-gray-200 dark:border-border/40"}`}>
              <Shield className="w-4 h-4" /><span>Cargos & Permissões</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${activeTab === "cargos" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>{MAX_CUSTOM_ROLES !== null ? `${customRoles.length}/${MAX_CUSTOM_ROLES}` : `${customRoles.length}`}</span>
            </button>
          </>
        )}
        <button type="button" role="tab" aria-selected={activeTab === "clientes"} onClick={() => handleTabSwitch("clientes")} className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === "clientes" ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-[#230E26] text-muted-foreground hover:text-foreground border border-gray-200 dark:border-border/40"}`}>
          <ShoppingBag className="w-4 h-4" /><span>Clientes & Moderação</span>
        </button>
      </div>

      {isAdmin && activeTab === "equipe" && (
        <TeamMembersTab
          users={users} customRoles={customRoles} currentUserId={currentAuthUser?.id} loading={loading}
          search={search} filter={teamFilter} statusFilter={statusFilter} sort={sort} page={page} totalPages={totalPages} totalCount={totalCount}
          onSearchChange={(val) => { setSearch(val); setPage(1); }} onFilterChange={(val) => { setTeamFilter(val); setPage(1); }}
          onStatusChange={(val) => { setStatusFilter(val); setPage(1); }} onSortChange={(val) => { setSort(val); setPage(1); }}
          onPageChange={setPage}
          onClearFilters={() => { setSearch(""); setTeamFilter("team"); setStatusFilter("all"); setSort("recent"); setPage(1); }}
          onManageUser={(u) => setStaffModal({ open: true, mode: "edit", user: u })}
          onViewDossier={(u) => { setDossierPromoteMode(false); setDossierUser(u); }} onResetPassword={setPasswordUser} onToggleBlock={setBlockUser} onDeactivate={handleRequestDeactivateUser}
        />
      )}

      {isAdmin && activeTab === "cargos" && (
        <CustomRolesTab
          customRoles={customRoles} loading={rolesLoading}
          onCreateRole={() => setRoleModal({ open: true, role: null })}
          onEditRole={(role) => setRoleModal({ open: true, role })}
          onDeleteRole={handleRequestDeleteRole}
          onCreateMemberWithRole={(roleId) => setStaffModal({ open: true, mode: "create", user: null, initialRoleId: roleId })}
        />
      )}

      {activeTab === "clientes" && (
        <ClientsTab
          users={users} isAdmin={isAdmin} loading={loading} search={search} filter={clientFilter} profileLoyalty={profileLoyalty}
          sort={sort} loyaltyBadges={loyaltyBadges} page={page} totalPages={totalPages} totalCount={totalCount}
          onSearchChange={(val) => { setSearch(val); setPage(1); }} onFilterChange={(val) => { setClientFilter(val); setPage(1); }}
          onProfileLoyaltyChange={(val) => { setProfileLoyalty(val); setPage(1); }} onSortChange={(val) => { setSort(val); setPage(1); }}
          onPageChange={setPage}
          onClearFilters={() => { setSearch(""); setClientFilter("clients"); setProfileLoyalty("all"); setSort("recent"); setPage(1); }}
          onViewDossier={(u) => { setDossierPromoteMode(false); setDossierUser(u); }}
          onPromoteClient={(u) => { setDossierPromoteMode(true); setDossierUser(u); }}
          onResetPassword={setPasswordUser} onToggleBlock={setBlockUser} onDeactivate={handleRequestDeactivateUser}
        />
      )}

      <StaffFormDrawer
        open={staffModal.open} onClose={() => setStaffModal((p) => ({ ...p, open: false }))} mode={staffModal.mode}
        userToEdit={staffModal.user} initialCustomRoleId={staffModal.initialRoleId} customRoles={customRoles}
        activeAdminsCount={activeAdminsCount} onSuccess={refreshAll}
        onEditLinkedRole={(role) => setRoleModal({ open: true, role })}
      />
      <CustomRoleDrawer open={roleModal.open} onClose={() => setRoleModal({ open: false, role: null })} roleToEdit={roleModal.role} onSuccess={refreshAll} />
      <UserDossierDrawer
        open={Boolean(dossierUser)}
        user={dossierUser}
        onClose={() => { setDossierUser(null); setDossierPromoteMode(false); }}
        isAdmin={isAdmin}
        customRoles={customRoles}
        activeAdminsCount={activeAdminsCount}
        maxAdmins={summary?.maxAdmins ?? MAX_ACTIVE_ADMINS}
        initialOpenPromote={dossierPromoteMode}
        onPromoted={refreshAll}
      />
      <PasswordResetModal open={Boolean(passwordUser)} user={passwordUser} onClose={() => setPasswordUser(null)} />
      <BlockUserModal open={Boolean(blockUser)} user={blockUser} onClose={() => setBlockUser(null)} onSuccess={refreshAll} />
      <ConfirmDialog open={Boolean(confirmState)} onOpenChange={(isOpen) => { if (!isOpen && !confirmBusy) setConfirmState(null); }} title={confirmState?.title || ""} description={confirmState?.description || ""} confirmLabel={confirmState?.confirmLabel || "Confirmar"} cancelLabel="Cancelar" variant="danger" loading={confirmBusy} onConfirm={handleConfirmAction} />
    </div>
  );
}
