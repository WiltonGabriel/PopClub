import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { apiSuccess, handleApiError } from "@/lib/api-error-handler";
import { createPromotionSchema } from "@/lib/validations/promotion";
import { promotionServerService } from "@/services/promotionServerService";
import { ForbiddenActionException, UnauthorizedException } from "@/domain/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeAll = url.searchParams.get("all") === "true";

    if (includeAll) {
      const user = await getAuthUser(request);
      if (!user) {
        throw new UnauthorizedException("Autenticação obrigatória para listar todas as promoções.");
      }
      if (!hasPermission(user, "promotions_manage")) {
        throw new ForbiddenActionException(
          "promotions_manage",
          "Acesso negado. Permissão para gerenciar promoções é necessária."
        );
      }
    }

    const promotions = await promotionServerService.listPromotions({ includeAll });
    return apiSuccess(promotions);
  } catch (error) {
    return handleApiError(error, "GET /api/promotions", "Erro ao carregar promoções.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      throw new UnauthorizedException("Autenticação obrigatória para criar promoções.");
    }
    if (!hasPermission(user, "promotions_manage")) {
      throw new ForbiddenActionException(
        "promotions_manage",
        "Acesso negado. Permissão para gerenciar promoções é necessária."
      );
    }

    const body = await request.json();
    const parsed = createPromotionSchema.parse(body);

    const created = await promotionServerService.createPromotion(parsed, {
      id: user.id,
      role: user.role,
    });

    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/promotions", "Erro ao criar promoção.");
  }
}
