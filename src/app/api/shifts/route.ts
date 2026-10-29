import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const settings = await prisma.storeSettings.findUnique({
      where: { id: "store_config" },
    });

    // Turno atual (se houver)
    let currentShift = null;
    let currentShiftSummary = null;

    if (settings?.currentShiftId) {
      currentShift = await prisma.shift.findUnique({
        where: { id: settings.currentShiftId },
      });
    }

    // Calcula resumo em tempo real da sessão/esteira ativa
    const activeSessionOrders = await prisma.order.findMany({
      where: {
        isArchived: false,
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        paymentMethodType: true,
        createdAt: true,
      },
    });

    const pendingOrders = activeSessionOrders.filter((o) =>
      ["pending", "accepted", "preparing", "ready", "delivering"].includes(o.status)
    );
    const completedOrders = activeSessionOrders.filter((o) => o.status === "completed");
    const cancelledOrders = activeSessionOrders.filter((o) => o.status === "cancelled");

    const cashTotal = completedOrders
      .filter((o) => o.paymentMethodType === "dinheiro")
      .reduce((acc, o) => acc + Number(o.totalAmount), 0);

    const pixTotal = completedOrders
      .filter((o) => o.paymentMethodType === "pix_entrega")
      .reduce((acc, o) => acc + Number(o.totalAmount), 0);

    const cardTotal = completedOrders
      .filter((o) => o.paymentMethodType === "cartao_maquininha")
      .reduce((acc, o) => acc + Number(o.totalAmount), 0);

    const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);

    currentShiftSummary = {
      totalOrders: activeSessionOrders.length,
      pendingCount: pendingOrders.length,
      completedCount: completedOrders.length,
      cancelledCount: cancelledOrders.length,
      totalRevenue,
      cashTotal,
      pixTotal,
      cardTotal,
      isOpen: settings?.isOpen ?? true,
      estimatedDeliveryTime: settings?.estimatedDeliveryTime || "30-50 min",
      openedAt: settings?.openedAt ? settings.openedAt.toISOString() : null,
      closedAt: settings?.closedAt ? settings.closedAt.toISOString() : null,
    };

    // Histórico de turnos passados
    const shifts = await prisma.shift.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return apiSuccess({
      isOpen: settings?.isOpen ?? true,
      currentShiftId: settings?.currentShiftId || null,
      estimatedDeliveryTime: settings?.estimatedDeliveryTime || "30-50 min",
      currentShift,
      currentShiftSummary,
      shifts: shifts.map((s) => ({
        id: s.id,
        code: s.code,
        openedAt: s.openedAt.toISOString(),
        closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        isOpen: s.isOpen,
        estimatedDeliveryTime: s.estimatedDeliveryTime,
        totalRevenue: Number(s.totalRevenue),
        totalOrders: s.totalOrders,
        completedOrders: s.completedOrders,
        cancelledOrders: s.cancelledOrders,
        cashTotal: Number(s.cashTotal),
        pixTotal: Number(s.pixTotal),
        cardTotal: Number(s.cardTotal),
        notes: s.notes,
      })),
    });
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/shifts", "Erro ao consultar turnos da esteira.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "ORDERS_KANBAN")) {
      return apiError("Acesso negado. Permissão para gerenciar a esteira de pedidos necessária.", 403, "FORBIDDEN");
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400);
    }

    const { action, estimatedDeliveryTime, notes } = body;
    const now = new Date();

    if (action === "open") {
      // Abre o turno
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const shiftCode = `TURNO-${dateStr}-${randomSuffix}`;
      const deliveryTime = estimatedDeliveryTime || "30-50 min";

      let shift: any = null;
      try {
        shift = await prisma.shift.create({
          data: {
            code: shiftCode,
            openedAt: now,
            isOpen: true,
            estimatedDeliveryTime: deliveryTime,
            notes: notes || null,
          },
        });
      } catch (shiftErr: any) {
        if (shiftErr?.code === "P2002" || String(shiftErr?.message).includes("unique_active_shift")) {
          shift = await prisma.shift.findFirst({
            where: { isOpen: true, closedAt: null },
            orderBy: { openedAt: "desc" },
          });
          if (!shift) throw shiftErr;
        } else {
          throw shiftErr;
        }
      }

      const updatedSettings = await prisma.storeSettings.upsert({
        where: { id: "store_config" },
        update: {
          isOpen: true,
          currentShiftId: shift.id,
          estimatedDeliveryTime: deliveryTime,
          openedAt: now,
          closedAt: null,
        },
        create: {
          id: "store_config",
          isOpen: true,
          currentShiftId: shift.id,
          estimatedDeliveryTime: deliveryTime,
          openedAt: now,
        },
      });

      return apiSuccess({
        success: true,
        message: "Esteira e loja abertas com sucesso!",
        shift: {
          id: shift.id,
          code: shift.code,
          openedAt: shift.openedAt.toISOString(),
          isOpen: shift.isOpen,
          estimatedDeliveryTime: shift.estimatedDeliveryTime,
        },
        settings: {
          isOpen: updatedSettings.isOpen,
          currentShiftId: updatedSettings.currentShiftId,
          estimatedDeliveryTime: updatedSettings.estimatedDeliveryTime,
        },
      });
    }

    if (action === "close") {
      // TRAVA DE SEGURANÇA: Valida se há pedidos em aberto na esteira
      const pendingOrders = await prisma.order.findMany({
        where: {
          isArchived: false,
          status: {
            in: ["pending", "accepted", "preparing", "ready", "delivering"],
          },
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // BLOQUEIO TERMINANTE: Sem bypass acidental
      if (pendingOrders.length > 0) {
        const inboxCount = pendingOrders.filter((o) => o.status === "pending").length;
        const preparingCount = pendingOrders.filter((o) => ["accepted", "preparing"].includes(o.status)).length;
        const readyCount = pendingOrders.filter((o) => o.status === "ready").length;
        const deliveringCount = pendingOrders.filter((o) => o.status === "delivering").length;

        return NextResponse.json(
          {
            error: `Não é possível encerrar o turno agora. Existem ${pendingOrders.length} pedido(s) ativos na esteira.`,
            code: "PENDING_ORDERS_ACTIVE",
            pendingCount: pendingOrders.length,
            breakdown: {
              inbox: inboxCount,
              preparing: preparingCount,
              ready: readyCount,
              delivering: deliveringCount,
            },
            pendingOrders: pendingOrders.map((p) => ({
              id: p.id,
              shortId: p.id.substring(0, 6),
              status: p.status,
              totalAmount: Number(p.totalAmount),
              clientName: p.user?.fullName || p.user?.username || "Cliente",
              createdAt: p.createdAt.toISOString(),
            })),
          },
          { status: 400 }
        );
      }

      // Calcula a conferência de caixa do turno atual
      const activeSessionOrders = await prisma.order.findMany({
        where: {
          isArchived: false,
        },
      });

      const completedOrders = activeSessionOrders.filter((o) => o.status === "completed");
      const cancelledOrders = activeSessionOrders.filter((o) => o.status === "cancelled");

      const cashTotal = completedOrders
        .filter((o) => o.paymentMethodType === "dinheiro")
        .reduce((acc, o) => acc + Number(o.totalAmount), 0);

      const pixTotal = completedOrders
        .filter((o) => o.paymentMethodType === "pix_entrega")
        .reduce((acc, o) => acc + Number(o.totalAmount), 0);

      const cardTotal = completedOrders
        .filter((o) => o.paymentMethodType === "cartao_maquininha")
        .reduce((acc, o) => acc + Number(o.totalAmount), 0);

      const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);

      const settings = await prisma.storeSettings.findUnique({
        where: { id: "store_config" },
      });

      let shiftRecord = null;
      if (settings?.currentShiftId) {
        shiftRecord = await prisma.shift.update({
          where: { id: settings.currentShiftId },
          data: {
            isOpen: false,
            closedAt: now,
            totalRevenue,
            totalOrders: activeSessionOrders.length,
            completedOrders: completedOrders.length,
            cancelledOrders: cancelledOrders.length,
            cashTotal,
            pixTotal,
            cardTotal,
            notes: notes || null,
          },
        });
      } else {
        // Cria um registro de turno retroativo para conferência
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        shiftRecord = await prisma.shift.create({
          data: {
            code: `TURNO-${dateStr}-ENCERRADO`,
            openedAt: settings?.openedAt || now,
            closedAt: now,
            isOpen: false,
            totalRevenue,
            totalOrders: activeSessionOrders.length,
            completedOrders: completedOrders.length,
            cancelledOrders: cancelledOrders.length,
            cashTotal,
            pixTotal,
            cardTotal,
            notes: notes || null,
          },
        });
      }

      // Arquiva os pedidos concluídos e cancelados da visão ativa do Kanban
      await prisma.order.updateMany({
        where: {
          isArchived: false,
          status: {
            in: ["completed", "cancelled"],
          },
        },
        data: {
          isArchived: true,
          shiftId: shiftRecord.id,
        },
      });

      // Atualiza configurações da loja para Fechada
      await prisma.storeSettings.update({
        where: { id: "store_config" },
        data: {
          isOpen: false,
          closedAt: now,
          currentShiftId: null,
        },
      });

      return apiSuccess({
        success: true,
        message: "Turno encerrado e loja fechada com sucesso!",
        summary: {
          shiftId: shiftRecord.id,
          code: shiftRecord.code,
          openedAt: shiftRecord.openedAt.toISOString(),
          closedAt: now.toISOString(),
          totalRevenue,
          totalOrders: activeSessionOrders.length,
          completedOrders: completedOrders.length,
          cancelledOrders: cancelledOrders.length,
          cashTotal,
          pixTotal,
          cardTotal,
        },
      });
    }

    return apiError("Ação de turno desconhecida.", 400);
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/shifts", "Erro ao processar turno.");
  }
}
