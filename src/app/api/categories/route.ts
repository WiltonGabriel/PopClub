import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const whereClause: any = includeInactive ? {} : { isActive: true };
    const orderByClause: any = [{ order: "asc" }, { name: "asc" }];

    const categories = await (prisma.category as any).findMany({
      where: whereClause,
      orderBy: orderByClause,
    });
    return apiSuccess(categories);
  } catch (error: unknown) {
    return handleApiError(error, "API:categories:GET", "Não foi possível carregar as categorias.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "admin") {
      return apiError("Acesso negado. Apenas administradores podem gerenciar categorias.", 403, "FORBIDDEN");
    }

    const countCategories = await prisma.category.count();
    if (countCategories >= 30) {
      return apiError("Limite máximo de 30 categorias atingido.", 400, "QUOTA_EXCEEDED");
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400, "BAD_REQUEST");
    }

    const { name, slug, order, order_index, isDynamic, dynamicType, isActive } = body || {};
    if (!name) {
      return apiError("O nome da categoria é obrigatório.", 400, "MISSING_NAME");
    }
    if (typeof name === "string" && name.length > 100) {
      return apiError("O nome da categoria não pode exceder 100 caracteres.", 400, "VALIDATION_ERROR");
    }

    const autoSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const categoryData: any = {
      name,
      slug: autoSlug,
      order: Number(order ?? order_index ?? 0),
      isDynamic: Boolean(isDynamic),
      dynamicType: dynamicType || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    };

    const category = await (prisma.category as any).create({
      data: categoryData,
    });

    return apiSuccess(category, 201);
  } catch (error: unknown) {
    return handleApiError(error, "API:categories:POST", "Não foi possível criar a categoria.");
  }
}
