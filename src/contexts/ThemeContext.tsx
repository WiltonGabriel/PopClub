"use client";

import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextThemes } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  systemTheme: "light",
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

// Suprime aviso falso-positivo do React 19 em desenvolvimento para scripts síncronos de prevenção de FOUC
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
    origError.apply(console, args);
  };
}

function ThemeBridge({ children }: { children: React.ReactNode }) {
  const {
    theme: nextTheme,
    setTheme: setNextTheme,
    resolvedTheme: nextResolved,
    systemTheme: nextSystem,
  } = useNextThemes();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme: Theme = (nextTheme as Theme) || "system";
  const systemTheme: ResolvedTheme = (nextSystem as ResolvedTheme) || "light";
  const resolvedTheme: ResolvedTheme =
    (nextResolved as ResolvedTheme) ||
    (typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : systemTheme);
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    // Alterna entre light e dark respeitando a resolução atual
    const next = isDark ? "light" : "dark";
    setNextTheme(next);
  };

  const setTheme = (newTheme: Theme) => {
    setNextTheme(newTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, systemTheme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = "popshake-theme",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey={storageKey}
      {...props}
    >
      <ThemeBridge>{children}</ThemeBridge>
    </NextThemesProvider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
