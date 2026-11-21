import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  DEFAULT_EDITOR_PERMISSIONS,
  hasPermission,
  isUserAdmin,
  isUserEditor,
  validatePermissionsInput,
} from "@/lib/permissions";
import {
  MAX_ACTIVE_ADMINS,
  MAX_CUSTOM_ROLES,
  MAX_MEMBERS_PER_CUSTOM_ROLE,
  arePermissionSetsEqual,
  isCustomRoleLimitReached,
} from "@/domain/services/RbacDomainService";
import {
  createCustomRoleSchema,
  createStaffUserSchema,
  updateAdminUserSchema,
  updateCustomRoleSchema,
} from "@/lib/validations/adminUsers";
import { recordAdminAudit } from "@/services/auditLogService";
import { calculateAccountAgeMonths, getUserBadge } from "@/services/loyaltyBadgeService";
import { loadLoyaltyBadgesConfig } from "@/services/couponLoyaltyService";
import type { UsersSummary } from "@/services/adminUserService";

export class AdminUserServiceError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminUserServiceError";
    this.status = status;
  }
}

export interface AdminAuthActor {
  id: string;
  role: string;
  permissions?: string[];
  customRole?: { permissions?: string[] } | null;
}

const ADMIN_USER_LIST_SELECT = {
  id: true,
  cpf: true,
  email: true,
  username: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  permissions: true,
  isRegistered: true,
  isActive: true,
  isBlocked: true,
  blockReason: true,
  tokenVersion: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  customRoleId: true,
  customRole: {
    select: {
      id: true,
      name: true,
      color: true,
      permissions: true,
    },
  },
  createdById: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
    },
  },
  _count: {
    select: { orders: true },
  },
} as const;

const ADMIN_USER_MUTATION_SELECT = {
  id: true,
  cpf: true,
  email: true,
  username: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  permissions: true,
  isRegistered: true,
  isActive: true,
  isBlocked: true,
  blockReason: true,
  tokenVersion: true,
  createdAt: true,
  updatedAt: true,
  customRoleId: true,
  customRole: {
    select: {
      id: true,
      name: true,
      color: true,
      permissions: true,
    },
  },
  createdById: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
    },
  },
} as const;

const CUSTOM_ROLE_INCLUDE = {
  _count: {
    select: {
      users: {
        where: {
          isActive: true,
          deletedAt: null,
        },
      },
    },
  },
} as const;

function hasUsersManageAccess(authUser: AdminAuthActor | null | undefined): boolean {
  return (
    isUserAdmin(authUser) ||
    (isUserEditor(authUser) && hasPermission(authUser, "users_manage"))
  );
}

function buildAdminUserListWhere(params: {
  isAdmin: boolean;
  filter: string;
  status: string;
  search: string;
  minMonthsStr: string | null;
  maxMonthsStr: string | null;
}): Prisma.UserWhereInput {
  const { isAdmin, filter, status, search, minMonthsStr, maxMonthsStr } = params;
  const where: Prisma.UserWhereInput = {};

  if (!isAdmin) {
    // Editores com users_manage enxergam exclusivamente contas de clientes
    where.role = Role.CLIENT;
    where.deletedAt = null;
    if (filter === "fast_access") {
      where.isRegistered = false;
    } else if (filter === "registered") {
      where.isRegistered = true;
    } else if (filter === "blocked") {
      where.isBlocked = true;
    }
  } else if (filter === "admin") {
    where.role = Role.ADMIN;
    where.deletedAt = null;
  } else if (filter === "editor") {
    where.role = Role.EDITOR;
    where.customRoleId = null;
    where.deletedAt = null;
  } else if (filter.startsWith("custom_")) {
    where.role = Role.EDITOR;
    where.customRoleId = filter.replace("custom_", "");
    where.deletedAt = null;
  } else if (filter === "team") {
    where.role = { in: [Role.ADMIN, Role.EDITOR] };
    where.deletedAt = null;
  } else if (filter === "clients") {
    where.role = Role.CLIENT;
    where.deletedAt = null;
  } else if (filter === "registered") {
    where.role = Role.CLIENT;
    where.isRegistered = true;
    where.deletedAt = null;
  } else if (filter === "fast_access") {
    where.role = Role.CLIENT;
    where.isRegistered = false;
    where.deletedAt = null;
  } else if (filter === "blocked") {
    where.isBlocked = true;
    where.deletedAt = null;
  } else {
    where.deletedAt = null;
  }

  if (status === "active") {
    where.isBlocked = false;
  } else if (status === "blocked") {
    where.isBlocked = true;
  }

  if (minMonthsStr || maxMonthsStr) {
    const minM = minMonthsStr ? parseInt(minMonthsStr, 10) : null;
    const maxM = maxMonthsStr ? parseInt(maxMonthsStr, 10) : null;
    const now = new Date();
    const createdAtFilter: Prisma.DateTimeFilter =
      (where.createdAt as Prisma.DateTimeFilter) || {};

    if (minM !== null && !Number.isNaN(minM)) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - minM);
      createdAtFilter.lte = date;
    }
    if (maxM !== null && !Number.isNaN(maxM)) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - maxM);
      createdAtFilter.gte = date;
    }
    if (Object.keys(createdAtFilter).length > 0) {
      where.createdAt = createdAtFilter;
    }
  }

  if (search) {
    const cleaned = search.replace(/\D/g, "");
    const searchConditions: Prisma.UserWhereInput[] = [
      { fullName: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];

    if (cleaned.length >= 3) {
      searchConditions.push({ phone: { contains: cleaned } });
    }

    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { OR: searchConditions },
    ];
  }

  return where;
}

