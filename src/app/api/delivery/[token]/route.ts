import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";

export async function GET(
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
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true, phone: true } },
      },
    });

    if (!order) {
      return apiError("Entrega não encontrada ou token inválido.", 404, "NOT_FOUND");
    }

    // Busca configurações da loja para obter coordenadas de origem
    const storeSettings = await prisma.storeSettings.findUnique({
      where: { id: "store_config" },
      select: { storeLatitude: true, storeLongitude: true, whatsappNumber: true },
    });

    const storeOrigin = {
      lat: order.originLatitude ?? storeSettings?.storeLatitude ?? -15.6536,
      lng: order.originLongitude ?? storeSettings?.storeLongitude ?? -56.1322,
    };

    const clientName =
      order.user?.fullName || order.user?.username || "Cliente Pop Shake";

    return apiSuccess({
      orderId: order.id,
      status: order.status,
      isGpsTrackingActive: order.isGpsTrackingActive,
      courierLatitude: order.courierLatitude,
      courierLongitude: order.courierLongitude,
      courierUpdatedAt: order.courierUpdatedAt?.toISOString() || null,
      client: {
        name: clientName,
        phone: order.user?.phone || null,
      },
      deliveryAddress: {
        street: order.deliveryStreet,
        number: order.deliveryNumber,
        neighborhood: order.deliveryNeighborhood,
        city: order.deliveryCity,
        complement: order.deliveryComplement,
        reference: order.deliveryReference,
        zip: order.deliveryZip,
        latitude: order.deliveryLatitude,
        longitude: order.deliveryLongitude,
      },
      payment: {
        type: order.paymentMethodType,
        changeFor: (order as any).changeFor ? Number((order as any).changeFor) : (order.paymentChangeFor ? Number(order.paymentChangeFor) : null),
        changeToReturn: (order as any).changeToReturn ? Number((order as any).changeToReturn) : null,
        total: Number(order.totalAmount),
      },
      items: order.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        productName: it.product.name,
      })),
      storeOrigin,
    });
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/delivery/[token]", "Erro ao buscar dados da entrega.");
  }
}
