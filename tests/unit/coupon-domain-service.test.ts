import { describe, it, expect } from "vitest";
import { CouponDomainService, CouponModel } from "@/domain/services/CouponDomainService";
import { InvalidCouponException } from "@/domain/errors";

describe("CouponDomainService (Regras Puras de Domínio de Cupons)", () => {
  const baseValidCoupon: CouponModel = {
    id: "coup-1",
    code: "VALE10",
    isActive: true,
    uses: 5,
    maxUses: 100,
    minOrderValue: 20.0,
    discountType: "percentage",
    discountValue: 10,
    productIds: null,
  };

  it("calcula desconto percentual e fixo com precisão monetária", () => {
    // 10% de R$ 50 = R$ 5.00
    expect(CouponDomainService.calculateDiscount(baseValidCoupon, 50.0)).toBe(5.0);

    // Cupom fixo de R$ 15 em pedido de R$ 50 = R$ 15.00
    const fixedCoupon: CouponModel = { ...baseValidCoupon, discountType: "fixed", discountValue: 15 };
    expect(CouponDomainService.calculateDiscount(fixedCoupon, 50.0)).toBe(15.0);

    // Cupom fixo de R$ 100 em pedido de R$ 50 não excede o subtotal = R$ 50.00
    expect(CouponDomainService.calculateDiscount({ ...baseValidCoupon, discountType: "fixed", discountValue: 100 }, 50.0)).toBe(50.0);
  });

  it("aprova cupom válido quando todos os critérios de elegibilidade são atendidos", () => {
    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: baseValidCoupon,
        subtotal: 35.0,
        isRegisteredUser: true,
      });
    }).not.toThrow();
  });

  it("lança InvalidCouponException quando o cupom é nulo ou inativo", () => {
    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: null,
        subtotal: 50.0,
      });
    }).toThrow(InvalidCouponException);

    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: { ...baseValidCoupon, isActive: false },
        subtotal: 50.0,
      });
    }).toThrowError(/Cupom inválido ou expirado/);
  });

  it("lança InvalidCouponException quando o cupom temporal expirou", () => {
    const expiredCoupon: CouponModel = {
      ...baseValidCoupon,
      expiresAt: new Date("2026-01-01T00:00:00Z"),
    };

    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: expiredCoupon,
        subtotal: 50.0,
        isRegisteredUser: true,
        referenceDate: new Date("2026-06-01T00:00:00Z"),
      });
    }).toThrow(InvalidCouponException);
  });

  it("lança InvalidCouponException quando atinge o limite máximo global de utilizações", () => {
    const depletedCoupon: CouponModel = {
      ...baseValidCoupon,
      uses: 10,
      maxUses: 10,
    };

    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: depletedCoupon,
        subtotal: 50.0,
        isRegisteredUser: true,
      });
    }).toThrowError(/Limite de utilizações deste cupom atingido/);
  });

  it("lança InvalidCouponException para usuários visitantes sem cadastro completo quando cupom exige cadastro", () => {
    const couponRequiringRegistration: CouponModel = {
      ...baseValidCoupon,
      requiresRegistration: true,
    };

    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: couponRequiringRegistration,
        subtotal: 50.0,
        isRegisteredUser: false,
      });
    }).toThrowError(/exclusivos para clientes com cadastro completo/);
  });

  it("permite usuários de acesso rápido (visitantes) utilizarem cupons padrão que não exigem cadastro", () => {
    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: baseValidCoupon,
        subtotal: 50.0,
        isRegisteredUser: false,
      });
    }).not.toThrow();
  });

  it("lança InvalidCouponException quando o nível de fidelidade/meses é insuficiente", () => {
    const loyaltyCoupon: CouponModel = {
      ...baseValidCoupon,
      minLoyaltyLevel: 6, // Exige 6 meses ou nível 6
    };

    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: loyaltyCoupon,
        subtotal: 50.0,
        isRegisteredUser: true,
        userMonths: 2, // Apenas 2 meses
        completedOrdersCount: 1, // Poucas compras
        requiredBadgeName: "Ouro",
      });
    }).toThrowError(/exclusivo para clientes com selo Ouro/);
  });

  it("aprova cupom de fidelidade quando o usuário atinge o critério por compras concluídas", () => {
    const loyaltyCoupon: CouponModel = {
      ...baseValidCoupon,
      minLoyaltyLevel: 5,
    };

    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: loyaltyCoupon,
        subtotal: 50.0,
        isRegisteredUser: true,
        userMonths: 0, // Conta nova criada hoje
        completedOrdersCount: 10, // Mas já fez 10 pedidos!
        requiredBadgeName: "Cliente Fiel",
      });
    }).not.toThrow();
  });

  it("calcula desconto sobre eligibleSubtotal para conviver amigavelmente com combos promocionais", () => {
    const pctCoupon: CouponModel = {
      ...baseValidCoupon,
      discountType: "percentage",
      discountValue: 10, // 10%
    };

    // Subtotal total = R$ 100 (R$ 40 em combos promocionais e R$ 60 em itens elegíveis)
    const discount = CouponDomainService.calculateDiscount(pctCoupon, 100.0, {
      eligibleSubtotal: 60.0,
    });
    // 10% de R$ 60 = R$ 6.00
    expect(discount).toBe(6.0);
  });

  it("lança InvalidCouponException quando o cupom é de uso único por cliente e já foi utilizado", () => {
    const onceCoupon: CouponModel = {
      ...baseValidCoupon,
      oncePerUser: true,
    };

    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: onceCoupon,
        subtotal: 50.0,
        isRegisteredUser: true,
        hasPriorUsage: true,
      });
    }).toThrowError(/uso único por cliente e já foi utilizado/);
  });

  it("lança InvalidCouponException quando o subtotal não atinge o pedido mínimo", () => {
    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: baseValidCoupon, // minOrderValue: 20
        subtotal: 18.5,
        isRegisteredUser: true,
      });
    }).toThrowError(/exige pedido mínimo de R\$ 20,00/);
  });

  it("valida escopo restrito de produtos específicos", () => {
    const scopedCoupon: CouponModel = {
      ...baseValidCoupon,
      productIds: ["prod-acai-special", "prod-shake-premium"],
    };

    // Falha: carrinho sem produtos do escopo
    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: scopedCoupon,
        subtotal: 50.0,
        isRegisteredUser: true,
        cartProductIds: ["prod-pastel-carne"],
      });
    }).toThrowError(/exclusivo para produtos específicos que não estão no seu carrinho/);

    // Sucesso: carrinho contém ao menos um produto do escopo
    expect(() => {
      CouponDomainService.validateEligibility({
        coupon: scopedCoupon,
        subtotal: 50.0,
        isRegisteredUser: true,
        cartProductIds: ["prod-pastel-carne", "prod-acai-special"],
      });
    }).not.toThrow();
  });
});
