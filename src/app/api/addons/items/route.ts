import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addonCrudLimiter, getIpFromRequest } from "@/lib/rateLimit";
import { hasPermission } from "@/lib/permissions";

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

    const { groupId, catalogKey, name, price, imageUrl, isAvailable, sortOrder } = body || {};

    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json({ error: "ID do grupo é obrigatório." }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "O nome do adicional é obrigatório." }, { status: 400 });
    }

    const group = await prisma.addonGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Grupo de complementos não encontrado." }, { status: 404 });
    }

    const parsedPrice = Math.max(0, parseFloat(String(price ?? 0)) || 0);
    const normalizedCatalogKey =
      typeof catalogKey === "string" && catalogKey.trim()
        ? catalogKey.trim().slice(0, 120)
        : null;

    const item = await prisma.addonItem.create({
      data: {
        groupId,
        catalogKey: normalizedCatalogKey,
        name: name.trim(),
        price: parsedPrice,
        imageUrl: typeof imageUrl === "string" ? imageUrl.trim() : null,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        sortOrder: parseInt(String(sortOrder ?? 0), 10) || 0,
      },
    });

    return NextResponse.json(
      {
        ...item,
        price: Number(item.price),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Erro ao adicionar item de complemento:", error);
    return NextResponse.json({ error: "Erro ao adicionar item de complemento." }, { status: 500 });
  }
}
