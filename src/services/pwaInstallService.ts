"use client";

export const PWA_DISMISS_KEY = "popshake_pwa_dismissed_until";
export const PWA_AUTO_PROMPT_KEY = "popshake_pwa_install_prompt_enabled";

// Prazo estrito de 4 meses (120 dias) para respeito da recusa do usuário
export const PWA_DISMISS_DURATION_DAYS = 120;
export const PWA_DISMISS_DURATION_MS = PWA_DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let capturedInstallPrompt: BeforeInstallPromptEvent | null = null;

export const pwaInstallService = {
  /**
   * Armazena em memória o evento beforeinstallprompt capturado pelo navegador
   */
  setCapturedPrompt(event: BeforeInstallPromptEvent | null): void {
    capturedInstallPrompt = event;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("popshake:pwa-prompt-captured"));
    }
  },

  /**
   * Retorna o evento beforeinstallprompt capturado, se disponível
   */
  getCapturedPrompt(): BeforeInstallPromptEvent | null {
    return capturedInstallPrompt;
  },

  /**
   * Verifica se a aplicação já está rodando em modo standalone (PWA instalado)
   */
  isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
    const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return Boolean(isStandaloneMedia || isIosStandalone);
  },

  /**
   * Verifica se a exibição automática do popup está ativada nas preferências
   * Padrão: true (ativado, a menos que o usuário desative expressamente nas configurações)
   */
  isAutoPromptEnabled(): boolean {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(PWA_AUTO_PROMPT_KEY);
      if (stored === null) return true;
      return stored === "true";
    } catch {
      return true;
    }
  },

  /**
   * Salva a preferência do usuário de ativar/desativar a exibição automática do popup
   */
  setAutoPromptEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PWA_AUTO_PROMPT_KEY, String(enabled));
      window.dispatchEvent(
        new CustomEvent("popshake:pwa-prompt-preference-changed", {
          detail: { enabled },
        })
      );
    } catch (e) {
      console.warn("Falha ao salvar preferência de aviso de instalação PWA:", e);
    }
  },

  /**
   * Retorna o timestamp até o qual o popup automático está suspenso
   */
  getDismissedUntil(): number | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(PWA_DISMISS_KEY);
      if (!stored) return null;
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  /**
   * Registra a dispensa do popup pelo usuário, silenciando o aviso automático por até 4 meses (120 dias)
   */
  dismissPrompt(customDurationMs: number = PWA_DISMISS_DURATION_MS): void {
    if (typeof window === "undefined") return;
    try {
      const targetTime = Date.now() + customDurationMs;
      localStorage.setItem(PWA_DISMISS_KEY, String(targetTime));
      window.dispatchEvent(
        new CustomEvent("popshake:pwa-prompt-dismissed", {
          detail: { dismissedUntil: targetTime },
        })
      );
    } catch (e) {
      console.warn("Falha ao salvar dispensa de instalação PWA:", e);
    }
  },

  /**
   * Limpa a dispensa temporária (para reativação ou testes)
   */
  resetDismissal(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(PWA_DISMISS_KEY);
      window.dispatchEvent(new CustomEvent("popshake:pwa-prompt-dismissed", { detail: null }));
    } catch (e) {
      console.warn("Falha ao resetar dispensa de instalação PWA:", e);
    }
  },

  /**
   * Verifica se o popup de instalação ainda está no período de silenciamento ativo (dentro dos 4 meses)
   */
  isDismissedActive(): boolean {
    const dismissedUntil = this.getDismissedUntil();
    if (!dismissedUntil) return false;
    return dismissedUntil > Date.now();
  },

  /**
   * Determina se o popup pode ser exibido AUTOMATICAMENTE na tela
   * Requisitos estritos:
   * 1. Não pode estar em modo standalone (já instalado).
   * 2. O usuário não pode ter desativado o aviso automático nas configurações.
   * 3. O período de 4 meses de silenciamento não pode estar ativo.
   */
  canShowAutomaticPrompt(): boolean {
    if (this.isStandalone()) return false;
    if (!this.isAutoPromptEnabled()) return false;
    if (this.isDismissedActive()) return false;
    return true;
  },

  /**
   * Dispara a abertura do fluxo de instalação manual (a partir das configurações ou de qualquer botão)
   * Esse método funciona de forma INDEPENDENTE do aviso automático estar ativado ou desativado.
   */
  openManualInstall(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("popshake:open-pwa-install"));
    }
  },

  /**
   * Dispara o prompt nativo capturado do navegador
   */
  async triggerPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!capturedInstallPrompt) {
      return "unavailable";
    }
    try {
      await capturedInstallPrompt.prompt();
      const choice = await capturedInstallPrompt.userChoice;
      if (choice.outcome === "accepted") {
        capturedInstallPrompt = null;
      }
      return choice.outcome;
    } catch (err) {
      console.warn("Erro ao invocar prompt nativo de instalação:", err);
      return "unavailable";
    }
  },
};
