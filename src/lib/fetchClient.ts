/**
 * Cliente HTTP Resiliente para o Front-end PopClub
 * 
 * - Detecta desconexão com a internet (offline)
 * - Identifica indisponibilidade do servidor/banco de dados (502, 503, 504, timeout)
 * - Preserva códigos de erro padronizados do backend (DATABASE_UNAVAILABLE, VALIDATION_ERROR, etc.)
 * - Lança instância rica de AppApiError para consumo direto pela UI
 */

export type ApiErrorCode =
  | "NETWORK_OFFLINE"
  | "SERVER_DOWN"
  | "DATABASE_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "PRISMA_VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND_OR_RELATION_MISSING"
  | "DUPLICATE_ENTRY"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "STORE_CLOSED"
  | "INTERNAL_SERVER_ERROR"
  | "REQUEST_FAILED";

export class AppApiError extends Error {
  public readonly code: ApiErrorCode | string;
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ApiErrorCode | string = "REQUEST_FAILED",
    status?: number,
    details?: unknown
  ) {
    super(message);
    this.name = "AppApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  get isOffline(): boolean {
    return this.code === "NETWORK_OFFLINE";
  }

  get isServerDown(): boolean {
    return (
      this.code === "SERVER_DOWN" ||
      this.code === "DATABASE_UNAVAILABLE" ||
      (this.status !== undefined && (this.status === 502 || this.status === 503 || this.status === 504))
    );
  }

  get isDatabaseDown(): boolean {
    return this.code === "DATABASE_UNAVAILABLE";
  }

  get isValidationError(): boolean {
    return (
      this.code === "VALIDATION_ERROR" ||
      this.code === "PRISMA_VALIDATION_ERROR" ||
      this.status === 400
    );
  }
}

export interface FetchClientOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Função utilitária central de requisição para o front-end
 */
export async function fetchClient<T = any>(
  url: string,
  options: FetchClientOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, ...fetchOptions } = options;

  // 1. Verificação prévia de conexão (se em navegador)
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
    throw new AppApiError(
      "Você parece estar sem conexão com a internet. Verifique seu Wi-Fi ou rede móvel.",
      "NETWORK_OFFLINE",
      0
    );
  }

  // 2. Configuração de Timeout com AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal || controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Queda de rede ou falha de conectividade do navegador
    if (
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      error?.name === "TypeError" ||
      (typeof error?.message === "string" && error.message.includes("Failed to fetch"))
    ) {
      throw new AppApiError(
        "Você parece estar sem conexão com a internet. Verifique seu Wi-Fi ou rede móvel.",
        "NETWORK_OFFLINE",
        0
      );
    }

    // Timeout de requisição
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw new AppApiError(
        "Instabilidade temporária de conexão com o servidor da loja. Seus itens continuam salvos no carrinho.",
        "SERVER_DOWN",
        504
      );
    }

    throw new AppApiError(
      error?.message || "Instabilidade temporária de conexão com o servidor da loja.",
      "SERVER_DOWN",
      500
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Processamento do payload JSON da resposta
  let data: any = {};
  try {
    const text = await response.text();
    if (text) {
      data = JSON.parse(text);
    }
  } catch {
    data = {};
  }

  // 4. Verificação de status HTTP de erro
  if (!response.ok) {
    const status = response.status;
    let code: ApiErrorCode | string = data.code || "REQUEST_FAILED";
    let message: string =
      data.message || data.error || response.statusText || "Ocorreu um erro ao processar a solicitação.";

    if (status === 503 || code === "DATABASE_UNAVAILABLE") {
      code = "DATABASE_UNAVAILABLE";
      message =
        data.message ||
        "Não foi possível conectar ao banco de dados no momento. Verifique se o serviço do banco está ativo.";
    } else if (status === 502 || status === 504) {
      code = "SERVER_DOWN";
      message =
        "Instabilidade temporária de conexão com o servidor da loja. Seus itens continuam salvos no carrinho.";
    } else if (status === 400 && !data.code) {
      code = "VALIDATION_ERROR";
    }

    throw new AppApiError(message, code, status, data.details);
  }

  return data as T;
}

fetchClient.get = <T = any>(url: string, options?: FetchClientOptions) =>
  fetchClient<T>(url, { ...options, method: "GET" });

fetchClient.post = <T = any>(url: string, body?: any, options?: FetchClientOptions) =>
  fetchClient<T>(url, {
    ...options,
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

fetchClient.put = <T = any>(url: string, body?: any, options?: FetchClientOptions) =>
  fetchClient<T>(url, {
    ...options,
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

fetchClient.patch = <T = any>(url: string, body?: any, options?: FetchClientOptions) =>
  fetchClient<T>(url, {
    ...options,
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

fetchClient.delete = <T = any>(url: string, options?: FetchClientOptions) =>
  fetchClient<T>(url, { ...options, method: "DELETE" });
