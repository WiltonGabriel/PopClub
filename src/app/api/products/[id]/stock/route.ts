import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { reconcileProductEditImpacts } from "@/services/productDependencyService";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "STOCK_CONTROL") && !hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão de controle de estoque necessária." }, { status: 403 });
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { stock, isAvailable } = body || {};

    const dataToUpdate: any = {};

    if (stock !== undefined) {
      if (stock === null || stock === "" || stock === "infinite") {
        dataToUpdate.stock = null;
      } else {
        const parsed = parseInt(String(stock), 10);
        dataToUpdate.stock = isNaN(parsed) ? null : Math.max(0, parsed);
      }
    }

    if (isAvailable !== undefined) {
      dataToUpdate.isAvailable = Boolean(isAvailable);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar informado." }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        isCombo: true,
        isAvailable: true,
        stock: true,
        deletedAt: true,
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: {
        categoryRel: { select: { name: true } },
      },
    });

    const impactSummary = await reconcileProductEditImpacts({
      productId: id,
      previousProduct: {
        id: existing.id,
        name: existing.name,
        price: existing.price,
        isCombo: Boolean(existing.isCombo),
        isAvailable: Boolean(existing.isAvailable),
        stock: existing.stock ?? null,
      },
      updatedProduct: {
        id: updated.id,
        name: updated.name,
        price: updated.price,
        isCombo: Boolean(updated.isCombo),
        isAvailable: Boolean(updated.isAvailable),
        stock: updated.stock ?? null,
      },
      actor: user ? { id: user.id, role: user.role } : null,
    });

    return NextResponse.json(
      {
        id: updated.id,
        name: updated.name,
        description: updated.description || "",
        price: Number(updated.price),
        categoryId: updated.categoryId,
        category: updated.categoryRel?.name || updated.category || "Outros",
        imageUrl: updated.imageUrl || "",
        stock: updated.stock,
        isAvailable: updated.isAvailable,
        impactWarnings: impactSummary.warnings,
        impactSummary,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("Erro ao atualizar estoque do produto:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar estoque do produto." }, { status: 500 });
  }
}
