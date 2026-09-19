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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const { latitude, longitude } = body || {};

    if (latitude === undefined || longitude === undefined) {
      return apiError("Coordenadas de latitude e longitude são obrigatórias.", 400);
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return apiError("Coordenadas geográficas inválidas.", 400);
    }

    const order = await prisma.order.findUnique({
      where: { trackingToken: token },
      select: { id: true, status: true },
    });

    if (!order) {
      return apiError("Entrega não encontrada ou token inválido.", 404, "NOT_FOUND");
    }

    if (order.status !== "delivering") {
      return apiError(
        `Rastreamento inativo. O status atual do pedido é "${order.status}".`,
        400
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        courierLatitude: lat,
        courierLongitude: lng,
        courierUpdatedAt: new Date(),
        isGpsTrackingActive: true,
      },
    });

    return apiSuccess({
      success: true,
      timestamp: Date.now(),
      coordinates: { lat, lng },
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/delivery/[token]/track", "Erro ao atualizar localização do entregador.");
  }
}
