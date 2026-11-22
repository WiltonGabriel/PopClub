import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";
import { markCourierInTransitForOrder } from "@/services/courierStatusAutomationService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return apiError("Token de entrega não informado.", 400);
    }

    const existingOrder = await prisma.order.findUnique({
      where: { trackingToken: token },
      select: {
        id: true,
        status: true,
        dispatchedAt: true,
        userId: true,
        courierId: true,
        courierName: true,
        courierPhone: true,
      },
    });

    if (!existingOrder) {
      return apiError("Entrega não encontrada ou token inválido.", 404, "NOT_FOUND");
    }

    if (existingOrder.status === "cancelled") {
      return apiError("Este pedido foi cancelado e a rota não pode ser iniciada.", 422, "ORDER_ALREADY_CANCELLED");
    }

    if (existingOrder.status === "completed") {
      return apiError("Este pedido já foi finalizado.", 422, "ORDER_ALREADY_COMPLETED");
    }

    // Se já estiver em rota, garante status do entregador e responde idempotente com sucesso
    if (existingOrder.status === "delivering") {
      await markCourierInTransitForOrder(existingOrder);
      return apiSuccess({
        success: true,
        message: "Rota já estava em andamento.",
        status: "delivering",
        dispatchedAt: existingOrder.dispatchedAt?.toISOString() || null,
      });
    }

    const now = new Date();
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: "delivering",
        dispatchedAt: now,
        isGpsTrackingActive: true,
      },
    });

    await markCourierInTransitForOrder(existingOrder);

    serverOrderEventManager.emit({
      type: "order_updated",
      orderId: existingOrder.id,
      userId: existingOrder.userId,
      status: "delivering",
      order: {
        id: existingOrder.id,
        status: "delivering",
        courier_name: existingOrder.courierName,
      },
      timestamp: Date.now(),
    });

    return apiSuccess({
      success: true,
      message: "Rota iniciada pelo entregador! O pedido agora está em trânsito.",
      status: "delivering",
      dispatchedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/delivery/[token]/start", "Erro ao iniciar rota de entrega.");
  }
}

