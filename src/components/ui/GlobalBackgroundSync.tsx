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

  useEffect(() => {
    let mounted = true;
    loadingSettingsService.getLoadingSettings().then((remote) => {
      if (mounted) setSettings(remote);
    });

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<LoadingSettingsData>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };

    window.addEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    return () => {
      mounted = false;
      window.removeEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  const isDark = theme === "dark";
  const bgType = isDark ? (settings.bgTypeDark || "gradient") : (settings.bgTypeLight || "gradient");
  const bgValue = isDark ? (settings.bgValueDark || "preset_dark_violet") : (settings.bgValueLight || "preset_cream");

  // Injeta o background estático ou a base do canvas diretamente no <body>
  useEffect(() => {
    if (typeof document === "undefined") return;

    const baseCss = resolveBackgroundCss(settings, isDark);
    document.body.style.background = baseCss;
    document.body.style.backgroundAttachment = "fixed";
  }, [settings, isDark]);

  // Sincroniza o favicon dinâmico no <head> do navegador
  useEffect(() => {
    if (typeof document === "undefined" || !settings.faviconUrl) return;

    const faviconHref = settings.faviconUrl;
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
  }, [settings.faviconUrl]);

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
