import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxUses,
      expiresAt,
      isActive,
      productIds,
    } = body || {};

    const cleanCode = code ? code.trim().toUpperCase() : undefined;

    // Se mudou o código, verifica unicidade
    if (cleanCode) {
      const existing = await prisma.coupon.findFirst({
        where: {
          code: cleanCode,
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: `O cupom '${cleanCode}' já está cadastrado em outro registro.` }, { status: 400 });
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(cleanCode && { code: cleanCode }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(minOrderValue !== undefined && { minOrderValue: Number(minOrderValue) }),
        ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(String(maxUses), 10) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(productIds !== undefined && { productIds: Array.isArray(productIds) ? productIds : [] }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      discountType: updated.discountType,
      discountValue: Number(updated.discountValue),
      minOrderValue: Number(updated.minOrderValue),
      maxUses: updated.maxUses,
      uses: updated.uses,
      expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
      isActive: updated.isActive,
      productIds: updated.productIds,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Erro ao atualizar cupom:", error);
    return NextResponse.json({ error: "Erro ao atualizar cupom." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { isActive } = body;
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Campo 'isActive' booleano é obrigatório." }, { status: 400 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      isActive: updated.isActive,
    });
  } catch (error: any) {
    console.error("Erro ao alternar status do cupom:", error);
    return NextResponse.json({ error: "Erro ao alternar status do cupom." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir cupom:", error);
    return NextResponse.json({ error: "Erro ao remover cupom." }, { status: 500 });
  }
}
