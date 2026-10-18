import { NextResponse } from "next/server";

export interface RateLimitCheckResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

/**
 * Limitador de taxa defensivo com Algoritmo de Janela Deslizante (Sliding Window Log).
 * Elimina completamente a vulnerabilidade de boundary bursts (rajadas na virada de janela)
 * e implementa proteção contra vazamento de memória (Memory Cap & Auto-Pruning).
 */
export class RateLimiter {
  private store = new Map<string, number[]>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxStoreSize: number = 10000;

  constructor(private windowMs: number, private maxRequests: number) {
    this.cleanupInterval = setInterval(() => {
      this.pruneExpired();
    }, Math.max(windowMs, 30000));

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove registros expirados para garantir O(1) e prevenir memory leaks
   */
  private pruneExpired() {
    const now = Date.now();
    const threshold = now - this.windowMs;
    for (const [key, timestamps] of this.store.entries()) {
      const valid = timestamps.filter((t) => t > threshold);
      if (valid.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, valid);
      }
    }
  }

  /**
   * Valida e consome 1 token para a chave informada
   */
  check(key: string): RateLimitCheckResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Proteção contra DoS por alta cardinalidade de chaves
    if (this.store.size >= this.maxStoreSize && !this.store.has(key)) {
      this.pruneExpired();
      if (this.store.size >= this.maxStoreSize) {
        const firstKey = this.store.keys().next().value;
        if (firstKey) this.store.delete(firstKey);
      }
    }

    const timestamps = this.store.get(key) || [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= this.maxRequests) {
      const oldestValid = validTimestamps[0];
      const resetTime = oldestValid + this.windowMs;
      const retryAfterSec = Math.max(1, Math.ceil((resetTime - now) / 1000));

      this.store.set(key, validTimestamps);
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: resetTime,
        retryAfter: retryAfterSec,
      };
    }

    validTimestamps.push(now);
    this.store.set(key, validTimestamps);

    const remaining = Math.max(0, this.maxRequests - validTimestamps.length);
    const resetTime = validTimestamps[0] + this.windowMs;

    return {
      success: true,
      limit: this.maxRequests,
      remaining,
      reset: resetTime,
      retryAfter: 0,
    };
  }

  /**
   * Reseta o contador para uma chave específica (útil em testes ou desbloqueios manuais)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Destrói o timer de limpeza (útil para testes unitários isolados)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// -------------------------------------------------------------
// LIMITADORES GRANULARES DE SEGURANÇA DEFENSIVA (OWASP ASVS / RFC 6585)
// -------------------------------------------------------------

// Autenticação e Credenciais: 10 requisições por minuto
export const authLimiter = new RateLimiter(60 * 1000, 10);

// Enumeração de Telefones (check-phone): 10 consultas por minuto
export const phoneCheckLimiter = new RateLimiter(60 * 1000, 10);

// Redefinição de Senhas e Códigos de Recuperação: 5 tentativas a cada 15 minutos
export const forgotPasswordLimiter = new RateLimiter(15 * 60 * 1000, 5);
export const passwordResetLimiter = new RateLimiter(15 * 60 * 1000, 5);

// Validação de Cupons de Desconto (Anti Brute-Force Dictionary): 15 tentativas por minuto
export const couponLimiter = new RateLimiter(60 * 1000, 15);

// Finalização de Pedidos / Checkout (Anti Denial of Inventory / Flooding): 10 pedidos por minuto
export const checkoutLimiter = new RateLimiter(60 * 1000, 10);

// Geocodificação Externa (Nominatim / OpenStreetMap): 15 consultas por minuto
export const geocodeLimiter = new RateLimiter(60 * 1000, 15);

// Cálculo de Frete e Logística: 30 requisições por minuto
export const deliveryCalculateLimiter = new RateLimiter(60 * 1000, 30);

// Consulta e Rastreamento de Pedidos (Anti Scraping / IDOR Enumeration): 30 consultas por minuto
export const orderLookupLimiter = new RateLimiter(60 * 1000, 30);

// Uploads de Mídia / Arquivos: 20 uploads por minuto
export const addonUploadLimiter = new RateLimiter(60 * 1000, 20);

// Operações Administrativas / CRUD de Complementos: 120 requisições por minuto
export const addonCrudLimiter = new RateLimiter(60 * 1000, 120);

// -------------------------------------------------------------
// UTILITÁRIOS DE IDENTIFICAÇÃO SEGURA E RFC 6585
// -------------------------------------------------------------

/**
 * Sanitiza o endereço IP extraído, removendo portas e validando formato
 */
function sanitizeIp(rawIp: string): string {
  const trimmed = rawIp.trim();
  // Se contiver porta IPv4 (ex: 192.168.1.1:54321), extrai apenas o IP
  if (/^(\d{1,3}\.){3}\d{1,3}:\d+$/.test(trimmed)) {
    return trimmed.split(":")[0];
  }
  // Remove caracteres inválidos para chaves
  return trimmed.replace(/[^\w.:-]/g, "").slice(0, 64) || "127.0.0.1";
}

/**
 * Extrai o endereço IP real da requisição respeitando a cadeia de proxies confiáveis:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (Nginx / Traefik / Docker Gateway)
 * 3. x-forwarded-for (primeiro IP do cabeçalho)
 */
export function getIpFromRequest(request: Request): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return sanitizeIp(cfConnectingIp);

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return sanitizeIp(xRealIp);

  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
    if (ips.length > 0) {
      return sanitizeIp(ips[0]);
    }
  }

  return "127.0.0.1";
}

/**
 * Cria uma chave composta (IP + Prefixo + Identificador Opcional) para blindar contra
 * ataques distribuídos e evitar penalizar múltiplos clientes sob o mesmo CGNAT/NAT
 */
export function getRateLimitKey(
  request: Request,
  prefix: string,
  extraIdentifier?: string | null
): string {
  const ip = getIpFromRequest(request);
  const cleanExtra = extraIdentifier ? extraIdentifier.trim().toLowerCase().slice(0, 80) : "";
  return cleanExtra ? `${prefix}:${ip}:${cleanExtra}` : `${prefix}:${ip}`;
}

/**
 * Anexa os cabeçalhos normativos da RFC 6585 (RateLimit-* e Retry-After) à resposta
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitCheckResult
): NextResponse {
  response.headers.set("RateLimit-Limit", String(result.limit));
  response.headers.set("RateLimit-Remaining", String(Math.max(0, result.remaining)));
  response.headers.set("RateLimit-Reset", String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))));
  if (!result.success && result.retryAfter > 0) {
    response.headers.set("Retry-After", String(result.retryAfter));
  }
  return response;
}

/**
 * Gera a resposta HTTP 429 Too Many Requests padronizada com cabeçalhos RFC 6585
 */
export function createRateLimitResponse(
  result: RateLimitCheckResult,
  customMessage?: string
): NextResponse {
  const retryAfterSec = result.retryAfter > 0 ? result.retryAfter : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  const message =
    customMessage ||
    `Limite de requisições excedido. Por favor, aguarde ${retryAfterSec} segundo(s) antes de tentar novamente.`;

  const payload = {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message,
    error: message,
    retryAfter: retryAfterSec,
    timestamp: new Date().toISOString(),
  };

  const response = NextResponse.json(payload, { status: 429 });
  return addRateLimitHeaders(response, result);
}
