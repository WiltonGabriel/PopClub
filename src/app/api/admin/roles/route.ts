import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { isUserAdmin, isUserEditor, hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const hasUsersManage = isUserAdmin(authUser) || (isUserEditor(authUser) && hasPermission(authUser, "users_manage"));
    if (!authUser || !hasUsersManage) {
      return NextResponse.json({ error: "Acesso negado. Permissão users_manage necessária." }, { status: 403 });
    }

    const roles = await prisma.customRole.findMany({
      orderBy: { createdAt: "asc" },
      include: {
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
      },
    });

    return NextResponse.json({ roles });
  } catch (error: unknown) {
    console.error("Erro ao listar cargos customizados:", error);
    return NextResponse.json({ error: "Erro ao listar cargos customizados." }, { status: 500 });
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

    const { name, color = "blue", permissions = [] } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "O nome do cargo é obrigatório." }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Limite rígido: máximo de 4 cargos personalizados
    const currentCount = await prisma.customRole.count();
    if (currentCount >= 4) {
      return NextResponse.json(
        { error: "Limite atingido: O sistema permite a criação de no máximo 4 cargos personalizados adicionais." },
        { status: 400 }
      );
    }

    // Verificar duplicidade de nome
    const existingRole = await prisma.customRole.findUnique({
      where: { name: trimmedName },
    });
    if (existingRole) {
      return NextResponse.json(
        { error: `Já existe um cargo cadastrado com o nome "${trimmedName}".` },
        { status: 409 }
      );
    }

    // Validar permissões
    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p): p is string => typeof p === "string")
      : [];

    const validColors = ["blue", "purple", "emerald", "amber", "rose", "cyan", "indigo", "orange"];
    const chosenColor = typeof color === "string" && validColors.includes(color.toLowerCase())
      ? color.toLowerCase()
      : "blue";

    const newRole = await prisma.customRole.create({
      data: {
        name: trimmedName,
        color: chosenColor,
        permissions: validPermissions,
      },
      include: {
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
      },
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar cargo customizado:", error);
    return NextResponse.json({ error: "Erro ao criar cargo customizado." }, { status: 500 });
  }
}
