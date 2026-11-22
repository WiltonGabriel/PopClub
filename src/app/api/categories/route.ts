import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiError, apiSuccess } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";

function slugify(text: string): string {
  const base = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || `cat-${Date.now().toString(36)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const whereClause = includeInactive ? {} : { isActive: true };
    const orderByClause = [{ order: "asc" as const }, { createdAt: "asc" as const }];

    const categories = await prisma.category.findMany({
      where: whereClause,
      orderBy: orderByClause,
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    return apiSuccess(categories);
  } catch (error: unknown) {
    return handleApiError(error, "API:categories:GET", "Não foi possível carregar as categorias.");
  }
}

interface CreateCategoryBody {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  order?: unknown;
  order_index?: unknown;
  isDynamic?: unknown;
  dynamicType?: unknown;
  imageUrl?: unknown;
  timeStart?: unknown;
  timeEnd?: unknown;
  isActive?: unknown;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return apiError("Acesso negado. Permissão para gerenciar cardápio/categorias necessária.", 403, "FORBIDDEN");
    }

    const countCategories = await prisma.category.count();
    if (countCategories >= 50) {
      return apiError("Limite máximo de 50 categorias atingido.", 400, "QUOTA_EXCEEDED");
    }

    let body: CreateCategoryBody | null = null;
    try {
      body = (await request.json()) as CreateCategoryBody;
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400, "BAD_REQUEST");
    }

    const {
      name,
      slug,
      description,
      order,
      order_index,
      isDynamic,
      dynamicType,
      imageUrl,
      timeStart,
      timeEnd,
      isActive,
    } = body || {};

    if (!name || typeof name !== "string") {
      return apiError("O nome da categoria é obrigatório.", 400, "MISSING_NAME");
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return apiError("O nome da categoria é obrigatório.", 400, "MISSING_NAME");
    }
    if (trimmedName.length > 100) {
      return apiError("O nome da categoria não pode exceder 100 caracteres.", 400, "VALIDATION_ERROR");
    }

    let trimmedDesc: string | null = null;
    if (description && typeof description === "string") {
      trimmedDesc = description.trim().slice(0, 100) || null;
    }

    let finalSlug =
      typeof slug === "string" && slug.trim()
        ? slugify(slug.trim())
        : slugify(trimmedName);

    // Garante unicidade do slug se já existir
    const existingSlug = await prisma.category.findUnique({
      where: { slug: finalSlug },
    });
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        slug: finalSlug,
        description: trimmedDesc,
        order: Number(order ?? order_index ?? 0),
        isDynamic: Boolean(isDynamic),
        dynamicType: typeof dynamicType === "string" ? dynamicType : null,
        imageUrl: typeof imageUrl === "string" ? imageUrl : null,
        timeStart: typeof timeStart === "string" ? timeStart : null,
        timeEnd: typeof timeEnd === "string" ? timeEnd : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    return apiSuccess(category, 201);
  } catch (error: unknown) {
    return handleApiError(error, "API:categories:POST", "Não foi possível criar a categoria.");
  }
}
