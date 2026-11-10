import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Prisma, OrderStatus } from "@prisma/client";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { sanitizeText } from "@/lib/sanitize";
import { hasPermission } from "@/lib/permissions";

import { formatOrder } from "@/lib/orderFormat";
import { orderLookupLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);

    // Consulta individual por ID (utilizada para rastreamento logístico em tempo real)
    const singleOrderId = searchParams.get("id")?.trim();
    if (singleOrderId) {
      const ip = getIpFromRequest(request);
      const limitCheck = orderLookupLimiter.check(ip);
      if (!limitCheck.success) {
        return createRateLimitResponse(limitCheck, "Muitas consultas de pedidos. Por favor, aguarde.");
      }

      const order = await prisma.order.findUnique({
        where: { id: singleOrderId },
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true, username: true, email: true, phone: true, isRegistered: true } },
        },
      });

      if (!order) {
        return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
      }

      // Blindagem de Autorização em Nível de Objeto (BOLA / IDOR)
      const trackingToken = searchParams.get("token")?.trim() || null;
      const isStaff =
        hasPermission(authUser, "ORDERS_READ") ||
        hasPermission(authUser, "ORDERS_KANBAN") ||
        hasPermission(authUser, "ORDERS_HISTORY");

      const isOwner = Boolean(authUser?.id && order.userId && authUser.id === order.userId);
      const hasValidTrackingToken = Boolean(
        trackingToken && order.trackingToken && trackingToken === order.trackingToken
      );
      const isGuestOrder = order.user ? !order.user.isRegistered : true;

      if (authUser && !isOwner && !isStaff && !hasValidTrackingToken) {
        return apiError(
          "Acesso negado. Você não possui permissão para visualizar os dados deste pedido.",
          403,
          "FORBIDDEN"
        );
      }

      if (!authUser && !isGuestOrder && !hasValidTrackingToken) {
        return apiError(
          "Este pedido pertence a um cliente cadastrado. Faça login para acessá-lo.",
          401,
          "UNAUTHORIZED"
        );
      }

      let shiftCode: string | null = null;
      if (order.shiftId) {
        const sh = await prisma.shift.findUnique({
          where: { id: order.shiftId },
          select: { code: true },
        });
        shiftCode = sh?.code || null;
      }

      const formatted = formatOrder(order, shiftCode);
      if (!authUser && !hasValidTrackingToken) {
        formatted.order_pin = null;
      }

      return apiSuccess(formatted);
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

    const canViewAll = hasPermission(authUser, "ORDERS_KANBAN") || hasPermission(authUser, "ORDERS_HISTORY");
    if (canViewAll && all) {
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

      // Visitantes consultando pedidos rastreados na sua sessão local
      // Proteção BOLA / IDOR: Visitantes anônimos NUNCA podem consultar pedidos de usuários cadastrados
      whereClause = {
        id: { in: cleanIds },
        OR: [
          { user: { isRegistered: false } },
          { user: null },
          { userId: null },
        ],
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
      orders.map((o) => {
        const formatted = formatOrder(o, o.shiftId ? shiftCodeMap.get(o.shiftId) || null : null);
        if (!authUser && !canViewAll) {
          formatted.order_pin = null;
        }
        return formatted;
      })
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
      include: {
        items: { include: { product: true } },
      },
    });

    if (!existingOrder) {
      return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
    }

    // Idempotência: se já estiver no status solicitado, retorna com sucesso sem reprocessar timestamps
    if (existingOrder.status === status) {
      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true, username: true, email: true, phone: true } },
        },
      });
      return apiSuccess(formatOrder(currentOrder!));
    }

    // Estado terminal imutável: pedido cancelado nunca pode sofrer nova transição
    if (existingOrder.status === "cancelled") {
      return apiError("Pedidos cancelados não podem ter seu status alterado.", 422, "ORDER_ALREADY_CANCELLED");
    }

    const isAdmin = authUser?.role === "admin";
    const canManageOrders = hasPermission(authUser, "ORDERS_KANBAN");
    const isOwner = Boolean(authUser?.id && existingOrder.userId === authUser.id);

    // Validação de Máquina de Estados Operacional (FSM)
    const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
      pending: ["accepted", "cancelled"],
      accepted: ["preparing", "pending", "cancelled"],
      preparing: ["ready", "accepted", "cancelled"],
      ready: ["delivering", "completed", "preparing", "cancelled"],
      delivering: ["completed", "ready", "cancelled"],
      completed: ["delivering"], // Reabrir entrega (staff recovery)
      cancelled: [], // Terminal
    };

    if (canManageOrders) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[existingOrder.status] || [];
      if (!allowedNext.includes(status as OrderStatus)) {
        return apiError(
          `Transição de status inválida de "${existingOrder.status}" para "${status}".`,
          422,
          "INVALID_STATUS_TRANSITION"
        );
      }
    } else {
      // Cliente não-operador: só pode cancelar se for o dono E o pedido ainda estiver "pending"
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

    // Atualização com verificação atômica de concorrência (evita conflitos e race conditions)
    if (status === "cancelled") {
      try {
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.order.updateMany({
            where: {
              id: orderId,
              status: existingOrder.status,
            },
            data: dataToUpdate,
          });

          if (updateResult.count === 0) {
            throw new Error("CONCURRENT_STATUS_UPDATE");
          }

          // 1. Restaura estoque dos produtos físicos cancelados
          for (const it of existingOrder.items || []) {
            if (it.product && it.product.stock !== null) {
              await tx.product.update({
                where: { id: it.productId },
                data: { stock: { increment: it.quantity } },
              });
            }

            // 2. Restaura cotas de lote em promoções de escassez
            if (it.promotionId) {
              await tx.$executeRaw`
                UPDATE promotions
                SET scarcity_sold = GREATEST(0, scarcity_sold - ${it.quantity}),
                    scarcity_units = scarcity_units + ${it.quantity}
                WHERE id = ${it.promotionId} AND scarcity_units IS NOT NULL
              `;
            }
          }

          // 3. Restaura utilização de cupom e libera cupom de uso único (oncePerUser)
          if (existingOrder.couponId) {
            await tx.coupon.updateMany({
              where: { id: existingOrder.couponId, uses: { gt: 0 } },
              data: { uses: { decrement: 1 } },
            });

            await tx.couponRedemption.deleteMany({
              where: {
                couponId: existingOrder.couponId,
                OR: [
                  { orderId: existingOrder.id },
                  ...(existingOrder.userId ? [{ userId: existingOrder.userId }] : []),
                ],
              },
            });
          }
        });
      } catch (txErr: any) {
        if (txErr?.message === "CONCURRENT_STATUS_UPDATE") {
          const freshOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              items: { include: { product: true } },
              user: { select: { fullName: true, username: true, email: true, phone: true } },
            },
          });
          if (freshOrder?.status === status) {
            return apiSuccess(formatOrder(freshOrder));
          }
          return apiError(
            "O pedido foi atualizado concorrentemente por outro operador.",
            409,
            "CONCURRENT_STATUS_UPDATE"
          );
        }
        throw txErr;
      }
    } else {
      const updateResult = await prisma.order.updateMany({
        where: {
          id: orderId,
          status: existingOrder.status,
        },
        data: dataToUpdate,
      });

      if (updateResult.count === 0) {
        // Outro operador ou chamada paralela alterou o status no mesmo instante
        const freshOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: { include: { product: true } },
            user: { select: { fullName: true, username: true, email: true, phone: true } },
          },
        });
        if (freshOrder?.status === status) {
          return apiSuccess(formatOrder(freshOrder));
        }
        return apiError(
          "O pedido foi atualizado concorrentemente por outro operador.",
          409,
          "CONCURRENT_STATUS_UPDATE"
        );
      }
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true, email: true, phone: true } },
      },
    });

    const formatted = formatOrder(updated!);

    serverOrderEventManager.emit({
      type: updated?.status === "cancelled" ? "order_cancelled" : "order_updated",
      orderId: updated!.id,
      userId: updated!.userId,
      status: updated!.status,
      order: formatted,
      timestamp: Date.now(),
    });

    return apiSuccess(formatted);
  } catch (error: unknown) {
    return handleApiError(error, "PATCH /api/orders", "Erro ao atualizar pedido.");
  }
}
