import { DomainException, BusinessModule } from "./DomainException";

export * from "./DomainException";

/**
 * 1. Loja Fechada Fora do Horário de Atendimento
 */
export class StoreClosedException extends DomainException {
  public readonly openingTime: string;
  public readonly closingTime: string;

  constructor(openingTime: string, closingTime: string, cuiabaTime?: string) {
    super({
      message: `Estamos fechados no momento. Hoje nosso horário de atendimento é das ${openingTime} às ${closingTime}. Você já pode ir escolhendo seus itens e montando sua sacola!`,
      code: "STORE_CLOSED",
      statusCode: 422,
      layer: "domain",
      module: "schedule",
      action: "validate_store_schedule",
      details: { openingTime, closingTime, cuiabaTime },
    });
    this.openingTime = openingTime;
    this.closingTime = closingTime;
  }
}

/**
 * 2. Esteira Operacional em Preparo da Cozinha
 */
export class ConveyorPausedException extends DomainException {
  public readonly openingTime: string;
  public readonly closingTime: string;

  constructor(openingTime: string, closingTime: string) {
    super({
      message: `Finalizando os preparativos da cozinha. Nossa equipe está organizando a esteira para atender você. Nosso horário hoje é das ${openingTime} às ${closingTime}. Em instantes o recebimento de pedidos estará liberado!`,
      code: "CONVEYOR_PAUSED",
      statusCode: 422,
      layer: "domain",
      module: "conveyor",
      action: "check_conveyor_status",
      details: { openingTime, closingTime },
    });
    this.openingTime = openingTime;
    this.closingTime = closingTime;
  }
}

/**
 * 3. Estoque Insuficiente para Produto Comum
 */
export class OutOfStockException extends DomainException {
  constructor(productName: string, available: number, requested: number, productId?: string) {
    super({
      message: `Estoque insuficiente para o produto "${productName}". Disponível: ${available}, Solicitado: ${requested}.`,
      code: "OUT_OF_STOCK",
      statusCode: 400,
      layer: "domain",
      module: "stock",
      action: "verify_stock_availability",
      details: { productName, available, requested, productId },
    });
  }
}

/**
 * 4. Lote de Promoção Esgotado
 */
export class BatchDepletedException extends DomainException {
  constructor(promotionTitle: string, remainingBatch: number, requested: number, promotionId?: string) {
    super({
      message: `Lote da promoção "${promotionTitle}" esgotado ou insuficiente. Restam apenas ${remainingBatch} unidade(s) no lote promocional.`,
      code: "PROMOTION_BATCH_DEPLETED",
      statusCode: 400,
      layer: "domain",
      module: "stock",
      action: "verify_promotion_batch",
      details: { promotionTitle, remainingBatch, requested, promotionId },
    });
  }
}

/**
 * 5. Violação de Regras de Grupo de Complementos/Adicionais
 */
export type AddonViolationReason =
  | "MAX_QUANTITY_EXCEEDED"
  | "MIN_QUANTITY_NOT_MET"
  | "ITEM_QUANTITY_NOT_ALLOWED"
  | "ITEM_UNAVAILABLE"
  | "GROUP_INACTIVE";

export class AddonRuleViolationException extends DomainException {
  constructor(
    groupName: string,
    reason: AddonViolationReason,
    detailsMsg: string,
    extraDetails?: Record<string, unknown>
  ) {
    super({
      message: detailsMsg,
      code: "ADDON_RULE_VIOLATION",
      statusCode: 400,
      layer: "domain",
      module: "addon",
      action: "validate_addon_group",
      details: { groupName, reason, ...extraDetails },
    });
  }
}

/**
 * 6. Cupom Inválido, Expirado ou Sem Requisitos Satisfeitos
 */
export class InvalidCouponException extends DomainException {
  constructor(couponCode: string, reasonMessage: string, extraDetails?: Record<string, unknown>) {
    super({
      message: reasonMessage,
      code: (extraDetails?.code as string) || "INVALID_COUPON",
      statusCode: 400,
      layer: "domain",
      module: "coupon",
      action: "apply_coupon",
      details: { couponCode, ...extraDetails },
    });
  }
}

/**
 * 7. Pedido Abaixo do Valor Mínimo
 */
export class MinimumOrderValueException extends DomainException {
  constructor(currentSubtotal: number, minOrderValue: number) {
    super({
      message: `O pedido mínimo é de R$ ${minOrderValue.toFixed(2).replace(".", ",")}. Subtotal atual: R$ ${currentSubtotal.toFixed(2).replace(".", ",")}.`,
      code: "MINIMUM_ORDER_VALUE_NOT_MET",
      statusCode: 400,
      layer: "domain",
      module: "order",
      action: "validate_order_subtotal",
      details: { currentSubtotal, minOrderValue },
    });
  }
}

/**
 * 8. Recurso Não Encontrado
 */
export class ResourceNotFoundException extends DomainException {
  constructor(entity: string, id: string, customMessage?: string) {
    super({
      message: customMessage || `${entity} não encontrado(a): ${id}`,
      code: "RESOURCE_NOT_FOUND",
      statusCode: 404,
      layer: "domain",
      module: "product",
      action: "find_resource",
      details: { entity, id },
    });
  }
}

/**
 * 9. Não Autorizado (Sessão Ausente ou Inválida)
 */
export class UnauthorizedException extends DomainException {
  constructor(message = "Autenticação obrigatória.") {
    super({
      message,
      code: "UNAUTHORIZED",
      statusCode: 401,
      layer: "application",
      module: "auth",
      action: "authenticate_user",
    });
  }
}

/**
 * 10. Acesso Proibido / Permissões Insuficientes (RBAC)
 */
export class ForbiddenActionException extends DomainException {
  constructor(requiredPermission: string, customMessage?: string) {
    super({
      message: customMessage || "Acesso negado. Permissões administrativas insuficientes para executar esta ação.",
      code: "FORBIDDEN_INSUFFICIENT_PERMISSIONS",
      statusCode: 403,
      layer: "application",
      module: "rbac",
      action: "authorize_permission",
      details: { requiredPermission },
    });
  }
}

/**
 * 11. Erro de Validação de Dados de Entrada
 */
export class ValidationException extends DomainException {
  constructor(message: string, fields?: Record<string, string>, module: BusinessModule = "order") {
    super({
      message,
      code: "VALIDATION_ERROR",
      statusCode: 400,
      layer: "presentation",
      module,
      action: "validate_input",
      details: { fields },
    });
  }
}

/**
 * 12. Limite de Requisições Atingido
 */
export class RateLimitExceededException extends DomainException {
  constructor(message = "Você está realizando requisições rápido demais. Aguarde um instante.") {
    super({
      message,
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      layer: "infrastructure",
      module: "order",
      action: "check_rate_limit",
    });
  }
}
