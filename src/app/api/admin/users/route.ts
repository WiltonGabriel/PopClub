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

    const where: Prisma.UserWhereInput = {};

    // Filtros de Categoria
    switch (filter) {
      case "team":
        where.role = { in: [Role.ADMIN, Role.EDITOR] };
        where.deletedAt = null;
        break;
      case "registered":
        where.role = Role.CLIENT;
        where.isRegistered = true;
        where.deletedAt = null;
        break;
      case "fast_access":
        where.role = Role.CLIENT;
        where.isRegistered = false;
        where.deletedAt = null;
        break;
      case "blocked":
        where.isBlocked = true;
        break;
      case "all":
      default:
        // Por padrão, exibe todos os usuários não-excluídos
        where.deletedAt = null;
        break;
    }

    // Busca Multifatorial (Nome, E-mail, Telefone ou CPF)
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
        searchConditions.push({ cpf: { contains: cleaned } });
      }

      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: searchConditions },
      ];
    }

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { role: "asc" }, // ADMIN, EDITOR, CLIENT
        { createdAt: "desc" },
      ],
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
      permissions,
    } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Nome completo é obrigatório." }, { status: 400 });
    }

    // Validação de Role
    const normalizedRole = String(role).toUpperCase();
    if (normalizedRole !== "ADMIN" && normalizedRole !== "EDITOR") {
      return NextResponse.json(
        { error: "O cargo deve ser Administrador ou Editor." },
        { status: 400 }
      );
    }

    // Validação de Senha
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // Validação e Limpeza do CPF
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

    // Permissões
    let finalPermissions: string[] = [];
    if (normalizedRole === "EDITOR") {
      if (Array.isArray(permissions) && permissions.length > 0) {
        finalPermissions = permissions.filter((p: unknown) => typeof p === "string");
      } else {
        finalPermissions = [...DEFAULT_EDITOR_PERMISSIONS];
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
        permissions: finalPermissions,
        isRegistered: true,
        isActive: true,
        isBlocked: false,
        tokenVersion: 1,
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
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao cadastrar membro da equipe:", error);
    return NextResponse.json({ error: "Erro ao cadastrar membro da equipe." }, { status: 500 });
  }
}
