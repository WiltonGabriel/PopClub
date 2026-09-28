import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getTargetClients } from "./helpers";

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

    const clientFirstName = (dbUser?.fullName?.trim().split(" ")[0] || dbUser?.username || "Cliente");

    const notifications = userNotifications.map((un) => {
      const coupon = un.notification.coupon;
      let finalMessage = un.notification.message;

      // Personaliza variáveis dinâmicas {NOME} e {CUPOM}
      finalMessage = finalMessage.replace(/\{NOME\}/gi, clientFirstName);
      if (coupon) {
        finalMessage = finalMessage.replace(/\{CUPOM\}/gi, coupon.code);
      } else {
        finalMessage = finalMessage.replace(/\{CUPOM\}/gi, "");
      }

      return {
        id: un.id,
        notificationId: un.notificationId,
        title: un.notification.title.replace(/\{NOME\}/gi, clientFirstName),
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
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      title,
      message,
      targetAudience = "ALL",
      loyaltyBadgeIds = [],
      couponId = null,
      type = null,
    } = body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "O título da mensagem é obrigatório." }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: "O título da mensagem não pode exceder 100 caracteres." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "O conteúdo da mensagem é obrigatório." }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: "O conteúdo da mensagem não pode exceder 1000 caracteres." }, { status: 400 });
    }

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
    const targetClients = await getTargetClients(targetAudience, Array.isArray(loyaltyBadgeIds) ? loyaltyBadgeIds : undefined);

    if (targetClients.length === 0) {
      return NextResponse.json({
        error: "Nenhum cliente atende aos critérios do filtro de público selecionado.",
      }, { status: 400 });
    }

    // Cria o registro principal de Notificação
    const notification = await prisma.notification.create({
      data: {
        title: title.trim(),
        message: message.trim(),
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
