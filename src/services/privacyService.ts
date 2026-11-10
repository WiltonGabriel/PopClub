"use client";

export interface CookieConsentPreferences {
  necessary: true; // Sempre ativo por exigência operacional
  analytics: boolean; // Padrão: false (Privacy by Default)
  preferences: boolean; // Padrão: false ou true para personalização local
  timestamp: string; // ISO date
  version: string;
}

export const COOKIE_CONSENT_KEY = "popclub_lgpd_consent";
export const DEFAULT_COOKIE_PREFERENCES: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  preferences: false,
  timestamp: "",
  version: "1.0",
};

export interface LgpdSubjectData {
  id: string;
  fullName: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isRegistered: boolean;
  createdAt: string;
}

export interface LgpdExportPayload {
  format: "LGPD_DATA_PORTABILITY_JSON";
  version: "1.0";
  generatedAt: string;
  legalFramework: {
    law: "Lei Geral de Proteção de Dados (Lei nº 13.709/2018)";
    authority: "Autoridade Nacional de Proteção de Dados (ANPD)";
    rightsUnderArticle18: [
      "I - confirmação da existência de tratamento",
      "II - acesso aos dados",
      "III - correção de dados incompletos, inexatos ou desatualizados",
      "IV - anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos",
      "V - portabilidade dos dados a outro fornecedor de serviço",
      "VI - eliminação dos dados pessoais tratados com o consentimento do titular",
      "VII - informação das entidades públicas e privadas com as quais o controlador realizou uso compartilhado de dados",
      "VIII - informação sobre a possibilidade de não fornecer consentimento e sobre as consequências da negativa",
      "IX - revogação do consentimento"
    ];
  };
  controller: {
    businessName: string;
    tradeName: string;
    dpoContactEmail: string;
    dpoChannelUrl: string;
    headquarters: string;
  };
  legalBasesApplied: Array<{
    basis: string;
    purpose: string;
    article: string;
  }>;
  subject: LgpdSubjectData;
  locations: Array<{
    id: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    complement?: string | null;
    reference?: string | null;
    zip?: string | null;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    createdAt: string;
    status: string;
    totalAmount: number;
    subtotal: number;
    deliveryFee: number;
    paymentMethodType: string;
    itemCount: number;
  }>;
}

export const privacyService = {
  /**
   * Obtém as preferências salvas de cookies no navegador
   */
  getConsent(): CookieConsentPreferences | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as CookieConsentPreferences;
      if (parsed && typeof parsed.necessary === "boolean") {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Verifica se o usuário já expressou consentimento formal
   */
  hasUserConsented(): boolean {
    return this.getConsent() !== null;
  },

  /**
   * Verifica se uma categoria específica de armazenamento está autorizada
   * "necessary" é sempre autorizada (Art. 7º, V da LGPD).
   */
  isCategoryAllowed(category: "necessary" | "analytics" | "preferences"): boolean {
    if (category === "necessary") return true;
    const consent = this.getConsent();
    if (!consent) return false; // Privacy by default
    return Boolean(consent[category]);
  },

  /**
   * Salva o consentimento do usuário localmente
   */
  saveConsent(prefs: Partial<CookieConsentPreferences>): CookieConsentPreferences {
    const fullPrefs: CookieConsentPreferences = {
      necessary: true,
      analytics: Boolean(prefs.analytics),
      preferences: Boolean(prefs.preferences),
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullPrefs));
        // Quando o usuário revoga ou rejeita preferências opcionais, limpa chaves passivas não essenciais
        if (!fullPrefs.preferences && typeof localStorage.removeItem === "function") {
          localStorage.removeItem("popclub_applied_coupon");
          localStorage.removeItem("popshake_home_sections_order");
          localStorage.removeItem("popshake_category_order");
        }
        window.dispatchEvent(new CustomEvent("popclub:cookie-consent-updated", { detail: fullPrefs }));
      } catch (e) {
        console.warn("Não foi possível persistir as preferências de cookies:", e);
      }
    }
    return fullPrefs;
  },

  /**
   * Dispara o evento global para abrir a gaveta/modal de cookies a qualquer momento
   */
  openPreferencesModal(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("popclub:open-cookie-preferences"));
    }
  },

  /**
   * Requisita o arquivo de portabilidade de dados do titular (Art. 18, V)
   */
  async exportData(): Promise<LgpdExportPayload> {
    const res = await fetch("/api/users/privacy", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao exportar dados pessoais.");
    }
    return res.json();
  },

  /**
   * Solicita a anonimização irreversível dos dados cadastrais (Art. 18, VI e Art. 16, I)
   */
  async requestAnonymization(password?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch("/api/users/privacy", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao processar anonimização de dados.");
    }
    return res.json();
  },
};
