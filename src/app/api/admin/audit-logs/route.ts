import { getAuthUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/apiResponse";
import { isUserAdmin } from "@/lib/permissions";
import { listAdminAuditLogs } from "@/services/auditLogService";

/**
 * GET /api/admin/audit-logs
 * Consulta somente leitura exclusiva de administradores (ADMIN).
 */
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return apiError("Não autenticado.", 401, "UNAUTHORIZED");
    }
    if (!isUserAdmin(authUser)) {
      return apiError(
        "Acesso negado. Apenas administradores podem consultar registros de auditoria.",
        403,
        "FORBIDDEN"
      );
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "25");
    const resourceType = url.searchParams.get("resourceType") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const actorUserId = url.searchParams.get("actorUserId") || undefined;

    const result = await listAdminAuditLogs({
      page,
      limit,
      resourceType,
      action,
      actorUserId,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "GET /api/admin/audit-logs", "Erro ao consultar auditoria administrativa.");
  }
}

export async function POST() {
  return apiError("Registros de auditoria são imutáveis e não podem ser criados manualmente.", 405, "METHOD_NOT_ALLOWED");
}

export async function PUT() {
  return apiError("Registros de auditoria são imutáveis e não podem ser alterados.", 405, "METHOD_NOT_ALLOWED");
}

export async function PATCH() {
  return apiError("Registros de auditoria são imutáveis e não podem ser alterados.", 405, "METHOD_NOT_ALLOWED");
}

export async function DELETE() {
  return apiError("Registros de auditoria são imutáveis e não podem ser removidos.", 405, "METHOD_NOT_ALLOWED");
}