function buildAdminUserOrderBy(sort: string): Prisma.UserOrderByWithRelationInput[] {
  if (sort === "oldest") {
    return [{ createdAt: "asc" }];
  }
  if (sort === "orders") {
    return [{ orders: { _count: "desc" } }, { createdAt: "desc" }];
  }
  if (sort === "alphabetical") {
    return [{ fullName: "asc" }, { username: "asc" }];
  }
  return [{ role: "asc" }, { createdAt: "desc" }];
}

async function buildUsersSummary(isAdmin: boolean): Promise<UsersSummary | undefined> {
  try {
    if (isAdmin) {
      const [
        activeAdminsCount,
        teamCount,
        clientsCount,
        blockedCount,
        customRolesCount,
      ] = await Promise.all([
        prisma.user.count({
          where: {
            role: Role.ADMIN,
            isActive: true,
            isBlocked: false,
            deletedAt: null,
          },
        }),
        prisma.user.count({
          where: {
            role: { in: [Role.ADMIN, Role.EDITOR] },
            deletedAt: null,
          },
        }),
        prisma.user.count({
          where: {
            role: Role.CLIENT,
            deletedAt: null,
          },
        }),
        prisma.user.count({
          where: {
            isBlocked: true,
            deletedAt: null,
          },
        }),
        prisma.customRole.count(),
      ]);

      return {
        activeAdminsCount,
        maxAdmins: MAX_ACTIVE_ADMINS,
        teamCount,
        clientsCount,
        blockedCount,
        customRolesCount,
        maxCustomRoles: MAX_CUSTOM_ROLES,
      };
    }

    const [clientsCount, blockedCount] = await Promise.all([
      prisma.user.count({
        where: {
          role: Role.CLIENT,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          role: Role.CLIENT,
          isBlocked: true,
          deletedAt: null,
        },
      }),
    ]);

    return {
      activeAdminsCount: 0,
      maxAdmins: MAX_ACTIVE_ADMINS,
      teamCount: 0,
      clientsCount,
      blockedCount,
      customRolesCount: 0,
      maxCustomRoles: MAX_CUSTOM_ROLES,
    };
  } catch {
    return undefined;
  }
}

