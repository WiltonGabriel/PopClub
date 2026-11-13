import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isValidSafeAssetUrl } from "@/lib/urlValidation";
import { adminOperationsLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { recordAdminAudit } from "@/services/auditLogService";

const updateAvatarSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  imageUrl: z
    .string()
    .trim()
    .min(1)
    .refine((val) => isValidSafeAssetUrl(val, false), {
      message: "URL da imagem do avatar inválida ou insegura.",
    })
    .optional(),
  category: z.string().trim().max(60).nullable().optional(),
  isActive: z.boolean().optional(),
  order: z.coerce.number().int().min(0).max(999).optional(),
  minMonths: z.coerce.number().int().min(0).max(1200).optional(),
  minOrders: z.coerce.number().int().min(0).max(100000).optional(),
});

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
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "loyalty_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão loyalty_manage necessária." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.avatarPreset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Avatar não encontrado." }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const parsed = updateAvatarSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do avatar inválidos." },
        { status: 400 }
      );
    }

    const { name, description, imageUrl, category, isActive, order, minMonths, minOrders } = parsed.data;

    const updated = await prisma.avatarPreset.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(category !== undefined && { category: category || null }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
        ...(minMonths !== undefined && { minMonths }),
        ...(minOrders !== undefined && { minOrders }),
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "UPDATE_AVATAR_PRESET",
      resourceType: "avatar_preset",
      resourceId: updated.id,
      summary: `Atualizou avatar oficial "${updated.name}".`,
      diffKeys: Object.keys(parsed.data),
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
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
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "loyalty_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão loyalty_manage necessária." },
        { status: 403 }
      );
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

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "DELETE_AVATAR_PRESET",
      resourceType: "avatar_preset",
      resourceId: id,
      summary: `Removeu avatar oficial "${existing.name}".`,
    });

    return NextResponse.json({ success: true, message: "Avatar removido com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao deletar avatar:", error);
    return NextResponse.json({ error: "Erro ao deletar avatar." }, { status: 500 });
  }
}
