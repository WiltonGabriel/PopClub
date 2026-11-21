/**
 * Utilitário de sanitização para defesa contra XSS (Cross-Site Scripting),
 * injeção de tags maliciosas e reparo automático de mojibake (UTF-8 lido como Latin-1).
 */

const MOJIBAKE_TRIGGER_REGEX =
  /Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â[\u0080-\u00BF]{2}|ð[\u0080-\u00BF]{3}/;

const UTF8_AS_LATIN1_SEQUENCE_REGEX =
  /(?:[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3})+/g;

/**
 * Detecta e corrige textos com dupla codificação UTF-8 / Latin-1 (ex.: "JÃ¡" -> "Já", "aÃ§aÃ­" -> "açaí").
 */
export function repairMojibake(input: string): string {
  if (!input || typeof input !== "string") return "";
  let current = input;
  for (let pass = 0; pass < 2; pass++) {
    if (!MOJIBAKE_TRIGGER_REGEX.test(current)) break;
    const next = current.replace(UTF8_AS_LATIN1_SEQUENCE_REGEX, (chunk) => {
      try {
        const decoded = Buffer.from(chunk, "latin1").toString("utf8");
        return decoded.includes("\uFFFD") ? chunk : decoded;
      } catch {
        return chunk;
      }
    });
    if (next === current) break;
    current = next;
  }
  return current;
}

export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";
  return repairMojibake(input)
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
