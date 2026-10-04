"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  loadingSettingsService,
  LoadingSettingsData,
  resolveBackgroundCss,
  LOADING_UPDATED_EVENT,
} from "../../services/loadingSettingsService";
import { DynamicCanvasBackground } from "./DynamicCanvasBackground";
import { getContrastTextColor } from "../admin/visual-identity/themePresets";

function hexToHslChannels(hex: string): string | null {
  const cleanHex = hex.replace(/^#/, "").trim();
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split("").map((c) => c + c).join("");
  }
  if (fullHex.length !== 6) return null;
  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function GlobalBackgroundSync() {
  const { theme, resolvedTheme, isDark: contextIsDark } = useTheme();
  const [settings, setSettings] = useState<LoadingSettingsData>(() =>
    loadingSettingsService.getCachedLoadingSettings()
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    setMounted(true);
    loadingSettingsService.getLoadingSettings().then((remote) => {
      if (active) setSettings(remote);
    });

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<LoadingSettingsData>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };

    window.addEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    return () => {
      active = false;
      window.removeEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  // Injeta variáveis CSS no :root e background no <body>
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;

    const isDark = contextIsDark ?? ((resolvedTheme || theme) === "dark");
    const modeConfig = isDark
      ? settings.advancedConfig?.storefront?.dark
      : settings.advancedConfig?.storefront?.light;

    const themeType =
      settings.advancedConfig?.themeType ||
      (isDark ? settings.bgTypeDark : settings.bgTypeLight) ||
      "solid";

    const baseColor =
      modeConfig?.baseColor || (isDark ? "#121212" : "#FDFBF7");

    const primaryColor =
      modeConfig?.primary || (isDark ? "#E899FF" : "#4A0E4E");

    const headerBg =
      modeConfig?.headerBg || (isDark ? "#181818" : "#FFFFFF");

    const footerBg =
      modeConfig?.footerBg || (isDark ? "#121212" : "#FDFBF7");

    const splashBg =
      settings.advancedConfig?.splashScreen?.backgroundValue ||
      resolveBackgroundCss(settings, isDark);

    const foreground = getContrastTextColor(baseColor);
    const textureOpacity = String(modeConfig?.textureOpacity ?? 0.1);
    const radius = "0.75rem";

    // Converte hex para canais HSL compatíveis com Tailwind hsl(var(--...))
    const primaryHslChannels = hexToHslChannels(primaryColor);
    const backgroundHslChannels = hexToHslChannels(baseColor);
    const foregroundHslChannels = hexToHslChannels(foreground);

    // Injeta variáveis semânticas no :root do CSS (WCAG AA & Design System)
    document.documentElement.style.setProperty(
      "--background",
      backgroundHslChannels || (isDark ? "222 47% 11%" : "210 17% 98%")
    );
    document.documentElement.style.setProperty(
      "--foreground",
      foregroundHslChannels || (isDark ? "210 40% 98%" : "296 33% 23%")
    );
    document.documentElement.style.setProperty("--background-hex", baseColor);
    document.documentElement.style.setProperty("--foreground-hex", foreground);
    document.documentElement.style.setProperty("--primary", primaryHslChannels || primaryColor);
    document.documentElement.style.setProperty("--primary-hex", primaryColor);
    document.documentElement.style.setProperty("--header-bg", headerBg);
    document.documentElement.style.setProperty("--footer-bg", footerBg);
    document.documentElement.style.setProperty("--radius", radius);
    document.documentElement.style.setProperty("--texture-opacity", textureOpacity);
    document.documentElement.style.setProperty("--splash-bg", splashBg);
    document.documentElement.style.setProperty("--theme-type", themeType);

    // Aplica o background na página
    const bgType = isDark ? (settings.bgTypeDark || "gradient") : (settings.bgTypeLight || "gradient");
    const bgValue = isDark ? (settings.bgValueDark || "preset_dark_violet") : (settings.bgValueLight || "preset_cream");
    const currentThemeId = settings.advancedConfig?.themeId || "";
    const isDynamic =
      bgType === "dynamic" ||
      settings.advancedConfig?.themeType === "dynamic" ||
      currentThemeId === "aurora_mesh" ||
      currentThemeId === "fluid_orbs" ||
      currentThemeId === "noctalia_mesh";

    const isFluid =
      currentThemeId === "fluid_orbs" ||
      settings.advancedConfig?.splashScreen?.dynamicStyle === "fluid_orbs" ||
      bgValue === "fluid_orbs" ||
      bgValue === "aurora_orbs";

    let baseCss = resolveBackgroundCss(settings, isDark);
    if (isDynamic) {
      baseCss = isDark
        ? isFluid
          ? "radial-gradient(circle at 50% 30%, #2F0E2D 0%, #18041F 100%)"
          : "radial-gradient(circle at 50% 30%, #111827 0%, #0B0F19 100%)"
        : isFluid
        ? "radial-gradient(circle at 50% 30%, #FFF9F2 0%, #FAF5FF 100%)"
        : "radial-gradient(circle at 50% 30%, #F8F9FE 0%, #EEF2FF 100%)";
    } else if (modeConfig?.gradient && modeConfig.gradient.trim() !== "") {
      baseCss = modeConfig.gradient;
    } else if (modeConfig?.baseColor) {
      baseCss = modeConfig.baseColor;
    }

    document.body.style.background = baseCss;
    document.body.style.backgroundAttachment = "fixed";
  }, [settings, theme, mounted]);

  // Sincroniza o favicon dinâmico no <head> do navegador com fallback seguro
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;

    const faviconHref = settings.faviconUrl || "/favicon.ico";
    if (faviconHref === "/favicon.ico") {
      const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      iconLinks.forEach((link) => {
        link.href = "/favicon.ico";
      });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      if (iconLinks.length > 0) {
        iconLinks.forEach((link) => {
          link.href = faviconHref;
        });
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = faviconHref;
        document.head.appendChild(newLink);
      }
    };
    img.onerror = () => {
      const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      iconLinks.forEach((link) => {
        link.href = "/favicon.ico";
      });
    };
    img.src = faviconHref;
  }, [settings.faviconUrl, mounted]);

  if (!mounted) return null;

  const isDark = theme === "dark";
  const bgType = isDark ? (settings.bgTypeDark || "gradient") : (settings.bgTypeLight || "gradient");
  const bgValue = isDark ? (settings.bgValueDark || "preset_dark_violet") : (settings.bgValueLight || "preset_cream");
  const themeId = settings.advancedConfig?.themeId || "";

  const isDynamicTheme =
    bgType === "dynamic" ||
    settings.advancedConfig?.themeType === "dynamic" ||
    themeId === "aurora_mesh" ||
    themeId === "fluid_orbs" ||
    themeId === "noctalia_mesh";

  if (isDynamicTheme) {
    const isFluid =
      themeId === "fluid_orbs" ||
      settings.advancedConfig?.splashScreen?.dynamicStyle === "fluid_orbs" ||
      bgValue === "fluid_orbs" ||
      bgValue === "aurora_orbs";

    const canvasStyle: "aurora_mesh" | "fluid_orbs" = isFluid ? "fluid_orbs" : "aurora_mesh";

    return (
      <div
        id="popclub-dynamic-canvas-container"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <DynamicCanvasBackground
          style={canvasStyle}
          isDark={isDark}
          className="w-full h-full"
        />
      </div>
    );
  }

  return null;
}
