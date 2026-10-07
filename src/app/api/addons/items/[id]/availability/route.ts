import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addonCrudLimiter, getIpFromRequest } from "@/lib/rateLimit";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = addonCrudLimiter.check(ip);
    if (!limitCheck.success) {
      return NextResponse.json({ error: "Muitas requisições. Aguarde um instante." }, { status: 429 });
    }

    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage") && !hasPermission(user, "STOCK_CONTROL")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para alterar disponibilidade necessária." }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.addonItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }

    let isAvailable = !existing.isAvailable; // toggle padrão se não enviado
    try {
      const body = await request.json();
      if (body && typeof body.isAvailable === "boolean") {
        isAvailable = body.isAvailable;
      }
    } catch {
      // mantém toggle automático
    }

    const updated = await prisma.addonItem.update({
      where: { id },
      data: { isAvailable },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      name: updated.name,
      isAvailable: updated.isAvailable,
      message: updated.isAvailable
        ? `"${updated.name}" agora está ATIVO no cardápio.`
        : `"${updated.name}" foi PAUSADO na cozinha.`,
    });
  } catch (error: unknown) {
    console.error("Erro ao alternar disponibilidade do complemento:", error);
    return NextResponse.json({ error: "Erro ao alternar disponibilidade do complemento." }, { status: 500 });
  }
}
