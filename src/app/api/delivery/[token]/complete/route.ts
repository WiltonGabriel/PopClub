import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";

interface CompleteDeliveryBody {
  pin?: string;
  bypassPin?: boolean;
  forceComplete?: boolean;
  requiresReconciliation?: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return apiError("Token de entrega não informado.", 400);
    }

    let body: CompleteDeliveryBody = {};
    try {
      body = (await request.json()) as CompleteDeliveryBody;
    } catch {
      // Body vazio é tolerado caso venha requisição sem payload
    }

    const existingOrder = await prisma.order.findUnique({
      where: { trackingToken: token },
      select: { id: true, status: true, orderPin: true, userId: true, paymentMethodType: true },
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

    const authUser = await getAuthUser(request);
    const isStaff = hasPermission(authUser, "ORDERS_KANBAN") || hasPermission(authUser, "ORDERS_HISTORY");

    // Validação estrita do PIN de Entrega (se configurado no pedido)
    if (existingOrder.orderPin) {
      const cleanInputPin = String(body.pin || "").trim().toUpperCase();
      const expectedPin = existingOrder.orderPin.trim().toUpperCase();

      if (cleanInputPin !== expectedPin) {
        if (!isStaff || !body.bypassPin) {
          return apiError(
            "Código PIN de confirmação incorreto ou não informado. Solicite o código ao cliente para confirmar a entrega.",
            400,
            "INVALID_DELIVERY_PIN"
          );
        }
      }
    }

    const requiresReconciliation = Boolean(body.requiresReconciliation && existingOrder.paymentMethodType === "dinheiro");
    const shouldDirectComplete = !requiresReconciliation || isStaff || Boolean(body.bypassPin) || Boolean(body.forceComplete);

    const now = new Date();
    const updateResult = await prisma.order.updateMany({
      where: {
        id: existingOrder.id,
        status: { notIn: ["completed", "cancelled"] },
      },
      data: {
        ...(shouldDirectComplete ? { status: "completed" } : {}),
        deliveredAt: now,
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
      status: shouldDirectComplete ? "completed" : "delivering",
      order: {
        id: existingOrder.id,
        status: shouldDirectComplete ? "completed" : "delivering",
        delivered_at: now.toISOString(),
      },
      timestamp: Date.now(),
    });

    return apiSuccess({
      success: true,
      status: shouldDirectComplete ? "completed" : "delivering",
      deliveredAt: now.toISOString(),
      requiresReconciliation: !shouldDirectComplete,
      message: shouldDirectComplete
        ? "Pedido entregue e concluído com sucesso!"
        : "Entrega física confirmada com sucesso! Aguardando conferência de caixa.",
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/delivery/[token]/complete", "Erro ao finalizar entrega.");
  }
}
