import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";
import {
  findMatchingCourierForOrder,
  markCourierInTransitForOrder,
} from "@/services/courierStatusAutomationService";
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
      courierId?: string;
      courierName?: string;
      courierPhone?: string;
      courierCode?: string;
      mode?: "assign" | "dispatch";
    }

    let body: DispatchBody = {};
    try {
      body = (await request.json()) as DispatchBody;
    } catch {
      // Body vazio é aceitável, assume enableGps = false
    }

    const enableGps = Boolean(body.enableGps);
    const requestedCourierId = body.courierId?.trim() || null;
    const courierName = body.courierName?.trim() || null;
    const courierPhone = body.courierPhone?.trim() || null;
    const courierCode = body.courierCode?.trim() || null;
    const mode = body.mode || "dispatch";
    const isAssignOnly = mode === "assign";

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, trackingToken: true, orderPin: true },
    });

    if (!existingOrder) {
      return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
    }

    let resolvedCourierId: string | null = null;
    if (requestedCourierId) {
      const existingCourier = await prisma.courier.findUnique({
        where: { id: requestedCourierId },
        select: { id: true },
      });
      resolvedCourierId = existingCourier?.id ?? null;
    } else if (courierPhone || courierName) {
      const matchedCourier = await findMatchingCourierForOrder({
        courierPhone,
        courierName,
      });
      resolvedCourierId = matchedCourier?.id ?? null;
    }

    // Gera token seguro ou reaproveita caso já exista
    const trackingToken =
      existingOrder.trackingToken || crypto.randomUUID().replace(/-/g, "");

    const orderPin = existingOrder.orderPin || id.slice(-4).toUpperCase();

    const targetStatus = isAssignOnly
      ? (existingOrder.status === "pending" || existingOrder.status === "accepted" ? "ready" : existingOrder.status)
      : "delivering";

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: targetStatus,
        trackingToken,
        isGpsTrackingActive: isAssignOnly ? false : enableGps,
        courierId: resolvedCourierId,
        courierName,
        courierPhone,
        courierCode,
        orderPin,
        ...(isAssignOnly ? {} : { dispatchedAt: new Date() }),
        deliveryIssue: null,
        deliveryIssueNotes: null,
        deliveryIssueAt: null,
      },
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true, email: true, phone: true } },
      },
    });

    if (!isAssignOnly) {
      await markCourierInTransitForOrder({
        courierId: resolvedCourierId,
        courierPhone,
        courierName,
      });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const trackingUrl = `${protocol}://${host}/entrega/${trackingToken}`;

    serverOrderEventManager.emit({
      type: "order_updated",
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      order: {
        id: updated.id,
        status: updated.status,
        courier_name: updated.courierName,
        courier_phone: updated.courierPhone,
        tracking_token: updated.trackingToken,
        is_gps_tracking_active: updated.isGpsTrackingActive,
      },
      timestamp: Date.now(),
    });

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
