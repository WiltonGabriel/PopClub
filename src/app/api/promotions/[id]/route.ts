import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { apiSuccess, handleApiError } from "@/lib/api-error-handler";
import { updatePromotionSchema } from "@/lib/validations/promotion";
import { promotionServerService } from "@/services/promotionServerService";
import { ForbiddenActionException, UnauthorizedException } from "@/domain/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promotion = await promotionServerService.getPromotionById(id);
    return apiSuccess(promotion);
  } catch (error) {
    return handleApiError(error, "GET /api/promotions/[id]", "Erro ao carregar promoção.");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      throw new UnauthorizedException("Autenticação obrigatória para atualizar promoções.");
    }
    if (!hasPermission(user, "promotions_manage")) {
      throw new ForbiddenActionException(
        "promotions_manage",
        "Acesso negado. Permissão para gerenciar promoções é necessária."
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePromotionSchema.parse(body);

    const updated = await promotionServerService.updatePromotion(id, parsed, {
      id: user.id,
      role: user.role,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error, "PUT /api/promotions/[id]", "Erro ao atualizar promoção.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      throw new UnauthorizedException("Autenticação obrigatória para remover promoções.");
    }
    if (!hasPermission(user, "promotions_manage")) {
      throw new ForbiddenActionException(
        "promotions_manage",
        "Acesso negado. Permissão para gerenciar promoções é necessária."
      );
    }

    const { id } = await params;
    const result = await promotionServerService.deletePromotion(id, {
      id: user.id,
      role: user.role,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "DELETE /api/promotions/[id]", "Erro ao remover promoção.");
  }
}
