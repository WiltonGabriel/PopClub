import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";

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
      select: { id: true, status: true },
    });

    if (!existingOrder) {
      return apiError("Entrega não encontrada ou token inválido.", 404, "NOT_FOUND");
    }

    if (existingOrder.status === "completed") {
      return apiSuccess({
        success: true,
        message: "Este pedido já foi finalizado anteriormente.",
      });
    }

    const updateResult = await prisma.order.updateMany({
      where: {
        id: existingOrder.id,
        status: { not: "completed" },
      },
      data: {
        status: "completed",
        deliveredAt: new Date(),
        isGpsTrackingActive: false,
      },
    });

    if (updateResult.count === 0) {
      return apiSuccess({
        success: true,
        message: "Este pedido já foi finalizado anteriormente.",
      });
    }

    return apiSuccess({
      success: true,
      message: "Pedido entregue com sucesso!",
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/delivery/[token]/complete", "Erro ao finalizar entrega.");
  }
}
