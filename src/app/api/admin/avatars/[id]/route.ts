import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { adminOperationsLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = adminOperationsLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas requisições. Aguarde um momento.");
    }

    const user = await getAuthUser(request);
    if (!hasPermission(user, "theme_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar identidade visual necessária." }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.avatarPreset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Avatar não encontrado." }, { status: 404 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { name, description, imageUrl, category, isActive, order, minMonths, minOrders } = body;

    const updated = await prisma.avatarPreset.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(description !== undefined && { description: String(description).trim() }),
        ...(imageUrl !== undefined && { imageUrl: String(imageUrl).trim() }),
        ...(category !== undefined && { category: category ? String(category).trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(order !== undefined && { order: Number(order) }),
        ...(minMonths !== undefined && { minMonths: Math.max(0, parseInt(String(minMonths), 10) || 0) }),
        ...(minOrders !== undefined && { minOrders: Math.max(0, parseInt(String(minOrders), 10) || 0) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar avatar:", error);
    return NextResponse.json({ error: "Erro ao atualizar avatar." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = adminOperationsLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas requisições. Aguarde um momento.");
    }

    const user = await getAuthUser(request);
    if (!hasPermission(user, "theme_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar identidade visual necessária." }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.avatarPreset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Avatar não encontrado." }, { status: 404 });
    }

    await prisma.avatarPreset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Avatar removido com sucesso." });
  } catch (error: any) {
    console.error("Erro ao deletar avatar:", error);
    return NextResponse.json({ error: "Erro ao deletar avatar." }, { status: 500 });
  }
}
