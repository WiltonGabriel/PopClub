import { describe, it, expect } from "vitest";
import {
  DomainException,
  StoreClosedException,
  ConveyorPausedException,
  OutOfStockException,
  BatchDepletedException,
  AddonRuleViolationException,
  InvalidCouponException,
  MinimumOrderValueException,
  ResourceNotFoundException,
  UnauthorizedException,
  ForbiddenActionException,
  ValidationException,
  RateLimitExceededException,
} from "@/domain/errors";

describe("Hierarquia de Exceções de Domínio do PopClub", () => {
  it("StoreClosedException carrega status 422, código STORE_CLOSED e metadados de horário", () => {
    const err = new StoreClosedException("13:00", "23:30", "12:59");
    expect(err).toBeInstanceOf(DomainException);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("STORE_CLOSED");
    expect(err.layer).toBe("domain");
    expect(err.module).toBe("schedule");
    expect(err.action).toBe("validate_store_schedule");
    expect(err.openingTime).toBe("13:00");
    expect(err.closingTime).toBe("23:30");
    expect(err.message).toContain("13:00");
    expect(err.message).toContain("23:30");

    const json = err.toJSON();
    expect(json.statusCode).toBe(422);
    expect(json.code).toBe("STORE_CLOSED");
    expect(json.details).toEqual({ openingTime: "13:00", closingTime: "23:30", cuiabaTime: "12:59" });
  });

  it("ConveyorPausedException carrega status 422, código CONVEYOR_PAUSED e mensagem acolhedora", () => {
    const err = new ConveyorPausedException("13:00", "23:30");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("CONVEYOR_PAUSED");
    expect(err.layer).toBe("domain");
    expect(err.module).toBe("conveyor");
    expect(err.action).toBe("check_conveyor_status");
    expect(err.message).toContain("Finalizando os preparativos da cozinha");
  });

  it("OutOfStockException carrega status 400, código OUT_OF_STOCK e saldo do estoque", () => {
    const err = new OutOfStockException("Copão de Açaí 500ml", 2, 5, "prod-123");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("OUT_OF_STOCK");
    expect(err.layer).toBe("domain");
    expect(err.module).toBe("stock");
    expect(err.action).toBe("verify_stock_availability");
    expect(err.details).toEqual({
      productName: "Copão de Açaí 500ml",
      available: 2,
      requested: 5,
      productId: "prod-123",
    });
    expect(err.message).toContain('Estoque insuficiente para o produto "Copão de Açaí 500ml"');
  });

  it("BatchDepletedException carrega status 400, código PROMOTION_BATCH_DEPLETED e saldo do lote", () => {
    const err = new BatchDepletedException("Super Promoção Relâmpago", 0, 2, "promo-456");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("PROMOTION_BATCH_DEPLETED");
    expect(err.layer).toBe("domain");
    expect(err.module).toBe("stock");
    expect(err.action).toBe("verify_promotion_batch");
    expect(err.message).toContain("esgotado ou insuficiente");
  });

  it("AddonRuleViolationException carrega status 400, código ADDON_RULE_VIOLATION e motivo", () => {
    const err = new AddonRuleViolationException(
      "Calda Especial",
      "MAX_QUANTITY_EXCEEDED",
      "O grupo Calda Especial permite no máximo 2 itens.",
      { maxAllowed: 2, totalQuantity: 3 }
    );
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("ADDON_RULE_VIOLATION");
    expect(err.layer).toBe("domain");
    expect(err.module).toBe("addon");
    expect(err.details?.reason).toBe("MAX_QUANTITY_EXCEEDED");
  });

  it("InvalidCouponException carrega status 400, código personalizado e motivo", () => {
    const err = new InvalidCouponException("POP10", "Este cupom já expirou.", { code: "COUPON_EXPIRED" });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("COUPON_EXPIRED");
    expect(err.layer).toBe("domain");
    expect(err.module).toBe("coupon");
    expect(err.message).toBe("Este cupom já expirou.");
  });

  it("MinimumOrderValueException carrega status 400 e valores comparativos", () => {
    const err = new MinimumOrderValueException(15.5, 30.0);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("MINIMUM_ORDER_VALUE_NOT_MET");
    expect(err.details?.currentSubtotal).toBe(15.5);
    expect(err.details?.minOrderValue).toBe(30.0);
  });

  it("ResourceNotFoundException carrega status 404 e detalhes da entidade", () => {
    const err = new ResourceNotFoundException("Pedido", "ord-999");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("RESOURCE_NOT_FOUND");
    expect(err.details?.entity).toBe("Pedido");
    expect(err.details?.id).toBe("ord-999");
  });

  it("UnauthorizedException carrega status 401 e código UNAUTHORIZED", () => {
    const err = new UnauthorizedException();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.layer).toBe("application");
    expect(err.module).toBe("auth");
  });

  it("ForbiddenActionException carrega status 403 e permissão requerida", () => {
    const err = new ForbiddenActionException("ORDERS_KANBAN");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN_INSUFFICIENT_PERMISSIONS");
    expect(err.layer).toBe("application");
    expect(err.module).toBe("rbac");
    expect(err.details?.requiredPermission).toBe("ORDERS_KANBAN");
  });

  it("ValidationException carrega status 400 e mapeamento de campos com erro", () => {
    const err = new ValidationException("Campos obrigatórios ausentes", { street: "Rua obrigatória" });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details?.fields).toEqual({ street: "Rua obrigatória" });
  });

  it("RateLimitExceededException carrega status 429 e código RATE_LIMIT_EXCEEDED", () => {
    const err = new RateLimitExceededException();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(err.layer).toBe("infrastructure");
  });
});
