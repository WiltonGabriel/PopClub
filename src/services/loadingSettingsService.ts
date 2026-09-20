export type LoadingTheme = "liquid_cream" | "playful_bounce" | "minimal_pulse";

export interface LoadingSettingsData {
  id?: string;
  theme: LoadingTheme;
  centerIcon: string;
  phrases: string[];
  rotationInterval: number; // ms
  minDuration: number; // ms
  updatedAt?: string;
}

export const DEFAULT_LOADING_SETTINGS: LoadingSettingsData = {
  theme: "liquid_cream",
  centerIcon: "🥣",
  phrases: [
    "Batendo o açaí artesanal na cremosidade perfeita...",
    "Separando os acompanhamentos mais fresquinhos...",
    "Preparando as receitas mais deliciosas do cardápio...",
    "Quase pronto! Seu momento doce está chegando...",
  ],
  rotationInterval: 2400,
  minDuration: 800,
};

const STORAGE_KEY = "popshake_loading_settings";
export const LOADING_UPDATED_EVENT = "popshake_loading_settings_updated";

export const loadingSettingsService = {
  getCachedLoadingSettings(): LoadingSettingsData {
    if (typeof window === "undefined") return DEFAULT_LOADING_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...DEFAULT_LOADING_SETTINGS,
            ...parsed,
            phrases: Array.isArray(parsed.phrases) && parsed.phrases.length > 0 ? parsed.phrases : DEFAULT_LOADING_SETTINGS.phrases,
          };
        }
      }
    } catch {}
    return DEFAULT_LOADING_SETTINGS;
  },

  async getLoadingSettings(): Promise<LoadingSettingsData> {
    try {
      const res = await fetch("/api/settings/loading", {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        return this.getCachedLoadingSettings();
      }
      const data = await res.json();
      const sanitized: LoadingSettingsData = {
        theme: ["liquid_cream", "playful_bounce", "minimal_pulse"].includes(data.theme) ? data.theme : DEFAULT_LOADING_SETTINGS.theme,
        centerIcon: data.centerIcon || DEFAULT_LOADING_SETTINGS.centerIcon,
        phrases: Array.isArray(data.phrases) && data.phrases.length > 0 ? data.phrases : DEFAULT_LOADING_SETTINGS.phrases,
        rotationInterval: Number(data.rotationInterval) || DEFAULT_LOADING_SETTINGS.rotationInterval,
        minDuration: Number(data.minDuration) || DEFAULT_LOADING_SETTINGS.minDuration,
        updatedAt: data.updatedAt,
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } catch {}
      }

      return sanitized;
    } catch (err) {
      console.warn("Falha ao buscar loadingSettings remotas, usando cache/padrão:", err);
      return this.getCachedLoadingSettings();
    }
  },

  async updateLoadingSettings(payload: Partial<LoadingSettingsData>): Promise<LoadingSettingsData> {
    const res = await fetch("/api/settings/loading", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Erro ao salvar configurações do loading.");
    }

    const data = await res.json();
    const updated: LoadingSettingsData = {
      theme: data.theme || DEFAULT_LOADING_SETTINGS.theme,
      centerIcon: data.centerIcon || DEFAULT_LOADING_SETTINGS.centerIcon,
      phrases: Array.isArray(data.phrases) && data.phrases.length > 0 ? data.phrases : DEFAULT_LOADING_SETTINGS.phrases,
      rotationInterval: Number(data.rotationInterval) || DEFAULT_LOADING_SETTINGS.rotationInterval,
      minDuration: Number(data.minDuration) || DEFAULT_LOADING_SETTINGS.minDuration,
      updatedAt: data.updatedAt,
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent(LOADING_UPDATED_EVENT, { detail: updated }));
      } catch {}
    }

    return updated;
  },
};
