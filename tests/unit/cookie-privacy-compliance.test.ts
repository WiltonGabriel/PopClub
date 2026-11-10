import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { privacyService, COOKIE_CONSENT_KEY } from "@/services/privacyService";

describe("Privacidade & Cookies — LGPD, ANPD, Inventário Real e Quiet Design", () => {
  let mockStorage: Record<string, string>;
  let dispatchedEvents: Array<{ type: string; detail?: unknown }>;

  beforeEach(() => {
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
      dispatchEvent: (ev: CustomEvent) => {
        dispatchedEvents.push({ type: ev.type, detail: ev.detail });
        return true;
      },
    });

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
    vi.unstubAllGlobals();
  });

  it("garante Privacy by Default: sem consentimento, categorias opcionais são desativadas", () => {
    expect(privacyService.hasUserConsented()).toBe(false);
    expect(privacyService.getConsent()).toBeNull();

    // Necessários sempre autorizados (Art. 7º, V)
    expect(privacyService.isCategoryAllowed("necessary")).toBe(true);

    // Opcionais bloqueados por padrão (Art. 7º, I)
    expect(privacyService.isCategoryAllowed("analytics")).toBe(false);
    expect(privacyService.isCategoryAllowed("preferences")).toBe(false);
  });

  it("salva preferências quando o usuário rejeita não necessários (Apenas Necessários)", () => {
    const saved = privacyService.saveConsent({ analytics: false, preferences: false });

    expect(saved.necessary).toBe(true);
    expect(saved.analytics).toBe(false);
    expect(saved.preferences).toBe(false);
    expect(mockStorage[COOKIE_CONSENT_KEY]).toBeDefined();

    expect(privacyService.hasUserConsented()).toBe(true);
    expect(privacyService.isCategoryAllowed("necessary")).toBe(true);
    expect(privacyService.isCategoryAllowed("analytics")).toBe(false);
    expect(privacyService.isCategoryAllowed("preferences")).toBe(false);

    const event = dispatchedEvents.find((e) => e.type === "popclub:cookie-consent-updated");
    expect(event).toBeDefined();
  });

  it("salva preferências quando o usuário aceita todos os cookies", () => {
    const saved = privacyService.saveConsent({ analytics: true, preferences: true });

    expect(saved.necessary).toBe(true);
    expect(saved.analytics).toBe(true);
    expect(saved.preferences).toBe(true);

    expect(privacyService.isCategoryAllowed("analytics")).toBe(true);
    expect(privacyService.isCategoryAllowed("preferences")).toBe(true);
  });

  it("revogar consentimento opcional limpa chaves de armazenamento não essenciais (popclub_applied_coupon, ordenação)", () => {
    mockStorage["popclub_applied_coupon"] = "DESCONTO10";
    mockStorage["popshake_home_sections_order"] = '["cat1"]';
    mockStorage["popclub_cart_v1"] = '{"items":[]}'; // Essencial — NÃO deve ser removido

    privacyService.saveConsent({ analytics: false, preferences: false });

    expect(mockStorage["popclub_applied_coupon"]).toBeUndefined();
    expect(mockStorage["popshake_home_sections_order"]).toBeUndefined();
    expect(mockStorage["popclub_cart_v1"]).toBeDefined();
  });

  it("garante que a página /cookies existe e documenta o inventário real sem inventar rastreadores", () => {
    const cookiesPagePath = path.resolve(process.cwd(), "src/app/cookies/page.tsx");
    expect(fs.existsSync(cookiesPagePath), "Arquivo src/app/cookies/page.tsx deve existir").toBe(true);

    const content = fs.readFileSync(cookiesPagePath, "utf-8");

    // Validação de tecnologias reais do app
    expect(content).toContain("popshake_session");
    expect(content).toContain("auth_token");
    expect(content).toContain("popclub_cart_v1");
    expect(content).toContain("popshake_addresses");
    expect(content).toContain("popshake_guest_orders");
    expect(content).toContain("popclub_lgpd_consent");
    expect(content).toContain("popshake-theme");
    expect(content).toContain("popshake-accessibility");
    expect(content).toContain("popshake_pwa_dismissed_until");
    expect(content).toContain("popshake_pwa_install_prompt_enabled");

    // Validação de bases legais e direitos da LGPD
    expect(content).toContain("Lei nº 13.709/2018");
    expect(content).toContain("ANPD");
    expect(content).toContain("Art. 18");
    expect(content).toContain("privacidade@popshake.com.br");

    // Não deve inventar rastreadores inexistentes
    expect(content).toContain("Google Analytics"); // Mencionado para atestar que NÃO utiliza
    expect(content).toContain("<strong>não</strong> utiliza ferramentas invasivas de terceiros");
  });

  it("garante que o CookieConsentBanner oferece opção paritária de rejeição e links diretos", () => {
    const bannerPath = path.resolve(process.cwd(), "src/components/ui/CookieConsentBanner.tsx");
    const content = fs.readFileSync(bannerPath, "utf-8");

    // Links diretos no aviso
    expect(content).toContain('href="/cookies"');
    expect(content).toContain('href="/privacidade"');

    // Opções de ação paritárias
    expect(content).toContain("Apenas Necessários");
    expect(content).toContain("Aceitar Todos");
    expect(content).toContain("Personalizar");
    expect(content).toContain("Rejeitar Opcionais");
  });

  it("garante que a página /conta disponibiliza a seção 'Privacidade e dados' e controles do PWA", () => {
    const contaPath = path.resolve(process.cwd(), "src/app/conta/page.tsx");
    const content = fs.readFileSync(contaPath, "utf-8");

    // Seção de Privacidade e dados
    expect(content).toContain("Privacidade e dados");
    expect(content).toContain("Gerenciamento de Consentimento e Cookies");
    expect(content).toContain('href="/cookies"');
    expect(content).toContain('href="/privacidade"');

    // Controles do PWA solicitados na especificação 5.5
    expect(content).toContain("Instalação do Aplicativo PopShake");
    expect(content).toContain("Instalar aplicativo");
    expect(content).toContain("Aviso de instalação");
    expect(content).toContain("pwaInstallService");
  });

  it("garante que o rodapé global (Footer) contém link para a Política de Cookies", () => {
    const footerPath = path.resolve(process.cwd(), "src/components/storefront/Footer.tsx");
    const content = fs.readFileSync(footerPath, "utf-8");

    expect(content).toContain('href="/cookies"');
    expect(content).toContain("Política de Cookies");
  });
});
