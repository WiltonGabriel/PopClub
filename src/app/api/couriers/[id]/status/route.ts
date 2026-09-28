import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return apiError("Acesso negado. Apenas administradores.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const { status } = body || {};
    if (!status || !["available", "in_transit", "off_duty"].includes(status)) {
      return apiError("Status inválido. Use 'available', 'in_transit' ou 'off_duty'.", 400);
    }

    const updated = await prisma.courier.update({
      where: { id },
      data: { status },
    });

    return apiSuccess(updated);
  } catch (error: unknown) {
    return handleApiError(error, "PATCH /api/couriers/[id]/status", "Erro ao alterar status do entregador.");
  }
}
