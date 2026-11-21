export type HtmlErrorCode =
  | "CLOUDFLARE_CHALLENGE"
  | "GATEWAY_UNAVAILABLE"
  | "UNEXPECTED_HTML";

export interface ClassifiedHtmlError {
  code: HtmlErrorCode;
  message: string;
  isCloudflareChallenge: boolean;
}

/**
 * Verifica se a requisição `fetch` tem como destino uma rota `/api/*` da própria origem.
 */
export function isSameOriginApiUrl(
  input: RequestInfo | URL,
  currentOrigin: string
): boolean {
  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!rawUrl) return false;
    if (rawUrl.startsWith("/api/") || rawUrl === "/api") {
      return true;
    }

    const parsed = new URL(rawUrl, currentOrigin);
    return (
      parsed.origin === currentOrigin &&
      (parsed.pathname.startsWith("/api/") || parsed.pathname === "/api")
    );
  } catch {
    return false;
  }
}

/**
 * Extrai o método HTTP normalizado (GET, POST, PUT, PATCH, DELETE) de uma chamada `fetch`.
 */
export function extractFetchMethod(
  input: RequestInfo | URL,
  init?: RequestInit
): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }
  if (typeof Request !== "undefined" && input instanceof Request && input.method) {
    return input.method.toUpperCase();
  }
  return "GET";
}

/**
 * Identifica se um corpo HTML retornado em uma rota de API corresponde a um desafio
 * de segurança da Cloudflare (Managed Challenge / Turnstile / WAF) ou erro de Gateway (502/503/504).
 */
export function classifyHtmlApiError(
  status: number,
  headers: Headers,
  htmlText: string
): ClassifiedHtmlError {
  const cfMitigated = (headers.get("cf-mitigated") || "").toLowerCase();
  const sample = (htmlText || "").slice(0, 4096);

  const isCfChallenge =
    cfMitigated.includes("challenge") ||
    sample.includes("_cf_chl_opt") ||
    sample.includes("challenges.cloudflare.com") ||
    sample.includes("/cdn-cgi/challenge-platform/") ||
    sample.includes("<title>Just a moment...</title>") ||
    sample.includes("<title>Um momento…</title>");

  if (isCfChallenge) {
    return {
      code: "CLOUDFLARE_CHALLENGE",
      message:
        "A verificação de segurança da Cloudflare expirou no seu navegador. Recarregue a página para validar a conexão e tente novamente.",
      isCloudflareChallenge: true,
    };
  }

  if (status === 502 || status === 503 || status === 504) {
    return {
      code: "GATEWAY_UNAVAILABLE",
      message: `O servidor está reiniciando ou temporariamente ocupado (HTTP ${status}). Aguarde alguns segundos e tente novamente.`,
      isCloudflareChallenge: false,
    };
  }

  return {
    code: "UNEXPECTED_HTML",
    message: `O servidor retornou uma resposta inesperada (HTTP ${status || 500}). Recarregue a página e tente novamente.`,
    isCloudflareChallenge: false,
  };
}
