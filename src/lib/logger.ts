/**
 * Logger Centralizado e Seguro da Aplicação PopShake
 * 
 * Garante formatação consistente, timestamps ISO, contexto semântico,
 * sanitização de informações sensíveis (tokens, senhas, cartões) e
 * prevenção de vazamento de stack traces em produção.
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const SENSITIVE_KEYS = new Set([
  "password",
  "senha",
  "token",
  "refreshtoken",
  "accesstoken",
  "secret",
  "authorization",
  "cookie",
  "creditcard",
  "cardnumber",
  "cvv",
  "database_url",
]);

/**
 * Sanitiza recursivamente objetos e strings para evitar vazamento de credenciais e dados pessoais.
 */
function sanitizeData(data: unknown, depth = 0): unknown {
  if (depth > 5 || data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Mascara possíveis tokens JWT (header.payload.signature)
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(data)) {
      return "[REDACTED_JWT_TOKEN]";
    }
    // Mascara possíveis connection strings do PostgreSQL
    if (data.includes("postgres://") || data.includes("postgresql://")) {
      return "[REDACTED_DATABASE_URL]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Extrai mensagem e causa essencial de erros sem expor detalhes internos excessivos.
 */
function formatError(error: unknown): { message: string; code?: string; type?: string } {
  if (!error) return { message: "Erro desconhecido" };

  if (typeof error === "string") return { message: error };

  if (error instanceof Error) {
    const errorObj = error as Error & { code?: string };

    // Tratamento para erros conhecidos do Prisma
    if (errorObj.name === "PrismaClientInitializationError") {
      return {
        type: "DatabaseConnectionError",
        message: "Não foi possível estabelecer conexão com o banco de dados.",
      };
    }

    if (errorObj.name === "PrismaClientKnownRequestError") {
      return {
        type: "PrismaKnownError",
        code: errorObj.code,
        message: `Operação de banco falhou (Código: ${errorObj.code}).`,
      };
    }

    return {
      type: error.name || "Error",
      code: errorObj.code,
      message: error.message,
    };
  }

  return { message: String(error) };
}

function outputLog(level: LogLevel, context: string, message: string, meta?: unknown) {
  const isDev = process.env.NODE_ENV !== "production";
  if (level === "DEBUG" && !isDev) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${context}]`;

  const safeMeta = meta !== undefined ? sanitizeData(meta) : undefined;

  switch (level) {
    case "DEBUG":
      console.debug(prefix, message, safeMeta ? safeMeta : "");
      break;
    case "INFO":
      console.info(prefix, message, safeMeta ? safeMeta : "");
      break;
    case "WARN":
      console.warn(prefix, message, safeMeta ? safeMeta : "");
      break;
    case "ERROR":
      console.error(prefix, message, safeMeta ? safeMeta : "");
      break;
  }
}

export const logger = {
  debug(context: string, message: string, meta?: unknown) {
    outputLog("DEBUG", context, message, meta);
  },

  info(context: string, message: string, meta?: unknown) {
    outputLog("INFO", context, message, meta);
  },

  warn(context: string, message: string, meta?: unknown) {
    outputLog("WARN", context, message, meta);
  },

  error(context: string, message: string, error?: unknown) {
    const formatted = error ? formatError(error) : undefined;
    outputLog("ERROR", context, message, formatted);
  },
};
