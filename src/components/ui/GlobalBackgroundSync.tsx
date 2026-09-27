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

export function GlobalBackgroundSync() {
  const { theme } = useTheme();
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

    const isDark = theme === "dark";
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

    // Injeta as 6 variáveis no :root do CSS
    document.documentElement.style.setProperty("--background", baseColor);
    document.documentElement.style.setProperty("--primary", primaryColor);
    document.documentElement.style.setProperty("--header-bg", headerBg);
    document.documentElement.style.setProperty("--footer-bg", footerBg);
    document.documentElement.style.setProperty("--splash-bg", splashBg);
    document.documentElement.style.setProperty("--theme-type", themeType);

    // Aplica o background na página
    let baseCss = resolveBackgroundCss(settings, isDark);
    if (modeConfig?.gradient && modeConfig.gradient.trim() !== "") {
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

  if (bgType === "dynamic") {
    return (
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <DynamicCanvasBackground
          style={bgValue === "aurora_orbs" ? "aurora_orbs" : "constellation"}
          isDark={isDark}
          className="w-full h-full"
        />
      </div>
    );
  }

  return null;
}