export async function listAdminUsers(
  authUser: AdminAuthActor | null | undefined,
  searchParams: URLSearchParams
) {
  if (!authUser || !hasUsersManageAccess(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Permissão users_manage necessária.",
      403
    );
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10) || 15));
  const search = searchParams.get("search")?.trim() || "";
  const filter = searchParams.get("filter") || "all";
  const sort = searchParams.get("sort") || "recent";
  const status = searchParams.get("status") || "all";
  const minOrdersStr = searchParams.get("minOrders");
  const maxOrdersStr = searchParams.get("maxOrders");
  const minMonthsStr = searchParams.get("minMonths");
  const maxMonthsStr = searchParams.get("maxMonths");
  const loyaltyBadgeLevelStr = searchParams.get("loyaltyBadgeLevel");
  const includeSummary = searchParams.get("includeSummary") === "true";

  const isAdmin = isUserAdmin(authUser);
  const where = buildAdminUserListWhere({
    isAdmin,
    filter,
    status,
    search,
    minMonthsStr,
    maxMonthsStr,
  });
  const orderBy = buildAdminUserOrderBy(sort);

  const minOrdersFilter = minOrdersStr ? parseInt(minOrdersStr, 10) : null;
  const maxOrdersFilter = maxOrdersStr ? parseInt(maxOrdersStr, 10) : null;
  const targetBadgeLevel = loyaltyBadgeLevelStr ? parseInt(loyaltyBadgeLevelStr, 10) : null;
  const needsOrderDerivedFilter =
    (minOrdersFilter !== null && !Number.isNaN(minOrdersFilter)) ||
    (maxOrdersFilter !== null && !Number.isNaN(maxOrdersFilter)) ||
    (targetBadgeLevel !== null && !Number.isNaN(targetBadgeLevel));

  const summary = includeSummary ? await buildUsersSummary(isAdmin) : undefined;

  if (needsOrderDerivedFilter) {
    const badges =
      targetBadgeLevel !== null && !Number.isNaN(targetBadgeLevel)
        ? await loadLoyaltyBadgesConfig()
        : [];

    const candidates = await prisma.user.findMany({
      where,
      orderBy,
      select: {
        ...ADMIN_USER_LIST_SELECT,
        orders: {
          where: { status: { not: "cancelled" } },
          select: { status: true },
        },
      },
    });

    const filteredUsers = candidates.filter((u) => {
      const nonCancelledCount = u.orders.length;
      if (
        minOrdersFilter !== null &&
        !Number.isNaN(minOrdersFilter) &&
        nonCancelledCount < minOrdersFilter
      ) {
        return false;
      }
      if (
        maxOrdersFilter !== null &&
        !Number.isNaN(maxOrdersFilter) &&
        nonCancelledCount > maxOrdersFilter
      ) {
        return false;
      }
      if (targetBadgeLevel !== null && !Number.isNaN(targetBadgeLevel)) {
        const months = calculateAccountAgeMonths(u.createdAt);
        const completedCount = u.orders.filter((o) => o.status === "completed").length;
        const userBadge = getUserBadge({ months, completedOrders: completedCount }, badges);
        if (userBadge.level !== targetBadgeLevel) {
          return false;
        }
      }
      return true;
    });

    const total = filteredUsers.length;
    const pagedUsers = filteredUsers
      .slice((page - 1) * limit, page * limit)
      .map((u) => {
        const { orders, ...userWithoutOrders } = u;
        void orders;
        return userWithoutOrders;
      });

    return {
      users: pagedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ...(summary ? { summary } : {}),
    };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      select: ADMIN_USER_LIST_SELECT,
    }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    ...(summary ? { summary } : {}),
  };
}

export async function createStaffUser(
  authUser: AdminAuthActor | null | undefined,
  body: unknown
) {
  if (!authUser || !isUserAdmin(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Apenas administradores podem criar membros da equipe.",
      403
    );
  }

  const parsed = createStaffUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminUserServiceError(
      parsed.error.issues[0]?.message || "Dados inválidos para criação de membro.",
      400
    );
  }

  const data = parsed.data;

  if (data.role === "ADMIN") {
    const activeAdminsCount = await prisma.user.count({
      where: {
        role: Role.ADMIN,
        isActive: true,
        deletedAt: null,
      },
    });
    if (activeAdminsCount >= MAX_ACTIVE_ADMINS) {
      throw new AdminUserServiceError(
        `Limite atingido: O sistema permite no máximo ${MAX_ACTIVE_ADMINS} Administradores ativos.`,
        400
      );
    }
  }

  if (data.cpf) {
    const existingCpf = await prisma.user.findUnique({ where: { cpf: data.cpf } });
    if (existingCpf) {
      throw new AdminUserServiceError("Este CPF já está cadastrado em outro usuário.", 409);
    }
  }

  if (data.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new AdminUserServiceError("Este e-mail já está cadastrado.", 409);
    }
  }

  if (data.phone) {
    const existingPhone = await prisma.user.findFirst({ where: { phone: data.phone } });
    if (existingPhone) {
      throw new AdminUserServiceError("Este telefone já está cadastrado.", 409);
    }
  }

  const passwordHash = await hashPassword(data.password);

  let targetCustomRoleId: string | null = null;
  let finalPermissions: string[] = [];

  if (data.role === "EDITOR") {
    if (data.customRoleId) {
      const customRole = await prisma.customRole.findUnique({
        where: { id: data.customRoleId },
      });

      if (!customRole) {
        throw new AdminUserServiceError("Cargo personalizado selecionado não existe.", 404);
      }

      const membersInRole = await prisma.user.count({
        where: {
          customRoleId: customRole.id,
          isActive: true,
          deletedAt: null,
        },
      });

      if (membersInRole >= MAX_MEMBERS_PER_CUSTOM_ROLE) {
        throw new AdminUserServiceError(
          `Limite de lotação atingido: O cargo "${customRole.name}" já possui o limite máximo de ${MAX_MEMBERS_PER_CUSTOM_ROLE} membros vinculados.`,
          400
        );
      }

      targetCustomRoleId = customRole.id;
      finalPermissions = customRole.permissions;
    } else if (data.permissions !== undefined) {
      finalPermissions = validatePermissionsInput(data.permissions).valid;
    } else {
      finalPermissions = [...DEFAULT_EDITOR_PERMISSIONS];
    }
  }

  const newUser = await prisma.user.create({
    data: {
      fullName: data.fullName,
      cpf: data.cpf ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      passwordHash,
      role: data.role === "ADMIN" ? Role.ADMIN : Role.EDITOR,
      customRoleId: targetCustomRoleId,
      permissions: finalPermissions,
      isRegistered: true,
      isActive: true,
      isBlocked: false,
      tokenVersion: 1,
      createdById: authUser.id,
    },
    select: ADMIN_USER_MUTATION_SELECT,
  });

  await recordAdminAudit({
    actor: { id: authUser.id, role: authUser.role },
    action: "CREATE_STAFF_USER",
    resourceType: "user",
    resourceId: newUser.id,
    summary: `Cadastrou membro da equipe com cargo ${newUser.role}.`,
    diffKeys: ["role", "customRoleId", "permissions"],
    metadata: { targetRole: newUser.role, customRoleId: newUser.customRoleId },
  });

  return newUser;
}

