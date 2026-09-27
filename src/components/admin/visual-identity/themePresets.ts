export type ThemeCategory = "classic" | "dynamic" | "custom";

export interface HarmonizedThemePreset {
  id: string;
  name: string;
  category: "classic" | "dynamic";
  categoryLabel: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: string;
  previewBgLight: string;
  previewBgDark: string;
  primaryLight: string;
  primaryDark: string;
  storefront: {
    light: {
      baseColor: string;
      gradient: string;
      texture: string;
      textureOpacity: number;
      headerBg: string;
      footerBg: string;
      primary: string;
    };
    dark: {
      baseColor: string;
      gradient: string;
      texture: string;
      textureOpacity: number;
      headerBg: string;
      footerBg: string;
      primary: string;
    };
  };
  splashScreen: {
    enabled: boolean;
    theme: "liquid_cream" | "playful_bounce" | "minimal_pulse";
    centerIcon: string;
    progressBarColorLight: string;
    progressBarColorDark: string;
    backgroundType: "solid" | "gradient" | "dynamic";
    backgroundValueLight: string;
    backgroundValueDark: string;
    dynamicStyle?: "constellation" | "aurora_orbs" | "noctalia_mesh" | "fluid_orbs";
    phrases: string[];
    rotationInterval: number;
    minDuration: number;
  };
}

// ── Utilitários WCAG de Contraste Inteligente ──

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function isLightColor(hex: string): boolean {
  if (!hex || hex === "transparent") return true;
  return getRelativeLuminance(hex) > 0.45;
}

export function getContrastTextColor(bgHex: string): string {
  return isLightColor(bgHex) ? "#0F172A" : "#FFFFFF";
}

// ── Catálogo de Presets Harmonizados ──

