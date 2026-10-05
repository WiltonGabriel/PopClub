import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiError, apiSuccess } from "@/lib/apiResponse";
import { sanitizeText } from "@/lib/sanitize";

const productInclude = {
  categoryRel: {
    select: { name: true },
  },
  cardBadge: true,
  comboItems: {
    include: {
      product: true,
    },
  },
  addonGroups: {
    include: {
      group: {
        include: {
          items: {
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
};

function formatProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    promotionalPrice: p.promotionalPrice ? Number(p.promotionalPrice) : null,
    startsAt: p.startsAt ? (p.startsAt instanceof Date ? p.startsAt.toISOString() : p.startsAt) : null,
    endsAt: p.endsAt ? (p.endsAt instanceof Date ? p.endsAt.toISOString() : p.endsAt) : null,
    isPromoActive: p.isPromoActive ?? true,
    servesText: p.servesText || null,
    isHighlight: Boolean(p.isHighlight),
    categoryId: p.categoryId,
    category: p.categoryRel?.name || p.category || "Outros",
    imageUrl: p.imageUrl || "",
    stock: p.stock,
    isAvailable: p.isAvailable,
    cardBadgeId: p.cardBadgeId,
    cardBadge: p.cardBadge,
    isCombo: p.isCombo,
    comboItems: p.comboItems?.map((ci: any) => ({
      id: ci.id,
      productId: ci.productId,
      quantity: ci.quantity,
      product: ci.product ? {
        id: ci.product.id,
        name: ci.product.name,
        price: Number(ci.product.price),
        imageUrl: ci.product.imageUrl || "",
      } : undefined,
    })) || [],
    addonGroupIds: p.addonGroups?.map((ag: any) => ag.groupId) || [],
    addonGroups: p.addonGroups?.map((ag: any) => ag.group) || [],
  };
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
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
    if (user?.role !== "admin") {
      return apiError("Acesso negado. Apenas administradores podem cadastrar produtos.", 403, "FORBIDDEN");
    }

    const countProducts = await prisma.product.count({ where: { isAvailable: true } });
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
      originalPrice,
      promotionalPrice,
      startsAt,
      endsAt,
      isPromoActive,
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
    } = (body || {}) as {
      name?: string;
      description?: string;
      price?: number | string;
      originalPrice?: number | string | null;
      promotionalPrice?: number | string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      isPromoActive?: boolean;
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
    const parsedOriginalPrice = originalPrice !== undefined && originalPrice !== null && originalPrice !== "" ? Number(originalPrice) : null;
    const parsedPromotionalPrice = promotionalPrice !== undefined && promotionalPrice !== null && promotionalPrice !== "" ? Number(promotionalPrice) : null;

    const productData: any = {
      name: cleanName,
      description: cleanDescription,
      price: parsedPrice,
      originalPrice: parsedOriginalPrice,
      promotionalPrice: parsedPromotionalPrice,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      isPromoActive: isPromoActive !== undefined ? Boolean(isPromoActive) : true,
      servesText: servesText ? String(servesText) : null,
      isHighlight: Boolean(isHighlight),
      categoryId: categoryId || null,
      category: cleanCategory,
      imageUrl: imageUrl || null,
      stock: parsedStock !== null && !isNaN(parsedStock) ? Math.max(0, parsedStock) : null,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      cardBadgeId: cardBadgeId || null,
      isCombo: isCombo ? true : false,
      comboItems: (isCombo && Array.isArray(comboItems)) ? {
        create: comboItems.map((ci: any) => ({
          productId: ci.productId,
          quantity: ci.quantity || 1,
        })),
      } : undefined,
      addonGroups: (Array.isArray(addonGroupIds) && addonGroupIds.length > 0) ? {
        create: addonGroupIds.map((groupId: string, index: number) => ({
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
