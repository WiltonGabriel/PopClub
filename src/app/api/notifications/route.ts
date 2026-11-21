import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getTargetClients, VALID_TARGET_AUDIENCES } from "./helpers";
import { recordAdminAudit } from "@/services/auditLogService";
import { repairMojibake } from "@/lib/sanitize";

const dispatchNotificationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "O título da mensagem é obrigatório.")
    .max(100, "O título da mensagem não pode exceder 100 caracteres."),
  message: z
    .string()
    .trim()
    .min(1, "O conteúdo da mensagem é obrigatório.")
    .max(1000, "O conteúdo da mensagem não pode exceder 1000 caracteres."),
  targetAudience: z.enum(VALID_TARGET_AUDIENCES).optional().default("ALL"),
  loyaltyBadgeIds: z.array(z.string().trim().min(1)).optional().default([]),
  customUserIds: z.array(z.string().trim().min(1)).optional().default([]),
  couponId: z.string().trim().min(1).nullable().optional().default(null),
  type: z.enum(["BROADCAST", "TARGETED", "COUPON"]).nullable().optional().default(null),
});

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        notificationsEnabled: true,
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { notificationsEnabled: true, fullName: true, username: true },
    });

    // Auto-vincula avisos gerais (BROADCAST ou targetAudience === ALL) ainda não vinculados ao usuário
    const unlinkedBroadcasts = await prisma.notification.findMany({
      where: {
        OR: [
          { type: "BROADCAST" },
          { targetAudience: "ALL" },
        ],
        userNotifications: {
          none: {
            userId: authUser.id,
          },
        },
      },
    });

    if (unlinkedBroadcasts.length > 0) {
      await prisma.userNotification.createMany({
        data: unlinkedBroadcasts.map((n) => ({
          userId: authUser.id,
          notificationId: n.id,
          isRead: false,
        })),
        skipDuplicates: true,
      });
    }

    // Busca todas as notificações do usuário
    const userNotifications = await prisma.userNotification.findMany({
      where: { userId: authUser.id },
      include: {
        notification: {
          include: {
            coupon: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const clientFirstName = repairMojibake(
      dbUser?.fullName?.trim().split(" ")[0] || dbUser?.username || "Cliente"
    );

    const notifications = userNotifications.map((un) => {
      const coupon = un.notification.coupon;
      let finalMessage = repairMojibake(un.notification.message);

      // Personaliza variáveis dinâmicas {NOME} e {CUPOM}
      finalMessage = finalMessage.replace(/\{NOME\}/gi, clientFirstName);
      if (coupon) {
        finalMessage = finalMessage.replace(/\{CUPOM\}/gi, coupon.code);
      } else {
        finalMessage = finalMessage.replace(/\{CUPOM\}/gi, "");
      }

      const finalTitle = repairMojibake(un.notification.title).replace(
        /\{NOME\}/gi,
        clientFirstName
      );

      return {
        id: un.id,
        notificationId: un.notificationId,
        title: finalTitle,
        message: finalMessage,
        type: un.notification.type,
        targetAudience: un.notification.targetAudience,
        isRead: un.isRead,
        readAt: un.readAt ? un.readAt.toISOString() : null,
        createdAt: un.notification.createdAt.toISOString(),
        coupon: coupon
          ? {
              id: coupon.id,
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: Number(coupon.discountValue),
              minOrderValue: Number(coupon.minOrderValue),
              oncePerUser: coupon.oncePerUser,
              expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
              isActive: coupon.isActive,
            }
          : null,
      };
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications,
      unreadCount,
      notificationsEnabled: Boolean(dbUser?.notificationsEnabled ?? true),
    });
  } catch (error: any) {
    console.error("Erro ao listar notificações:", error);
    return NextResponse.json({ error: "Erro ao obter notificações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "notifications_manage")) {
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

    const parsed = dispatchNotificationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados de notificação inválidos." },
        { status: 400 }
      );
    }

    const {
      title,
      message,
      targetAudience,
      loyaltyBadgeIds,
      customUserIds,
      couponId,
      type,
    } = parsed.data;

    // Trava de Cooldown para Broadcast
    const finalType = type || (couponId ? "COUPON" : targetAudience === "ALL" ? "BROADCAST" : "TARGETED");
    if (finalType === "BROADCAST" || targetAudience === "ALL") {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentBroadcast = await prisma.notification.findFirst({
        where: {
          OR: [{ type: "BROADCAST" }, { targetAudience: "ALL" }],
          createdAt: { gte: fiveMinutesAgo },
        },
      });
      if (recentBroadcast) {
        return NextResponse.json({ error: "Por favor, aguarde 5 minutos antes de enviar outra notificação em massa." }, { status: 429 });
      }
    }

    // Se houver cupom, verifica se existe
    let coupon = null;
    if (couponId) {
      coupon = await prisma.coupon.findUnique({
        where: { id: couponId },
      });
      if (!coupon) {
        return NextResponse.json({ error: "Cupom vinculado não encontrado." }, { status: 400 });
      }
    }

    // Identifica clientes elegíveis de acordo com o segmento
    const targetClients = await getTargetClients(
      targetAudience,
      loyaltyBadgeIds,
      customUserIds
    );

    if (targetClients.length === 0) {
      return NextResponse.json({
        error: "Nenhum cliente atende aos critérios do filtro de público selecionado.",
      }, { status: 400 });
    }

    // Cria o registro principal de Notificação
    const cleanTitle = repairMojibake(title.trim());
    const cleanMessage = repairMojibake(message.trim());
    const notification = await prisma.notification.create({
      data: {
        title: cleanTitle,
        message: cleanMessage,
        type: finalType,
        targetAudience,
        couponId: couponId || null,
      },
    });

    // Cria as associações de leitura individual para cada destinatário selecionado
    await prisma.userNotification.createMany({
      data: targetClients.map((client) => ({
        userId: client.id,
        notificationId: notification.id,
        isRead: false,
      })),
      skipDuplicates: true,
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "DISPATCH_NOTIFICATION",
      resourceType: "notification",
      resourceId: notification.id,
      summary: `Disparou notificação "${notification.title}" (${targetAudience}) para ${targetClients.length} cliente(s).`,
      metadata: {
        targetAudience,
        recipientsCount: targetClients.length,
        hasCoupon: Boolean(couponId),
      },
    });

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      recipientsCount: targetClients.length,
      message: `Mensagem disparada com sucesso para ${targetClients.length} cliente(s)!`,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao disparar notificação:", error);
    return NextResponse.json({ error: "Erro ao enviar notificação." }, { status: 500 });
  }
}
