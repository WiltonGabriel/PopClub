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

export const navigationHistoryService = {
  recordNavigation(route: string): void {
    const normalized = normalizeRoute(route);
    const stack = readStack();
    const top = stack[stack.length - 1];

    if (top === normalized) {
      return;
    }

    // Se o usuário voltou pelo botão do navegador para a rota anterior imediata, sincroniza a pilha
    if (stack.length >= 2 && stack[stack.length - 2] === normalized) {
      stack.pop();
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
      const normalized = normalizeRoute(currentRoute);
      const top = stack[stack.length - 1];
      if (top !== normalized) {
        return top;
      }
    }

    if (stack.length < 2) return null;
    return stack[stack.length - 2] ?? null;
  },

  popCurrent(): string | null {
    const stack = readStack();
    if (stack.length === 0) return null;
    const popped = stack.pop() ?? null;
    writeStack(stack);
    return popped;
  },

  getCurrentFullUrl(): string {
    if (typeof window === "undefined") return "/";
    return `${window.location.pathname}${window.location.search}`;
  },

  goBack(router: NavigationRouter, fallback = "/"): void {
    const current = this.getCurrentFullUrl();
    const previousRoute = this.getPreviousRoute(current);
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;

    if (hasHistory && (previousRoute !== null || hasSameOriginReferrer())) {
      this.popCurrent();
      router.back();
      return;
    }

    if (previousRoute) {
      this.popCurrent();
      router.replace(previousRoute);
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
