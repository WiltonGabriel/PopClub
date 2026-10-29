import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { z } from "zod";

const claimSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1, "Nenhum pedido informado para vincular."),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.id) {
      return apiError("Usuário não autenticado. Faça login para vincular seus pedidos.", 401, "UNAUTHORIZED");
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiError("Formato de requisição inválido.", 400);
    }

    const parsed = claimSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400, "VALIDATION_ERROR");
    }

    const { orderIds } = parsed.data;

    // ISOLAMENTO E SEGURANÇA:
    // Apenas pedidos anônimos (userId === null) podem ser reivindicados.
    // Pedidos já vinculados a outros usuários NUNCA podem ser transferidos!
    const unclaimedOrders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        userId: null,
      },
      select: { id: true },
    });

    if (unclaimedOrders.length === 0) {
      return apiSuccess({
        claimedCount: 0,
        claimedOrderIds: [],
        message: "Nenhum pedido anônimo pendente encontrado para vinculação.",
      });
    }

    const validIdsToClaim = unclaimedOrders.map((o) => o.id);

    const claimResult = await prisma.order.updateMany({
      where: {
        id: { in: validIdsToClaim },
        userId: null,
      },
      data: {
        userId: authUser.id,
      },
    });

    if (claimResult.count === 0) {
      return apiError("Os pedidos informados já foram vinculados a outra conta simultaneamente.", 409, "CONFLICT");
    }

    return apiSuccess({
      claimedCount: claimResult.count,
      claimedOrderIds: validIdsToClaim,
      message: `${claimResult.count} pedido(s) vinculado(s) com sucesso à sua conta!`,
    });
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/orders/claim", "Erro ao vincular pedidos à conta.");
  }
}
