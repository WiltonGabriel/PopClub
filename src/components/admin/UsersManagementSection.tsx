"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  Key,
  Lock,
  Unlock,
  Trash2,
  History,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Edit2,
  Info,
} from "lucide-react";
import {
  adminUserService,
  AdminUserListItem,
  UserDossier,
  CustomRoleItem,
} from "@/services/adminUserService";
import {
  loyaltyBadgeService,
  LoyaltyBadgeConfig,
  DEFAULT_LOYALTY_BADGES,
  formatLoyaltyBadgeRequirement,
} from "@/services/loyaltyBadgeService";
import {
  PERMISSION_DEFINITIONS,
  DEFAULT_EDITOR_PERMISSIONS,
  ALL_PERMISSIONS,
} from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// Configurações de cores de badges para cargos customizados
export const ROLE_COLOR_STYLES: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    label: "Azul",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
    label: "Roxo",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Verde Esmeralda",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    label: "Âmbar / Dourado",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    label: "Rosa / Carmim",
  },
  cyan: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
    label: "Ciano / Turquesa",
  },
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
    dot: "bg-indigo-500",
    label: "Índigo",
  },
  orange: {
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
    label: "Laranja",
  },
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function UsersManagementSection() {
  const { user: currentAuthUser, isAdmin } = useAuth();

  // Estados principais de listagem
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState("recent");
  const [profileLoyalty, setProfileLoyalty] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loyaltyBadges, setLoyaltyBadges] = useState<LoyaltyBadgeConfig[]>(DEFAULT_LOYALTY_BADGES);

  // Estados de modais e gavetas
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"create" | "edit" | "edit_permissions" | "edit_role">("create");
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  // Modal de Gestão de Cargos Personalizados (RBAC)
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [roleModalTab, setRoleModalTab] = useState<"list" | "form">("list");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormColor, setRoleFormColor] = useState("blue");
  const [roleFormPermissions, setRoleFormPermissions] = useState<string[]>([...DEFAULT_EDITOR_PERMISSIONS]);

  // Drawer de histórico
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userDossier, setUserDossier] = useState<UserDossier | null>(null);

  // Modais de suporte
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulário de Criação / Edição de Membro
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [formCustomRoleId, setFormCustomRoleId] = useState<string | null>(null);
  const [formPermissions, setFormPermissions] = useState<string[]>([...DEFAULT_EDITOR_PERMISSIONS]);

  // Modal de Troca de Cargo
  const [changeRoleTarget, setChangeRoleTarget] = useState<"EDITOR_DEFAULT" | string>("EDITOR_DEFAULT");

  // Exibe feedback temporário com auto-dismiss
  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Carregamento de Cargos Personalizados
  const fetchCustomRoles = useCallback(async () => {
    try {
      const roles = await adminUserService.getCustomRoles();
      setCustomRoles(roles);
    } catch (err: unknown) {
      console.error("Erro ao carregar cargos personalizados:", err);
    }
  }, []);

  // Carregamento de Usuários
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      let minOrders: number | undefined;
      let maxOrders: number | undefined;
      let loyaltyBadgeLevel: number | undefined;

      if (profileLoyalty === "recurrent") {
        minOrders = 3;
      } else if (profileLoyalty === "recent") {
        minOrders = 1;
        maxOrders = 2;
      } else if (profileLoyalty === "inactive") {
        maxOrders = 0;
      } else if (profileLoyalty.startsWith("badge_")) {
        const parsedLevel = parseInt(profileLoyalty.replace("badge_", ""), 10);
        if (!Number.isNaN(parsedLevel)) {
          loyaltyBadgeLevel = parsedLevel;
        }
      }

      const res = await adminUserService.getUsers({
        page,
        limit: 15,
        search,
        filter,
        sort,
        status: statusFilter,
        minOrders,
        maxOrders,
        loyaltyBadgeLevel,
      });
      setUsers(res.users);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao carregar lista de usuários.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, sort, statusFilter, profileLoyalty, loyaltyBadges]);

  useEffect(() => {
    fetchUsers();
    fetchCustomRoles();
  }, [fetchUsers, fetchCustomRoles]);

  useEffect(() => {
    loyaltyBadgeService.getBadges().then(setLoyaltyBadges).catch(() => null);
  }, []);

  // Contagem de administradores ativos atualmente
  const activeAdminsCount = useMemo(() => {
    return users.filter((u) => u.role.toUpperCase() === "ADMIN" && u.isActive && !u.isBlocked).length;
  }, [users]);

  // Abertura do modal de criação de novo membro
  const handleOpenCreateModal = () => {
    setUserModalMode("create");
    setSelectedUser(null);
    setFormFullName("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("");
    setFormRole("EDITOR");
    setFormCustomRoleId(null);
    setFormPermissions([...DEFAULT_EDITOR_PERMISSIONS]);
    setUserModalOpen(true);
  };

  // Abertura do modal de edição completa do colaborador
  const handleOpenEditUser = (user: AdminUserListItem) => {
    setUserModalMode("edit");
    setSelectedUser(user);
    setFormFullName(user.fullName || user.username || "");
    setFormEmail(user.email || "");
    setFormPhone(user.phone || "");
    setFormPassword("");
    const normalizedRole = user.role.toUpperCase() === "ADMIN" ? "ADMIN" : "EDITOR";
    setFormRole(normalizedRole);
    setFormCustomRoleId(user.customRoleId || null);
    const existingPerms = Array.isArray(user.permissions) && user.permissions.length > 0
      ? [...user.permissions]
      : (user.customRole?.permissions ? [...user.customRole.permissions] : [...DEFAULT_EDITOR_PERMISSIONS]);
    setFormPermissions(existingPerms);
    setUserModalOpen(true);
  };

  // Abertura do modal exclusivo de permissões do editor
  const handleOpenPermissionsModal = (user: AdminUserListItem) => {
    setUserModalMode("edit_permissions");
    setSelectedUser(user);
    setFormFullName(user.fullName || user.username || "");
    setFormEmail(user.email || "");
    setFormPhone(user.phone || "");
    setFormPassword("");
    setFormRole("EDITOR");
    setFormCustomRoleId(user.customRoleId || null);
    setFormPermissions(Array.isArray(user.permissions) ? [...user.permissions] : [...DEFAULT_EDITOR_PERMISSIONS]);
    setUserModalOpen(true);
  };

  // Abertura do modal de troca de cargo
  const handleOpenRoleModal = (user: AdminUserListItem) => {
    const normalizedRole = user.role.toUpperCase();
    if (normalizedRole === "ADMIN" || normalizedRole === "CLIENT") {
      return; // Bloqueado pelas regras de imutabilidade
    }

    setUserModalMode("edit_role");
    setSelectedUser(user);
    setFormFullName(user.fullName || user.username || "");
    setChangeRoleTarget(user.customRoleId ? user.customRoleId : "EDITOR_DEFAULT");
    setUserModalOpen(true);
  };

  // Abertura do modal de Gestão de Cargos Personalizados
  const handleOpenCustomRolesModal = () => {
    setRoleModalTab("list");
    setEditingRoleId(null);
    setRoleFormName("");
    setRoleFormColor("blue");
    setRoleFormPermissions([...DEFAULT_EDITOR_PERMISSIONS]);
    setRolesModalOpen(true);
  };

  const handleStartCreateCustomRole = () => {
    if (customRoles.length >= 4) {
      showFeedback("error", "Limite máximo de 4 cargos personalizados adicionais atingido.");
      return;
    }
    setEditingRoleId(null);
    setRoleFormName("");
    setRoleFormColor("blue");
    setRoleFormPermissions([...DEFAULT_EDITOR_PERMISSIONS]);
    setRoleModalTab("form");
  };

  const handleStartEditCustomRole = (role: CustomRoleItem) => {
    setEditingRoleId(role.id);
    setRoleFormName(role.name);
    setRoleFormColor(role.color || "blue");
    setRoleFormPermissions(Array.isArray(role.permissions) ? [...role.permissions] : []);
    setRoleModalTab("form");
  };

  // Salvar Cargo Personalizado (Criar ou Editar)
  const handleSaveCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) {
      showFeedback("error", "O nome do cargo é obrigatório.");
      return;
    }

    setActionLoading(true);
    try {
      if (editingRoleId) {
        await adminUserService.updateCustomRole(editingRoleId, {
          name: roleFormName.trim(),
          color: roleFormColor,
          permissions: roleFormPermissions,
        });
        showFeedback("success", `Cargo "${roleFormName.trim()}" atualizado com sucesso!`);
      } else {
        await adminUserService.createCustomRole({
          name: roleFormName.trim(),
          color: roleFormColor,
          permissions: roleFormPermissions,
        });
        showFeedback("success", `Cargo "${roleFormName.trim()}" criado com sucesso!`);
      }

      await fetchCustomRoles();
      await fetchUsers();
      setRoleModalTab("list");
      setEditingRoleId(null);
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao salvar cargo personalizado.");
    } finally {
      setActionLoading(false);
    }
  };

  // Excluir Cargo Personalizado com Proteção contra Exclusão Órfã
  const handleDeleteCustomRole = async (role: CustomRoleItem) => {
    const membersCount = role._count?.users ?? 0;
    if (membersCount > 0) {
      showFeedback(
        "error",
        `Não é possível excluir o cargo "${role.name}" porque há ${membersCount} membro(s) vinculado(s) a ele. Reatribua os membros antes de excluí-lo.`
      );
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o cargo "${role.name}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await adminUserService.deleteCustomRole(role.id);
      showFeedback("success", `Cargo "${role.name}" excluído com sucesso.`);
      await fetchCustomRoles();
      await fetchUsers();
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao excluir cargo.");
    } finally {
      setActionLoading(false);
    }
  };

  // Abertura da gaveta de histórico
  const handleOpenHistoryDrawer = async (user: AdminUserListItem) => {
    setSelectedUser(user);
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const dossier = await adminUserService.getUserHistory(user.id);
      setUserDossier(dossier);
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao carregar histórico do cliente.");
      setHistoryDrawerOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Salvar formulário de usuário (Criar ou Editar Permissões / Cargo)
  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (userModalMode === "create") {
        if (!formFullName.trim()) {
          throw new Error("O nome completo é obrigatório.");
        }
        if (!formPassword || formPassword.length < 6) {
          throw new Error("A senha deve ter no mínimo 6 caracteres.");
        }

        if (formRole === "ADMIN" && activeAdminsCount >= 2) {
          throw new Error("Limite máximo de 2 Administradores ativos já atingido no sistema.");
        }

        await adminUserService.createTeamMember({
          fullName: formFullName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          password: formPassword,
          role: formRole === "ADMIN" ? "ADMIN" : "EDITOR",
          customRoleId: formRole === "EDITOR" ? formCustomRoleId : null,
          permissions: formRole === "EDITOR" && !formCustomRoleId ? formPermissions : undefined,
        });

        showFeedback("success", "Novo membro da equipe criado com sucesso!");
        setUserModalOpen(false);
        fetchUsers();
        fetchCustomRoles();
      } else if (userModalMode === "edit" && selectedUser) {
        if (!formFullName.trim()) {
          throw new Error("O nome completo é obrigatório.");
        }
        if (formPassword && formPassword.length < 6) {
          throw new Error("A nova senha deve ter no mínimo 6 caracteres se for informada.");
        }
        if (formRole === "ADMIN" && selectedUser.role.toUpperCase() !== "ADMIN" && activeAdminsCount >= 2) {
          throw new Error("Limite máximo de 2 Administradores ativos já atingido no sistema.");
        }

        await adminUserService.updateUser(selectedUser.id, {
          fullName: formFullName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          password: formPassword.trim() ? formPassword.trim() : undefined,
          role: formRole,
          customRoleId: formRole === "EDITOR" ? formCustomRoleId : null,
          permissions: formRole === "EDITOR" && !formCustomRoleId ? formPermissions : undefined,
        });

        showFeedback("success", `Colaborador "${formFullName.trim()}" atualizado com sucesso!`);
        setUserModalOpen(false);
        fetchUsers();
        fetchCustomRoles();
      } else if (userModalMode === "edit_permissions" && selectedUser) {
        await adminUserService.updateUser(selectedUser.id, {
          permissions: formPermissions,
        });

        showFeedback("success", `Permissões de ${selectedUser.fullName || selectedUser.username} atualizadas com sucesso!`);
        setUserModalOpen(false);
        fetchUsers();
      } else if (userModalMode === "edit_role" && selectedUser) {
        const isCustom = changeRoleTarget !== "EDITOR_DEFAULT";
        await adminUserService.updateUser(selectedUser.id, {
          role: "EDITOR",
          customRoleId: isCustom ? changeRoleTarget : null,
        });

        const targetRoleName = isCustom
          ? customRoles.find((r) => r.id === changeRoleTarget)?.name || "Cargo Customizado"
          : "Editor Padrão";

        showFeedback("success", `Cargo de ${selectedUser.fullName || selectedUser.username} atualizado para "${targetRoleName}"!`);
        setUserModalOpen(false);
        fetchUsers();
        fetchCustomRoles();
      }
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle de permissão individual
  const togglePermission = (permId: string) => {
    setFormPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleRolePermission = (permId: string) => {
    setRoleFormPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // Presets rápidos de permissão
  const handleSelectDefaultPermissions = () => {
    setFormPermissions([...DEFAULT_EDITOR_PERMISSIONS]);
  };
  const handleSelectAllPermissions = () => {
    setFormPermissions([...ALL_PERMISSIONS]);
  };
  const handleClearAllPermissions = () => {
    setFormPermissions([]);
  };

  // Presets para cargos customizados
  const handleRoleSelectDefaultPermissions = () => {
    setRoleFormPermissions([...DEFAULT_EDITOR_PERMISSIONS]);
  };
  const handleRoleSelectAllPermissions = () => {
    setRoleFormPermissions([...ALL_PERMISSIONS]);
  };
  const handleRoleClearAllPermissions = () => {
    setRoleFormPermissions([]);
  };

  // Reset de Senha
  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      showFeedback("error", "A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setActionLoading(true);
    try {
      await adminUserService.updateUser(selectedUser.id, {
        password: newPassword,
      });
      showFeedback("success", `Senha de ${selectedUser.fullName || selectedUser.username} resetada com sucesso!`);
      setPasswordModalOpen(false);
      setNewPassword("");
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao resetar senha.");
    } finally {
      setActionLoading(false);
    }
  };

  // Bloqueio / Desbloqueio
  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const willBlock = !selectedUser.isBlocked;
      await adminUserService.updateUser(selectedUser.id, {
        isBlocked: willBlock,
        blockReason: willBlock ? (blockReason.trim() || "Bloqueio administrativo.") : null,
      });
      showFeedback(
        "success",
        willBlock
          ? `Conta de ${selectedUser.fullName || selectedUser.username} bloqueada com sucesso.`
          : `Conta de ${selectedUser.fullName || selectedUser.username} desbloqueada.`
      );
      setBlockModalOpen(false);
      setBlockReason("");
      fetchUsers();
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao alterar status de bloqueio.");
    } finally {
      setActionLoading(false);
    }
  };

  // Soft Delete (Desativar Conta)
  const handleDeleteUser = async (user: AdminUserListItem) => {
    const isSelf = currentAuthUser?.id === user.id;
    if (isSelf) {
      showFeedback("error", "Você não pode desativar sua própria conta de Administrador.");
      return;
    }

    const confirmMsg = `Tem certeza que deseja desativar a conta de "${user.fullName || user.username}"?\n\n• O usuário perderá o acesso imediatamente.\n• O histórico de pedidos será integralmente preservado.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminUserService.deleteUser(user.id);
      showFeedback("success", `Conta de ${user.fullName || user.username} desativada com sucesso.`);
      fetchUsers();
      fetchCustomRoles();
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Erro ao desativar conta.");
    }
  };

  // Agrupamento de definições de permissão por categoria
  const groupedPermissions = useMemo(() => {
    return {
      operacao: PERMISSION_DEFINITIONS.filter((p) => p.category === "operacao"),
      cardapio: PERMISSION_DEFINITIONS.filter((p) => p.category === "cardapio"),
      estrategico: PERMISSION_DEFINITIONS.filter((p) => p.category === "estrategico"),
    };
  }, []);

interface FilterTabItem {
  id: string;
  label: string;
  count?: number;
  subLabel?: string;
  color?: string;
}

  // Lista dinâmica de tabs de filtragem
  const filterTabs: FilterTabItem[] = useMemo(() => {
    return [
      { id: "all", label: "Todos", count: totalCount },
      { id: "admin", label: "Admins" },
      { id: "editor", label: "Editores" },
      ...customRoles.map((cr) => ({
        id: `custom_${cr.id}`,
        label: `${cr.name}`,
        subLabel: `(${cr._count?.users ?? 0}/4)`,
        color: cr.color,
      })),
      { id: "registered", label: "Clientes Cadastrados" },
      { id: "fast_access", label: "Acesso Rápido" },
      { id: "blocked", label: "Bloqueados" },
    ];
  }, [totalCount, customRoles]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 ${
            feedbackMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-700/50"
              : "bg-red-950/90 text-red-200 border-red-700/50"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="ml-2 text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
                Gestão de Usuários & Equipe
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controle de acessos, RBAC com cargos personalizados e histórico analítico de clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => {
              fetchUsers();
              fetchCustomRoles();
            }}
            variant="outline"
            className="rounded-xl border-gray-200 dark:border-border/40 h-11 px-3.5 text-xs font-bold gap-1.5 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {isAdmin && (
            <>
              {/* Botão Secundário: "+ Novo Cargo" */}
              <Button
                onClick={handleOpenCustomRolesModal}
                variant="outline"
                className="border-gray-200 dark:border-border/40 hover:border-primary/50 text-foreground font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-4 cursor-pointer"
                title="Gerenciar e Criar Cargos Personalizados"
              >
                <Shield className="w-4 h-4 text-primary" />
                <span>+ Novo Cargo</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-bold">
                  {customRoles.length}/4
                </span>
              </Button>

              {/* Botão Primário: "+ Novo Usuário / Membro" */}
              <Button
                onClick={handleOpenCreateModal}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-primary/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Novo Usuário / Membro</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca (2 Linhas) */}
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* LINHA 1: BARRA DE BUSCA EXPANDIDA + SELETORES DE FILTROS & ORDENAÇÃO */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de Busca Global */}
          <div className="relative flex-1 min-w-[280px] max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="w-full h-11 pl-10 pr-9 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controles de Filtro & Ordenação (Direita) */}
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="orders">Mais compras</option>
              <option value="alphabetical">Alfabética (A-Z)</option>
            </select>

            <select
              value={profileLoyalty}
              onChange={(e) => {
                setProfileLoyalty(e.target.value);
                setPage(1);
              }}
              className="h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-[200px] text-ellipsis"
            >
              <option value="all">Perfil & Fidelidade</option>
              <optgroup label="Selos de Fidelidade (Clientes)">
                {loyaltyBadges.map(b => (
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="all">Todos os status</option>
              <option value="active">Apenas Ativos</option>
              <option value="blocked">Apenas Bloqueados</option>
            </select>

            {(search || sort !== "recent" || profileLoyalty !== "all" || statusFilter !== "all" || filter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSort("recent");
                  setProfileLoyalty("all");
                  setStatusFilter("all");
                  setFilter("all");
                  setPage(1);
                }}
                className="h-11 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* LINHA 2: ESTEIRA HORIZONTAL DE CARGOS E TIPOS (TABS INDEPENDENTES) */}
        <div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {filterTabs.map((p) => {
              const active = filter === p.id;
              const colorStyle = p.color && ROLE_COLOR_STYLES[p.color] ? ROLE_COLOR_STYLES[p.color] : null;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setFilter(p.id);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? "bg-primary text-white shadow-xs font-bold"
                      : "bg-gray-100 dark:bg-background text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-white/5 border border-transparent dark:border-border/30"
                  }`}
                >
                  {colorStyle && (
                    <span className={`w-2 h-2 rounded-full ${colorStyle.dot}`} />
                  )}
                  <span>{p.label}</span>
                  {p.subLabel && (
                    <span className={`text-[10px] opacity-75 font-mono ${active ? "text-white" : "text-muted-foreground"}`}>
                      {p.subLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Exibindo {users.length} de {totalCount} usuários encontrados
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
            <p className="text-xs">Carregando usuários e permissões...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
              👥
            </div>
            <h4 className="font-heading font-bold text-sm text-foreground">
              Nenhum usuário encontrado
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Nenhum registro corresponde aos filtros ou à pesquisa informada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full min-w-0 overscroll-contain-x">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-border/30 bg-gray-50/70 dark:bg-background/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                  {/* Coluna substituta: "CRIADO EM / POR" */}
                  <th className="py-3.5 px-4">Criado em / Por</th>
                  <th className="py-3.5 px-4">Tipo de Conta</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Compras</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border/30">
                {users.map((u) => {
                  const normalizedRole = u.role.toUpperCase();
                  const isAdmin = normalizedRole === "ADMIN";
                  const isEditor = normalizedRole === "EDITOR";
                  const isClient = normalizedRole === "CLIENT";
                  const isFastAccess = isClient && !u.isRegistered;
                  const isSelf = currentAuthUser?.id === u.id;
                  const hasCustomRole = Boolean(u.customRole);
                  const customRoleColor = u.customRole?.color && ROLE_COLOR_STYLES[u.customRole.color]
                    ? ROLE_COLOR_STYLES[u.customRole.color]
                    : ROLE_COLOR_STYLES.blue;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Coluna 1: Avatar e Identificação */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Image
                              src={u.avatarUrl || "/avatars/avatar-sorvete.svg"}
                              alt={u.fullName || "Avatar"}
                              width={40}
                              height={40}
                              unoptimized
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-border/40 bg-gray-100 dark:bg-background"
                            />
                            {isAdmin && (
                              <span
                                className="absolute -bottom-1 -right-1 text-xs"
                                title="Administrador"
                              >
                                👑
                              </span>
                            )}
                            {isEditor && (
                              <span
                                className="absolute -bottom-1 -right-1 text-xs"
                                title={u.customRole?.name || "Editor"}
                              >
                                🛡️
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground truncate max-w-[200px]">
                                {u.fullName || u.username || "Sem Nome"}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 truncate">
                              {u.email && <span>{u.email}</span>}
                              {u.email && u.phone && <span>•</span>}
                              {u.phone && <span>{u.phone}</span>}
                              {!u.email && !u.phone && <span>Sem contato registrado</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 2: CRIADO EM / POR */}
                      <td className="py-3.5 px-4">
                        {isClient ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold text-foreground text-xs font-mono">
                              {formatDate(u.createdAt)}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-white/5 text-muted-foreground border border-gray-200 dark:border-border/30">
                              Auto-cadastro
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-semibold text-foreground text-xs font-mono">
                              {formatDate(u.createdAt)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Criado por:{" "}
                              <strong className="text-foreground/90 font-medium">
                                {u.createdBy?.fullName || u.createdBy?.username || (u.createdById ? "Admin" : "Sistema")}
                              </strong>{" "}
                              <span className="text-[10px] opacity-75">
                                ({u.createdBy?.role ? (u.createdBy.role.toUpperCase() === "ADMIN" ? "Admin" : "Editor") : "Admin"})
                              </span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Coluna 3: Tipo de Conta */}
                      <td className="py-3.5 px-4">
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span>👑</span>
                            <span>Administrador</span>
                          </span>
                        )}
                        {isEditor && hasCustomRole && u.customRole && (
                          <div className="inline-flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${customRoleColor.bg} ${customRoleColor.text} ${customRoleColor.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${customRoleColor.dot}`} />
                              <span>{u.customRole.name}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({u.permissions?.length || 0} de {ALL_PERMISSIONS.length} acessos)
                            </span>
                          </div>
                        )}
                        {isEditor && !hasCustomRole && (
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <span>🛡️</span>
                              <span>Editor Padrão</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({u.permissions?.length || 0} de {ALL_PERMISSIONS.length} acessos)
                            </span>
                          </div>
                        )}
                        {isFastAccess && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <span>⚡</span>
                            <span>Acesso Rápido</span>
                          </span>
                        )}
                        {isClient && !isFastAccess && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                            <span>👤</span>
                            <span>Cliente</span>
                          </span>
                        )}
                      </td>

                      {/* Coluna 4: Status */}
                      <td className="py-3.5 px-4">
                        {u.isBlocked ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            title={u.blockReason || "Bloqueado administrativamente"}
                          >
                            <Lock className="w-3 h-3" />
                            <span>Bloqueado</span>
                          </span>
                        ) : u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Ativo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20">
                            <span>Inativo</span>
                          </span>
                        )}
                      </td>

                      {/* Coluna 5: Pedidos Realizados */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-background border border-gray-200 dark:border-border/40 text-foreground">
                          {u._count?.orders ?? 0}
                        </span>
                      </td>

                      {/* Coluna 6: Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver Histórico */}
                          <button
                            type="button"
                            onClick={() => handleOpenHistoryDrawer(u)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Ver Histórico e Pedidos"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Editar Colaborador (Dados, Cargo e Permissões) */}
                          {!isClient && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Editar Colaborador (Dados, Cargo e Permissões)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Se for Editor Padrão: Botão rápido para Matriz de Permissões */}
                          {isEditor && !hasCustomRole && (
                            <button
                              type="button"
                              onClick={() => handleOpenPermissionsModal(u)}
                              className="p-1.5 rounded-lg text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                              title="Configurar Permissões Granulares"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Alterar Cargo:
                              - Para Clientes: Desabilitado com tooltip explicativo estrito
                              - Para Admin: Desabilitado (cargo soberano e imutável)
                              - Para Editor / Custom Role: Habilitado
                          */}
                          {isClient ? (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 rounded-lg text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40"
                              title="Contas de clientes são exclusivas para consumo e não podem ser convertidas em cargos operacionais."
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 rounded-lg text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40"
                              title="O cargo de Administrador é soberano e imutável."
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRoleModal(u)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title="Alterar Cargo do Colaborador"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}

                          {/* Resetar Senha */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword("");
                              setPasswordModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Resetar Senha"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Bloquear / Desbloquear */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => {
                              setSelectedUser(u);
                              setBlockReason(u.blockReason || "");
                              setBlockModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf
                                ? "text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40"
                                : u.isBlocked
                                ? "text-red-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                                : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            }`}
                            title={
                              isSelf
                                ? "Você não pode bloquear a si mesmo"
                                : u.isBlocked
                                ? "Desbloquear Usuário"
                                : "Bloquear Usuário"
                            }
                          >
                            {u.isBlocked ? (
                              <Unlock className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </button>

                          {/* Desativar / Excluir */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf
                                ? "text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40"
                                : "text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                            }`}
                            title={isSelf ? "Você não pode desativar sua própria conta" : "Desativar Conta"}
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

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-border/30 bg-gray-50/50 dark:bg-background/20 text-xs">
            <span className="text-muted-foreground">
              Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} usuários)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg h-8 text-xs cursor-pointer"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg h-8 text-xs cursor-pointer"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CADASTRO / EDIÇÃO DE MEMBRO & MATRIZ DE ACESSOS */}
      {/* ========================================================= */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50/60 dark:bg-background/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {userModalMode === "create" ? (
                    <UserPlus className="w-5 h-5" />
                  ) : userModalMode === "edit" ? (
                    <Edit2 className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    {userModalMode === "create"
                      ? "Novo Membro da Equipe"
                      : userModalMode === "edit"
                      ? `Editar Colaborador: ${selectedUser?.fullName || selectedUser?.username}`
                      : userModalMode === "edit_permissions"
                      ? `Permissões de ${selectedUser?.fullName || selectedUser?.username}`
                      : `Alterar Cargo de ${selectedUser?.fullName || selectedUser?.username}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {userModalMode === "create"
                      ? "Cadastre um novo colaborador vinculando a Administrador, Editor ou Cargo Personalizado."
                      : userModalMode === "edit"
                      ? "Edite os dados cadastrais, cargo e permissões modulares de acesso."
                      : userModalMode === "edit_permissions"
                      ? "Selecione individualmente quais módulos e abas o editor pode acessar."
                      : "Defina o nível de acesso ou vincule este colaborador a um cargo personalizado."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body com Rolagem */}
            <form onSubmit={handleSaveUserForm} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Se for Criação ou Edição de Usuário: Exibe campos de cadastro */}
              {(userModalMode === "create" || userModalMode === "edit") && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                        <span>E-mail</span>
                        <span className="text-[10px] text-primary font-bold">Recomendado</span>
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="exemplo@popclub.com"
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                        <span>Telefone / WhatsApp</span>
                        <span className="text-[10px] text-primary font-bold">Recomendado</span>
                      </label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="(65) 99999-9999"
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                      <span>{userModalMode === "create" ? "Senha de Acesso *" : "Nova Senha (Opcional)"}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {userModalMode === "create" ? "Mínimo 6 caracteres" : "Deixe em branco para manter a atual"}
                      </span>
                    </label>
                    <input
                      type="password"
                      required={userModalMode === "create"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={userModalMode === "create" ? "••••••••" : "Manter senha inalterada"}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  {/* Seleção de Cargo na Criação */}
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-border/30">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Selecione o Cargo ou Função:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Administrador (limitado a 2 ativos) */}
                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                          activeAdminsCount >= 2
                            ? "opacity-45 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-border/30 cursor-not-allowed"
                            : formRole === "ADMIN"
                            ? "border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 cursor-pointer"
                            : "border-gray-200 dark:border-border/40 hover:border-gray-300 cursor-pointer"
                        }`}
                      >
                        <input
                          type="radio"
                          name="formRole"
                          value="ADMIN"
                          disabled={activeAdminsCount >= 2}
                          checked={formRole === "ADMIN"}
                          onChange={() => {
                            setFormRole("ADMIN");
                            setFormCustomRoleId(null);
                          }}
                          className="mt-0.5 text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                            <span>👑</span>
                            <span>Administrador</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Acesso total e irrestrito (máximo de 2 ativos).
                          </p>
                          {activeAdminsCount >= 2 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1">
                              ⚠️ Limite de 2 Admins atingido
                            </span>
                          )}
                        </div>
                      </label>

                      {/* Editor Padrão */}
                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          formRole === "EDITOR" && !formCustomRoleId
                            ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                            : "border-gray-200 dark:border-border/40 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="formRole"
                          value="EDITOR"
                          checked={formRole === "EDITOR" && !formCustomRoleId}
                          onChange={() => {
                            setFormRole("EDITOR");
                            setFormCustomRoleId(null);
                          }}
                          className="mt-0.5 text-indigo-500 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                            <span>🛡️</span>
                            <span>Editor Padrão</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Permissões modulares configuradas abaixo.
                          </p>
                        </div>
                      </label>

                      {/* Cargos Customizados Existentes */}
                      {customRoles.map((cr) => {
                        const isFull = (cr._count?.users ?? 0) >= 4;
                        const isSelected = formRole === "EDITOR" && formCustomRoleId === cr.id;
                        const colorStyle = ROLE_COLOR_STYLES[cr.color] || ROLE_COLOR_STYLES.blue;

                        return (
                          <label
                            key={cr.id}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                              isFull
                                ? "opacity-50 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-border/30 cursor-not-allowed"
                                : isSelected
                                ? `border-primary bg-primary/5 cursor-pointer`
                                : "border-gray-200 dark:border-border/40 hover:border-gray-300 cursor-pointer"
                            }`}
                          >
                            <input
                              type="radio"
                              name="formRole"
                              value={cr.id}
                              disabled={isFull}
                              checked={isSelected}
                              onChange={() => {
                                setFormRole("EDITOR");
                                setFormCustomRoleId(cr.id);
                              }}
                              className="mt-0.5 text-primary focus:ring-primary"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                                <span className={`w-2 h-2 rounded-full ${colorStyle.dot}`} />
                                <span>{cr.name}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {cr.permissions.length} permissões ativas •{" "}
                                <span className="font-mono font-semibold">
                                  {cr._count?.users ?? 0}/4 membros
                                </span>
                              </p>
                              {isFull && (
                                <span className="text-[10px] text-red-500 font-bold block mt-1">
                                  Lotação máxima (4/4 membros)
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Se for Modo de Troca de Cargo */}
              {userModalMode === "edit_role" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      Altere a função de{" "}
                      <strong>{selectedUser?.fullName || selectedUser?.username}</strong>. Ao selecionar um cargo
                      personalizado, as permissões são herdadas automaticamente.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Opção: Editor Padrão */}
                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        changeRoleTarget === "EDITOR_DEFAULT"
                          ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                          : "border-gray-200 dark:border-border/40 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="changeRoleTarget"
                        value="EDITOR_DEFAULT"
                        checked={changeRoleTarget === "EDITOR_DEFAULT"}
                        onChange={() => setChangeRoleTarget("EDITOR_DEFAULT")}
                        className="mt-0.5 text-indigo-500 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                          <span>🛡️</span>
                          <span>Editor Padrão (Modular)</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Função padrão com permissões configuráveis individualmente pelo Administrador.
                        </p>
                      </div>
                    </label>

                    {/* Cargos Customizados */}
                    {customRoles.map((cr) => {
                      const isCurrentMemberOfThisRole = selectedUser?.customRoleId === cr.id;
                      const isFull = !isCurrentMemberOfThisRole && (cr._count?.users ?? 0) >= 4;
                      const isSelected = changeRoleTarget === cr.id;
                      const colorStyle = ROLE_COLOR_STYLES[cr.color] || ROLE_COLOR_STYLES.blue;

                      return (
                        <label
                          key={cr.id}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                            isFull
                              ? "opacity-50 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-border/30 cursor-not-allowed"
                              : isSelected
                              ? "border-primary bg-primary/5 cursor-pointer"
                              : "border-gray-200 dark:border-border/40 hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          <input
                            type="radio"
                            name="changeRoleTarget"
                            value={cr.id}
                            disabled={isFull}
                            checked={isSelected}
                            onChange={() => setChangeRoleTarget(cr.id)}
                            className="mt-0.5 text-primary focus:ring-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
                                <span className={`w-2 h-2 rounded-full ${colorStyle.dot}`} />
                                <span>{cr.name}</span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-muted-foreground">
                                {cr._count?.users ?? 0}/4 membros
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {cr.permissions.length} permissões ativas configuradas.
                            </p>
                            {isFull && (
                              <span className="text-[10px] text-red-500 font-bold block mt-1">
                                Lotação máxima atingida (4/4 membros vinculados).
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bloco: Matriz de Permissões (para Editor Padrão na criação, na edição completa ou na edição de permissões) */}
              {(((userModalMode === "create" || userModalMode === "edit") && formRole === "EDITOR" && !formCustomRoleId) ||
                userModalMode === "edit_permissions") && (
                <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-border/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>Matriz Granular de Acessos</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Habilite ou desabilite os módulos operacionais individualmente.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectDefaultPermissions}
                        className="text-[11px] h-7 px-2 cursor-pointer"
                      >
                        Padrão Seguro
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllPermissions}
                        className="text-[11px] h-7 px-2 cursor-pointer"
                      >
                        Marcar Todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllPermissions}
                        className="text-[11px] h-7 px-2 text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>

                  {/* Operação */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Operação da Cozinha & Esteira
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.operacao.map((perm) => {
                        const checked = formPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-gray-50/60 dark:bg-background/40 border-gray-200 dark:border-border/30 text-muted-foreground hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cardápio */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Gestão de Produtos & Cardápio
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.cardapio.map((perm) => {
                        const checked = formPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-gray-50/60 dark:bg-background/40 border-gray-200 dark:border-border/30 text-muted-foreground hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estratégico */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Estratégico & Marketing
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.estrategico.map((perm) => {
                        const checked = formPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-gray-50/60 dark:bg-background/40 border-gray-200 dark:border-border/30 text-muted-foreground hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões do Rodapé do Modal */}
              <div className="pt-4 border-t border-gray-100 dark:border-border/30 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUserModalOpen(false)}
                  className="rounded-xl cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary text-white rounded-xl font-bold cursor-pointer"
                >
                  {actionLoading ? "Salvando..." : "Confirmar e Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: GESTÃO DE CARGOS PERSONALIZADOS (CUSTOM ROLES)   */}
      {/* ========================================================= */}
      {rolesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50/60 dark:bg-background/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    {roleModalTab === "list"
                      ? "Cargos Personalizados (RBAC)"
                      : editingRoleId
                      ? "Editar Cargo Personalizado"
                      : "Criar Novo Cargo Personalizado"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {roleModalTab === "list"
                      ? `Você pode criar até 4 cargos personalizados. Lotação máxima de 4 membros por cargo.`
                      : "Defina o nome, a cor de destaque e as permissões de acesso do cargo."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRolesModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo: Lista ou Formulário */}
            {roleModalTab === "list" ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Cargos Criados: <strong>{customRoles.length} de 4 permitidos</strong>
                  </span>
                  <Button
                    type="button"
                    disabled={customRoles.length >= 4}
                    onClick={handleStartCreateCustomRole}
                    className="bg-primary text-white text-xs font-bold rounded-xl h-9 px-3.5 gap-1.5 cursor-pointer"
                  >
                    <span>+ Novo Cargo</span>
                  </Button>
                </div>

                {customRoles.length === 0 ? (
                  <div className="py-12 text-center space-y-3 px-4 border border-dashed rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-lg">
                      🛡️
                    </div>
                    <h5 className="font-heading font-bold text-sm text-foreground">
                      Nenhum cargo personalizado criado
                    </h5>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Crie cargos como Atendente, Cozinha ou Supervisor com permissões pré-definidas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {customRoles.map((role) => {
                      const colorStyle = ROLE_COLOR_STYLES[role.color] || ROLE_COLOR_STYLES.blue;
                      const membersCount = role._count?.users ?? 0;
                      const isFull = membersCount >= 4;

                      return (
                        <div
                          key={role.id}
                          className="p-4 rounded-xl border border-gray-200 dark:border-border/40 bg-gray-50/60 dark:bg-background/40 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${colorStyle.dot}`} />
                                <span>{role.name}</span>
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                  isFull
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                    : "bg-gray-200 dark:bg-white/10 text-foreground"
                                }`}
                              >
                                {membersCount}/4 membros
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {role.permissions.length} módulos habilitados na matriz de acessos.
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartEditCustomRole(role)}
                              className="rounded-lg h-8 text-xs font-bold gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={membersCount > 0}
                              onClick={() => handleDeleteCustomRole(role)}
                              className={`rounded-lg h-8 text-xs font-bold gap-1 cursor-pointer ${
                                membersCount > 0
                                  ? "opacity-40 cursor-not-allowed"
                                  : "text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200 dark:border-red-900/40"
                              }`}
                              title={
                                membersCount > 0
                                  ? `Não é possível excluir: existem ${membersCount} membro(s) vinculados a este cargo.`
                                  : "Excluir Cargo"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveCustomRole} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {/* Nome do Cargo */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Nome do Cargo *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleFormName}
                    onChange={(e) => setRoleFormName(e.target.value)}
                    placeholder="Ex: Atendente de Balcão"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Seleção de Cor do Badge */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Cor do Badge de Identificação:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {Object.entries(ROLE_COLOR_STYLES).map(([key, style]) => {
                      const isSelected = roleFormColor === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setRoleFormColor(key)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? `ring-2 ring-primary border-primary ${style.bg} ${style.text}`
                              : "border-gray-200 dark:border-border/40 hover:border-gray-300"
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${style.dot}`} />
                          <span>{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Matriz de Permissões para o Cargo */}
                <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-border/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>Permissões Habilitadas para este Cargo</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Todos os membros vinculados a este cargo herdarão estas permissões.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRoleSelectDefaultPermissions}
                        className="text-[11px] h-7 px-2 cursor-pointer"
                      >
                        Padrão Seguro
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRoleSelectAllPermissions}
                        className="text-[11px] h-7 px-2 cursor-pointer"
                      >
                        Marcar Todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRoleClearAllPermissions}
                        className="text-[11px] h-7 px-2 text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>

                  {/* Operação */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Operação da Cozinha & Esteira
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.operacao.map((perm) => {
                        const checked = roleFormPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-gray-50/60 dark:bg-background/40 border-gray-200 dark:border-border/30 text-muted-foreground hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRolePermission(perm.id)}
                              className="mt-0.5 rounded text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cardápio */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Gestão de Produtos & Cardápio
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.cardapio.map((perm) => {
                        const checked = roleFormPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-gray-50/60 dark:bg-background/40 border-gray-200 dark:border-border/30 text-muted-foreground hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRolePermission(perm.id)}
                              className="mt-0.5 rounded text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estratégico */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Estratégico & Marketing
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.estrategico.map((perm) => {
                        const checked = roleFormPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-gray-50/60 dark:bg-background/40 border-gray-200 dark:border-border/30 text-muted-foreground hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRolePermission(perm.id)}
                              className="mt-0.5 rounded text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Rodapé do Formulário de Cargo */}
                <div className="pt-4 border-t border-gray-100 dark:border-border/30 flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRoleModalTab("list");
                      setEditingRoleId(null);
                    }}
                    className="rounded-xl cursor-pointer"
                  >
                    Voltar à Lista
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-primary text-white rounded-xl font-bold cursor-pointer"
                  >
                    {actionLoading ? "Salvando..." : "Salvar Cargo"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: RESET DE SENHA ADMINISTRATIVO                     */}
      {/* ========================================================= */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  Resetar Senha
                </h3>
                <p className="text-xs text-muted-foreground">
                  Defina uma nova senha para {selectedUser?.fullName || selectedUser?.username}.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nova Senha (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={actionLoading}
                onClick={handleResetPassword}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold cursor-pointer"
              >
                {actionLoading ? "Salvando..." : "Confirmar Nova Senha"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: BLOQUEIO / DESBLOQUEIO DE USUÁRIO                 */}
      {/* ========================================================= */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  selectedUser?.isBlocked
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {selectedUser?.isBlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  {selectedUser?.isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedUser?.isBlocked
                    ? `Restaurar o acesso de ${selectedUser?.fullName || selectedUser?.username}.`
                    : `Impedir o acesso de ${selectedUser?.fullName || selectedUser?.username}.`}
                </p>
              </div>
            </div>

            {!selectedUser?.isBlocked && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Motivo do Bloqueio
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Tentativa suspeita ou solicitação judicial"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBlockModalOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={actionLoading}
                onClick={handleToggleBlock}
                className={`text-white rounded-xl font-bold cursor-pointer ${
                  selectedUser?.isBlocked
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {actionLoading
                  ? "Processando..."
                  : selectedUser?.isBlocked
                  ? "Confirmar Desbloqueio"
                  : "Confirmar Bloqueio"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DRAWER: HISTÓRICO ANALÍTICO DO CLIENTE                     */}
      {/* ========================================================= */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-card border-l border-border w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50/60 dark:bg-background/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    Dossiê do Usuário
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser?.fullName || selectedUser?.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {historyLoading ? (
                <div className="py-20 text-center text-muted-foreground space-y-3">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
                  <p className="text-xs">Carregando histórico analítico...</p>
                </div>
              ) : userDossier ? (
                <>
                  {/* Cards de Métricas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-gray-100 dark:border-border/30 bg-gray-50/60 dark:bg-background/40">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Total de Pedidos
                      </span>
                      <span className="font-heading font-bold text-lg text-foreground mt-0.5 block">
                        {userDossier.metrics.totalOrders}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-gray-100 dark:border-border/30 bg-gray-50/60 dark:bg-background/40">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Gasto Total
                      </span>
                      <span className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        R$ {userDossier.metrics.totalSpent.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-gray-100 dark:border-border/30 bg-gray-50/60 dark:bg-background/40 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Ticket Médio
                      </span>
                      <span className="font-heading font-bold text-lg text-primary mt-0.5 block">
                        R$ {userDossier.metrics.averageTicket.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Pedidos Anteriores */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Histórico de Pedidos ({userDossier.orders.length})
                    </h4>

                    {userDossier.orders.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        Nenhum pedido registrado para este usuário.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userDossier.orders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-3.5 rounded-xl border border-gray-200 dark:border-border/40 bg-gray-50/40 dark:bg-background/20 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-foreground">
                                Pedido #{ord.id.slice(0, 8)}
                              </span>
                              <span className="text-muted-foreground font-mono text-[11px]">
                                {formatDate(ord.createdAt)}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {ord.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between py-0.5">
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
      )}
    </div>
  );
}
