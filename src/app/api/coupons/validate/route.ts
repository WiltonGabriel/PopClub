import { NextResponse } from "next/server";
import { prisma, DBCoupon } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import {
  couponLimiter,
  couponFailedAttemptsLimiter,
  getIpFromRequest,
  createRateLimitResponse,
} from "@/lib/rateLimit";
import { calculateAccountAgeMonths } from "@/services/loyaltyBadgeService";
import { resolveCouponLoyaltyContext } from "@/services/couponLoyaltyService";
import { CouponDomainService } from "@/domain/services/CouponDomainService";
import { InvalidCouponException } from "@/domain/errors";

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);

    // 1. Verificação se o IP já está bloqueado por tentativas consecutivas inválidas (Anti Brute-Force)
    const failedKey = `failed_coupon:${ip}`;
    const blockedCheck = couponFailedAttemptsLimiter.isBlocked(failedKey);
    if (blockedCheck) {
      return createRateLimitResponse(
        blockedCheck,
        "Você testou alguns cupons seguidos. Respire fundo e aguarde 2 minutinhos para tentar outro código."
      );
    }

    // 2. Verificação de teto geral de requisições
    const limitCheck = couponLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Você testou alguns cupons seguidos. Respire fundo e aguarde alguns instantes para tentar outro código."
      );
    }

    interface ValidateCouponBody {
      code?: string;
      subtotal?: number | string;
      userId?: string;
      phone?: string;
      customerPhone?: string;
      productIds?: string[];
    }

    let body: ValidateCouponBody = {};
    try {
      body = (await request.json()) as ValidateCouponBody;
    } catch {
      return NextResponse.json({ valid: false, message: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { code, subtotal } = body || {};

    if (!code) {
      return NextResponse.json({ valid: false, message: "Código do cupom é obrigatório." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon: DBCoupon | null = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    const authUser = await getAuthUser(request);
    const isRegisteredUser = Boolean(authUser?.isRegistered);

    let userMonths = 0;
    let completedOrdersCount = 0;
    let requiredBadgeName = "VIP";
    let requiredBadgeLevel: number | undefined;
    let userBadgeLevel: number | undefined;
    let userBadgeId: string | undefined;

    const effectiveUserId = authUser?.id || (typeof body.userId === "string" ? body.userId : undefined);
    if (effectiveUserId) {
      const [dbUser, ordersCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: effectiveUserId },
          select: { createdAt: true, isRegistered: true },
        }),
        prisma.order.count({
          where: { userId: effectiveUserId, status: "completed" },
        }),
      ]);

      if (dbUser?.createdAt) {
        userMonths = calculateAccountAgeMonths(dbUser.createdAt);
      }
      completedOrdersCount = ordersCount;
    }

    if (coupon?.minLoyaltyLevel || coupon?.loyaltyBadgeId) {
      const loyaltyCtx = await resolveCouponLoyaltyContext(coupon, {
        userMonths,
        completedOrdersCount,
      });
      requiredBadgeName = loyaltyCtx.requiredBadgeName;
      requiredBadgeLevel = loyaltyCtx.requiredBadgeLevel;
      userBadgeLevel = loyaltyCtx.userBadge.level;
      userBadgeId = loyaltyCtx.userBadge.id;
    }

    // Identificação de uso prévio caso seja oncePerUser
    let hasPriorUsage = false;
    if (coupon?.oncePerUser) {
      const targetUserId = authUser?.id || (typeof body.userId === "string" ? body.userId : undefined);
      const targetPhone =
        (typeof body.phone === "string" ? body.phone : undefined) ||
        (typeof body.customerPhone === "string" ? body.customerPhone : undefined) ||
        authUser?.phone;

      const conditions: Prisma.OrderWhereInput[] = [];
      if (targetUserId) conditions.push({ userId: targetUserId });
      if (targetPhone) conditions.push({ user: { phone: targetPhone } });

      if (conditions.length > 0) {
        const priorOrder = await prisma.order.findFirst({
          where: {
            couponId: coupon.id,
            status: { not: "cancelled" },
            OR: conditions,
          },
        });
        if (priorOrder) {
          hasPriorUsage = true;
        }
      }
    }

    const numSubtotal = Number(subtotal || 0);
    const cartProductIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];

    // Delegação da validação ao Domain Service
    CouponDomainService.validateEligibility({
      coupon,
      subtotal: numSubtotal,
      isRegisteredUser,
      userMonths,
      completedOrdersCount,
      userBadgeLevel,
      userBadgeId,
      requiredBadgeName,
      requiredBadgeLevel,
      hasPriorUsage,
      cartProductIds,
    });

    const discountAmount = CouponDomainService.calculateDiscount(coupon!, numSubtotal);

    // Em caso de validação bem-sucedida, reseta o contador de falhas para tolerar erros pontuais futuros
    couponFailedAttemptsLimiter.reset(failedKey);

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon!.id,
        code: coupon!.code,
        discountType: coupon!.discountType,
        discountValue: Number(coupon!.discountValue),
        discountAmount,
        productIds: coupon!.productIds || [],
      },
    });
  } catch (error: unknown) {
    if (error instanceof InvalidCouponException) {
      // Registra a tentativa inválida
      const reqIp = getIpFromRequest(request);
      const failedKey = `failed_coupon:${reqIp}`;
      const failedCheck = couponFailedAttemptsLimiter.check(failedKey);

      if (!failedCheck.success) {
        return createRateLimitResponse(
          failedCheck,
          "Você testou alguns cupons seguidos. Respire fundo e aguarde 2 minutinhos para tentar outro código."
        );
      }

      return NextResponse.json(
        {
          valid: false,
          code: error.code,
          message: error.message,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error("Erro na validação do cupom:", error);
    return NextResponse.json({ valid: false, message: "Erro ao validar cupom." }, { status: 500 });
  }
}
