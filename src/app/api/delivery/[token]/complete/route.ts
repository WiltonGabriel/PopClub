import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return apiError("Token de entrega não informado.", 400);
    }

    let body: { pin?: string; bypassPin?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Body vazio é tolerado caso venha requisição sem payload
    }

    const existingOrder = await prisma.order.findUnique({
      where: { trackingToken: token },
      select: { id: true, status: true, orderPin: true, userId: true },
    });

    if (!existingOrder) {
      return apiError("Entrega não encontrada ou token inválido.", 404, "NOT_FOUND");
    }

    if (existingOrder.status === "cancelled") {
      return apiError("Este pedido foi cancelado e não pode ser finalizado.", 422, "ORDER_ALREADY_CANCELLED");
    }

    if (existingOrder.status === "completed") {
      return apiSuccess({
        success: true,
        message: "Este pedido já foi finalizado anteriormente.",
      });
    }

    // Validação estrita do PIN de Entrega (se configurado no pedido)
    if (existingOrder.orderPin) {
      const cleanInputPin = String(body.pin || "").trim().toUpperCase();
      const expectedPin = existingOrder.orderPin.trim().toUpperCase();

      if (cleanInputPin !== expectedPin) {
        // Verifica se é um operador da loja (Admin/Staff) forçando a finalização
        const authUser = await getAuthUser(request);
        const isStaff = hasPermission(authUser, "ORDERS_KANBAN") || hasPermission(authUser, "ORDERS_HISTORY");

        if (!isStaff || !body.bypassPin) {
          return apiError(
            "Código PIN de confirmação incorreto ou não informado. Solicite o código ao cliente para confirmar a entrega.",
            400,
            "INVALID_DELIVERY_PIN"
          );
        }
      }
    }

    const updateResult = await prisma.order.updateMany({
      where: {
        id: existingOrder.id,
        status: { notIn: ["completed", "cancelled"] },
      },
      data: {
        status: "completed",
        deliveredAt: new Date(),
        isGpsTrackingActive: false,
      },
    });

    if (updateResult.count === 0) {
      const fresh = await prisma.order.findUnique({
        where: { id: existingOrder.id },
        select: { status: true },
      });
      if (fresh?.status === "cancelled") {
        return apiError("Este pedido foi cancelado e não pode ser finalizado.", 422, "ORDER_ALREADY_CANCELLED");
      }
      return apiSuccess({
        success: true,
        message: "Este pedido já foi finalizado anteriormente.",
      });
    }

    serverOrderEventManager.emit({
      type: "order_updated",
      orderId: existingOrder.id,
      userId: existingOrder.userId,
      status: "completed",
      order: {
        id: existingOrder.id,
        status: "completed",
      },
      timestamp: Date.now(),
    });

    return apiSuccess({
      success: true,
      message: "Pedido entregue com sucesso!",
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/delivery/[token]/complete", "Erro ao finalizar entrega.");
  }
}
