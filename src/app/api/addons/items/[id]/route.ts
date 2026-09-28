import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addonCrudLimiter, getIpFromRequest } from "@/lib/rateLimit";
import { deleteAddonImageFile } from "@/lib/addonStorage";

export async function PUT(
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
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const existing = await prisma.addonItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }

    const { name, price, imageUrl, isAvailable, sortOrder } = body || {};

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (price !== undefined) dataToUpdate.price = Math.max(0, parseFloat(String(price)) || 0);
    if (isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(isAvailable);
    if (sortOrder !== undefined) dataToUpdate.sortOrder = parseInt(String(sortOrder), 10) || 0;

    if (imageUrl !== undefined) {
      const cleanImg = imageUrl ? String(imageUrl).trim() : null;
      // Se a imagem mudou, exclui o arquivo anterior
      if (existing.imageUrl && existing.imageUrl !== cleanImg) {
        await deleteAddonImageFile(existing.imageUrl);
      }
      dataToUpdate.imageUrl = cleanImg;
    }

    const updated = await prisma.addonItem.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      ...updated,
      price: Number(updated.price),
    });
  } catch (error: any) {
    console.error("Erro ao atualizar item de complemento:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar item de complemento." }, { status: 500 });
  }
}

export async function DELETE(
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
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.addonItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }

    // Exclui a imagem física associada
    if (existing.imageUrl) {
      await deleteAddonImageFile(existing.imageUrl);
    }

    await prisma.addonItem.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Item de complemento removido com sucesso." });
  } catch (error: any) {
    console.error("Erro ao excluir item de complemento:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir item de complemento." }, { status: 500 });
  }
}
