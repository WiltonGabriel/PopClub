import { randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  emailService,
  isEmailProviderConfigured,
  type EmailSendResult,
} from "@/lib/emailService";

export const EMAIL_VERIFICATION_TTL_MINUTES = 30;
const EMAIL_CODE_MIN = 100000;
const EMAIL_CODE_MAX = 1000000;
const SIX_DIGIT_REGEX = /^\d{6}$/;

export interface EmailVerificationPayload {
  code: string;
  expiresAt: Date;
}

export type VerifyEmailResult =
  | {
      ok: true;
      status: 200;
      alreadyVerified: boolean;
      message: string;
    }
  | {
      ok: false;
      status: 400;
      code:
        | "INVALID_CODE_FORMAT"
        | "INVALID_OR_EXPIRED_CODE"
        | "INVALID_CODE"
        | "EXPIRED_CODE";
      error: string;
    };

/**
 * Gera um código numérico criptograficamente seguro de 6 dígitos (CSPRNG).
 */
export function generateSixDigitCode(): string {
  return randomInt(EMAIL_CODE_MIN, EMAIL_CODE_MAX).toString();
}

/**
 * Comparação em tempo constante para códigos numéricos/tokens curtos,
 * normalizando comprimentos sem retorno antecipado por diferença de tamanho.
 */
export function safeCompareCode(expected: string, provided: string): boolean {
  if (typeof expected !== "string" || typeof provided !== "string") {
    return false;
  }

  const normalizedExpected = expected.trim();
  const normalizedProvided = provided.trim();
  if (!normalizedExpected || !normalizedProvided) {
    return false;
  }

  const expectedBuf = Buffer.from(normalizedExpected, "utf8");
  const providedBuf = Buffer.from(normalizedProvided, "utf8");
  const maxLength = Math.max(expectedBuf.length, providedBuf.length);

  const paddedExpected = Buffer.alloc(maxLength);
  const paddedProvided = Buffer.alloc(maxLength);
  expectedBuf.copy(paddedExpected);
  providedBuf.copy(paddedProvided);

  return timingSafeEqual(paddedExpected, paddedProvided) && expectedBuf.length === providedBuf.length;
}

/**
 * Resolve a URL base pública da aplicação a partir de variáveis de ambiente
 * ou dos cabeçalhos da requisição HTTP atual.
 */
export function resolveAppBaseUrl(request?: Request): string {
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicAppUrl) {
    return publicAppUrl.replace(/\/+$/, "");
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    return nextAuthUrl.replace(/\/+$/, "");
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

    if (host) {
      let protocol = "http";
      if (forwardedProto === "https" || forwardedProto === "http") {
        protocol = forwardedProto;
      } else if (typeof request.url === "string" && request.url.startsWith("https://")) {
        protocol = "https";
      } else if (
        !host.includes("localhost") &&
        !host.includes("127.0.0.1") &&
        !/^192\.168\./.test(host) &&
        !/^10\./.test(host) &&
        process.env.NODE_ENV === "production"
      ) {
        protocol = "https";
      }
      return `${protocol}://${host}`.replace(/\/+$/, "");
    }

    if (typeof request.url === "string" && request.url) {
      try {
        const parsed = new URL(request.url);
        if (parsed.origin && parsed.origin !== "null") {
          return parsed.origin.replace(/\/+$/, "");
        }
      } catch {
        // Ignora URL malformada e utiliza fallback padrão
      }
    }
  }

  return "http://localhost:3000";
}

/**
 * Gera em memória o par código + expiração para confirmação de e-mail.
 * Não realiza chamadas ao banco de dados.
 */
export function createEmailVerificationPayload(): EmailVerificationPayload {
  return {
    code: generateSixDigitCode(),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000),
  };
}

/**
 * Monta o link direto e dispara o e-mail de confirmação sem derrubar o fluxo em falhas externas.
 */
export async function dispatchEmailVerification({
  userId,
  email,
  name,
  code,
  request,
}: {
  userId: string;
  email: string;
  name?: string | null;
  code: string;
  request?: Request;
}): Promise<EmailSendResult> {
  const baseUrl = resolveAppBaseUrl(request);
  const verifyUrl = `${baseUrl}/verificar-email?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;

  try {
    const sendResult = await emailService.sendEmailVerificationCode({
      to: email,
      name,
      code,
      verifyUrl,
      expiresMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
      idempotencyKey: `email_verify_${userId}_${code}`,
    });

    if (!sendResult.success && (process.env.NODE_ENV === "production" || sendResult.mode === "production")) {
      console.error("[EmailVerification] Falha ao enviar e-mail de confirmação:", {
        userId,
        error: sendResult.error,
      });
    }

    return sendResult;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao enviar confirmação de e-mail.";
    console.error("[EmailVerification] Exceção ao disparar confirmação de e-mail:", {
      userId,
      error: message,
    });
    return {
      success: false,
      mode: isEmailProviderConfigured() ? "production" : "simulation",
      error: message,
    };
  }
}

/**
 * Valida o código de 6 dígitos e marca o e-mail do usuário como confirmado no banco.
 */
export async function verifyUserEmailByCode({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<VerifyEmailResult> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.trim();

  if (!SIX_DIGIT_REGEX.test(cleanCode)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_CODE_FORMAT",
      error: "O código de confirmação deve conter exatamente 6 dígitos numéricos.",
    };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: cleanEmail, mode: "insensitive" } },
    select: {
      id: true,
      emailVerified: true,
      emailVerificationCode: true,
      emailVerificationExpires: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_OR_EXPIRED_CODE",
      error: "Código inválido ou expirado.",
    };
  }

  if (user.emailVerified === true) {
    return {
      ok: true,
      status: 200,
      alreadyVerified: true,
      message: "Este e-mail já foi confirmado anteriormente.",
    };
  }

  if (!user.emailVerificationCode || !safeCompareCode(user.emailVerificationCode, cleanCode)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_CODE",
      error: "Código de confirmação inválido.",
    };
  }

  if (!user.emailVerificationExpires || new Date() > new Date(user.emailVerificationExpires)) {
    return {
      ok: false,
      status: 400,
      code: "EXPIRED_CODE",
      error: "Código expirado. Solicite um novo código de confirmação.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpires: null,
    },
  });

  return {
    ok: true,
    status: 200,
    alreadyVerified: false,
    message: "E-mail confirmado com sucesso!",
  };
}

/**
 * Gera um novo código de confirmação, persiste no usuário e dispara o e-mail.
 */
export async function resendVerificationForUser({
  userId,
  email,
  name,
  request,
}: {
  userId: string;
  email: string;
  name?: string | null;
  request?: Request;
}): Promise<{ code: string; expiresAt: Date; sendResult: EmailSendResult }> {
  const { code, expiresAt } = createEmailVerificationPayload();

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: code,
      emailVerificationExpires: expiresAt,
    },
  });

  const sendResult = await dispatchEmailVerification({
    userId,
    email,
    name,
    code,
    request,
  });

  return { code, expiresAt, sendResult };
}
