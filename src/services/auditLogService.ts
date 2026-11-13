import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface AdminAuditActor {
  id?: string | null;
  role?: string | null;
}

export interface RecordAdminAuditInput {
  actor: AdminAuditActor | null | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  diffKeys?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface ListAdminAuditParams {
  page?: number;
  limit?: number;
  resourceType?: string;
  action?: string;
  actorUserId?: string;
}

const SENSITIVE_AUDIT_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "newpassword",
  "currentpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "resetcode",
  "reset_code",
  "secret",
  "pixkey",
  "pix_key",
  "cpf",
  "phone",
  "customerphone",
  "courierphone",
  "whatsapp",
  "email",
  "fullname",
  "full_name",
  "customername",
  "deliverystreet",
  "delivery_street",
  "deliverynumber",
  "delivery_number",
  "address",
  "street",
  "orderpin",
  "order_pin",
  "authorization",
  "cookie",
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (SENSITIVE_AUDIT_KEYS.has(normalized)) return true;
  return (
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.includes("token") ||
    normalized.includes("pix") ||
    normalized.includes("cpf") ||
    normalized.includes("phone") ||
    normalized.includes("email")
  );
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") {
    return Number.isFinite(value as number) || typeof value === "boolean" ? value : null;
  }
  if (typeof value === "string") {
    return value.length > 240 ? `${value.slice(0, 237)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizeValue(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

/**
 * Remove campos de PII/credenciais dos metadados de auditoria antes da persistência.
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null;
  const sanitized = sanitizeValue(metadata, 0);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
    return null;
  }
  return sanitized as Record<string, unknown>;
}

/**
 * Filtra nomes de campos alterados para evitar registrar nomes internos sensíveis como hash/token.
 */
export function sanitizeDiffKeys(diffKeys?: string[]): string[] {
  if (!Array.isArray(diffKeys)) return [];
  const unique = new Set<string>();
  for (const key of diffKeys) {
    const trimmed = String(key || "").trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase().includes("token") || trimmed.toLowerCase().includes("secret")) {
      continue;
    }
    unique.add(trimmed.slice(0, 64));
  }
  return Array.from(unique);
}

/**
 * Registra evento administrativo imutável em AdminAuditLog sem expor PII ou bloquear a operação em falha transitória.
 */
export async function recordAdminAudit(input: RecordAdminAuditInput): Promise<boolean> {
  try {
    const actorRole = String(input.actor?.role || "SYSTEM").toUpperCase();
    const safeMetadata = sanitizeAuditMetadata(input.metadata);
    const safeDiffKeys = sanitizeDiffKeys(input.diffKeys);
    const safeSummary = String(input.summary || "")
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]")
      .slice(0, 280);

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actor?.id || null,
        actorRole,
        action: String(input.action || "UNKNOWN").slice(0, 64),
        resourceType: String(input.resourceType || "unknown").slice(0, 64),
        resourceId: input.resourceId ? String(input.resourceId).slice(0, 128) : null,
        summary: safeSummary,
        diffKeys: safeDiffKeys,
        metadata:
          safeMetadata === null
            ? Prisma.JsonNull
            : (safeMetadata as Prisma.InputJsonValue),
      },
    });
    return true;
  } catch (error) {
    logger.warn("recordAdminAudit", "Falha ao gravar registro de auditoria administrativa.", error);
    return false;
  }
}

/**
 * Lista registros de auditoria com paginação e filtros seguros (somente leitura).
 */
export async function listAdminAuditLogs(params: ListAdminAuditParams = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.resourceType?.trim()) {
    where.resourceType = params.resourceType.trim();
  }
  if (params.action?.trim()) {
    where.action = params.action.trim();
  }
  if (params.actorUserId?.trim()) {
    where.actorUserId = params.actorUserId.trim();
  }

  const [items, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
