export type ThemeCategory = "solid" | "gradient" | "dynamic" | "custom";

export interface HarmonizedThemePreset {
  id: string;
  name: string;
  category: ThemeCategory;
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
    dynamicStyle?: "constellation" | "aurora_orbs";
    phrases: string[];
    rotationInterval: number;
    minDuration: number;
  };
}

export const HARMONIZED_PRESETS: HarmonizedThemePreset[] = [
  // ── A. Temas de Cor Sólida & Minimalista ──
  {
    id: "acai_traditional",
    name: "Açaí Tradicional",
    category: "solid",
    categoryLabel: "Cor Sólida & Minimalista",
    subtitle: "Clean & Elegante",
    description: "Creme suave no fundo com roxo açaí nobre e cabeçalho translúcido.",
    badge: "Artesanal",
    icon: "🥣",
    previewBgLight: "#FDFBF7",
    previewBgDark: "#1A091D",
    primaryLight: "#4A0E4E",
    primaryDark: "#E899FF",
    storefront: {
      light: {
        baseColor: "#FDFBF7",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#FDFBF7",
        primary: "#4A0E4E",
      },
      dark: {
        baseColor: "#1A091D",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#120514",
        footerBg: "#1A091D",
        primary: "#E899FF",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "liquid_cream",
      centerIcon: "🥣",
      progressBarColorLight: "#4A0E4E",
      progressBarColorDark: "#E899FF",
      backgroundType: "solid",
      backgroundValueLight: "#FDFBF7",
      backgroundValueDark: "#1A091D",
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
    id: "dark_minimalist",
    name: "Dark Minimalist",
    category: "solid",
    categoryLabel: "Cor Sólida & Minimalista",
    subtitle: "Moderno & Noturno",
    description: "Preto fosco profundo com contraste puro em branco e ícone pulsante.",
    badge: "Minimalista",
    icon: "✨",
    previewBgLight: "#F4F4F5",
    previewBgDark: "#121212",
    primaryLight: "#18181B",
    primaryDark: "#FFFFFF",
    storefront: {
      light: {
        baseColor: "#F4F4F5",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#F4F4F5",
        primary: "#18181B",
      },
      dark: {
        baseColor: "#121212",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#181818",
        footerBg: "#121212",
        primary: "#FFFFFF",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "minimal_pulse",
      centerIcon: "✨",
      progressBarColorLight: "#18181B",
      progressBarColorDark: "#FFFFFF",
      backgroundType: "solid",
      backgroundValueLight: "#F4F4F5",
      backgroundValueDark: "#121212",
      phrases: [
        "Inicializando cardápio minimalista...",
        "Carregando produtos exclusivos...",
        "Tudo pronto para sua experiência...",
      ],
      rotationInterval: 2000,
      minDuration: 1000,
    },
  },

  // ── B. Temas de Gradiente ──
  {
    id: "acai_sunset",
    name: "Açaí Sunset",
    category: "gradient",
    categoryLabel: "Gradiente Moderno & Fluido",
    subtitle: "Linear & Vibrante",
    description: "Degradê de Roxo Intenso para Magenta Tropical com barra dourada.",
    badge: "Pôr do Sol",
    icon: "🍧",
    previewBgLight: "linear-gradient(135deg, #3B0764 0%, #BE185D 100%)",
    previewBgDark: "linear-gradient(135deg, #260440 0%, #831843 100%)",
    primaryLight: "#F59E0B",
    primaryDark: "#FBBF24",
    storefront: {
      light: {
        baseColor: "#3B0764",
        gradient: "linear-gradient(135deg, #3B0764 0%, #BE185D 100%)",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#2D054E",
        footerBg: "#9D174D",
        primary: "#F59E0B",
      },
      dark: {
        baseColor: "#260440",
        gradient: "linear-gradient(135deg, #260440 0%, #831843 100%)",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#1C0330",
        footerBg: "#50072B",
        primary: "#FBBF24",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "liquid_cream",
      centerIcon: "🍧",
      progressBarColorLight: "#FBBF24",
      progressBarColorDark: "#FBBF24",
      backgroundType: "gradient",
      backgroundValueLight: "linear-gradient(135deg, #3B0764 0%, #BE185D 100%)",
      backgroundValueDark: "linear-gradient(135deg, #260440 0%, #831843 100%)",
      phrases: [
        "Misturando as cores do pôr do sol...",
        "Açaí cremoso com brilho tropical...",
        "Seu momento dourado está pronto!",
      ],
      rotationInterval: 2200,
      minDuration: 1200,
    },
  },
  {
    id: "tropical_fresh",
    name: "Tropical Fresh",
    category: "gradient",
    categoryLabel: "Gradiente Moderno & Fluido",
    subtitle: "Diagonal & Refrescante",
    description: "Degradê Verde Esmeralda para Turquesa com essência natural fresca.",
    badge: "Refrescante",
    icon: "🍓",
    previewBgLight: "linear-gradient(135deg, #065F46 0%, #0D9488 100%)",
    previewBgDark: "linear-gradient(135deg, #032B20 0%, #064E3B 100%)",
    primaryLight: "#10B981",
    primaryDark: "#34D399",
    storefront: {
      light: {
        baseColor: "#065F46",
        gradient: "linear-gradient(135deg, #065F46 0%, #0D9488 100%)",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#044E39",
        footerBg: "#0F766E",
        primary: "#10B981",
      },
      dark: {
        baseColor: "#032B20",
        gradient: "linear-gradient(135deg, #032B20 0%, #064E3B 100%)",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#021F17",
        footerBg: "#043629",
        primary: "#34D399",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "playful_bounce",
      centerIcon: "🍓",
      progressBarColorLight: "#10B981",
      progressBarColorDark: "#34D399",
      backgroundType: "gradient",
      backgroundValueLight: "linear-gradient(135deg, #065F46 0%, #0D9488 100%)",
      backgroundValueDark: "linear-gradient(135deg, #032B20 0%, #064E3B 100%)",
      phrases: [
        "Colhendo os ingredientes mais frescos...",
        "Energia tropical chegando na sua tela...",
        "Sabor fresco e natural pronto para servir!",
      ],
      rotationInterval: 2200,
      minDuration: 1200,
    },
  },

  // ── C. Temas Dinâmicos com Animações ──
  {
    id: "fluid_orbs",
    name: "Fluid Orbs",
    category: "dynamic",
    categoryLabel: "Dinâmico com Animações",
    subtitle: "Líquido em Movimento",
    description: "Esferas orgânicas suaves flutuando em baixa opacidade no background.",
    badge: "Spotlight Fluido",
    icon: "🥣",
    previewBgLight: "radial-gradient(circle at center, #FFF9F2 0%, #F7EEFF 100%)",
    previewBgDark: "radial-gradient(circle at center, #2F0E2D 0%, #150618 100%)",
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
      backgroundValueLight: "aurora_orbs",
      backgroundValueDark: "aurora_orbs",
      dynamicStyle: "aurora_orbs",
      phrases: [
        "Fluidez e cremosidade em perfeita harmonia...",
        "Orquestrando os melhores sabores...",
        "Pronto para surpreender seu paladar!",
      ],
      rotationInterval: 2400,
      minDuration: 1400,
    },
  },
  {
    id: "neon_constellation",
    name: "Neon Constellation",
    category: "dynamic",
    categoryLabel: "Dinâmico com Animações",
    subtitle: "Partículas & Brilho",
    description: "Partículas estelares conectadas por linhas finas e reação ao cursor.",
    badge: "Plexus Neon",
    icon: "✨",
    previewBgLight: "radial-gradient(circle at center, #FFF5FC 0%, #F4EAFF 100%)",
    previewBgDark: "radial-gradient(circle at center, #111A2E 0%, #070B14 100%)",
    primaryLight: "#0284C7",
    primaryDark: "#00F0FF",
    storefront: {
      light: {
        baseColor: "#F8FAFC",
        gradient: "",
        texture: "dots",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#F8FAFC",
        primary: "#0284C7",
      },
      dark: {
        baseColor: "#0B0F19",
        gradient: "",
        texture: "dots",
        textureOpacity: 0.12,
        headerBg: "#070A10",
        footerBg: "#0B0F19",
        primary: "#00F0FF",
      },
    },
    splashScreen: {
      enabled: true,
      theme: "minimal_pulse",
      centerIcon: "✨",
      progressBarColorLight: "#0284C7",
      progressBarColorDark: "#00F0FF",
      backgroundType: "dynamic",
      backgroundValueLight: "constellation",
      backgroundValueDark: "constellation",
      dynamicStyle: "constellation",
      phrases: [
        "Conectando partículas de sabor...",
        "Sincronizando constelação de delícias...",
        "Universo Pop Shake carregado com sucesso!",
      ],
      rotationInterval: 2000,
      minDuration: 1200,
    },
  },
];
