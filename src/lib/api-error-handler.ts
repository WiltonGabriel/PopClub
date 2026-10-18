import { NextResponse } from "next/server";
import { logger } from "./logger";
import {
  DomainException,
  StoreClosedException,
  ConveyorPausedException,
} from "@/domain/errors";

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  layer?: string;
  module?: string;
  action?: string;
  details?: unknown;
  timestamp?: string;
  canAcceptOrders?: boolean;
  openingTime?: string;
  closingTime?: string;
  status?: string;
}

export interface ErrorFieldDetail {
  field: string;
  message: string;
}

/**
 * Resposta de Sucesso Padronizada
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Resposta de Erro Padronizada
 */
export function apiError(
  message: string,
  status = 400,
  code?: string,
  details?: unknown
): NextResponse {
  const payload: StandardApiResponse = {
    success: false,
    error: message,
    message,
    code: code || "BAD_REQUEST",
    timestamp: new Date().toISOString(),
  };
  if (details !== undefined) {
    payload.details = details;
  }
  return NextResponse.json(payload, { status });
}

/**
 * Tratador Centralizado de Erros para Rotas de API
 * 
 * - Intercepta e formata Exceções de Domínio (DomainException)
 * - Classifica exceções de banco (Prisma), validações (Zod) e erros HTTP
 * - Emite logs estruturados e legíveis no terminal: [API_ERROR] [METODO_E_ROTA] [CODIGO]
 * - Retorna respostas semânticas com códigos padronizados para o front-end
 */
export function handleApiError(
  error: unknown,
  context: string,
  fallbackMessage?: string
): NextResponse {
  // 0. Interceptação Especial de Exceções de Domínio do PopClub
  if (error instanceof DomainException) {
    const status = error.statusCode;
    const code = error.code;
    const message = error.message;
    const details = error.details;
    const errorLayer = error.layer;
    const businessModule = error.module;
    const action = error.action;
    const timestamp = error.timestamp;

    const detailsStr = details ? ` | Detalhes: ${JSON.stringify(details)}` : "";
    console.error(`[API_ERROR] [${context}] [${code}] [${errorLayer}/${businessModule}] (HTTP ${status}): ${message}${detailsStr}`);
    logger.error(context, `${message} [Code: ${code}]`, error);

    const isStoreScheduleException =
      error instanceof StoreClosedException || error instanceof ConveyorPausedException;

    const payload: StandardApiResponse = {
      success: false,
      code,
      message,
      error: message,
      layer: errorLayer,
      module: businessModule,
      action,
      timestamp,
      ...(details !== undefined ? { details } : {}),
      ...(isStoreScheduleException
        ? {
            canAcceptOrders: false,
            openingTime: error.openingTime,
            closingTime: error.closingTime,
            status: code,
          }
        : {}),
    };

    return NextResponse.json(payload, { status });
  }

  const err = error as {
    name?: string;
    code?: string;
    message?: string;
    status?: number;
    stack?: string;
    meta?: Record<string, unknown>;
    details?: unknown;
    issues?: Array<{ path?: unknown[]; message: string }>;
  } | null | undefined;
  let status = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = fallbackMessage || "Ocorreu um erro interno ao processar a solicitação.";
  let details: unknown = undefined;

  // 1. Falha de Conexão com o Banco de Dados (Prisma Initialization ou Timeout de Conexão)
  const isPrismaInitError = err?.name === "PrismaClientInitializationError";
  const isConnectionTimeout =
    err?.code === "P1001" || // Can't reach database server
    err?.code === "P1002" || // The database server was reached but timed out
    err?.code === "P1003" || // Database does not exist
    err?.code === "P1008" || // Operations timed out
    err?.code === "P1017" || // Server has closed the connection
    err?.code === "ECONNREFUSED" ||
    err?.code === "ETIMEDOUT" ||
    (typeof err?.message === "string" &&
      (err.message.includes("Can't reach database server") ||
        err.message.includes("Timed out fetching a new connection") ||
        err.message.includes("connect ECONNREFUSED")));

  if (isPrismaInitError || isConnectionTimeout) {
    status = 503;
    code = "DATABASE_UNAVAILABLE";
    message =
      "Não foi possível conectar ao banco de dados no momento. Verifique se o serviço do banco está ativo.";
    details = {
      originalCode: err?.code,
      retryable: true,
    };
  }
  // 2. Erros Conhecidos do Prisma (PrismaClientKnownRequestError)
  else if (err?.name === "PrismaClientKnownRequestError") {
    switch (err.code) {
      case "P2002":
        status = 409;
        code = "DUPLICATE_ENTRY";
        message = "Já existe um registro com os dados informados.";
        details = { target: err.meta?.target };
        break;

      case "P2003":
        status = 400;
        code = "RESOURCE_NOT_FOUND_OR_RELATION_MISSING";
        message = "Falha de relacionamento: registro referenciado não foi encontrado ou é inválido.";
        details = { field: err.meta?.field_name };
        break;

      case "P2025":
        status = 404;
        code = "RESOURCE_NOT_FOUND_OR_RELATION_MISSING";
        message = "O registro solicitado não foi encontrado no sistema.";
        details = { cause: err.meta?.cause };
        break;

      default:
        status = 400;
        code = "DATABASE_QUERY_ERROR";
        message = fallbackMessage || `Operação do banco falhou (Código: ${err.code}).`;
        details = { code: err.code };
        break;
    }
  }
  // 3. Erro de Validação de Schema do Prisma Client (PrismaClientValidationError)
  else if (err?.name === "PrismaClientValidationError") {
    status = 400;
    code = "PRISMA_VALIDATION_ERROR";
    message = "Os dados enviados são incompatíveis com os parâmetros aceitos pela operação.";
    const cleanMsg = typeof err.message === "string" ? err.message.split("\n").filter(Boolean).pop() : undefined;
    details = { summary: cleanMsg };
  }
  // 4. Erros de Validação do Zod
  else if (err?.name === "ZodError" && Array.isArray(err?.issues)) {
    status = 400;
    code = "VALIDATION_ERROR";
    const issues: ErrorFieldDetail[] = err.issues.map((i: { path?: unknown[]; message: string }) => ({
      field: Array.isArray(i.path) ? i.path.join(".") || "root" : "field",
      message: i.message,
    }));
    message = issues.map((i) => i.message).join(", ") || "Dados de requisição inválidos.";
    details = issues;
  }
  // 5. Exceção com Status HTTP e Código Pré-definidos
  else if (typeof err?.status === "number" && err.status >= 400 && err.status < 600) {
    status = err.status;
    code = err.code || (status === 404 ? "NOT_FOUND" : status === 403 ? "FORBIDDEN" : "CLIENT_ERROR");
    message = err.message || fallbackMessage || "Erro ao processar requisição.";
    details = err.details;
  }
  // 6. Mensagem de Erro Genérica
  else if (err instanceof Error) {
    message = fallbackMessage || err.message || "Ocorreu um erro interno ao processar a solicitação.";
  }

  // Emissão de Log Estruturado no Terminal do Servidor
  const detailsStr = details ? ` | Detalhes: ${JSON.stringify(details)}` : "";
  const stackStr = err?.stack && process.env.NODE_ENV !== "production" ? `\n${err.stack}` : "";
  console.error(`[API_ERROR] [${context}] [${code}] (HTTP ${status}): ${message}${detailsStr}${stackStr}`);

  // Registra via logger seguro interno
  logger.error(context, `${message} [Code: ${code}]`, error);

  return NextResponse.json(
    {
      success: false,
      code,
      message,
      error: message,
      timestamp: new Date().toISOString(),
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  );
}
