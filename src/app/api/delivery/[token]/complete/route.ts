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

    const order = await prisma.order.findUnique({
      where: { trackingToken: token },
      select: { id: true, status: true },
    });

    if (!order) {
      return apiError("Entrega não encontrada ou token inválido.", 404, "NOT_FOUND");
    }

    if (order.status === "completed") {
      return apiSuccess({
        success: true,
        message: "Este pedido já foi finalizado anteriormente.",
      });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "completed",
        isGpsTrackingActive: false,
      },
    });

    return apiSuccess({
      success: true,
      message: "Pedido entregue com sucesso!",
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/delivery/[token]/complete", "Erro ao finalizar entrega.");
  }
}