function hasNonAdminPrivilegeFieldInBody(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  return (
    record.role !== undefined ||
    record.customRoleId !== undefined ||
    record.permissions !== undefined
  );
}

export async function updateAdminUser(
  authUser: AdminAuthActor | null | undefined,
  id: string,
  body: unknown
) {
  if (!authUser) {
    throw new AdminUserServiceError("Não autenticado.", 401);
  }
  if (!id) {
    throw new AdminUserServiceError("ID de usuário inválido.", 400);
  }

  const isSelf = authUser.id === id;
  const isAdmin = isUserAdmin(authUser);
  const hasUsersManage = isUserEditor(authUser) && hasPermission(authUser, "users_manage");

  if (!isSelf && !isAdmin && !hasUsersManage) {
    throw new AdminUserServiceError(
      "Acesso negado. Permissão users_manage necessária para editar outros usuários.",
      403
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    include: {
      customRole: true,
    },
  });

  if (!targetUser) {
    throw new AdminUserServiceError("Usuário não encontrado.", 404);
  }

  const targetRoleUpper = String(targetUser.role).toUpperCase();

  if (!isSelf && !isAdmin && targetRoleUpper !== "CLIENT") {
    throw new AdminUserServiceError(
      "Acesso negado. Apenas administradores podem editar membros da equipe.",
      403
    );
  }

  // Impede tentativa de escalonamento de privilégio por não-administradores antes da validação de schema
  if (!isAdmin && targetRoleUpper !== "CLIENT" && hasNonAdminPrivilegeFieldInBody(body)) {
    throw new AdminUserServiceError(
      targetRoleUpper === "ADMIN"
        ? "Apenas administradores podem gerenciar contas de administradores."
        : "Apenas administradores podem alterar cargos ou permissões.",
      403
    );
  }

  const parsedResult = updateAdminUserSchema.safeParse(body);
  if (!parsedResult.success) {
    throw new AdminUserServiceError(
      parsedResult.error.issues[0]?.message || "Dados inválidos para atualização.",
      400
    );
  }
  const parsed = parsedResult.data;

  // Regra de segurança 1: Proteção e promoção controlada de contas de clientes
  const isPromotingClient =
    targetRoleUpper === "CLIENT" &&
    ((parsed.role !== undefined && parsed.role !== "CLIENT") ||
      (parsed.customRoleId !== undefined && parsed.customRoleId !== null));

  if (targetRoleUpper === "CLIENT") {
    const hasClientPrivilegeChangeAttempt =
      isPromotingClient ||
      (parsed.permissions !== undefined && parsed.permissions.length > 0);

    if (hasClientPrivilegeChangeAttempt && !isAdmin) {
      throw new AdminUserServiceError(
        "Apenas administradores podem promover clientes ou alterar cargos.",
        403
      );
    }

    if (!isPromotingClient && parsed.permissions !== undefined && parsed.permissions.length > 0) {
      throw new AdminUserServiceError(
        "Contas de clientes são exclusivas para consumo e não podem receber permissões operacionais sem promoção de cargo.",
        400
      );
    }

    if (isPromotingClient) {
      if (!targetUser.isRegistered) {
        throw new AdminUserServiceError(
          "Apenas clientes com cadastro completo (e-mail/conta registrada) podem ser promovidos.",
          400
        );
      }
      if (targetUser.deletedAt || !targetUser.isActive || targetUser.isBlocked) {
        throw new AdminUserServiceError(
          "Não é possível promover uma conta de cliente bloqueada ou desativada.",
          400
        );
      }
      if (!parsed.adminPassword) {
        throw new AdminUserServiceError(
          "Verificação de segurança obrigatória: informe sua senha atual de administrador para autorizar a promoção deste cliente.",
          400
        );
      }

      const adminRecord = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { passwordHash: true },
      });

      if (!adminRecord?.passwordHash) {
        throw new AdminUserServiceError(
          "Sua conta de administrador (login via Google) ainda não possui senha local definida. Acesse Meu Perfil → Definir Senha para criar uma senha antes de autorizar promoções.",
          400
        );
      }

      const isPasswordValid = await verifyPassword(parsed.adminPassword, adminRecord.passwordHash);

      if (!isPasswordValid) {
        throw new AdminUserServiceError(
          "Senha do administrador logado incorreta. Promoção não autorizada.",
          401
        );
      }
    }
  }

  // Regra de segurança 2: Imutabilidade do cargo de Administrador
  if (targetRoleUpper === "ADMIN") {
    if (!isAdmin) {
      throw new AdminUserServiceError(
        "Apenas administradores podem gerenciar contas de administradores.",
        403
      );
    }
    if (parsed.role !== undefined && parsed.role !== "ADMIN") {
      throw new AdminUserServiceError("O cargo de Administrador é soberano e imutável.", 400);
    }
    if (parsed.customRoleId !== undefined && parsed.customRoleId !== null) {
      throw new AdminUserServiceError(
        "O cargo de Administrador é soberano e não pode ser vinculado a cargos secundários.",
        400
      );
    }
  }

  const dataToUpdate: Prisma.UserUncheckedUpdateInput = {};
  let shouldInvalidateSession = false;
  let customRoleChangedToAssigned = false;

  if (parsed.role !== undefined || parsed.customRoleId !== undefined) {
    if (!isAdmin) {
      throw new AdminUserServiceError("Apenas administradores podem alterar cargos.", 403);
    }

    if (parsed.role !== undefined) {
      if (parsed.role === "ADMIN" && targetRoleUpper !== "ADMIN") {
        const activeAdminsCount = await prisma.user.count({
          where: {
            role: Role.ADMIN,
            isActive: true,
            deletedAt: null,
            id: { not: targetUser.id },
          },
        });
        if (activeAdminsCount >= MAX_ACTIVE_ADMINS) {
          throw new AdminUserServiceError(
            `Limite atingido: O sistema permite no máximo ${MAX_ACTIVE_ADMINS} Administradores ativos.`,
            400
          );
        }
        dataToUpdate.role = Role.ADMIN;
        dataToUpdate.customRoleId = null;
        dataToUpdate.permissions = [];
        shouldInvalidateSession = true;
      } else if (parsed.role === "EDITOR" && targetRoleUpper !== "EDITOR") {
        dataToUpdate.role = Role.EDITOR;
        if (isPromotingClient && parsed.permissions === undefined && !parsed.customRoleId) {
          dataToUpdate.permissions = [...DEFAULT_EDITOR_PERMISSIONS];
        }
        shouldInvalidateSession = true;
      }
    }

    if (
      parsed.customRoleId !== undefined &&
      targetRoleUpper !== "ADMIN" &&
      (targetRoleUpper !== "CLIENT" || isPromotingClient)
    ) {
      const currentCustomRoleId = targetUser.customRoleId ?? null;
      const nextCustomRoleId = parsed.customRoleId ?? null;

      if (nextCustomRoleId !== currentCustomRoleId) {
        if (nextCustomRoleId === null) {
          dataToUpdate.customRoleId = null;
          shouldInvalidateSession = true;
        } else {
          const customRole = await prisma.customRole.findUnique({
            where: { id: nextCustomRoleId },
          });

          if (!customRole) {
            throw new AdminUserServiceError("Cargo personalizado selecionado não existe.", 404);
          }

          const membersInRole = await prisma.user.count({
            where: {
              customRoleId: customRole.id,
              isActive: true,
              deletedAt: null,
              id: { not: targetUser.id },
            },
          });

          if (membersInRole >= MAX_MEMBERS_PER_CUSTOM_ROLE) {
            throw new AdminUserServiceError(
              `Limite de lotação atingido: O cargo "${customRole.name}" já possui o limite máximo de ${MAX_MEMBERS_PER_CUSTOM_ROLE} membros vinculados.`,
              400
            );
          }

          dataToUpdate.role = Role.EDITOR;
          dataToUpdate.customRoleId = customRole.id;
          dataToUpdate.permissions = customRole.permissions;
          shouldInvalidateSession = true;
          customRoleChangedToAssigned = true;
        }
      }
    }
  }

  if (parsed.permissions !== undefined) {
    if (!isAdmin) {
      throw new AdminUserServiceError(
        "Apenas administradores podem alterar permissões.",
        403
      );
    }

    if (
      (targetRoleUpper !== "CLIENT" || isPromotingClient) &&
      targetRoleUpper !== "ADMIN" &&
      parsed.role !== "ADMIN" &&
      !customRoleChangedToAssigned
    ) {
      dataToUpdate.permissions = parsed.permissions;
      if (!arePermissionSetsEqual(targetUser.permissions, parsed.permissions)) {
        shouldInvalidateSession = true;
      }
    }
  }

  if (parsed.password !== undefined) {
    const now = new Date();
    dataToUpdate.passwordHash = await hashPassword(parsed.password);
    dataToUpdate.lastPasswordChangedAt = now;
    dataToUpdate.passwordUpdatedAt = now;
    shouldInvalidateSession = true;
  }

  if (parsed.isBlocked !== undefined) {
    const blockedBool = parsed.isBlocked;

    if (authUser.id === targetUser.id && blockedBool) {
      throw new AdminUserServiceError(
        "Você não pode bloquear sua própria conta de Administrador.",
        400
      );
    }

    if (targetRoleUpper === "ADMIN" && blockedBool) {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          isActive: true,
          isBlocked: false,
          deletedAt: null,
          id: { not: targetUser.id },
        },
      });
      if (activeAdminsCount < 1) {
        throw new AdminUserServiceError(
          "Operação não permitida. O sistema deve possuir pelo menos um Administrador ativo.",
          400
        );
      }
    }

    dataToUpdate.isBlocked = blockedBool;
    dataToUpdate.blockReason = blockedBool
      ? parsed.blockReason?.trim() || "Bloqueio administrativo."
      : null;

    if (blockedBool !== Boolean(targetUser.isBlocked)) {
      shouldInvalidateSession = true;
    }
  }

  if (parsed.fullName !== undefined) {
    dataToUpdate.fullName = parsed.fullName;
  }

  if (parsed.email !== undefined) {
    if (parsed.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: parsed.email, id: { not: id } },
      });
      if (existingEmail) {
        throw new AdminUserServiceError("Este e-mail já está em uso por outro usuário.", 409);
      }
    }
    dataToUpdate.email = parsed.email;
  }

  if (parsed.phone !== undefined) {
    if (parsed.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: parsed.phone, id: { not: id } },
      });
      if (existingPhone) {
        throw new AdminUserServiceError("Este telefone já está em uso por outro usuário.", 409);
      }
    }
    dataToUpdate.phone = parsed.phone;
  }

  if (parsed.cpf !== undefined) {
    if (parsed.cpf) {
      const existingCpf = await prisma.user.findFirst({
        where: { cpf: parsed.cpf, id: { not: id } },
      });
      if (existingCpf) {
        throw new AdminUserServiceError("Este CPF já está em uso por outro usuário.", 409);
      }
    }
    dataToUpdate.cpf = parsed.cpf;
  }

  if (shouldInvalidateSession) {
    dataToUpdate.tokenVersion = { increment: 1 };
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: dataToUpdate,
    select: ADMIN_USER_MUTATION_SELECT,
  });

  await recordAdminAudit({
    actor: { id: authUser.id, role: authUser.role },
    action: isPromotingClient ? "PROMOTE_CLIENT_TO_STAFF" : "UPDATE_USER",
    resourceType: "user",
    resourceId: updatedUser.id,
    summary: isPromotingClient
      ? `Promoveu conta de cliente para ${updatedUser.role} mediante confirmação de senha.`
      : `Atualizou conta (${updatedUser.role}).`,
    diffKeys: Object.keys(dataToUpdate),
    metadata: {
      previousRole: targetUser.role,
      targetRole: updatedUser.role,
      isPromotedFromClient: isPromotingClient,
      isBlocked: updatedUser.isBlocked,
      isSelf,
    },
  });

  return updatedUser;
}

