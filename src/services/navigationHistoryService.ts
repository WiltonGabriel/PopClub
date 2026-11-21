const STORAGE_KEY = "popshake_nav_history";
const MAX_HISTORY_LENGTH = 50;

export interface NavigationRouter {
  back: () => void;
  push: (href: string) => void;
  replace: (href: string) => void;
}

function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function extractRoutePathname(route: string): string {
  const normalized = normalizeRoute(route);
  const rawPath = normalized.split("?")[0]?.split("#")[0] || "/";
  const cleanPath =
    rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
  return cleanPath === "/perfil" ? "/conta" : cleanPath;
}

function readStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.startsWith("/"));
  } catch {
    return [];
  }
}

function writeStack(stack: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = stack.slice(-MAX_HISTORY_LENGTH);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignora falhas de sessionStorage (ex.: modo privado restrito)
  }
}

function hasSameOriginReferrer(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function sanitizeSafeInternalRoute(route: string | null | undefined): string | null {
  if (typeof route !== "string") return null;
  const trimmed = route.trim();
  if (!trimmed || !trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
  if (/[\r\n\0]/.test(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  if (lower.includes("javascript:") || lower.includes("data:") || lower.includes("vbscript:")) {
    return null;
  }
  return trimmed;
}

function getQueryFromRoute(currentFullUrl: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const candidate = sanitizeSafeInternalRoute(params.get("from"));
    if (
      !candidate ||
      candidate === currentFullUrl ||
      extractRoutePathname(candidate) === extractRoutePathname(currentFullUrl)
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

function getSameOriginReferrerRoute(currentFullUrl: string): string | null {
  if (!hasSameOriginReferrer()) return null;
  try {
    const refUrl = new URL(document.referrer);
    const candidate = sanitizeSafeInternalRoute(`${refUrl.pathname}${refUrl.search}`);
    if (
      !candidate ||
      candidate === currentFullUrl ||
      extractRoutePathname(candidate) === extractRoutePathname(currentFullUrl)
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export const navigationHistoryService = {
  recordNavigation(route: string): void {
    const normalized = normalizeRoute(route);
    const normalizedPath = extractRoutePathname(normalized);
    const stack = readStack();
    const top = stack[stack.length - 1];

    if (top === normalized) {
      return;
    }

    // Se a rota no topo pertence à mesma página base (ex.: /conta, /conta?section=perfil ou /perfil),
    // atualiza o topo sem empilhar entradas duplicadas da mesma página.
    if (top && extractRoutePathname(top) === normalizedPath) {
      stack[stack.length - 1] = normalized;
      writeStack(stack);
      return;
    }

    // Se o usuário voltou pelo botão do navegador para a rota anterior imediata, sincroniza a pilha
    if (
      stack.length >= 2 &&
      (stack[stack.length - 2] === normalized ||
        extractRoutePathname(stack[stack.length - 2]) === normalizedPath)
    ) {
      stack.pop();
      stack[stack.length - 1] = normalized;
      writeStack(stack);
      return;
    }

    stack.push(normalized);
    writeStack(stack);
  },

  replaceCurrent(route: string): void {
    const normalized = normalizeRoute(route);
    const stack = readStack();

    if (stack.length === 0) {
      writeStack([normalized]);
      return;
    }

    if (stack[stack.length - 1] === normalized) {
      return;
    }

    stack[stack.length - 1] = normalized;
    writeStack(stack);
  },

  getPreviousRoute(currentRoute?: string): string | null {
    const stack = readStack();
    if (stack.length === 0) return null;

    if (currentRoute) {
      const currentPath = extractRoutePathname(currentRoute);
      for (let i = stack.length - 1; i >= 0; i--) {
        if (extractRoutePathname(stack[i]) !== currentPath) {
          return stack[i] ?? null;
        }
      }
      return null;
    }

    if (stack.length < 2) return null;
    return stack[stack.length - 2] ?? null;
  },

  popCurrent(currentRoute?: string): string | null {
    const stack = readStack();
    if (stack.length === 0) return null;
    const targetPath = currentRoute
      ? extractRoutePathname(currentRoute)
      : extractRoutePathname(stack[stack.length - 1]);
    let popped: string | null = null;
    while (
      stack.length > 0 &&
      extractRoutePathname(stack[stack.length - 1]) === targetPath
    ) {
      popped = stack.pop() ?? null;
    }
    writeStack(stack);
    return popped;
  },

  getCurrentFullUrl(): string {
    if (typeof window === "undefined") return "/";
    return `${window.location.pathname}${window.location.search}`;
  },

  goBack(router: NavigationRouter, fallback = "/"): void {
    const current = this.getCurrentFullUrl();
    const currentPath = extractRoutePathname(current);
    const previousRoute = this.getPreviousRoute(current);
    const fromRoute = getQueryFromRoute(current);
    const referrerRoute = getSameOriginReferrerRoute(current);
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    const safeTarget = previousRoute || fromRoute || referrerRoute || fallback;

    // Quando não há rota anterior nesta aba mas há ?from= explícito (ex.: aba nova), prioriza o retorno contextual
    if (previousRoute === null && fromRoute) {
      this.popCurrent(current);
      router.push(fromRoute);
      return;
    }

    if (hasHistory && (previousRoute !== null || referrerRoute !== null)) {
      this.popCurrent(current);
      router.back();
      // Fallback defensivo para PWA/mobile caso router.back() permaneça na mesma página
      if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        window.setTimeout(() => {
          try {
            if (extractRoutePathname(window.location.pathname) === currentPath) {
              router.replace(safeTarget);
            }
          } catch {
            // Ignora em ambientes de teste sem window real
          }
        }, 140);
      }
      return;
    }

    if (previousRoute) {
      this.popCurrent(current);
      router.replace(previousRoute);
      return;
    }

    if (fromRoute) {
      this.popCurrent(current);
      router.push(fromRoute);
      return;
    }

    if (referrerRoute) {
      this.popCurrent(current);
      router.push(referrerRoute);
      return;
    }

    router.push(fallback);
  },

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignora falhas de limpeza
    }
  },
};
