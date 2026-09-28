import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Prisma, OrderStatus } from "@prisma/client";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { sanitizeText } from "@/lib/sanitize";

type DbOrderPayload = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
    user: {
      select: {
        fullName: true;
        username: true;
        email: true;
        phone: true;
      };
    };
  };
}>;

type AddonItemSummary = {
  id: string;
  name: string;
  groupName?: string;
  price: number;
  quantity: number;
};

function formatOrder(o: DbOrderPayload, shiftCode?: string | null) {
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
    shift_code: shiftCode !== undefined ? shiftCode : null,
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
    courier_name: o.courierName || null,
    courier_phone: o.courierPhone || null,
    courier_code: o.courierCode || null,
    order_pin: o.orderPin || null,
    dispatched_at: o.dispatchedAt ? o.dispatchedAt.toISOString() : null,
    delivered_at: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    delivery_issue: o.deliveryIssue || null,
    delivery_issue_notes: o.deliveryIssueNotes || null,
    delivery_issue_at: o.deliveryIssueAt ? o.deliveryIssueAt.toISOString() : null,
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
    items: (o.items || []).map((it) => ({
      id: it.id,
      order_id: it.orderId,
      product_id: it.productId,
      quantity: it.quantity,
      price_at_time: Number(it.priceAtTime),
      selected_addons: (it.selectedAddons as unknown as AddonItemSummary[]) || null,
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
      const order = await prisma.order.findUnique({
        where: { id: singleOrderId },
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true, username: true, email: true, phone: true } },
        },
      });

      if (!order) {
        return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
      }

      // BOLA / IDOR Protection: Ensure user can only see their own orders unless ADMIN
      if (order.userId && (!authUser || authUser.id !== order.userId) && authUser?.role !== "admin") {
         return apiError("Acesso negado a este pedido.", 403, "FORBIDDEN");
      }

      let shiftCode: string | null = null;
      if (order.shiftId) {
        const sh = await prisma.shift.findUnique({
          where: { id: order.shiftId },
          select: { code: true },
        });
        shiftCode = sh?.code || null;
      }

      // Rastreamento público liberado via link direto do ID do pedido
      return apiSuccess(formatOrder(order, shiftCode));
    }

    const all = searchParams.get("all") === "true";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const paginated = searchParams.get("paginated") === "true";
    const statusFilter = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const guestOrderIdsParam = searchParams.get("guestOrderIds")?.trim();
    const shiftId = searchParams.get("shiftId")?.trim();
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

    // Filtro por Turno / Esteira
    if (shiftId) {
      whereClause.shiftId = shiftId;
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

    // Busca textual por ID (mesmo com prefixo #), Nome, Usuário, Telefone ou Rua/Bairro
    if (search) {
      const cleanSearch = search.trim();
      const idSearch = cleanSearch.replace(/^#/, "").trim();
      const digitsOnly = cleanSearch.replace(/\D/g, "");
      whereClause.OR = [
        ...(idSearch ? [{ id: { contains: idSearch, mode: "insensitive" as const } }] : []),
        { user: { fullName: { contains: cleanSearch, mode: "insensitive" as const } } },
        { user: { username: { contains: cleanSearch, mode: "insensitive" as const } } },
        { user: { phone: { contains: cleanSearch, mode: "insensitive" as const } } },
        ...(digitsOnly.length >= 4 ? [{ user: { phone: { contains: digitsOnly, mode: "insensitive" as const } } }] : []),
        { deliveryStreet: { contains: cleanSearch, mode: "insensitive" as const } },
        { deliveryNeighborhood: { contains: cleanSearch, mode: "insensitive" as const } },
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

      // Resolução de códigos de turnos para os pedidos
      const shiftIds = Array.from(new Set(orders.map((o) => o.shiftId).filter(Boolean))) as string[];
      let shiftCodeMap = new Map<string, string>();
      if (shiftIds.length > 0) {
        const shiftsFound = await prisma.shift.findMany({
          where: { id: { in: shiftIds } },
          select: { id: true, code: true },
        });
        shiftCodeMap = new Map(shiftsFound.map((s) => [s.id, s.code]));
      }

      return apiSuccess({
        orders: orders.map((o) => formatOrder(o, o.shiftId ? shiftCodeMap.get(o.shiftId) || null : null)),
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

    const shiftIds = Array.from(new Set(orders.map((o) => o.shiftId).filter(Boolean))) as string[];
    let shiftCodeMap = new Map<string, string>();
    if (shiftIds.length > 0) {
      const shiftsFound = await prisma.shift.findMany({
        where: { id: { in: shiftIds } },
        select: { id: true, code: true },
      });
      shiftCodeMap = new Map(shiftsFound.map((s) => [s.id, s.code]));
    }

    return apiSuccess(
      orders.map((o) => formatOrder(o, o.shiftId ? shiftCodeMap.get(o.shiftId) || null : null))
    );
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
      const cleanReason = cancellationReason ? sanitizeText(cancellationReason) : "";
      dataToUpdate.cancellationReason =
        cleanReason || (isAdmin ? "Cancelado pela administração" : "Cancelado pelo cliente");
      dataToUpdate.cancelledAt = new Date();
    } else if (status === "completed") {
      dataToUpdate.deliveredAt = new Date();
      dataToUpdate.isGpsTrackingActive = false;
    }

    if (body.deliveryIssue) {
      dataToUpdate.deliveryIssue = sanitizeText(String(body.deliveryIssue));
      dataToUpdate.deliveryIssueNotes = body.deliveryIssueNotes ? sanitizeText(String(body.deliveryIssueNotes)) : null;
      dataToUpdate.deliveryIssueAt = new Date();
    }

    if (body.courierName) {
      dataToUpdate.courierName = sanitizeText(String(body.courierName));
    }
    if (body.courierCode) {
      dataToUpdate.courierCode = sanitizeText(String(body.courierCode));
    }
    if (body.orderPin) {
      dataToUpdate.orderPin = sanitizeText(String(body.orderPin));
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
