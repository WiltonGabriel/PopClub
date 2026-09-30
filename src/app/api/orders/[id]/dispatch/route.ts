import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !hasPermission(authUser, "ORDERS_KANBAN")) {
      return apiError("Acesso restrito à administração e operadores de esteira.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    if (!id) {
      return apiError("ID do pedido não informado.", 400);
    }

    interface DispatchBody {
      enableGps?: boolean;
      courierName?: string;
      courierPhone?: string;
      courierCode?: string;
    }

    let body: DispatchBody = {};
    try {
      body = (await request.json()) as DispatchBody;
    } catch {
      // Body vazio é aceitável, assume enableGps = false
    }

    const enableGps = Boolean(body.enableGps);
    const courierName = body.courierName?.trim() || null;
    const courierPhone = body.courierPhone?.trim() || null;
    const courierCode = body.courierCode?.trim() || null;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, trackingToken: true, orderPin: true },
    });

    if (!existingOrder) {
      return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
    }

    // Gera token seguro ou reaproveita caso já exista
    const trackingToken =
      existingOrder.trackingToken || crypto.randomUUID().replace(/-/g, "");

    const orderPin = existingOrder.orderPin || id.slice(-4).toUpperCase();

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "delivering",
        trackingToken,
        isGpsTrackingActive: enableGps,
        courierName,
        courierPhone,
        courierCode,
        orderPin,
        dispatchedAt: new Date(),
        deliveryIssue: null,
        deliveryIssueNotes: null,
        deliveryIssueAt: null,
      },
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true, email: true, phone: true } },
      },
    });

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const trackingUrl = `${protocol}://${host}/entrega/${trackingToken}`;

    return apiSuccess({
      success: true,
      trackingToken,
      trackingUrl,
      isGpsTrackingActive: enableGps,
      order: {
        id: updated.id,
        status: updated.status,
        tracking_token: updated.trackingToken,
        is_gps_tracking_active: updated.isGpsTrackingActive,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/orders/[id]/dispatch", "Erro ao despachar pedido.");
  }
}
