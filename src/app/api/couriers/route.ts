import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";
import {
  courierCreateSchema,
  toCourierDispatchDto,
} from "@/services/courierDispatchProjection";
import { recordAdminAudit } from "@/services/auditLogService";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Autenticação necessária para consultar entregadores.", 401, "UNAUTHORIZED");
    }

    const canManageLogistics = hasPermission(user, "logistics_manage");
    const canDispatchOrders = hasPermission(user, "ORDERS_KANBAN");

    if (!canManageLogistics && !canDispatchOrders) {
      return apiError(
        "Acesso negado. Permissão logistics_manage ou ORDERS_KANBAN necessária.",
        403,
        "FORBIDDEN"
      );
    }

    const couriers = await prisma.courier.findMany({
      where: { isActive: true },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    if (canManageLogistics) {
      return apiSuccess(couriers);
    }

    // Operadores apenas com ORDERS_KANBAN recebem projeção sem pixKey
    return apiSuccess(couriers.map(toCourierDispatchDto));
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/couriers", "Erro ao listar entregadores.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Não autenticado.", 401, "UNAUTHORIZED");
    }
    if (!hasPermission(user, "logistics_manage")) {
      return apiError(
        "Acesso negado. Permissão logistics_manage necessária para cadastrar entregadores.",
        403,
        "FORBIDDEN"
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const parsed = courierCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Dados do entregador inválidos.";
      return apiError(msg, 400, "VALIDATION_ERROR");
    }

    const { name, phone, vehicle, plate, pixKey, status } = parsed.data;

    const courier = await prisma.courier.create({
      data: {
        name,
        phone,
        vehicle: vehicle || "Moto",
        plate: plate ? plate.toUpperCase() : null,
        pixKey: pixKey || null,
        status,
        isActive: true,
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "CREATE_COURIER",
      resourceType: "courier",
      resourceId: courier.id,
      summary: `Cadastrou entregador "${courier.name}".`,
      diffKeys: ["name", "vehicle", "status"],
      metadata: { vehicle: courier.vehicle, status: courier.status },
    });

    return apiSuccess(courier);
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/couriers", "Erro ao cadastrar entregador.");
  }
}
