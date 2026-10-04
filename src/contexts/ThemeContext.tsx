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
  } = useNextThemes();

  const [systemMatchesDark, setSystemMatchesDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const theme: Theme = (nextTheme as Theme) || "system";

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const onMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = e.matches;
      setSystemMatchesDark(matches);

      const activeChoice = (nextTheme as Theme) || localStorage.getItem("popshake-theme") || "system";
      if (activeChoice === "system") {
        document.documentElement.classList.toggle("dark", matches);
      }
    };

    onMediaChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onMediaChange);
    } else if ("addListener" in mediaQuery) {
      (mediaQuery as unknown as { addListener: (cb: (ev: MediaQueryListEvent) => void) => void }).addListener(onMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", onMediaChange);
      } else if ("removeListener" in mediaQuery) {
        (mediaQuery as unknown as { removeListener: (cb: (ev: MediaQueryListEvent) => void) => void }).removeListener(onMediaChange);
      }
    };
  }, [nextTheme]);

  const systemTheme: ResolvedTheme = systemMatchesDark ? "dark" : "light";
  const resolvedTheme: ResolvedTheme =
    theme === "system"
      ? systemTheme
      : (nextResolved as ResolvedTheme) ||
        (typeof document !== "undefined" && document.documentElement.classList.contains("dark")
          ? "dark"
          : (theme === "dark" ? "dark" : "light"));
  const isDark = resolvedTheme === "dark";

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setNextTheme(newTheme);
      if (typeof document !== "undefined") {
        if (newTheme === "system") {
          const matches =
            typeof window !== "undefined" && window.matchMedia
              ? window.matchMedia("(prefers-color-scheme: dark)").matches
              : false;
          document.documentElement.classList.toggle("dark", matches);
        } else {
          document.documentElement.classList.toggle("dark", newTheme === "dark");
        }
      }
    },
    [setNextTheme]
  );

  const toggleTheme = React.useCallback(() => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
  }, [isDark, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, systemTheme, isDark, setTheme, toggleTheme]
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
