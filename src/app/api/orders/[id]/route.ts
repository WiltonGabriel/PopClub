import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { formatOrder } from "@/lib/orderFormat";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { orderLookupLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Proteção de Taxa (Anti Scraping / IDOR Brute Force)
    const ip = getIpFromRequest(request);
    const limitCheck = orderLookupLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas consultas de pedidos. Por favor, aguarde.");
    }

    const { id } = await params;
    if (!id || typeof id !== "string") {
      return apiError("ID do pedido não informado.", 400);
    }

    const { searchParams } = new URL(request.url);
    const trackingToken = searchParams.get("token")?.trim() || null;

    const order = await prisma.order.findUnique({
      where: { id: id.trim() },
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true, email: true, phone: true, isRegistered: true } },
      },
    });

    if (!order) {
      return apiError("Pedido não encontrado.", 404, "NOT_FOUND");
    }

    // 2. Blindagem de Autorização em Nível de Objeto (BOLA / IDOR - OWASP API1)
    const authUser = await getAuthUser(request);
    const isStaff =
      hasPermission(authUser, "ORDERS_READ") ||
      hasPermission(authUser, "ORDERS_KANBAN") ||
      hasPermission(authUser, "ORDERS_HISTORY");

    const isOwner = Boolean(authUser?.id && order.userId && authUser.id === order.userId);
    const hasValidTrackingToken = Boolean(
      trackingToken && order.trackingToken && trackingToken === order.trackingToken
    );
    const isGuestOrder = order.user ? !order.user.isRegistered : true;

    // Se o requisitante for um usuário autenticado que NÃO é o proprietário e NÃO é staff:
    if (authUser && !isOwner && !isStaff && !hasValidTrackingToken) {
      return apiError(
        "Acesso negado. Você não possui permissão para visualizar os dados deste pedido.",
        403,
        "FORBIDDEN"
      );
    }

    // Se for anônimo e o pedido pertencer a uma conta registrada:
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

    // 3. Prevenção de Exposição Excessiva de Dados (Data Leakage - OWASP API3)
    // Se o pedido estiver sendo rastreado anonimamente sem token de entrega dedicado,
    // não expõe o PIN de entrega confidencial (usado pelo cliente na conferência física).
    if (!authUser && !hasValidTrackingToken) {
      formatted.order_pin = null;
    }

    return apiSuccess(formatted);
  } catch (error) {
    return handleApiError(error, "GET /api/orders/[id]", "Erro ao obter detalhes do pedido.");
  }
}
