/**
 * Utilitário de sanitização para defesa contra XSS (Cross-Site Scripting)
 * e injeção de tags maliciosas em entradas de dados da aplicação.
 */

export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "") // Remove qualquer tag HTML remanescente
    .replace(/javascript:/gi, "")
    .replace(/\bon\w+\s*=/gi, "") // Remove handlers de eventos como onload=, onerror=, etc.
    .trim();
}

/**
 * Sanitiza recursivamente valores em strings dentro de um objeto ou array simples.
 */
export function sanitizePayload<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    return sanitizeText(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizePayload(val);
    }
    return result as T;
  }
  return data;
}
