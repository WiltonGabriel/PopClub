/**
 * Validação estrita de URLs de mídia (avatares, uploads e favicons) contra XSS e SSRF.
 * Aceita apenas caminhos internos seguros ou URLs HTTPS válidas.
 */

const BLOCKED_SCHEMES = ["javascript:", "data:", "vbscript:", "file:"];

export function isValidSafeAssetUrl(rawUrl: unknown, allowEmpty = false): boolean {
  if (rawUrl === null || rawUrl === undefined || rawUrl === "") {
    return allowEmpty;
  }

  if (typeof rawUrl !== "string") {
    return false;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return allowEmpty;
  }

  if (trimmed.length > 2048 || /[\s<>'"`]/.test(trimmed)) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (BLOCKED_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    return false;
  }

  // Caminhos relativos internos da aplicação (sem protocol-relative `//`)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return !trimmed.includes("..");
  }

  // Apenas HTTPS externo é permitido para recursos visuais hospedados em CDN
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
