import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  pwaInstallService,
  PWA_DISMISS_DURATION_DAYS,
  PWA_DISMISS_DURATION_MS,
  PWA_DISMISS_KEY,
  PWA_AUTO_PROMPT_KEY,
} from "@/services/pwaInstallService";

describe("PWA Install Service — Regras de Dispensa (4 Meses), Preferências e Instalação Manual", () => {
  let mockStorage: Record<string, string>;
  let dispatchedEvents: Array<{ type: string; detail?: unknown }>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));

    mockStorage = {};
    dispatchedEvents = [];

    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key in mockStorage ? mockStorage[key] : null),
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    });

    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false },
      dispatchEvent: (ev: CustomEvent) => {
        dispatchedEvents.push({ type: ev.type, detail: ev.detail });
        return true;
      },
    });

    // Shim CustomEvent caso ambiente Node antigo não possua
    if (typeof globalThis.CustomEvent === "undefined") {
      vi.stubGlobal("CustomEvent", class {
        type: string;
        detail?: unknown;
        constructor(type: string, params?: { detail?: unknown }) {
          this.type = type;
          this.detail = params?.detail;
        }
      });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("deve definir exatamente 4 meses (120 dias) como prazo de silenciamento padrão", () => {
    expect(PWA_DISMISS_DURATION_DAYS).toBe(120);
    expect(PWA_DISMISS_DURATION_MS).toBe(120 * 24 * 60 * 60 * 1000);
  });

  it("permite exibir o popup automaticamente na primeira visita quando não está em standalone", () => {
    expect(pwaInstallService.isAutoPromptEnabled()).toBe(true);
    expect(pwaInstallService.isDismissedActive()).toBe(false);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(true);
  });

  it("ao dispensar o popup, persiste escolha por 4 meses e impede reaparição automática dentro desse prazo", () => {
    pwaInstallService.dismissPrompt();

    expect(mockStorage[PWA_DISMISS_KEY]).toBeDefined();
    expect(pwaInstallService.isDismissedActive()).toBe(true);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);

    // Avança 119 dias (ainda dentro dos 4 meses)
    vi.advanceTimersByTime(119 * 24 * 60 * 60 * 1000);
    expect(pwaInstallService.isDismissedActive()).toBe(true);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);
  });

  it("após completar 4 meses (120 dias + 1s), o aviso automático volta a ser elegível se não estiver desativado nas configurações", () => {
    pwaInstallService.dismissPrompt();
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);

    // Avança além de 120 dias
    vi.advanceTimersByTime(120 * 24 * 60 * 60 * 1000 + 1000);
    expect(pwaInstallService.isDismissedActive()).toBe(false);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(true);
  });

  it("ao desativar o aviso de instalação nas configurações, o popup automático nunca reaparece, mesmo após 4 meses", () => {
    pwaInstallService.setAutoPromptEnabled(false);

    expect(mockStorage[PWA_AUTO_PROMPT_KEY]).toBe("false");
    expect(pwaInstallService.isAutoPromptEnabled()).toBe(false);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);

    // Avança 200 dias (muito além dos 4 meses)
    vi.advanceTimersByTime(200 * 24 * 60 * 60 * 1000);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);
  });

  it("usuário pode reativar o aviso automático nas configurações quando quiser", () => {
    pwaInstallService.setAutoPromptEnabled(false);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);

    pwaInstallService.setAutoPromptEnabled(true);
    expect(mockStorage[PWA_AUTO_PROMPT_KEY]).toBe("true");
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(true);
  });

  it("instalação manual pelas configurações permanece independente e dispara evento mesmo com aviso automático desativado ou dispensado", () => {
    pwaInstallService.setAutoPromptEnabled(false);
    pwaInstallService.dismissPrompt();

    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);

    // Ação manual nas configurações continua funcionando
    pwaInstallService.openManualInstall();
    const openEvent = dispatchedEvents.find((e) => e.type === "popshake:open-pwa-install");
    expect(openEvent).toBeDefined();
  });

  it("não exibe popup automático quando o app já está instalado (standalone mode)", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query === "(display-mode: standalone)",
      }),
      navigator: { standalone: false },
      dispatchEvent: () => true,
    });

    expect(pwaInstallService.isStandalone()).toBe(true);
    expect(pwaInstallService.canShowAutomaticPrompt()).toBe(false);
  });
});
