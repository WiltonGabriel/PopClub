"use client";
import React, { useState } from "react";
import { Sun, Moon, RotateCcw } from "lucide-react";
import { LoadingSettingsData, AdvancedConfig } from "@/services/loadingSettingsService";

interface Props {
  settings: LoadingSettingsData;
  advancedConfig: AdvancedConfig;
  previewMode: "light" | "dark";
  setPreviewMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  onDiscard: () => void;
}

export function LivePreview({ settings, advancedConfig, previewMode, setPreviewMode, onDiscard }: Props) {
  const [activeTab, setActiveTab] = useState<"storefront" | "splash">("storefront");
  const config = previewMode === "light" ? advancedConfig.storefront.light : advancedConfig.storefront.dark;

  const bgStyle = {
    backgroundColor: config.baseColor,
    // Se tiver textura, renderizaremos um pseudo ou div absoluta
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("storefront")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${activeTab === "storefront" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            Vitrine
          </button>
          <button
            onClick={() => setActiveTab("splash")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${activeTab === "splash" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            Splash Screen
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode(previewMode === "light" ? "dark" : "light")}
            className="p-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors"
            title="Alternar Tema (Claro/Escuro)"
          >
            {previewMode === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onDiscard}
            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
            title="Descartar Alterações"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-muted/30">

        {/* Mobile Device Mockup */}
        <div
          className="relative w-full max-w-[320px] aspect-[9/19] rounded-[2.5rem] border-8 border-foreground/10 overflow-hidden shadow-2xl flex flex-col"
          style={bgStyle}
        >
          {activeTab === "storefront" ? (
            <>
              {/* Header */}
              <div
                className="h-16 w-full shrink-0 flex items-center px-4 shadow-sm backdrop-blur-md z-10"
                style={{ backgroundColor: `${config.headerBg}E6` }} // 90% opacity for glass effect
              >
                <div className="w-8 h-8 rounded-full bg-foreground/20 animate-pulse" />
                <div className="ml-3 h-4 w-24 rounded bg-foreground/20 animate-pulse" />
              </div>

              {/* Content */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto z-10 relative">
                {/* Banner Skeleton */}
                <div className="w-full h-32 rounded-xl bg-foreground/10 animate-pulse" />

                {/* Product Card */}
                <div className="w-full rounded-2xl bg-card p-3 shadow-md">
                  <div className="w-full h-24 rounded-xl bg-foreground/10 animate-pulse mb-3" />
                  <div className="h-4 w-3/4 rounded bg-foreground/20 mb-2" />
                  <div className="h-3 w-1/2 rounded bg-foreground/10 mb-3" />
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-4 w-16 rounded bg-primary/20" />
                    <div className="h-8 w-16 rounded-lg bg-primary" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="h-16 w-full shrink-0 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-md z-10"
                style={{ backgroundColor: `${config.footerBg}E6` }}
              >
                <div className="w-6 h-6 rounded-md bg-primary" />
                <div className="w-6 h-6 rounded-md bg-foreground/20" />
                <div className="w-6 h-6 rounded-md bg-foreground/20" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-20 h-20 rounded-3xl bg-card shadow-xl flex items-center justify-center text-4xl animate-bounce mb-6">
                {settings.centerIcon || "🥣"}
              </div>
              <div className="w-3/4 h-2 rounded-full bg-primary/20 overflow-hidden mb-6">
                <div className="w-1/2 h-full bg-primary rounded-full" />
              </div>
              <p className="text-xs text-foreground/70 font-medium">
                {settings.phrases[0] || "Carregando..."}
              </p>
            </div>
          )}

          {/* Texture Overlay */}
          {config.texture !== "none" && (
            <div
              className="absolute inset-0 pointer-events-none z-0 mix-blend-overlay"
              style={{
                opacity: config.textureOpacity,
                backgroundImage: config.texture === "dots" ? "radial-gradient(circle, #000 1px, transparent 1px)" : "none",
                backgroundSize: config.texture === "dots" ? "10px 10px" : "auto"
              }}
            />
          )}
        </div>

      </div>
    </div>
  );
}
