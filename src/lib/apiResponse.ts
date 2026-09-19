import { NextResponse } from "next/server";
import { logger } from "./logger";

export interface StandardErrorResponse {
  error: string;
  code?: string;
}

/**
 * Resposta de Sucesso Padronizada
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Resposta de Erro Padronizada
 */
export function apiError(message: string, status = 400, code?: string) {
  const payload: StandardErrorResponse = { error: message };
  if (code) payload.code = code;
  return NextResponse.json(payload, { status });
}

/**
 * Tratador Centralizado de Erros para Rotas de API
 * 
 * - Registra o erro de forma segura via logger central
 * - Previne vazamento de credenciais, queries cruas e stack traces
 * - Retorna respostas amigáveis e consistentes ao cliente
 */
export function handleApiError(
  error: unknown,
  context: string,
  fallbackMessage?: string
): NextResponse {
  const err = error as any;

  // 1. Falha de Conexão com o Banco de Dados (Prisma Initialization)
  if (err?.name === "PrismaClientInitializationError") {
    logger.error(context, "Falha de conectividade com o banco de dados.", error);
    return NextResponse.json(
      {
        error: "Serviço temporariamente indisponível. Tente novamente em instantes.",
        code: "DATABASE_UNAVAILABLE",
      },
      { status: 503 }
    );
  }

  // 2. Erros Conhecidos do Prisma (PrismaClientKnownRequestError)
  if (err?.name === "PrismaClientKnownRequestError") {
    logger.warn(context, `Operação do Prisma falhou com código ${err.code}.`, {
      code: err.code,
      meta: err.meta,
    });

    if (err.code === "P2002") {
      return NextResponse.json(
        {
          error: "Já existe um registro com os dados informados.",
          code: "DUPLICATE_ENTRY",
        },
        { status: 409 }
      );
    }

    if (err.code === "P2025") {
      return NextResponse.json(
        {
          error: "O recurso solicitado não foi encontrado.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }
  }

  // 3. Erros de Validação do Zod
  if (err?.name === "ZodError" && Array.isArray(err?.issues)) {
    const issues = err.issues.map((i: any) => i.message).join(", ");
    logger.warn(context, `Falha de validação Zod: ${issues}`);
    return NextResponse.json(
      {
        error: issues || "Dados de requisição inválidos.",
        code: "VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  // 4. Erros Genéricos ou Não Tratados
  logger.error(context, fallbackMessage || "Erro não tratado ao processar requisição.", error);

  return NextResponse.json(
    {
      error: fallbackMessage || "Ocorreu um erro interno ao processar a solicitação.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}
