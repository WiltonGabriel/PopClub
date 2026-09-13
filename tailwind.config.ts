import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        /* ═══════════════════════════════════
           Shadcn semantic tokens (HSL vars)
           ═══════════════════════════════════ */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: "var(--color-surface)",
        success: "hsl(var(--success))",

        /* ═══════════════════════════════════
           Pop Shake Açaí — Brand Tokens
           bg-brand-pop-shake, text-brand-folha-acai, etc.
           ═══════════════════════════════════ */
        brand: {
          "pop-shake":      "#9306CF",
          "magenta":        "#940068",
          "acai-vibrante":  "#881BAA",
          "circulo-escuro": "#401E3F",
          "circulo-claro":  "#512B54",
          "circulo-maior":  "#940068",
          "acai-base":      "#4C264F",
          "folha-acai":     "#35A340",
          "folha-acai-dk":  "#2a8030",
          // Light surfaces
          "surface-0":      "#FFFFFF",
          "surface-1":      "#F8F9FA",
          "surface-2":      "#F4F4F5",
          "surface-3":      "#EEEEEF",
        },
      },
      borderRadius: {
        // Shadcn uses `lg`, `md`, `sm` via --radius var
        lg: "var(--radius)",               // 1rem = 16px
        md: "calc(var(--radius) - 4px)",   // 12px
        sm: "calc(var(--radius) - 8px)",   // 8px
        // Extra explicit values for Bento Grid
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "card-pop":   "0 2px 12px rgba(76, 38, 79, 0.08)",
        "card-hover": "0 8px 32px rgba(76, 38, 79, 0.16)",
        "brand-glow": "0 0 20px rgba(147, 6, 207, 0.3)",
        "green-clay": "0 6px 0 #2a8030, 0 8px 24px rgba(53,163,64,.35)",
      },
      animation: {
        "fade-in":       "fadeIn 0.3s ease forwards",
        "slide-up":      "slideUp 0.35s ease forwards",
        "slide-in-right":"slideInRight 0.3s ease forwards",
        "bounce-subtle": "bounceSub 0.4s ease",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
        bounceSub: {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.12)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
