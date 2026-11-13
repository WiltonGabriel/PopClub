import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isValidSafeAssetUrl } from "@/lib/urlValidation";
import { adminOperationsLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { recordAdminAudit } from "@/services/auditLogService";

const createAvatarSchema = z.object({
  name: z.string().trim().min(1, "O nome do avatar é obrigatório.").max(100, "O nome do avatar não pode exceder 100 caracteres."),
  description: z.string().trim().min(1, "A descrição do avatar é obrigatória.").max(300),
  imageUrl: z
    .string()
    .trim()
    .min(1, "A imagem/SVG do avatar é obrigatória.")
    .refine((val) => isValidSafeAssetUrl(val, false), {
      message: "URL da imagem do avatar inválida ou insegura.",
    }),
  category: z.string().trim().max(60).optional().default("Oficial"),
  isActive: z.boolean().optional().default(true),
  order: z.coerce.number().int().min(0).max(999).optional().default(0),
  minMonths: z.coerce.number().int().min(0).max(1200).optional().default(0),
  minOrders: z.coerce.number().int().min(0).max(100000).optional().default(0),
});

export async function GET(request: Request) {
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

    const avatars = await prisma.avatarPreset.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json(avatars);
  } catch (error: unknown) {
    console.error("Erro ao listar avatares no admin:", error);
    return NextResponse.json({ error: "Erro ao listar avatares." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const countAvatars = await prisma.avatarPreset.count();
    if (countAvatars >= 30) {
      return NextResponse.json({ error: "Limite máximo de 30 presets de avatar atingido." }, { status: 400 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const parsed = createAvatarSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do avatar inválidos." },
        { status: 400 }
      );
    }

    const { name, description, imageUrl, category, isActive, order, minMonths, minOrders } = parsed.data;

    const newAvatar = await prisma.avatarPreset.create({
      data: {
        name,
        description,
        imageUrl,
        category: category || "Oficial",
        isActive,
        order,
        minMonths,
        minOrders,
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "CREATE_AVATAR_PRESET",
      resourceType: "avatar_preset",
      resourceId: newAvatar.id,
      summary: `Cadastrou avatar oficial "${newAvatar.name}".`,
      diffKeys: ["name", "category", "isActive", "minMonths", "minOrders"],
    });

    return NextResponse.json(newAvatar, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao cadastrar avatar:", error);
    return NextResponse.json({ error: "Erro ao cadastrar avatar." }, { status: 500 });
  }
}
