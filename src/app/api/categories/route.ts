import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400, "BAD_REQUEST");
    }

    const { name, slug } = body || {};
    if (!name) {
      return apiError("O nome da categoria é obrigatório.", 400, "MISSING_NAME");
    }

    const autoSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const category = await prisma.category.create({
      data: {
        name,
        slug: autoSlug,
      },
    });

    return apiSuccess(category, 201);
  } catch (error: unknown) {
    return handleApiError(error, "API:categories:POST", "Não foi possível criar a categoria.");
  }
}
