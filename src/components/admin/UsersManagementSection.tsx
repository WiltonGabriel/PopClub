"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
  Zap,
  Key,
  Lock,
  Unlock,
  Trash2,
  History,
  MoreVertical,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  adminUserService,
  AdminUserListItem,
  UserDossier,
  UserHistoryItem,
} from "@/services/adminUserService";
import { formatCpf, cleanCpf, validateCpf } from "@/lib/cpf";
import {
  PERMISSION_KEYS,
  PERMISSION_DEFINITIONS,
  DEFAULT_EDITOR_PERMISSIONS,
  ALL_PERMISSIONS,
  PermissionKey,
} from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function UsersManagementSection() {
  const { user: currentAuthUser } = useAuth();

  // Estados principais de listagem
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "team" | "registered" | "fast_access" | "blocked">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Estados de modais e gavetas
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"create" | "edit_permissions" | "edit_role">("create");
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

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
  const [formCpf, setFormCpf] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"ADMIN" | "EDITOR" | "CLIENT">("EDITOR");
  const [formPermissions, setFormPermissions] = useState<string[]>([...DEFAULT_EDITOR_PERMISSIONS]);
  const [permissionsSectionOpen, setPermissionsSectionOpen] = useState(true);

  // Exibe feedback temporário com auto-dismiss
  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Carregamento de Usuários
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminUserService.getUsers({
        page,
        limit: 15,
        search,
        filter,
      });
      setUsers(res.users);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao carregar lista de usuários.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Abertura do modal de criação de novo membro
  const handleOpenCreateModal = () => {
    setUserModalMode("create");
    setSelectedUser(null);
    setFormFullName("");
    setFormCpf("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("");
    setFormRole("EDITOR");
    setFormPermissions([...DEFAULT_EDITOR_PERMISSIONS]);
    setPermissionsSectionOpen(true);
    setUserModalOpen(true);
  };

  // Abertura do modal exclusivo de permissões do editor
  const handleOpenPermissionsModal = (user: AdminUserListItem) => {
    setUserModalMode("edit_permissions");
    setSelectedUser(user);
    setFormFullName(user.fullName || user.username || "");
    setFormCpf(user.cpf ? formatCpf(user.cpf) : "");
    setFormEmail(user.email || "");
    setFormPhone(user.phone || "");
    setFormPassword("");
    setFormRole((user.role.toUpperCase() as "ADMIN" | "EDITOR" | "CLIENT") || "EDITOR");
    setFormPermissions(Array.isArray(user.permissions) ? [...user.permissions] : [...DEFAULT_EDITOR_PERMISSIONS]);
    setPermissionsSectionOpen(true);
    setUserModalOpen(true);
  };

  // Abertura do modal de troca de cargo
  const handleOpenRoleModal = (user: AdminUserListItem) => {
    setUserModalMode("edit_role");
    setSelectedUser(user);
    setFormFullName(user.fullName || user.username || "");
    setFormRole((user.role.toUpperCase() as "ADMIN" | "EDITOR" | "CLIENT") || "CLIENT");
    setFormPermissions(Array.isArray(user.permissions) ? [...user.permissions] : [...DEFAULT_EDITOR_PERMISSIONS]);
    setPermissionsSectionOpen(false);
    setUserModalOpen(true);
  };

  // Abertura da gaveta de histórico
  const handleOpenHistoryDrawer = async (user: AdminUserListItem) => {
    setSelectedUser(user);
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const dossier = await adminUserService.getUserHistory(user.id);
      setUserDossier(dossier);
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao carregar histórico do cliente.");
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

        const cleanedCpfNum = formCpf ? cleanCpf(formCpf) : undefined;
        if (cleanedCpfNum && !validateCpf(cleanedCpfNum)) {
          throw new Error("O CPF informado é inválido.");
        }

        await adminUserService.createTeamMember({
          fullName: formFullName.trim(),
          cpf: cleanedCpfNum,
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          password: formPassword,
          role: formRole === "ADMIN" ? "ADMIN" : "EDITOR",
          permissions: formRole === "EDITOR" ? formPermissions : [],
        });

        showFeedback("success", "Novo membro da equipe criado com sucesso!");
        setUserModalOpen(false);
        fetchUsers();
      } else if (userModalMode === "edit_permissions" && selectedUser) {
        await adminUserService.updateUser(selectedUser.id, {
          permissions: formPermissions,
        });

        showFeedback("success", `Permissões de ${selectedUser.fullName || selectedUser.username} atualizadas com sucesso!`);
        setUserModalOpen(false);
        fetchUsers();
      } else if (userModalMode === "edit_role" && selectedUser) {
        await adminUserService.updateUser(selectedUser.id, {
          role: formRole,
          permissions: formRole === "EDITOR" ? formPermissions : [],
        });

        showFeedback("success", `Cargo de ${selectedUser.fullName || selectedUser.username} atualizado para ${formRole}!`);
        setUserModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao salvar alterações.");
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
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao resetar senha.");
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
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao alterar status de bloqueio.");
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
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao desativar conta.");
    }
  };

  // Formatação com máscara de CPF no input
  const handleCpfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = cleanCpf(raw);
    if (cleaned.length <= 11) {
      setFormCpf(formatCpf(cleaned));
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
                Controle de acessos, RBAC granular para editores e histórico analítico de clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={fetchUsers}
            variant="outline"
            className="rounded-xl border-gray-200 dark:border-border/40 h-11 px-3.5 text-xs font-bold gap-1.5 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-primary/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo Usuário / Membro</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de Busca Global */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por Nome, CPF, E-mail ou Telefone..."
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros em Pílulas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: "Todos", count: totalCount },
              { id: "team", label: "Equipe (Admins/Editores)" },
              { id: "registered", label: "Clientes Cadastrados" },
              { id: "fast_access", label: "Acesso Rápido" },
              { id: "blocked", label: "Bloqueados" },
            ].map((p) => {
              const active = filter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setFilter(p.id as any);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-white shadow-xs font-bold"
                      : "bg-gray-100 dark:bg-background text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-white/5 border border-transparent dark:border-border/30"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-border/30 bg-gray-50/70 dark:bg-background/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                  <th className="py-3.5 px-4">Documento (CPF)</th>
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

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Coluna 1: Avatar e Identificação */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={u.avatarUrl || "/avatars/avatar-sorvete.svg"}
                              alt={u.fullName || "Avatar"}
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
                                title="Editor"
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

                      {/* Coluna 2: Documento (CPF) */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {u.cpf ? (
                          <span className="font-semibold text-foreground">
                            {formatCpf(u.cpf)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
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
                        {isEditor && (
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <span>🛡️</span>
                              <span>Editor</span>
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

                          {/* Se for Editor: Botão rápido para Matriz de Permissões */}
                          {isEditor && (
                            <button
                              type="button"
                              onClick={() => handleOpenPermissionsModal(u)}
                              className="p-1.5 rounded-lg text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                              title="Configurar Permissões de Acesso"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Alterar Cargo */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleOpenRoleModal(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf
                                ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5"
                            }`}
                            title={isSelf ? "Você não pode alterar seu próprio cargo" : "Alterar Cargo"}
                          >
                            <Shield className="w-4 h-4" />
                          </button>

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
                                ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
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
                                ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
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
                  {userModalMode === "create" ? <UserPlus className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    {userModalMode === "create"
                      ? "Novo Membro da Equipe"
                      : userModalMode === "edit_permissions"
                      ? `Permissões de ${selectedUser?.fullName || selectedUser?.username}`
                      : `Alterar Cargo de ${selectedUser?.fullName || selectedUser?.username}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {userModalMode === "create"
                      ? "Cadastre um administrador ou editor com permissões sob medida."
                      : userModalMode === "edit_permissions"
                      ? "Selecione individualmente quais módulos e abas o editor pode acessar."
                      : "Defina o nível de acesso deste usuário no sistema."}
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
              {/* Se for Criação de Usuário: Exibe campos de cadastro */}
              {userModalMode === "create" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                        <span>CPF</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Somente números</span>
                      </label>
                      <input
                        type="text"
                        value={formCpf}
                        onChange={handleCpfInputChange}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
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
                      <span>Senha de Acesso *</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Mínimo 6 caracteres</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              )}

              {/* Seção de Seleção de Cargo */}
              {(userModalMode === "create" || userModalMode === "edit_role") && (
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-border/30">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selecione o Cargo do Membro:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formRole === "ADMIN"
                          ? "border-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                          : "border-gray-200 dark:border-border/40 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="formRole"
                        value="ADMIN"
                        checked={formRole === "ADMIN"}
                        onChange={() => setFormRole("ADMIN")}
                        className="mt-0.5 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                          <span>👑</span>
                          <span>Administrador</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Acesso <strong>total e irrestrito</strong> a 100% dos módulos, relatórios, configurações e gestão de usuários.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formRole === "EDITOR"
                          ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                          : "border-gray-200 dark:border-border/40 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="formRole"
                        value="EDITOR"
                        checked={formRole === "EDITOR"}
                        onChange={() => setFormRole("EDITOR")}
                        className="mt-0.5 text-indigo-500 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                          <span>🛡️</span>
                          <span>Editor</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Acesso <strong>personalizável</strong> definido na matriz de permissões abaixo. Nunca tem acesso a gerenciar outros usuários.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Bloco Colapsável: Matriz de Permissões do Editor */}
              {(formRole === "EDITOR" || userModalMode === "edit_permissions") && (
                <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        <span>Permissões de Acesso do Editor</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formPermissions.length} de {ALL_PERMISSIONS.length} recursos liberados.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectDefaultPermissions}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        title="Ativa Esteira, Estoque, Métricas, Combos, Promoções, Adicionais e Logística"
                      >
                        ⚡ Padrão Operacional
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllPermissions}
                        className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Grupo 1: Módulos Operacionais da Cozinha */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Módulos Operacionais da Cozinha
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.operacao.map((perm) => {
                        const isChecked = formPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-primary/5 border-primary/30"
                                : "bg-gray-50/50 dark:bg-background/40 border-gray-200 dark:border-border/30 opacity-70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-1 rounded-md text-primary focus:ring-primary w-4 h-4"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs sm:text-sm text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block leading-relaxed">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grupo 2: Cardápio & Vendas */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Cardápio & Vendas
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.cardapio.map((perm) => {
                        const isChecked = formPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-primary/5 border-primary/30"
                                : "bg-gray-50/50 dark:bg-background/40 border-gray-200 dark:border-border/30 opacity-70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-1 rounded-md text-primary focus:ring-primary w-4 h-4"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs sm:text-sm text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block leading-relaxed">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grupo 3: Estratégico & Decisões do Dono */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Estratégico / Decisões do Dono
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        Bloqueados por Padrão
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedPermissions.estrategico.map((perm) => {
                        const isChecked = formPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-primary/5 border-primary/30"
                                : "bg-gray-50/50 dark:bg-background/40 border-gray-200 dark:border-border/30 opacity-70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-1 rounded-md text-primary focus:ring-primary w-4 h-4"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs sm:text-sm text-foreground block">
                                {perm.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block leading-relaxed">
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

              {/* Botões do Rodapé do Formulário */}
              <div className="pt-4 border-t border-border/50 flex justify-end items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUserModalOpen(false)}
                  className="rounded-xl h-11 px-5 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 text-xs font-bold cursor-pointer shadow-md shadow-primary/20"
                >
                  {actionLoading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DRAWER LATERAL: DOSSIÊ E HISTÓRICO DO CLIENTE */}
      {/* ========================================================= */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header do Drawer */}
            <div className="p-5 border-b border-border/50 bg-gray-50/70 dark:bg-background/40 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedUser?.avatarUrl || "/avatars/avatar-sorvete.svg"}
                  alt={selectedUser?.fullName || "Avatar"}
                  className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-border/40"
                />
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base text-foreground truncate">
                    {selectedUser?.fullName || selectedUser?.username || "Dossiê do Cliente"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    {selectedUser?.cpf && <span>CPF: {formatCpf(selectedUser.cpf)}</span>}
                    {selectedUser?.phone && <span>• {selectedUser.phone}</span>}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
              {historyLoading ? (
                <div className="py-20 text-center text-muted-foreground space-y-3">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
                  <p className="text-xs">Carregando métricas e histórico de compras...</p>
                </div>
              ) : userDossier ? (
                <>
                  {/* Grid de Métricas Analíticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Gasto</span>
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <p className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                        R$ {userDossier.metrics.totalSpent.toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ticket Médio</span>
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="font-mono font-black text-lg text-primary">
                        R$ {userDossier.metrics.averageTicket.toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Pedidos</span>
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <p className="font-mono font-black text-lg text-foreground">
                        {userDossier.metrics.totalOrders}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Concluídos
                      </span>
                      <p className="font-mono font-bold text-sm text-emerald-600">
                        {userDossier.metrics.completedOrders} pedidos
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Cancelados
                      </span>
                      <p className="font-mono font-bold text-sm text-red-500">
                        {userDossier.metrics.cancelledOrders} pedidos
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Primeiro Pedido
                      </span>
                      <p className="font-mono text-xs text-foreground truncate">
                        {userDossier.metrics.firstOrderAt
                          ? new Date(userDossier.metrics.firstOrderAt).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </p>
                    </div>
                  </div>

                  {/* Lista Cronológica de Pedidos */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-foreground flex items-center justify-between">
                      <span>Histórico de Compras ({userDossier.orders.length})</span>
                    </h4>

                    {userDossier.orders.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground bg-gray-50 dark:bg-background rounded-xl border border-dashed border-gray-200 dark:border-border/40">
                        Este cliente ainda não realizou nenhum pedido.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userDossier.orders.map((ord) => {
                          let badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
                          let badgeLabel = "Pendente";
                          if (ord.status === "completed") {
                            badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
                            badgeLabel = "Concluído";
                          } else if (ord.status === "cancelled") {
                            badgeColor = "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
                            badgeLabel = "Cancelado";
                          } else if (ord.status === "delivering") {
                            badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
                            badgeLabel = "A Caminho";
                          }

                          return (
                            <div
                              key={ord.id}
                              className="p-4 rounded-xl border border-gray-200 dark:border-border/40 bg-gray-50/60 dark:bg-background/60 space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-primary">
                                    #{ord.id.substring(0, 6)}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                                    {badgeLabel}
                                  </span>
                                </div>
                                <span className="font-mono font-black text-sm text-foreground">
                                  R$ {ord.totalAmount.toFixed(2).replace(".", ",")}
                                </span>
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                                <span>{new Date(ord.createdAt).toLocaleString("pt-BR")}</span>
                                <span className="uppercase font-bold">{ord.paymentMethodType}</span>
                              </div>

                              {/* Itens do Pedido */}
                              <div className="pt-2 border-t border-gray-100 dark:border-border/20 space-y-1">
                                {ord.items.map((it) => (
                                  <div
                                    key={it.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-foreground">
                                      {it.quantity}x {it.productName}
                                    </span>
                                    <span className="font-mono text-muted-foreground">
                                      R$ {(it.quantity * it.priceAtTime).toFixed(2).replace(".", ",")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Rodapé da Gaveta */}
            <div className="p-4 border-t border-border/50 bg-gray-50/70 dark:bg-background/40 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setHistoryDrawerOpen(false)}
                className="rounded-xl h-10 px-5 text-xs font-bold cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RESET DE SENHA */}
      {/* ========================================================= */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  Resetar Senha de Acesso
                </h3>
                <p className="text-xs text-muted-foreground">
                  Usuário: <strong>{selectedUser?.fullName || selectedUser?.username}</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Nova Senha (Mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha..."
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-xl h-10 px-4 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={actionLoading || newPassword.length < 6}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-5 text-xs font-bold cursor-pointer"
              >
                {actionLoading ? "Salvando..." : "Confirmar Nova Senha"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: BLOQUEIO / DESBLOQUEIO DE USUÁRIO */}
      {/* ========================================================= */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  selectedUser?.isBlocked
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {selectedUser?.isBlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  {selectedUser?.isBlocked ? "Desbloquear Conta" : "Bloquear Conta de Usuário"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Usuário: <strong>{selectedUser?.fullName || selectedUser?.username}</strong>
                </p>
              </div>
            </div>

            {!selectedUser?.isBlocked && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Motivo do Bloqueio (Registrado no Sistema)
                </label>
                <textarea
                  rows={3}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Fraude recorrente em pagamentos, desrespeito a entregadores..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setBlockModalOpen(false)}
                className="rounded-xl h-10 px-4 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleToggleBlock}
                disabled={actionLoading}
                className={`rounded-xl h-10 px-5 text-xs font-bold text-white cursor-pointer ${
                  selectedUser?.isBlocked
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
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
    </div>
  );
}
