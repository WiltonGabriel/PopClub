/**
 * Camadas de Arquitetura do Sistema PopClub
 */
export type ArchitectureLayer = "domain" | "application" | "infrastructure" | "presentation";

/**
 * Módulos de Negócio do PopClub
 */
export type BusinessModule =
  | "schedule"
  | "conveyor"
  | "stock"
  | "addon"
  | "coupon"
  | "auth"
  | "rbac"
  | "order"
  | "shipping"
  | "cart"
  | "product"
  | "settings";

export interface DomainExceptionParams {
  message: string;
  code: string;
  statusCode?: number;
  layer?: ArchitectureLayer;
  module: BusinessModule;
  action: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * Classe Base de Exceção de Domínio do PopClub
 * Carrega metadados estruturados para rastreabilidade, observabilidade e respostas de API padronizadas.
 */
export abstract class DomainException extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly layer: ArchitectureLayer;
  public readonly module: BusinessModule;
  public readonly action: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(params: DomainExceptionParams) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code;
    this.statusCode = params.statusCode ?? 400;
    this.layer = params.layer ?? "domain";
    this.module = params.module;
    this.action = params.action;
    this.details = params.details;
    this.timestamp = new Date().toISOString();

    if (params.cause && params.cause instanceof Error) {
      this.cause = params.cause;
    }

    // Mantém stack trace legível no V8/Node.js
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      layer: this.layer,
      module: this.module,
      action: this.action,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}
