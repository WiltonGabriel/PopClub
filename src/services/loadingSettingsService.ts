export type LoadingTheme = "liquid_cream" | "playful_bounce" | "minimal_pulse";
export type BackgroundType = "gradient" | "solid" | "pattern";

export interface LoadingSettingsData {
  id?: string;
  theme: LoadingTheme;
  centerIcon: string;
  phrases: string[];
  rotationInterval: number; // ms
  minDuration: number; // ms

  // Personalização de Fundo (Background da Aplicação)
  bgTypeLight: BackgroundType;
  bgValueLight: string;
  bgCustomLight?: string | null;

  bgTypeDark: BackgroundType;
  bgValueDark: string;
  bgCustomDark?: string | null;

  updatedAt?: string;
}

export interface BackgroundPreset {
  id: string;
  label: string;
  description: string;
  css: string;
  previewBg: string;
}

export const LIGHT_GRADIENT_PRESETS: BackgroundPreset[] = [
  {
    id: "preset_cream",
    label: "Creme & Framboesa",
    description: "Tons claros aveludados com reflexos sutis de framboesa e baunilha",
    css: "linear-gradient(135deg, #FFF6FB 0%, #F5ECFF 50%, #FFF0F5 100%)",
    previewBg: "linear-gradient(135deg, #FFF6FB, #F5ECFF, #FFF0F5)",
  },
  {
    id: "preset_tropical",
    label: "Açaí Tropical Suave",
    description: "Transição sutil de lavanda clara e névoa floral fresca",
    css: "linear-gradient(180deg, #FBF8FD 0%, #F3E8FA 100%)",
    previewBg: "linear-gradient(180deg, #FBF8FD, #F3E8FA)",
  },
  {
    id: "preset_sunrise",
    label: "Nascer do Sol Pop",
    description: "Cores quentes e acolhedoras com pêssego suave e rosa algodão",
    css: "linear-gradient(135deg, #FFF9F2 0%, #FFF0F7 50%, #F6EDFF 100%)",
    previewBg: "linear-gradient(135deg, #FFF9F2, #FFF0F7, #F6EDFF)",
  },
  {
    id: "preset_mint",
    label: "Menta Refrescante",
    description: "Toque leve de menta fresca com lavanda suave de verão",
    css: "linear-gradient(135deg, #F0FDF4 0%, #FAF5FF 100%)",
    previewBg: "linear-gradient(135deg, #F0FDF4, #FAF5FF)",
  },
];

export const DARK_GRADIENT_PRESETS: BackgroundPreset[] = [
  {
    id: "preset_dark_violet",
    label: "Açaí Profundo & Neon",
    description: "Violeta escuro açaí com suave brilho de neon púrpura",
    css: "linear-gradient(135deg, #130614 0%, #220B25 50%, #160718 100%)",
    previewBg: "linear-gradient(135deg, #130614, #220B25, #160718)",
  },
  {
    id: "preset_cosmic",
    label: "Noite Cósmica Pop",
    description: "Profundidade estelar com nuances magenta e ameixa escura",
    css: "linear-gradient(180deg, #0F0311 0%, #1D0621 50%, #2A0930 100%)",
    previewBg: "linear-gradient(180deg, #0F0311, #1D0621, #2A0930)",
  },
  {
    id: "preset_velvet",
    label: "Veludo Roxo & Magenta",
    description: "Luxuoso tom de veludo com transição quente em vinho nobre",
    css: "linear-gradient(135deg, #1A0A1D 0%, #2F0E2A 100%)",
    previewBg: "linear-gradient(135deg, #1A0A1D, #2F0E2A)",
  },
  {
    id: "preset_obsidian",
    label: "Midnight Obsidian",
    description: "Minimalismo escuro absoluto com toques açaí quase pretos",
    css: "linear-gradient(180deg, #0B030D 0%, #140517 100%)",
    previewBg: "linear-gradient(180deg, #0B030D, #140517)",
  },
];

export const LIGHT_PATTERN_PRESETS: BackgroundPreset[] = [
  {
    id: "pattern_dots",
    label: "Pontilhado Suave",
    description: "Micro-pontos translúcidos de açaí organizados de forma leve",
    css: "radial-gradient(#9306CF18 1.5px, transparent 1.5px) 0 0 / 20px 20px, #FFFFFF",
    previewBg: "radial-gradient(#9306CF22 1.5px, transparent 1.5px) 0 0 / 12px 12px, #FFFFFF",
  },
  {
    id: "pattern_grid",
    label: "Grade Clean",
    description: "Linhas quadriculadas ultrafinas com estética moderna",
    css: "linear-gradient(to right, #9306CF0C 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(to bottom, #9306CF0C 1px, transparent 1px) 0 0 / 24px 24px, #FFFFFF",
    previewBg: "linear-gradient(to right, #9306CF15 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(to bottom, #9306CF15 1px, transparent 1px) 0 0 / 12px 12px, #FFFFFF",
  },
];

