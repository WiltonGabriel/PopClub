import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiError, apiSuccess } from "@/lib/apiResponse";
import { sanitizeText } from "@/lib/sanitize";

import { productInclude, formatProduct } from "@/lib/productHelper";
import { resolveOrderedAddonGroupIds } from "@/lib/addonPersistenceHelper";
import { hasPermission } from "@/lib/permissions";
import { CategoryDomainService } from "@/domain/services/CategoryDomainService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(products.map(formatProduct));
  } catch (error: unknown) {
    return handleApiError(error, "API:products:GET", "Não foi possível carregar os produtos.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return apiError("Acesso negado. Permissão para gerenciar cardápio necessária.", 403, "FORBIDDEN");
    }

    const countProducts = await prisma.product.count({ where: { isAvailable: true, deletedAt: null } });
    if (countProducts >= 300) {
      return apiError("Limite máximo de 300 produtos ativos atingido.", 400, "QUOTA_EXCEEDED");
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400, "BAD_REQUEST");
    }
    const {
      name,
      description,
      price,
      servesText,
      isHighlight,
      categoryId,
      category,
      imageUrl,
      stock,
      isAvailable,
      cardBadgeId,
      isCombo,
      comboItems,
      addonGroupIds,
      showScarcity,
      scarcityType,
      scarcityUnits,
      scarcityInitial,
      scarcitySold,
      showProgressBar,
      showDuration,
      urgencyType,
      expiresAt,
      sessionMinutes,
    } = (body || {}) as {
      name?: string;
      description?: string;
      price?: number | string;
      servesText?: string | null;
      isHighlight?: boolean;
      categoryId?: string;
      category?: string;
      imageUrl?: string;
      stock?: number | string;
      isAvailable?: boolean;
      cardBadgeId?: string;
      isCombo?: boolean;
      comboItems?: Array<{ productId: string; quantity?: number }>;
      addonGroupIds?: string[];
      showScarcity?: boolean;
      scarcityType?: string;
      scarcityUnits?: number | string;
      scarcityInitial?: number | string;
      scarcitySold?: number | string;
      showProgressBar?: boolean;
      showDuration?: boolean;
      urgencyType?: string;
      expiresAt?: string | null;
      sessionMinutes?: number | string;
    };

    const cleanName = sanitizeText(name);
    const cleanDescription = description ? sanitizeText(description) : null;
    const cleanCategory = category ? sanitizeText(category) : null;

    if (!cleanName || price === undefined) {
      return apiError("Nome e preço do produto são obrigatórios.", 400, "VALIDATION_ERROR");
    }
    if (cleanName.length > 100) {
      return apiError("O nome do produto não pode exceder 100 caracteres.", 400, "VALIDATION_ERROR");
    }
    if (cleanDescription && cleanDescription.length > 1000) {
      return apiError("A descrição do produto não pode exceder 1000 caracteres.", 400, "VALIDATION_ERROR");
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return apiError("O preço do produto deve ser um valor positivo.", 400, "VALIDATION_ERROR");
    }

    const parsedStock = stock !== undefined && stock !== null && stock !== "" ? Number(stock) : null;

    let resolvedCategoryName = cleanCategory;
    if (categoryId) {
      const targetCategory = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true, isDynamic: true, maxProducts: true },
      });
      if (!targetCategory) {
        return apiError("A categoria selecionada não foi encontrada.", 400, "VALIDATION_ERROR");
      }
      if (!targetCategory.isDynamic) {
        const currentActiveCount = await prisma.product.count({
          where: { categoryId, deletedAt: null },
        });
        const maxCap = targetCategory.maxProducts ?? 20;
        if (
          !CategoryDomainService.canAssignProductToCategory({
            currentActiveCount,
            maxProducts: maxCap,
          })
        ) {
          return apiError(
            `A categoria "${targetCategory.name}" atingiu o limite máximo de ${maxCap} produto(s).`,
            400,
            "CATEGORY_LIMIT_REACHED"
          );
        }
      }
      resolvedCategoryName = targetCategory.name;
    }

    if (Boolean(isCombo)) {
      if (!Array.isArray(comboItems) || comboItems.length === 0) {
        return apiError("Um combo precisa ter pelo menos 1 produto base vinculado.", 400, "VALIDATION_ERROR");
      }
      const childIds = Array.from(new Set(comboItems.map((ci) => ci.productId).filter(Boolean)));
      const childProducts = await prisma.product.findMany({
        where: { id: { in: childIds }, deletedAt: null },
        select: { id: true, name: true, isCombo: true },
      });
      if (childProducts.length !== childIds.length) {
        return apiError("Um ou mais produtos selecionados para o combo não existem ou foram removidos.", 400, "VALIDATION_ERROR");
      }
      const nestedCombo = childProducts.find((cp) => cp.isCombo);
      if (nestedCombo) {
        return apiError(`O item "${nestedCombo.name}" já é um combo e não pode ser adicionado dentro de outro combo.`, 400, "VALIDATION_ERROR");
      }
    }

    const productData: any = {
      name: cleanName,
      description: cleanDescription,
      price: parsedPrice,
      servesText: servesText ? String(servesText) : null,
      isHighlight: Boolean(isHighlight),
      categoryId: categoryId || null,
      category: resolvedCategoryName,
      imageUrl: imageUrl || null,
      stock: parsedStock !== null && !isNaN(parsedStock) ? Math.max(0, parsedStock) : null,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      cardBadgeId: cardBadgeId || null,
      isCombo: Boolean(isCombo),
      showScarcity: Boolean(showScarcity),
      scarcityType: (scarcityType as string) || "strategic",
      scarcityUnits: scarcityUnits !== undefined && scarcityUnits !== null && scarcityUnits !== "" ? Number(scarcityUnits) : null,
      scarcityInitial: scarcityInitial !== undefined && scarcityInitial !== null && scarcityInitial !== "" ? Number(scarcityInitial) : (scarcityUnits ? Number(scarcityUnits) : null),
      scarcitySold: Number(scarcitySold || 0),
      showProgressBar: Boolean(showProgressBar),
      showDuration: Boolean(showDuration),
      urgencyType: (urgencyType as string) || "date",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      sessionMinutes: sessionMinutes !== undefined && sessionMinutes !== null && sessionMinutes !== "" ? Number(sessionMinutes) : null,
      comboItems: (isCombo && Array.isArray(comboItems)) ? {
        create: comboItems.map((ci: any) => ({
          productId: ci.productId,
          quantity: ci.quantity || 1,
        })),
      } : undefined,
      addonGroups: (Array.isArray(addonGroupIds) && addonGroupIds.length > 0) ? {
        create: (await resolveOrderedAddonGroupIds(addonGroupIds)).map((groupId: string, index: number) => ({
          groupId,
          sortOrder: index,
        })),
      } : undefined,
    };

    const product = await prisma.product.create({
      data: productData,
      include: productInclude,
    });

    return apiSuccess(formatProduct(product), 201);
  } catch (error: unknown) {
    return handleApiError(error, "API:products:POST", "Não foi possível cadastrar o produto.");
  }
}
