import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addonCrudLimiter, getIpFromRequest } from "@/lib/rateLimit";
import { hasPermission } from "@/lib/permissions";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const groups = await prisma.addonGroup.findMany({
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const formatted = AddonOrganizationService.sortAddonGroups(groups).map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      minQuantity: g.minQuantity,
      maxQuantity: g.maxQuantity,
      freeQuantity: g.freeQuantity,
      isRequired: g.isRequired,
      allowItemQuantity: g.allowItemQuantity,
      sortOrder: g.sortOrder,
      isActive: g.isActive,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      productsCount: g._count.products,
      items: g.items.map((i) => ({
        id: i.id,
        groupId: i.groupId,
        name: i.name,
        price: Number(i.price),
        imageUrl: i.imageUrl,
        isAvailable: i.isAvailable,
        sortOrder: i.sortOrder,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Erro ao listar grupos de complementos:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os grupos de complementos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = addonCrudLimiter.check(ip);
    if (!limitCheck.success) {
      return NextResponse.json({ error: "Muitas requisições. Aguarde um instante." }, { status: 429 });
    }

    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar complementos necessária." }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { name, description, minQuantity, maxQuantity, freeQuantity, isRequired, allowItemQuantity, sortOrder, isActive } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "O nome do grupo de complementos é obrigatório." }, { status: 400 });
    }

    const minQ = Math.max(0, parseInt(String(minQuantity ?? 0), 10) || 0);
    const maxQ = Math.max(1, parseInt(String(maxQuantity ?? 1), 10) || 1);
    const freeQ = Math.max(0, parseInt(String(freeQuantity ?? 0), 10) || 0);
    const required = isRequired !== undefined ? Boolean(isRequired) : minQ >= 1;

    const defaultSortOrder = AddonOrganizationService.isCutleryGroupName(name) ? 99 : 0;
    const resolvedSortOrder =
      sortOrder !== undefined && sortOrder !== null && String(sortOrder).trim() !== ""
        ? parseInt(String(sortOrder), 10) || defaultSortOrder
        : defaultSortOrder;

    const group = await prisma.addonGroup.create({
      data: {
        name: name.trim(),
        description: description ? String(description).trim() : null,
        minQuantity: minQ,
        maxQuantity: Math.max(minQ, maxQ),
        freeQuantity: freeQ,
        isRequired: required,
        allowItemQuantity: Boolean(allowItemQuantity),
        sortOrder: resolvedSortOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        items: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(
      {
        ...group,
        productsCount: group._count.products,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Erro ao criar grupo de complementos:", error);
    return NextResponse.json({ error: "Erro ao criar grupo de complementos." }, { status: 500 });
  }
}
