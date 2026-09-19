"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check } from "lucide-react";

export type FontSizeOption = "normal" | "large" | "xlarge";
export type ColorBlindModeOption = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "monochrome";

export interface AccessibilitySettings {
  fontSize: FontSizeOption;
  colorBlindMode: ColorBlindModeOption;
  highContrast: boolean;
  reduceMotion: boolean;
  visualAlerts: boolean;
  dyslexicFont: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  fontSize: "normal",
  colorBlindMode: "none",
  highContrast: false,
  reduceMotion: false,
  visualAlerts: false,
  dyslexicFont: false,
};

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  previewSettings: AccessibilitySettings;
  updatePreview: (partial: Partial<AccessibilitySettings>) => void;
  resetPreview: () => void;
  saveSettings: (customToSave?: AccessibilitySettings) => Promise<void>;
  isSaving: boolean;
  isVisualAlertFlashing: boolean;
  triggerVisualAlert: () => void;
  resetToDefaults: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  settings: DEFAULT_ACCESSIBILITY_SETTINGS,
  previewSettings: DEFAULT_ACCESSIBILITY_SETTINGS,
  updatePreview: () => {},
  resetPreview: () => {},
  saveSettings: async () => {},
  isSaving: false,
  isVisualAlertFlashing: false,
  triggerVisualAlert: () => {},
  resetToDefaults: () => {},
});

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

const STORAGE_KEY = "popshake-accessibility";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();

  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  });

  const [previewSettings, setPreviewSettings] = useState<AccessibilitySettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisualAlertFlashing, setIsVisualAlertFlashing] = useState(false);

  // Sincroniza configurações quando o usuário loga ou altera cadastro
  useEffect(() => {
    if (user?.accessibilitySettings) {
      const userSettings = {
        ...DEFAULT_ACCESSIBILITY_SETTINGS,
        ...user.accessibilitySettings,
      };
      setSettings(userSettings);
      setPreviewSettings(userSettings);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userSettings));
      } catch {}
    }
  }, [user?.id, user?.accessibilitySettings]);

  // Aplica as classes CSS no document.documentElement (html)
  const applyClassesToDOM = useCallback((cfg: AccessibilitySettings) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // 1. Font scale
    root.classList.remove("font-scale-large", "font-scale-xlarge");
    if (cfg.fontSize === "large") root.classList.add("font-scale-large");
    if (cfg.fontSize === "xlarge") root.classList.add("font-scale-xlarge");

    // 2. High contrast
    if (cfg.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // 3. Dyslexic font
    if (cfg.dyslexicFont) {
      root.classList.add("font-dyslexic");
    } else {
      root.classList.remove("font-dyslexic");
    }

    // 4. Reduce motion
    if (cfg.reduceMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }

    // 5. Colorblind modes
    root.classList.remove(
      "colorblind-none",
      "colorblind-protanopia",
      "colorblind-deuteranopia",
      "colorblind-tritanopia",
      "colorblind-monochrome"
    );
    if (cfg.colorBlindMode && cfg.colorBlindMode !== "none") {
      root.classList.add(`colorblind-${cfg.colorBlindMode}`);
    } else {
      root.classList.add("colorblind-none");
    }
  }, []);

  // Aplica preview visual imediatamente ao mudar
  useEffect(() => {
    applyClassesToDOM(previewSettings);
  }, [previewSettings, applyClassesToDOM]);

  // Dispara alerta luminoso visual
  const triggerVisualAlert = useCallback(() => {
    setIsVisualAlertFlashing(true);
    const timer = setTimeout(() => {
      setIsVisualAlertFlashing(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // Escuta eventos de som emitidos pela aplicação
  useEffect(() => {
    if (!previewSettings.visualAlerts) return;

    const handleSoundPlayed = () => {
      triggerVisualAlert();
    };

    window.addEventListener("popshake_sound_played", handleSoundPlayed);
    return () => window.removeEventListener("popshake_sound_played", handleSoundPlayed);
  }, [previewSettings.visualAlerts, triggerVisualAlert]);

  const updatePreview = (partial: Partial<AccessibilitySettings>) => {
    setPreviewSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetPreview = () => {
    setPreviewSettings(settings);
  };

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    setPreviewSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    applyClassesToDOM(DEFAULT_ACCESSIBILITY_SETTINGS);
  }, [applyClassesToDOM]);

  const saveSettings = async (customToSave?: AccessibilitySettings) => {
    const toSave = customToSave || previewSettings;
    setIsSaving(true);
    try {
      // Salva em localStorage cache imediatamente
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setSettings(toSave);
      setPreviewSettings(toSave);

      // Se autenticado, persiste na conta via API
      if (user) {
        const res = await fetch("/api/users/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessibilitySettings: toSave }),
        });
        if (!res.ok) {
          throw new Error("Não foi possível salvar na nuvem.");
        }
        await refreshUser();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        previewSettings,
        updatePreview,
        resetPreview,
        saveSettings,
        isSaving,
        isVisualAlertFlashing,
        triggerVisualAlert,
        resetToDefaults,
      }}
    >
      {/* Filtros SVG ocultos para correção de daltonismo */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          {/* Protanopia (baixa sensibilidade ao vermelho) */}
          <filter id="filter-protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567, 0.433, 0.000, 0, 0
                      0.558, 0.442, 0.000, 0, 0
                      0.000, 0.242, 0.758, 0, 0
                      0.000, 0.000, 0.000, 1, 0"
            />
          </filter>

          {/* Deuteranopia (baixa sensibilidade ao verde) */}
          <filter id="filter-deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625, 0.375, 0.000, 0, 0
                      0.700, 0.300, 0.000, 0, 0
                      0.000, 0.300, 0.700, 0, 0
                      0.000, 0.000, 0.000, 1, 0"
            />
          </filter>

          {/* Tritanopia (baixa sensibilidade ao azul/amarelo) */}
          <filter id="filter-tritanopia">
            <feColorMatrix
              type="matrix"
              values="0.950, 0.050, 0.000, 0, 0
                      0.000, 0.433, 0.567, 0, 0
                      0.000, 0.475, 0.525, 0, 0
                      0.000, 0.000, 0.000, 1, 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Barra de Alerta Visual Luminoso para Pessoas com Deficiência Auditiva */}
      {isVisualAlertFlashing && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed top-0 left-0 right-0 z-[9999] h-3 sm:h-3.5 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 animate-pulse shadow-lg shadow-amber-500/50 flex items-center justify-center pointer-events-none"
        >
          <span className="sr-only">Notificação sonora acionada na aplicação</span>
        </div>
      )}

      {children}
    </AccessibilityContext.Provider>
  );
}