export async function deactivateAdminUser(
  authUser: AdminAuthActor | null | undefined,
  id: string
) {
  if (!authUser || !hasUsersManageAccess(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Permissão users_manage necessária.",
      403
    );
  }
  if (!id) {
    throw new AdminUserServiceError("ID de usuário inválido.", 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    throw new AdminUserServiceError("Usuário não encontrado.", 404);
  }

  if (authUser.id === targetUser.id) {
    throw new AdminUserServiceError(
      "Você não pode desativar ou excluir sua própria conta de Administrador.",
      400
    );
  }

  const targetRoleUpper = String(targetUser.role).toUpperCase();

  if (targetRoleUpper !== "CLIENT" && !isUserAdmin(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Apenas administradores podem desativar membros da equipe.",
      403
    );
  }

  if (targetRoleUpper === "ADMIN") {
    if (!isUserAdmin(authUser)) {
      throw new AdminUserServiceError(
        "Apenas administradores podem desativar contas de administradores.",
        403
      );
    }
    const activeAdminsCount = await prisma.user.count({
      where: {
        role: Role.ADMIN,
        isActive: true,
        isBlocked: false,
        deletedAt: null,
        id: { not: targetUser.id },
      },
    });
    if (activeAdminsCount < 1) {
      throw new AdminUserServiceError(
        "Operação não permitida. O sistema deve possuir pelo menos um Administrador ativo.",
        400
      );
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
      tokenVersion: { increment: 1 },
    },
  });

  await recordAdminAudit({
    actor: { id: authUser.id, role: authUser.role },
    action: "DEACTIVATE_USER",
    resourceType: "user",
    resourceId: id,
    summary: `Desativou conta (${targetUser.role}).`,
    diffKeys: ["isActive", "deletedAt"],
    metadata: { targetRole: targetUser.role },
  });

  return {
    success: true,
    message: "Usuário desativado com sucesso.",
  };
}

