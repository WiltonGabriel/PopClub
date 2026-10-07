import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
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

async function updateCategoryHandler(
  request: Request,
  params: Promise<{ id: string }>
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão de cardápio necessária." }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
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
    } = body;

    const dataToUpdate: Prisma.CategoryUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Nome da categoria inválido." }, { status: 400 });
      }
      const trimmedName = name.trim();
      dataToUpdate.name = trimmedName;

      let finalSlug =
        typeof slug === "string" && slug.trim()
          ? slugify(slug.trim())
          : slugify(trimmedName);

      // Checa unicidade excluindo a própria categoria
      const existingSlug = await prisma.category.findFirst({
        where: {
          slug: finalSlug,
          NOT: { id },
        },
      });
      if (existingSlug) {
        finalSlug = `${finalSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      dataToUpdate.slug = finalSlug;
    } else if (slug !== undefined && typeof slug === "string" && slug.trim()) {
      dataToUpdate.slug = slugify(slug.trim());
    }

    if (description !== undefined) {
      dataToUpdate.description =
        typeof description === "string" ? description.trim().slice(0, 100) || null : null;
    }

    if (order !== undefined || order_index !== undefined) {
      dataToUpdate.order = Number(order ?? order_index ?? 0);
    }
    if (isDynamic !== undefined) {
      dataToUpdate.isDynamic = Boolean(isDynamic);
    }
    if (dynamicType !== undefined) {
      dataToUpdate.dynamicType = typeof dynamicType === "string" ? dynamicType : null;
    }
    if (imageUrl !== undefined) {
      dataToUpdate.imageUrl = typeof imageUrl === "string" ? imageUrl : null;
    }
    if (timeStart !== undefined) {
      dataToUpdate.timeStart = typeof timeStart === "string" ? timeStart : null;
    }
    if (timeEnd !== undefined) {
      dataToUpdate.timeEnd = typeof timeEnd === "string" ? timeEnd : null;
    }
    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Erro ao atualizar categoria:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar categoria." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateCategoryHandler(request, params);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateCategoryHandler(request, params);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão de cardápio necessária." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao deletar categoria:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir categoria." }, { status: 500 });
  }
}
