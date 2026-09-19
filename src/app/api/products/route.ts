import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        categoryRel: {
          select: { name: true },
        },
        cardBadge: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      categoryId: p.categoryId,
      category: p.categoryRel?.name || p.category || "Outros",
      imageUrl: p.imageUrl || "",
      stock: p.stock,
      isAvailable: p.isAvailable,
      cardBadgeId: p.cardBadgeId,
      cardBadge: p.cardBadge,
    }));

    return apiSuccess(formatted);
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400, "BAD_REQUEST");
    }
    const { name, description, price, categoryId, category, imageUrl, stock, isAvailable, cardBadgeId } = body || {};

    if (!name || price === undefined) {
      return apiError("Nome e preço do produto são obrigatórios.", 400, "VALIDATION_ERROR");
    }

    const parsedStock = stock !== undefined && stock !== null && stock !== "" ? Number(stock) : null;

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: Number(price),
        categoryId: categoryId || null,
        category: category || null,
        imageUrl: imageUrl || null,
        stock: parsedStock !== null && !isNaN(parsedStock) ? Math.max(0, parsedStock) : null,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        cardBadgeId: cardBadgeId || null,
      },
      include: {
        categoryRel: { select: { name: true } },
        cardBadge: true,
      },
    });

    return apiSuccess({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      categoryId: product.categoryId,
      category: product.categoryRel?.name || product.category || "Outros",
      imageUrl: product.imageUrl || "",
      stock: product.stock,
      isAvailable: product.isAvailable,
      cardBadgeId: product.cardBadgeId,
      cardBadge: product.cardBadge,
    }, 201);
  } catch (error: unknown) {
    return handleApiError(error, "API:products:POST", "Não foi possível cadastrar o produto.");
  }
}