export async function listCustomRoles(authUser: AdminAuthActor | null | undefined) {
  if (!authUser || !hasUsersManageAccess(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Permissão users_manage necessária.",
      403
    );
  }

  const roles = await prisma.customRole.findMany({
    orderBy: { createdAt: "asc" },
    include: CUSTOM_ROLE_INCLUDE,
  });

  return { roles };
}

export async function createCustomRole(
  authUser: AdminAuthActor | null | undefined,
  body: unknown
) {
  if (!authUser || !isUserAdmin(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Apenas administradores podem criar cargos personalizados.",
      403
    );
  }

  const parsed = createCustomRoleSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminUserServiceError(
      parsed.error.issues[0]?.message || "Dados inválidos para criação do cargo.",
      400
    );
  }

  const { name: trimmedName, color: chosenColor, permissions: validPermissions } = parsed.data;

  const currentCount = await prisma.customRole.count();
  if (isCustomRoleLimitReached(currentCount)) {
    throw new AdminUserServiceError(
      `Limite atingido: O sistema permite a criação de no máximo ${MAX_CUSTOM_ROLES} cargos personalizados adicionais.`,
      400
    );
  }

  const existingRole = await prisma.customRole.findUnique({
    where: { name: trimmedName },
  });
  if (existingRole) {
    throw new AdminUserServiceError(
      `Já existe um cargo cadastrado com o nome "${trimmedName}".`,
      409
    );
  }

  const newRole = await prisma.customRole.create({
    data: {
      name: trimmedName,
      color: chosenColor,
      permissions: validPermissions,
    },
    include: CUSTOM_ROLE_INCLUDE,
  });

  await recordAdminAudit({
    actor: { id: authUser.id, role: authUser.role },
    action: "CREATE_CUSTOM_ROLE",
    resourceType: "custom_role",
    resourceId: newRole.id,
    summary: `Criou cargo personalizado "${newRole.name}".`,
    diffKeys: ["name", "color", "permissions"],
    metadata: { roleName: newRole.name, permissionsCount: validPermissions.length },
  });

  return newRole;
}

