import { describe, it, expect } from "vitest";
import {
  classifyHtmlApiError,
  extractFetchMethod,
  isSameOriginApiUrl,
} from "@/lib/apiFetchInterceptor";

describe("Interceptador de Respostas HTML / Cloudflare Challenge em Rotas /api/*", () => {
  it("identifica corretamente URLs de API da mesma origem e ignora origens externas ou páginas comuns", () => {
    const origin = "https://popshake.wnzk.dev.br";
    expect(isSameOriginApiUrl("/api/addons/groups/123", origin)).toBe(true);
    expect(isSameOriginApiUrl("https://popshake.wnzk.dev.br/api/orders", origin)).toBe(true);
    expect(isSameOriginApiUrl("/admin/pedidos", origin)).toBe(false);
    expect(isSameOriginApiUrl("https://api.external.com/api/data", origin)).toBe(false);
  });

  it("extrai o método HTTP normalizado da chamada fetch", () => {
    expect(extractFetchMethod("/api/addons/groups", undefined)).toBe("GET");
    expect(extractFetchMethod("/api/addons/groups/1", { method: "put" })).toBe("PUT");
    expect(extractFetchMethod("/api/addons/groups/1", { method: "DELETE" })).toBe("DELETE");
  });

  it("classifica página de desafio anti-robô da Cloudflare como CLOUDFLARE_CHALLENGE", () => {
    const cfHtml =
      '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title></head><body><script>window._cf_chl_opt={cType:"managed"};</script></body></html>';
    const headers = new Headers({ "content-type": "text/html; charset=UTF-8" });

    const result = classifyHtmlApiError(403, headers, cfHtml);
    expect(result.isCloudflareChallenge).toBe(true);
    expect(result.code).toBe("CLOUDFLARE_CHALLENGE");
    expect(result.message).toContain("Cloudflare");
  });

  it("classifica cabeçalho cf-mitigated: challenge como CLOUDFLARE_CHALLENGE", () => {
    const headers = new Headers({
      "content-type": "text/html",
      "cf-mitigated": "challenge",
    });

    const result = classifyHtmlApiError(403, headers, "<!DOCTYPE html><html></html>");
    expect(result.isCloudflareChallenge).toBe(true);
    expect(result.code).toBe("CLOUDFLARE_CHALLENGE");
  });

  it("classifica erros HTML 502/503/504 como GATEWAY_UNAVAILABLE", () => {
    const headers = new Headers({ "content-type": "text/html" });
    const result = classifyHtmlApiError(502, headers, "<!DOCTYPE html><html>Bad Gateway</html>");
    expect(result.isCloudflareChallenge).toBe(false);
    expect(result.code).toBe("GATEWAY_UNAVAILABLE");
    expect(result.message).toContain("502");
  });
});
