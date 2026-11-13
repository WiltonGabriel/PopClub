import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { getAuthUser } from "../../../lib/auth";
import { hasPermission } from "../../../lib/permissions";
import { Role } from "@prisma/client";
import { recordAdminAudit } from "../../../services/auditLogService";

const createAudienceSchema = z.object({
  name: z.string().trim().min(1, "Nome da lista é obrigatório.").max(100),
  userIds: z
    .array(z.string().trim().min(1))
    .min(1, "Selecione pelo menos um cliente para a lista.")
    .max(500),
});

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(authUser, "notifications_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão notifications_manage necessária." },
        { status: 403 }
      );
    }

    const lists = await prisma.customAudienceList.findMany({
      orderBy: { createdAt: "desc" },
    });

    const users = await prisma.user.findMany({
      where: {
        role: Role.CLIENT,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        orders: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        fullName: "asc",
      },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.fullName || "Sem Nome",
      phone: u.phone,
      totalOrders: u.orders.length,
      lastOrderAt: u.orders.length > 0 ? u.orders[0].createdAt : null,
    }));

    return NextResponse.json({ lists, users: formattedUsers });
  } catch (error: unknown) {
    console.error("Erro ao buscar dados de audiência:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(authUser, "notifications_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão notifications_manage necessária." },
        { status: 403 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const parsed = createAudienceSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados da lista inválidos." },
        { status: 400 }
      );
    }

    const currentCount = await prisma.customAudienceList.count();
    if (currentCount >= 6) {
      return NextResponse.json(
        { error: "Limite atingido: Você já possui 6 listas personalizadas salvas." },
        { status: 400 }
      );
    }

    const uniqueUserIds = Array.from(new Set(parsed.data.userIds));
    const created = await prisma.customAudienceList.create({
      data: {
        name: parsed.data.name,
        userIds: uniqueUserIds,
      },
    });

    await recordAdminAudit({
      actor: { id: authUser.id, role: authUser.role },
      action: "CREATE_AUDIENCE_LIST",
      resourceType: "custom_audience_list",
      resourceId: created.id,
      summary: `Criou lista personalizada de audiência "${created.name}" (${uniqueUserIds.length} destinatário(s)).`,
      metadata: { recipientsCount: uniqueUserIds.length },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar lista personalizada:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