export async function updateCustomRole(
  authUser: AdminAuthActor | null | undefined,
  id: string,
  body: unknown
) {
  if (!authUser || !isUserAdmin(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Apenas administradores podem editar cargos personalizados.",
      403
    );
  }

  if (!id) {
    throw new AdminUserServiceError("ID de cargo inválido.", 400);
  }

  const existingRole = await prisma.customRole.findUnique({
    where: { id },
  });

  if (!existingRole) {
    throw new AdminUserServiceError("Cargo não encontrado.", 404);
  }

  const parsed = updateCustomRoleSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminUserServiceError(
      parsed.error.issues[0]?.message || "Dados inválidos para atualização do cargo.",
      400
    );
  }

  const dataToUpdate: Prisma.CustomRoleUpdateInput = {};

  if (parsed.data.name !== undefined && parsed.data.name !== existingRole.name) {
    const nameConflict = await prisma.customRole.findFirst({
      where: { name: parsed.data.name, id: { not: id } },
    });
    if (nameConflict) {
      throw new AdminUserServiceError(
        `Já existe outro cargo com o nome "${parsed.data.name}".`,
        409
      );
    }
    dataToUpdate.name = parsed.data.name;
  }

  if (parsed.data.color !== undefined) {
    dataToUpdate.color = parsed.data.color;
  }

  const prevPermissions = Array.isArray(existingRole.permissions)
    ? existingRole.permissions
    : [];
  let shouldSyncUserPermissions = false;
  let nextPermissions: string[] = [];

  if (parsed.data.permissions !== undefined) {
    nextPermissions = parsed.data.permissions;
    dataToUpdate.permissions = nextPermissions;
    shouldSyncUserPermissions = !arePermissionSetsEqual(prevPermissions, nextPermissions);
  }

  const updatedRole = await prisma.customRole.update({
    where: { id },
    data: dataToUpdate,
    include: CUSTOM_ROLE_INCLUDE,
  });

  if (shouldSyncUserPermissions) {
    const hadUsersManage = prevPermissions.some(
      (p) => typeof p === "string" && p.toLowerCase() === "users_manage"
    );
    const hasUsersManage = nextPermissions.some(
      (p) => p.toLowerCase() === "users_manage"
    );
    const shouldBumpTokenVersion = hadUsersManage !== hasUsersManage;

    await prisma.user.updateMany({
      where: { customRoleId: id },
      data: {
        permissions: nextPermissions,
        ...(shouldBumpTokenVersion ? { tokenVersion: { increment: 1 } } : {}),
      },
    });
  }

  await recordAdminAudit({
    actor: { id: authUser.id, role: authUser.role },
    action: "UPDATE_CUSTOM_ROLE",
    resourceType: "custom_role",
    resourceId: updatedRole.id,
    summary: `Atualizou cargo personalizado "${updatedRole.name}".`,
    diffKeys: Object.keys(dataToUpdate),
    metadata: {
      roleName: updatedRole.name,
      permissionsCount: Array.isArray(updatedRole.permissions)
        ? updatedRole.permissions.length
        : 0,
    },
  });

  return updatedRole;
}

