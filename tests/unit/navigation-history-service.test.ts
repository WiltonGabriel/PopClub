import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { navigationHistoryService, NavigationRouter } from "@/services/navigationHistoryService";

describe("NavigationHistoryService & Botão Voltar (Cookies / Privacidade / Conta)", () => {
  let mockSessionStorage: Record<string, string>;
  let mockLocation: { pathname: string; search: string; origin: string };
  let mockHistory: { length: number };
  let mockDocument: { referrer: string };
  let routerMock: NavigationRouter;

  beforeEach(() => {
    mockSessionStorage = {};
    mockLocation = {
      pathname: "/cookies",
      search: "",
      origin: "https://popshake.com.br",
    };
    mockHistory = { length: 2 };
    mockDocument = { referrer: "" };

    const sessionStorageMock = {
      getItem: (key: string) => (key in mockSessionStorage ? mockSessionStorage[key] : null),
      setItem: (key: string, val: string) => {
        mockSessionStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockSessionStorage[key];
      },
    };

    vi.stubGlobal("window", {
      sessionStorage: sessionStorageMock,
      location: mockLocation,
      history: mockHistory,
    });
    vi.stubGlobal("document", mockDocument);

    routerMock = {
      back: vi.fn(),
      push: vi.fn(),
      replace: vi.fn(),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registra rotas internas sequenciais sem duplicar a rota atual consecutiva", () => {
    navigationHistoryService.recordNavigation("/pedidos");
    navigationHistoryService.recordNavigation("/pedidos");
    navigationHistoryService.recordNavigation("/cookies");

    expect(navigationHistoryService.getPreviousRoute("/cookies")).toBe("/pedidos");
  });

  it("atualiza a rota atual com replaceCurrent (ex.: /conta -> /conta?section=privacidade) sem duplicar pilha", () => {
    navigationHistoryService.recordNavigation("/");
    navigationHistoryService.recordNavigation("/conta");
    navigationHistoryService.replaceCurrent("/conta?section=privacidade");
    navigationHistoryService.recordNavigation("/cookies");

    expect(navigationHistoryService.getPreviousRoute("/cookies")).toBe("/conta?section=privacidade");
  });

  it("desempilha quando o usuário volta pelo navegador para a rota anterior imediata", () => {
    navigationHistoryService.recordNavigation("/conta?section=privacidade");
    navigationHistoryService.recordNavigation("/cookies");
    // Simula voltar pelo botão nativo do navegador para /conta?section=privacidade
    navigationHistoryService.recordNavigation("/conta?section=privacidade");

    expect(navigationHistoryService.getPreviousRoute("/conta?section=privacidade")).toBeNull();
  });

  it("chama router.back() e remove a página atual da pilha ao voltar de /cookies para /conta?section=privacidade", () => {
    navigationHistoryService.recordNavigation("/");
    navigationHistoryService.recordNavigation("/conta");
    navigationHistoryService.replaceCurrent("/conta?section=privacidade");
    navigationHistoryService.recordNavigation("/cookies");

    mockLocation.pathname = "/cookies";
    mockLocation.search = "";
    mockHistory.length = 4;

    navigationHistoryService.goBack(routerMock, "/");

    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
    // Após sair de /cookies, o topo da pilha passa a ser /conta?section=privacidade
    expect(navigationHistoryService.getPreviousRoute("/conta?section=privacidade")).toBe("/");
  });

  it("usa router.replace(previousRoute) quando window.history.length <= 1 mas há rota anterior rastreada", () => {
    navigationHistoryService.recordNavigation("/pedidos");
    navigationHistoryService.recordNavigation("/privacidade");

    mockLocation.pathname = "/privacidade";
    mockLocation.search = "";
    mockHistory.length = 1;

    navigationHistoryService.goBack(routerMock, "/");

    expect(routerMock.replace).toHaveBeenCalledWith("/pedidos");
    expect(routerMock.back).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("usa router.back() quando referrer é da mesma origem mesmo sem pilha prévia em sessionStorage", () => {
    mockLocation.pathname = "/cookies";
    mockHistory.length = 2;
    mockDocument.referrer = "https://popshake.com.br/carrinho";

    navigationHistoryService.goBack(routerMock, "/");

    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("usa fallback router.push('/') quando aberto em nova aba ou vindo de referrer externo sem histórico interno", () => {
    mockLocation.pathname = "/cookies";
    mockHistory.length = 2;
    mockDocument.referrer = "https://www.google.com/";

    navigationHistoryService.goBack(routerMock, "/");

    expect(routerMock.push).toHaveBeenCalledWith("/");
    expect(routerMock.back).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("garante que /cookies, /privacidade, /conta e RootLayout utilizam a navegação de retorno contextual", () => {
    const root = process.cwd();
    const cookiesSource = fs.readFileSync(path.join(root, "src/app/cookies/page.tsx"), "utf-8");
    const privacidadeSource = fs.readFileSync(path.join(root, "src/app/privacidade/page.tsx"), "utf-8");
    const contaSource = fs.readFileSync(path.join(root, "src/app/conta/page.tsx"), "utf-8");
    const layoutSource = fs.readFileSync(path.join(root, "src/app/layout.tsx"), "utf-8");

    expect(cookiesSource).toContain("SmartBackButton");
    expect(cookiesSource).not.toContain("Voltar ao Cardápio");

    expect(privacidadeSource).toContain("SmartBackButton");
    expect(privacidadeSource).not.toContain("Voltar ao Cardápio");

    expect(contaSource).toContain("navigationHistoryService.replaceCurrent");
    expect(contaSource).toContain("navigationHistoryService.goBack");
    expect(contaSource).toContain("window.history.replaceState");

    expect(layoutSource).toContain("RouteHistoryTracker");
  });
});