export const HARMONIZED_PRESETS: HarmonizedThemePreset[] = [
  // ── ABA 1: TEMAS CLÁSSICOS (3 Presets Balanceados) ──
  {
    id: "popclub_original",
    name: "PopClub Original",
    category: "classic",
    categoryLabel: "Tema Clássico",
    subtitle: "Padrão de Fábrica",
    description: "Identidade oficial PopClub com roxo nobre vibrante, excelente legibilidade e acabamento impecável.",
    badge: "Oficial",
    icon: "🥣",
    previewBgLight: "#FFFFFF",
    previewBgDark: "#0F172A",
    primaryLight: "#7C3AED",
    primaryDark: "#A855F7",
    storefront: {
      light: {
        baseColor: "#FFFFFF",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#F8FAFC",
        primary: "#7C3AED",
      },
      dark: {
        baseColor: "#0F172A",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#0F172A",
        footerBg: "#0F172A",
        primary: "#A855F7",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "liquid_cream",
      centerIcon: "🥣",
      progressBarColorLight: "#7C3AED",
      progressBarColorDark: "#A855F7",
      backgroundType: "solid",
      backgroundValueLight: "#FFFFFF",
      backgroundValueDark: "#0F172A",
      phrases: [
        "Batendo o açaí artesanal na cremosidade perfeita...",
        "Separando os acompanhamentos mais fresquinhos...",
        "Preparando as receitas mais deliciosas do cardápio...",
        "Quase pronto! Seu momento doce está chegando...",
      ],
      rotationInterval: 2400,
      minDuration: 1200,
    },
  },
  {
    id: "acai_sunset",
    name: "Açaí Sunset",
    category: "classic",
    categoryLabel: "Tema Clássico",
    subtitle: "Gastronomia Premium",
    description: "Creme aveludado aconchegante com tons de Magenta Berry e toques dourados sofisticados.",
    badge: "Gastronomia",
    icon: "🍧",
    previewBgLight: "#FFFDF7",
    previewBgDark: "#2E0234",
    primaryLight: "#BE185D",
    primaryDark: "#FB7185",
    storefront: {
      light: {
        baseColor: "#FFFDF7",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#FFFDF7",
        primary: "#BE185D",
      },
      dark: {
        baseColor: "#2E0234",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#1F0123",
        footerBg: "#2E0234",
        primary: "#FB7185",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "liquid_cream",
      centerIcon: "🍧",
      progressBarColorLight: "#F59E0B",
      progressBarColorDark: "#FB7185",
      backgroundType: "solid",
      backgroundValueLight: "#FFFDF7",
      backgroundValueDark: "#2E0234",
      phrases: [
        "Misturando o açaí artesanal com frutas selecionadas...",
        "Textura aveludada e aroma irresistível...",
        "Seu momento doce dourado está pronto!",
      ],
      rotationInterval: 2200,
      minDuration: 1200,
    },
  },
  {
    id: "clean_fresh",
    name: "Clean Fresh",
    category: "classic",
    categoryLabel: "Tema Clássico",
    subtitle: "Minimalismo Moderno",
    description: "Fundo off-white neutro com detalhes em Verde Esmeralda Menta e contraste equilibrado.",
    badge: "Minimalista",
    icon: "🍓",
    previewBgLight: "#F8FAFC",
    previewBgDark: "#18181B",
    primaryLight: "#059669",
    primaryDark: "#10B981",
    storefront: {
      light: {
        baseColor: "#F8FAFC",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#F8FAFC",
        primary: "#059669",
      },
      dark: {
        baseColor: "#18181B",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#121214",
        footerBg: "#18181B",
        primary: "#10B981",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "playful_bounce",
      centerIcon: "🍓",
      progressBarColorLight: "#059669",
      progressBarColorDark: "#10B981",
      backgroundType: "solid",
      backgroundValueLight: "#F8FAFC",
      backgroundValueDark: "#18181B",
      phrases: [
        "Separando os acompanhamentos mais frescos...",
        "Ingredientes 100% naturais e selecionados...",
        "Prontinho para surpreender seu paladar!",
      ],
      rotationInterval: 2200,
      minDuration: 1200,
    },
  },

  // ── ABA 2: TEMAS DINÂMICOS (2 Presets com Canvas Interativo) ──
  {
    id: "noctalia_mesh",
    name: "Noctalia Mesh",
    category: "dynamic",
    categoryLabel: "Tema Dinâmico",
    subtitle: "Inspirado no Noctalia.dev",
    description: "Malha de gradiente orgânico e suave com partículas reativas ao movimento do cursor e toque.",
    badge: "Canvas 60fps",
    icon: "✨",
    previewBgLight: "radial-gradient(circle at center, #F8F9FE 0%, #EEF2FF 100%)",
    previewBgDark: "radial-gradient(circle at center, #111827 0%, #0B0F19 100%)",
    primaryLight: "#6366F1",
    primaryDark: "#818CF8",
    storefront: {
      light: {
        baseColor: "#F8F9FE",
        gradient: "",
        texture: "dots",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#F8F9FE",
        primary: "#6366F1",
      },
      dark: {
        baseColor: "#0B0F19",
        gradient: "",
        texture: "dots",
        textureOpacity: 0.12,
        headerBg: "#070A10",
        footerBg: "#0B0F19",
        primary: "#818CF8",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "minimal_pulse",
      centerIcon: "✨",
      progressBarColorLight: "#6366F1",
      progressBarColorDark: "#818CF8",
      backgroundType: "dynamic",
      backgroundValueLight: "noctalia_mesh",
      backgroundValueDark: "noctalia_mesh",
      dynamicStyle: "noctalia_mesh",
      phrases: [
        "Sincronizando malha dinâmica do cardápio...",
        "Conectando partículas artesanais...",
        "Experiência interativa pronta!",
      ],
      rotationInterval: 2000,
      minDuration: 1200,
    },
  },
  {
    id: "fluid_orbs",
    name: "Fluid Orbs",
    category: "dynamic",
    categoryLabel: "Tema Dinâmico",
    subtitle: "Líquido em Movimento",
    description: "Esferas e orbes de luz suaves flutuando continuamente no background com desfoque gaussian blur.",
    badge: "Spotlight Fluido",
    icon: "🥣",
    previewBgLight: "radial-gradient(circle at center, #FFF9F2 0%, #FAF5FF 100%)",
    previewBgDark: "radial-gradient(circle at center, #2F0E2D 0%, #18041F 100%)",
    primaryLight: "#9333EA",
    primaryDark: "#C084FC",
    storefront: {
      light: {
        baseColor: "#FAF5FF",
        gradient: "",
        texture: "organic",
        textureOpacity: 0.15,
        headerBg: "#FFFFFF",
        footerBg: "#FAF5FF",
        primary: "#9333EA",
      },
      dark: {
        baseColor: "#18041F",
        gradient: "",
        texture: "organic",
        textureOpacity: 0.15,
        headerBg: "#120317",
        footerBg: "#18041F",
        primary: "#C084FC",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "liquid_cream",
      centerIcon: "🥣",
      progressBarColorLight: "#9333EA",
      progressBarColorDark: "#C084FC",
      backgroundType: "dynamic",
      backgroundValueLight: "fluid_orbs",
      backgroundValueDark: "fluid_orbs",
      dynamicStyle: "fluid_orbs",
      phrases: [
        "Fluidez e cremosidade em perfeita harmonia...",
        "Orquestrando os melhores sabores...",
        "Pronto para surpreender seu paladar!",
      ],
      rotationInterval: 2400,
      minDuration: 1400,
    },
  },
];