export const DARK_PATTERN_PRESETS: BackgroundPreset[] = [
  {
    id: "pattern_dots",
    label: "Constelação Estelar",
    description: "Partículas estelares translúcidas que iluminam o fundo escuro",
    css: "radial-gradient(#C7A9C924 1.5px, transparent 1.5px) 0 0 / 20px 20px, #140715",
    previewBg: "radial-gradient(#C7A9C930 1.5px, transparent 1.5px) 0 0 / 12px 12px, #140715",
  },
  {
    id: "pattern_grid",
    label: "Grade Cyber Pop",
    description: "Linhas geométricas de neon com contraste de baixa intensidade",
    css: "linear-gradient(to right, #C7A9C910 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(to bottom, #C7A9C910 1px, transparent 1px) 0 0 / 24px 24px, #120713",
    previewBg: "linear-gradient(to right, #C7A9C918 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(to bottom, #C7A9C918 1px, transparent 1px) 0 0 / 12px 12px, #120713",
  },
];

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

  bgTypeLight: "gradient",
  bgValueLight: "preset_cream",
  bgCustomLight: "#FBF8FD",

  bgTypeDark: "gradient",
  bgValueDark: "preset_dark_violet",
  bgCustomDark: "#190B1A",
};

const STORAGE_KEY = "popshake_loading_settings";
export const LOADING_UPDATED_EVENT = "popshake_loading_settings_updated";

/**
 * Resolve a string CSS final para o background baseada no modo de cor (light ou dark)
 */
export function resolveBackgroundCss(settings: Partial<LoadingSettingsData>, isDark: boolean): string {
  const type = isDark ? (settings.bgTypeDark || "gradient") : (settings.bgTypeLight || "gradient");
  const value = isDark ? (settings.bgValueDark || "preset_dark_violet") : (settings.bgValueLight || "preset_cream");
  const custom = isDark ? (settings.bgCustomDark || "#190B1A") : (settings.bgCustomLight || "#FBF8FD");

  if (type === "solid") {
    return custom || (isDark ? "#190B1A" : "#FFFFFF");
  }

  if (type === "pattern") {
    const list = isDark ? DARK_PATTERN_PRESETS : LIGHT_PATTERN_PRESETS;
    const found = list.find((p) => p.id === value) || list[0];
    return found.css;
  }

  // type === "gradient"
  const list = isDark ? DARK_GRADIENT_PRESETS : LIGHT_GRADIENT_PRESETS;
  const found = list.find((p) => p.id === value) || list[0];
  return found.css;
}

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

        bgTypeLight: ["gradient", "solid", "pattern"].includes(data.bgTypeLight) ? data.bgTypeLight : DEFAULT_LOADING_SETTINGS.bgTypeLight,
        bgValueLight: data.bgValueLight || DEFAULT_LOADING_SETTINGS.bgValueLight,
        bgCustomLight: data.bgCustomLight || DEFAULT_LOADING_SETTINGS.bgCustomLight,

        bgTypeDark: ["gradient", "solid", "pattern"].includes(data.bgTypeDark) ? data.bgTypeDark : DEFAULT_LOADING_SETTINGS.bgTypeDark,
        bgValueDark: data.bgValueDark || DEFAULT_LOADING_SETTINGS.bgValueDark,
        bgCustomDark: data.bgCustomDark || DEFAULT_LOADING_SETTINGS.bgCustomDark,

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
      throw new Error(err.message || err.error || "Erro ao salvar configurações do visual/loading.");
    }

    const data = await res.json();
    const updated: LoadingSettingsData = {
      theme: data.theme || DEFAULT_LOADING_SETTINGS.theme,
      centerIcon: data.centerIcon || DEFAULT_LOADING_SETTINGS.centerIcon,
      phrases: Array.isArray(data.phrases) && data.phrases.length > 0 ? data.phrases : DEFAULT_LOADING_SETTINGS.phrases,
      rotationInterval: Number(data.rotationInterval) || DEFAULT_LOADING_SETTINGS.rotationInterval,
      minDuration: Number(data.minDuration) || DEFAULT_LOADING_SETTINGS.minDuration,

      bgTypeLight: data.bgTypeLight || DEFAULT_LOADING_SETTINGS.bgTypeLight,
      bgValueLight: data.bgValueLight || DEFAULT_LOADING_SETTINGS.bgValueLight,
      bgCustomLight: data.bgCustomLight || DEFAULT_LOADING_SETTINGS.bgCustomLight,

      bgTypeDark: data.bgTypeDark || DEFAULT_LOADING_SETTINGS.bgTypeDark,
      bgValueDark: data.bgValueDark || DEFAULT_LOADING_SETTINGS.bgValueDark,
      bgCustomDark: data.bgCustomDark || DEFAULT_LOADING_SETTINGS.bgCustomDark,

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
