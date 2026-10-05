import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { cleanCpf, validateCpf } from "@/lib/cpf";
import { DEFAULT_EDITOR_PERMISSIONS, isUserAdmin, isUserEditor, hasPermission } from "@/lib/permissions";
import { Role, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const hasUsersManage = isUserAdmin(authUser) || (isUserEditor(authUser) && hasPermission(authUser, "users_manage"));
    if (!authUser || !hasUsersManage) {
      return NextResponse.json({ error: "Acesso negado. Permissão users_manage necessária." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const filter = searchParams.get("filter") || "all";
    const sort = searchParams.get("sort") || "recent";
    const status = searchParams.get("status") || "all";
    const minOrdersStr = searchParams.get("minOrders");
    const maxOrdersStr = searchParams.get("maxOrders");
    const minMonthsStr = searchParams.get("minMonths");
    const maxMonthsStr = searchParams.get("maxMonths");

    const where: Prisma.UserWhereInput = {};

    // Filtros Dinâmicos de Categoria / Tabs
    if (filter === "admin") {
      where.role = Role.ADMIN;
      where.deletedAt = null;
    } else if (filter === "editor") {
      where.role = Role.EDITOR;
      where.customRoleId = null;
      where.deletedAt = null;
    } else if (filter.startsWith("custom_")) {
      const targetRoleId = filter.replace("custom_", "");
      where.role = Role.EDITOR;
      where.customRoleId = targetRoleId;
      where.deletedAt = null;
    } else if (filter === "team") {
      where.role = { in: [Role.ADMIN, Role.EDITOR] };
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
    } else {
      // "all" ou padrão
      where.deletedAt = null;
    }

    if (status === "active") {
      where.isBlocked = false;
    } else if (status === "blocked") {
      where.isBlocked = true;
    }

    if (minOrdersStr || maxOrdersStr) {
      const minO = minOrdersStr ? parseInt(minOrdersStr, 10) : null;
      const maxO = maxOrdersStr ? parseInt(maxOrdersStr, 10) : null;
      // Note: we can't easily filter by relation count in standard Prisma where without specific config in older versions, but assuming Prisma 6 supports _count filtering:
      /* If Prisma doesn't support _count in where we might have a type error, but Prisma >= 4.3 supports it */
      const countFilter: { gte?: number; lte?: number } = {};
      if (minO !== null && !isNaN(minO)) countFilter.gte = minO;
      if (maxO !== null && !isNaN(maxO)) countFilter.lte = maxO;
      if (Object.keys(countFilter).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where.orders = { ...(where.orders as object || {}), _count: countFilter } as any;
      }
    }

    if (minMonthsStr || maxMonthsStr) {
      const minM = minMonthsStr ? parseInt(minMonthsStr, 10) : null;
      const maxM = maxMonthsStr ? parseInt(maxMonthsStr, 10) : null;
      const now = new Date();
      const createdAtFilter: Prisma.DateTimeFilter = (where.createdAt as Prisma.DateTimeFilter) || {};
      
      if (minM !== null && !isNaN(minM)) {
         const date = new Date(now);
         date.setMonth(date.getMonth() - minM);
         createdAtFilter.lte = date;
      }
      if (maxM !== null && !isNaN(maxM)) {
         const date = new Date(now);
         date.setMonth(date.getMonth() - maxM);
         createdAtFilter.gte = date;
      }
      if (Object.keys(createdAtFilter).length > 0) {
         where.createdAt = createdAtFilter;
      }
    }

    // Busca Multifatorial (Nome, E-mail, Telefone)
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

    let orderBy: Prisma.UserOrderByWithRelationInput[] = [];
    if (sort === "oldest") {
      orderBy = [{ createdAt: "asc" }];
    } else if (sort === "orders") {
      // Prisma supports order by relation count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy = [{ orders: { _count: "desc" } as any }, { createdAt: "desc" }];
    } else if (sort === "alphabetical") {
      orderBy = [{ fullName: "asc" }, { username: "asc" }];
    } else {
      orderBy = [
        { role: "asc" },
        { createdAt: "desc" },
      ];
    }

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      select: {
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
      },
    });

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao listar usuários:", error);
    return NextResponse.json({ error: "Erro ao listar usuários." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const hasUsersManage = isUserAdmin(authUser) || (isUserEditor(authUser) && hasPermission(authUser, "users_manage"));
    if (!authUser || !hasUsersManage) {
      return NextResponse.json({ error: "Acesso negado. Permissão users_manage necessária." }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      fullName,
      cpf,
      email,
      phone,
      password,
      role = "EDITOR",
      customRoleId,
      permissions,
    } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Nome completo é obrigatório." }, { status: 400 });
    }

    // Validação de Role
    const normalizedRole = String(role).toUpperCase();
    if (normalizedRole !== "ADMIN" && normalizedRole !== "EDITOR") {
      return NextResponse.json(
        { error: "O cargo deve ser Administrador ou Editor/Customizado." },
        { status: 400 }
      );
    }

    // Regra rígida: Administrador - limite máximo de 2 ativos em todo o sistema
    if (normalizedRole === "ADMIN") {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          isActive: true,
          deletedAt: null,
        },
      });
      if (activeAdminsCount >= 2) {
        return NextResponse.json(
          { error: "Limite atingido: O sistema permite no máximo 2 Administradores ativos." },
          { status: 400 }
        );
      }
    }

    // Validação de Senha
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // Validação e Limpeza do CPF (se fornecido opcionalmente)
    let cleanedCpf: string | null = null;
    if (cpf && typeof cpf === "string" && cpf.trim()) {
      cleanedCpf = cleanCpf(cpf);
      if (!validateCpf(cleanedCpf)) {
        return NextResponse.json({ error: "CPF informado é inválido." }, { status: 400 });
      }

      const existingCpf = await prisma.user.findUnique({
        where: { cpf: cleanedCpf },
      });
      if (existingCpf) {
        return NextResponse.json({ error: "Este CPF já está cadastrado em outro usuário." }, { status: 409 });
      }
    }

    // Validação de E-mail
    let normalizedEmail: string | null = null;
    if (email && typeof email === "string" && email.trim()) {
      normalizedEmail = email.trim().toLowerCase();
      const existingEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
      }
    }

    // Validação de Telefone
    let cleanedPhone: string | null = null;
    if (phone && typeof phone === "string" && phone.trim()) {
      cleanedPhone = phone.replace(/\D/g, "");
      const existingPhone = await prisma.user.findFirst({
        where: { phone: cleanedPhone },
      });
      if (existingPhone) {
        return NextResponse.json({ error: "Este telefone já está cadastrado." }, { status: 409 });
      }
    }

    // Hash da Senha
    const passwordHash = await hashPassword(password);

    // Validação de Cargo Customizado e Lotação Máxima (máx 4 por cargo)
    let targetCustomRoleId: string | null = null;
    let finalPermissions: string[] = [];

    if (normalizedRole === "EDITOR") {
      if (customRoleId && typeof customRoleId === "string" && customRoleId.trim()) {
        const customRole = await prisma.customRole.findUnique({
          where: { id: customRoleId.trim() },
        });

        if (!customRole) {
          return NextResponse.json({ error: "Cargo personalizado selecionado não existe." }, { status: 404 });
        }

        const membersInRole = await prisma.user.count({
          where: {
            customRoleId: customRole.id,
            isActive: true,
            deletedAt: null,
          },
        });

        if (membersInRole >= 4) {
          return NextResponse.json(
            { error: `Limite de lotação atingido: O cargo "${customRole.name}" já possui o limite máximo de 4 membros vinculados.` },
            { status: 400 }
          );
        }

        targetCustomRoleId = customRole.id;
        finalPermissions = customRole.permissions;
      } else {
        // Editor padrão modular
        if (Array.isArray(permissions) && permissions.length > 0) {
          finalPermissions = permissions.filter((p): p is string => typeof p === "string");
        } else {
          finalPermissions = [...DEFAULT_EDITOR_PERMISSIONS];
        }
      }
    }

    const newUser = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        cpf: cleanedCpf,
        email: normalizedEmail,
        phone: cleanedPhone,
        passwordHash,
        role: normalizedRole === "ADMIN" ? Role.ADMIN : Role.EDITOR,
        customRoleId: targetCustomRoleId,
        permissions: finalPermissions,
        isRegistered: true,
        isActive: true,
        isBlocked: false,
        tokenVersion: 1,
        createdById: authUser.id,
      },
      select: {
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
        tokenVersion: true,
        createdAt: true,
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
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao cadastrar membro da equipe:", error);
    return NextResponse.json({ error: "Erro ao cadastrar membro da equipe." }, { status: 500 });
  }
}
