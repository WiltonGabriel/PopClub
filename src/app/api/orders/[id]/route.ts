import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { formatOrder } from "@/lib/orderFormat";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return apiError("ID do pedido não informado.", 400);
    }

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

    let shiftCode: string | null = null;
    if (order.shiftId) {
      const sh = await prisma.shift.findUnique({
        where: { id: order.shiftId },
        select: { code: true },
      });
      shiftCode = sh?.code || null;
    }

    return apiSuccess(formatOrder(order, shiftCode));
  } catch (error) {
    return handleApiError(error, "GET /api/orders/[id]", "Erro ao obter detalhes do pedido.");
  }
}
