import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Prisma, OrderStatus } from "@prisma/client";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";

function formatOrder(o: any) {
  return {
    id: o.id,
    user_id: o.userId,
    status: o.status,
    subtotal: Number(o.subtotal),
    discount_amount: Number(o.discountAmount),
    delivery_fee: Number(o.deliveryFee || 0),
    total_amount: Number(o.totalAmount),
    payment_method_type: o.paymentMethodType,
    payment_change_for: o.paymentChangeFor ? Number(o.paymentChangeFor) : (o.changeFor ? Number(o.changeFor) : null),
    change_for: o.changeFor ? Number(o.changeFor) : (o.paymentChangeFor ? Number(o.paymentChangeFor) : null),
    change_to_return: o.changeToReturn ? Number(o.changeToReturn) : null,
    shift_id: o.shiftId,
    is_archived: o.isArchived,
    tracking_token: o.trackingToken || null,
    is_gps_tracking_active: Boolean(o.isGpsTrackingActive),
    courier_latitude: o.courierLatitude ?? null,
    courier_longitude: o.courierLongitude ?? null,
    courier_updated_at: o.courierUpdatedAt ? o.courierUpdatedAt.toISOString() : null,
    origin_latitude: o.originLatitude ?? -15.6536,
    origin_longitude: o.originLongitude ?? -56.1322,
    origin_address: o.originAddress || "Várzea Grande, MT",
    branch_id: o.branchId || "store_config",
    delivery_address: {
      street: o.deliveryStreet,
      number: o.deliveryNumber,
      neighborhood: o.deliveryNeighborhood,
      city: o.deliveryCity,
      complement: o.deliveryComplement,
      reference: o.deliveryReference,
      zip: o.deliveryZip,
      latitude: o.deliveryLatitude,
      longitude: o.deliveryLongitude,
    },
    cancellation_reason: o.cancellationReason || null,
    cancelled_at: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
    items: (o.items || []).map((it: any) => ({
      id: it.id,
      order_id: it.orderId,
      product_id: it.productId,
      quantity: it.quantity,
      price_at_time: Number(it.priceAtTime),
      product: it.product
        ? {
            id: it.product.id,
            name: it.product.name,
            description: it.product.description || "",
            price: Number(it.product.price),
            imageUrl: it.product.imageUrl || "",
          }
        : undefined,
    })),
    user: o.user,
  };
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);

    // Consulta individual por ID (utilizada para rastreamento logístico público em tempo real)
    const singleOrderId = searchParams.get("id")?.trim();
    if (singleOrderId) {
      // BOLA / IDOR Protection: Add user filtering dynamically unless ADMIN
      let whereFilter: Prisma.OrderWhereInput = { id: singleOrderId };

      if (authUser?.role !== "admin") {
         if (authUser?.id) {
           whereFilter = { id: singleOrderId, userId: authUser.id };
         } else {
           // Allow guests to see orders without userId, or we check ownership on the frontend
           // Better approach is to rely on tracking token for guests, but we enforce BOLA below.
           whereFilter = { id: singleOrderId };
         }
      }

      const order = await prisma.order.findUnique({
        where: whereFilter as Prisma.OrderWhereUniqueInput,
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true, username: true, email: true, phone: true } },
        },
      });

      if (!order) {
        return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
      }

      // Extra BOLA Check (If order belongs to someone else and requester is not admin)
      if (order.userId && (!authUser || authUser.id !== order.userId) && authUser?.role !== "admin") {
         return apiError("Acesso negado a este pedido.", 403, "FORBIDDEN");
      }

      // Rastreamento público liberado via link direto do ID do pedido
      return apiSuccess(formatOrder(order));
    }

    const all = searchParams.get("all") === "true";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const paginated = searchParams.get("paginated") === "true";
    const statusFilter = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const guestOrderIdsParam = searchParams.get("guestOrderIds")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));

    let whereClause: Prisma.OrderWhereInput = {};

    if (authUser?.role === "admin" && all) {
      whereClause = {};
      if (!includeArchived) {
        whereClause.isArchived = false;
      }
    } else if (authUser?.id) {
      whereClause = { userId: authUser.id };
    } else if (guestOrderIdsParam) {
      // Visitante anônimo consultando pedidos que ele mesmo acabou de gerar nesta sessão
      const cleanIds = guestOrderIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
        .slice(0, 20);

      if (cleanIds.length === 0) {
        return apiSuccess(paginated ? { orders: [], total: 0, page: 1, limit, totalPages: 0, totalRevenue: 0, averageTicket: 0 } : []);
      }

      // ISOLAMENTO ESTRITO: visitantes só podem ver pedidos sem usuário vinculado (userId: null)
      whereClause = {
        id: { in: cleanIds },
        userId: null,
      };
    } else {
      // Retorna vazio para usuário não autenticado sem pedidos de visitante informados
      return apiSuccess(paginated ? { orders: [], total: 0, page: 1, limit, totalPages: 0, totalRevenue: 0, averageTicket: 0 } : []);
    }

    // Filtro por status
    if (statusFilter && statusFilter !== "all") {
      whereClause.status = statusFilter as OrderStatus;
    }

    // Filtro por intervalo de datas
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    // Busca textual por ID, Nome, Usuário ou Telefone
    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { username: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
        { deliveryStreet: { contains: search, mode: "insensitive" } },
      ];
    }

    // Se paginação for solicitada
    if (paginated) {
      const [total, orders, allMatchingForMetrics] = await Promise.all([
        prisma.order.count({ where: whereClause }),
        prisma.order.findMany({
          where: whereClause,
          include: {
            items: {
              include: { product: true },
            },
            user: {
              select: { fullName: true, username: true, email: true, phone: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.findMany({
          where: whereClause,
          select: { totalAmount: true, status: true },
        }),
      ]);

      const validOrdersForRevenue = allMatchingForMetrics.filter((o) => o.status !== "cancelled");
      const totalRevenue = validOrdersForRevenue.reduce((acc, o) => acc + Number(o.totalAmount), 0);
      const averageTicket = validOrdersForRevenue.length > 0 ? totalRevenue / validOrdersForRevenue.length : 0;
      const totalPages = Math.ceil(total / limit) || 1;

      return apiSuccess({
        orders: orders.map(formatOrder),
        total,
        page,
        limit,
        totalPages,
        totalRevenue,
        averageTicket,
      });
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: { product: true },
        },
        user: {
          select: { fullName: true, username: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(orders.map(formatOrder));
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/orders", "Erro ao listar pedidos.");
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400);
    }

    const { orderId, status, cancellationReason } = (body as Record<string, string>) || {};

    if (!orderId || !status) {
      return apiError("orderId e status são obrigatórios.", 400);
    }

    // Busca o pedido existente para validar autorização e integridade
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });

    if (!existingOrder) {
      return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
    }

    const isAdmin = authUser?.role === "admin";
    const isOwner = Boolean(authUser?.id && existingOrder.userId === authUser.id);

    // Se não for admin, só tem permissão para cancelar caso seja o dono E o pedido ainda esteja "pending"
    if (!isAdmin) {
      if (!isOwner || status !== "cancelled" || existingOrder.status !== "pending") {
        return apiError("Você não tem permissão para alterar o status deste pedido.", 403, "FORBIDDEN");
      }
    }

    const dataToUpdate: Prisma.OrderUpdateInput = { status: status as OrderStatus };
    if (status === "cancelled") {
      dataToUpdate.cancellationReason =
        cancellationReason || (isAdmin ? "Cancelado pela administração" : "Cancelado pelo cliente");
      dataToUpdate.cancelledAt = new Date();
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true, email: true, phone: true } },
      },
    });

    return apiSuccess(formatOrder(updated));
  } catch (error: unknown) {
    return handleApiError(error, "PATCH /api/orders", "Erro ao atualizar pedido.");
  }
}
