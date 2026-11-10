import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { calculateAccountAgeMonths } from "@/services/loyaltyBadgeService";
import { avatarLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";

const DEFAULT_AVATARS = [
  { id: "preset_1", name: "Sundae Amora", description: "Clássico sundae com calda de amora", imageUrl: "/avatars/avatar-sorvete.svg", category: "Sobremesas", order: 1, minMonths: 0, minOrders: 0 },
  { id: "preset_2", name: "Tigela de Açaí", description: "Açaí cremoso com banana e morango", imageUrl: "/avatars/avatar-acai.svg", category: "Açaí", order: 2, minMonths: 0, minOrders: 0 },
  { id: "preset_3", name: "Milk Shake", description: "Milk shake cremoso refrescante", imageUrl: "/avatars/avatar-shake.svg", category: "Bebidas", order: 3, minMonths: 0, minOrders: 0 },
  { id: "preset_4", name: "Picolé Frutas", description: "Picolé artesanal de frutas tropicais", imageUrl: "/avatars/avatar-picole.svg", category: "Picolés", order: 4, minMonths: 0, minOrders: 0 },
  { id: "preset_5", name: "Morango Pop", description: "Morango doce e selecionado", imageUrl: "/avatars/avatar-morango.svg", category: "Frutas", order: 5, minMonths: 0, minOrders: 0 },
  { id: "preset_6", name: "Banana Split", description: "Banana ouro com toque especial", imageUrl: "/avatars/avatar-banana.svg", category: "Frutas", order: 6, minMonths: 1, minOrders: 3 },
  { id: "preset_7", name: "Cookie Choco", description: "Cookie crocante com gotas de chocolate", imageUrl: "/avatars/avatar-cookie.svg", category: "Gourmet", order: 7, minMonths: 2, minOrders: 5 },
  { id: "preset_8", name: "Cereja Pop", description: "Toque final irresistível", imageUrl: "/avatars/avatar-cereja.svg", category: "Frutas", order: 8, minMonths: 3, minOrders: 10 },
  { id: "preset_9", name: "Casquinha Dupla", description: "Casquinha crocante com dois sabores", imageUrl: "/avatars/avatar-casquinha.svg", category: "Sorvetes", order: 9, minMonths: 6, minOrders: 15 },
  { id: "preset_10", name: "Mestre Gelateiro", description: "Toque profissional de confeitaria", imageUrl: "/avatars/avatar-chef.svg", category: "Especiais", order: 10, minMonths: 12, minOrders: 25 },
];

export async function GET(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = avatarLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas consultas de avatares. Por favor, aguarde.");
    }

    const authUser = await getAuthUser(request);
    let userMonths = 0;
    let completedOrders = 0;

    if (authUser?.id) {
      const [dbUser, ordersCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: authUser.id },
          select: { createdAt: true },
        }),
        prisma.order.count({
          where: { userId: authUser.id, status: "completed" },
        }),
      ]);

      if (dbUser?.createdAt) {
        userMonths = calculateAccountAgeMonths(dbUser.createdAt);
      }
      completedOrders = ordersCount;
    }

    let avatars = await prisma.avatarPreset.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Auto-seed defensivo caso a tabela esteja limpa
    if (avatars.length === 0) {
      for (const av of DEFAULT_AVATARS) {
        await prisma.avatarPreset.upsert({
          where: { id: av.id },
          update: {
            name: av.name,
            description: av.description,
            imageUrl: av.imageUrl,
            category: av.category,
            order: av.order,
            minMonths: av.minMonths,
            minOrders: av.minOrders,
            isActive: true,
          },
          create: {
            id: av.id,
            name: av.name,
            description: av.description,
            imageUrl: av.imageUrl,
            category: av.category,
            order: av.order,
            minMonths: av.minMonths,
            minOrders: av.minOrders,
            isActive: true,
          },
        });
      }

      avatars = await prisma.avatarPreset.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
    }

    const enrichedAvatars = avatars.map((av) => {
      const minMonths = av.minMonths ?? 0;
      const minOrders = av.minOrders ?? 0;

      const isFreeTier = minMonths === 0 && minOrders === 0;
      let isUnlocked = isFreeTier;

      if (authUser?.id) {
        if (minMonths > 0 && minOrders > 0) {
          isUnlocked = userMonths >= minMonths || completedOrders >= minOrders;
        } else if (minMonths > 0) {
          isUnlocked = userMonths >= minMonths;
        } else if (minOrders > 0) {
          isUnlocked = completedOrders >= minOrders;
        } else {
          isUnlocked = true;
        }
      }

      return {
        ...av,
        minMonths,
        minOrders,
        isUnlocked,
      };
    });

    return NextResponse.json(enrichedAvatars);
  } catch (error: any) {
    console.error("Erro ao buscar avatares oficiais:", error);
    // Em caso de falha transitória de banco, retorna a lista padrão estática com status 200
    return NextResponse.json(
      DEFAULT_AVATARS.map((av) => ({
        ...av,
        isUnlocked: av.minMonths === 0 && av.minOrders === 0,
      }))
    );
  }
}