export async function deleteCustomRole(
  authUser: AdminAuthActor | null | undefined,
  id: string
) {
  if (!authUser || !isUserAdmin(authUser)) {
    throw new AdminUserServiceError(
      "Acesso negado. Apenas administradores podem excluir cargos personalizados.",
      403
    );
  }

  if (!id) {
    throw new AdminUserServiceError("ID de cargo inválido.", 400);
  }

  const role = await prisma.customRole.findUnique({
    where: { id },
    include: CUSTOM_ROLE_INCLUDE,
  });

  if (!role) {
    throw new AdminUserServiceError("Cargo não encontrado.", 404);
  }

  if (role._count.users > 0) {
    throw new AdminUserServiceError(
      `Não é possível excluir o cargo "${role.name}" porque há ${role._count.users} membro(s) da equipe vinculado(s) a ele. Reatribua os membros para outro cargo antes de excluí-lo.`,
      400
    );
  }

  await prisma.customRole.delete({
    where: { id },
  });

  await recordAdminAudit({
    actor: { id: authUser.id, role: authUser.role },
    action: "DELETE_CUSTOM_ROLE",
    resourceType: "custom_role",
    resourceId: id,
    summary: `Excluiu cargo personalizado "${role.name}".`,
    metadata: { roleName: role.name },
  });

  return {
    success: true,
    message: `Cargo "${role.name}" excluído com sucesso.`,
  };
}
