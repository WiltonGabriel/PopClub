"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Palette,
  Sparkles,
  Sun,
  Moon,
  Save,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Layers,
  Wand2,
  Eye,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  loadingSettingsService,
  LoadingSettingsData,
  LoadingTheme,
  BackgroundType,
  DEFAULT_LOADING_SETTINGS,
  LIGHT_GRADIENT_PRESETS,
  DARK_GRADIENT_PRESETS,
  LIGHT_PATTERN_PRESETS,
  DARK_PATTERN_PRESETS,
  resolveBackgroundCss,
} from "@/services/loadingSettingsService";
import { PopShakeLoading } from "@/components/ui/PopShakeLoading";
import { useToast } from "@/components/ui/ToastNotification";

const ICON_PRESETS = ["🥣", "🍧", "🍦", "🥤", "🍓", "✨", "🍨", "🥞", "🍒", "🍫"];

const SOLID_LIGHT_SWATCHES = [
  { label: "Branco Puro", hex: "#FFFFFF" },
  { label: "Lavanda Suave", hex: "#FBF8FD" },
  { label: "Creme Baunilha", hex: "#FFFDF9" },
  { label: "Rosa Algodão", hex: "#FFF5FA" },
  { label: "Menta Claro", hex: "#F2FBF6" },
];

const SOLID_DARK_SWATCHES = [
  { label: "Açaí Profundo", hex: "#190B1A" },
  { label: "Noite Roxa", hex: "#120713" },
  { label: "Obsidiana Dark", hex: "#0E050F" },
  { label: "Vinho Escuro", hex: "#200922" },
  { label: "Café Gourmet", hex: "#180D15" },
];

export function VisualIdentitySection() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<LoadingSettingsData>(
    loadingSettingsService.getCachedLoadingSettings()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modo de cor exclusivo para o Mock de Pré-Visualização
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");

  // Sub-aba ativa na personalização de fundo: 'light' ou 'dark'
  const [activeBgTab, setActiveBgTab] = useState<"light" | "dark">("light");

  // Estado para inserção de nova frase
  const [newPhraseInput, setNewPhraseInput] = useState("");

  // Busca inicial das preferências
  useEffect(() => {
    let isMounted = true;
    loadingSettingsService
      .getLoadingSettings()
      .then((data) => {
        if (isMounted) {
          setSettings(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Adicionar Frase
  const handleAddPhrase = () => {
    const trimmed = newPhraseInput.trim();
    if (!trimmed) return;
    setSettings((prev) => ({
      ...prev,
      phrases: [...prev.phrases, trimmed],
    }));
    setNewPhraseInput("");
  };

  // Remover Frase
  const handleRemovePhrase = (indexToRemove: number) => {
    if (settings.phrases.length <= 1) {
      showToast({
        title: "Atenção",
        message: "Mantenha ao menos uma mensagem de carregamento ativa.",
        type: "warning",
      });
      return;
    }
    setSettings((prev) => ({
      ...prev,
      phrases: prev.phrases.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Atualizar Frase existente
  const handleUpdatePhrase = (index: number, val: string) => {
    setSettings((prev) => {
      const nextPhrases = [...prev.phrases];
      nextPhrases[index] = val;
      return { ...prev, phrases: nextPhrases };
    });
  };

  // Restaurar frases padrão
  const handleResetPhrases = () => {
    setSettings((prev) => ({
      ...prev,
      phrases: [...DEFAULT_LOADING_SETTINGS.phrases],
    }));
    showToast({
      title: "Mensagens Restauradas",
      message: "Frases originais da Pop Shake redefinidas.",
      type: "info",
    });
  };

  // Salvar Toda a Identidade Visual
  const handleSaveAll = async () => {
    if (settings.phrases.length === 0 || settings.phrases.every((p) => !p.trim())) {
      showToast({
        title: "Mensagem Obrigatória",
        message: "Adicione ao menos uma mensagem de carregamento antes de salvar.",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      await loadingSettingsService.updateLoadingSettings(settings);
      showToast({
        title: "Identidade Visual Salva!",
        message: "As configurações de fundo e loading foram atualizadas com sucesso.",
        type: "success",
      });
    } catch (err: any) {
      showToast({
        title: "Erro ao Salvar",
        message: err.message || "Não foi possível salvar as configurações visuais.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Computa o CSS de fundo a ser exibido no Live Preview Mock
  const activePreviewBackground = useMemo(() => {
    return resolveBackgroundCss(settings, previewMode === "dark");
  }, [settings, previewMode]);

  return (
    <div className="space-y-6">
      {/* ── CABEÇALHO DO MÓDULO UNIFICADO ── */}
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[#9306CF] dark:text-[#E899FF]">
              <Palette className="w-5 h-5" />
            </span>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
              Aparência & Identidade Visual
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono">
              Live Customizer
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-2xl">
            Personalize a estética de fundo da vitrine e a animação da tela de carregamento com adaptação independente para os modos Claro e Escuro.
          </p>
        </div>

        {/* Botão de Salvar no Topo */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || loading}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 active:scale-[0.98] text-white text-xs uppercase tracking-wider shadow-md shadow-[#9306CF]/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Identidade Visual</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── GRID PRINCIPAL: CONFIGURAÇÕES (ESQ) + LIVE PREVIEW MOCK (DIR) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: CONTROLES DE FUNDO E LOADING (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ══════════════════════════════════════════
              CARD 1: PERSONALIZAÇÃO DE FUNDO (BACKGROUND)
              ══════════════════════════════════════════ */}
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 dark:border-[#512B54]/30 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#9306CF]" />
                <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-[#4C264F] dark:text-[#F9F5F9]">
                  Fundo da Vitrine & Aplicação
                </h3>
              </div>

              {/* Sub-abas: Modo Claro vs Modo Escuro */}
              <div className="flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-[#180A1A] border border-gray-200 dark:border-[#512B54]/40 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBgTab("light");
                    setPreviewMode("light");
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeBgTab === "light"
                      ? "bg-white dark:bg-[#2F1333] text-amber-700 dark:text-amber-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Modo Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBgTab("dark");
                    setPreviewMode("dark");
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeBgTab === "dark"
                      ? "bg-white dark:bg-[#2F1333] text-purple-700 dark:text-purple-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-[#9306CF] dark:text-[#E899FF]" />
                  <span>Modo Escuro</span>
                </button>
              </div>
            </div>

            {/* SELEÇÃO DO TIPO DE FUNDO PARA A ABA ATIVA */}
            {(() => {
              const isDark = activeBgTab === "dark";
              const currentType = isDark ? settings.bgTypeDark : settings.bgTypeLight;
              const currentValue = isDark ? settings.bgValueDark : settings.bgValueLight;
              const currentCustom = isDark ? (settings.bgCustomDark || "#190B1A") : (settings.bgCustomLight || "#FBF8FD");

              const updateType = (t: BackgroundType) => {
                setSettings((prev) =>
                  isDark ? { ...prev, bgTypeDark: t } : { ...prev, bgTypeLight: t }
                );
              };

              const updateValue = (v: string) => {
                setSettings((prev) =>
                  isDark ? { ...prev, bgValueDark: v } : { ...prev, bgValueLight: v }
                );
              };

              const updateCustom = (c: string) => {
                setSettings((prev) =>
                  isDark ? { ...prev, bgCustomDark: c } : { ...prev, bgCustomLight: c }
                );
              };

              return (
                <div className="space-y-4">
                  {/* Seletor de Tipo: Gradiente / Sólido / Textura */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Estilo de Fundo ({isDark ? "Modo Escuro" : "Modo Claro"}):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: "gradient" as BackgroundType, label: "Gradiente Temático", icon: Wand2 },
                        { type: "solid" as BackgroundType, label: "Cor Sólida", icon: Palette },
                        { type: "pattern" as BackgroundType, label: "Textura Sutil", icon: Layers },
                      ].map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateType(type)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            currentType === type
                              ? "border-[#9306CF] bg-purple-50/70 dark:bg-purple-950/30 text-[#9306CF] dark:text-[#E899FF] ring-2 ring-[#9306CF]/20"
                              : "border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* OPÇÃO A: GRADIENTES TEMÁTICOS */}
                  {currentType === "gradient" && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        Selecione um gradiente harmonioso da marca:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(isDark ? DARK_GRADIENT_PRESETS : LIGHT_GRADIENT_PRESETS).map((p) => {
                          const isSelected = currentValue === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => updateValue(p.id)}
                              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-[#9306CF] bg-purple-50/60 dark:bg-purple-950/30 ring-2 ring-[#9306CF]/30"
                                  : "border-gray-200 dark:border-[#512B54]/30 hover:border-gray-300 dark:hover:border-[#512B54]/70"
                              }`}
                            >
                              <div
                                className="w-9 h-9 rounded-lg shrink-0 border border-black/10 shadow-xs"
                                style={{ background: p.previewBg }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                                  <span>{p.label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#9306CF]" />}
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                  {p.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* OPÇÃO B: COR SÓLIDA PERSONALIZADA */}
                  {currentType === "solid" && (
                    <div className="space-y-3">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        Escolha uma cor sólida ou digite o valor hexadecimal:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(isDark ? SOLID_DARK_SWATCHES : SOLID_LIGHT_SWATCHES).map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => updateCustom(swatch.hex)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                              currentCustom.toLowerCase() === swatch.hex.toLowerCase()
                                ? "border-[#9306CF] ring-2 ring-[#9306CF]/30 bg-purple-50/50 dark:bg-purple-950/30 font-bold"
                                : "border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-black/15 shadow-xs"
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <span>{swatch.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Seletor Livre Hexadecimal */}
                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="color"
                          value={currentCustom.startsWith("#") && currentCustom.length === 7 ? currentCustom : (isDark ? "#190B1A" : "#FFFFFF")}
                          onChange={(e) => updateCustom(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-gray-300 dark:border-[#512B54]/60 bg-transparent p-0.5 shadow-xs"
                          title="Seletor de cor livre"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={currentCustom}
                            onChange={(e) => updateCustom(e.target.value)}
                            placeholder={isDark ? "#190B1A" : "#FFFFFF"}
                            className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-200 dark:border-[#512B54]/50 bg-gray-50 dark:bg-[#1A0A1C] text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OPÇÃO C: TEXTURAS SUTIS DA MARCA */}
                  {currentType === "pattern" && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        Selecione uma textura sutil de fundo:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(isDark ? DARK_PATTERN_PRESETS : LIGHT_PATTERN_PRESETS).map((p) => {
                          const isSelected = currentValue === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => updateValue(p.id)}
                              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-[#9306CF] bg-purple-50/60 dark:bg-purple-950/30 ring-2 ring-[#9306CF]/30"
                                  : "border-gray-200 dark:border-[#512B54]/30 hover:border-gray-300 dark:hover:border-[#512B54]/70"
                              }`}
                            >
                              <div
                                className="w-9 h-9 rounded-lg shrink-0 border border-black/15 shadow-xs"
                                style={{ background: p.previewBg }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                                  <span>{p.label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#9306CF]" />}
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                  {p.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ══════════════════════════════════════════
              CARD 2: GESTÃO DA TELA DE CARREGAMENTO (LOADING)
              ══════════════════════════════════════════ */}
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#512B54]/30 pb-3">
              <Sparkles className="w-4 h-4 text-[#9306CF]" />
              <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-[#4C264F] dark:text-[#F9F5F9]">
                Tela de Carregamento (Loading Screen)
              </h3>
            </div>

            {/* SELEÇÃO DOS 3 TEMAS VISUAIS */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Estilo Visual da Animação (3 Temas com Modo Claro & Escuro):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "liquid_cream" as LoadingTheme,
                    title: "Líquido & Fluido",
                    desc: "Ondas e preenchimento cremoso artesanal",
                    badge: "Padrão Pop",
                  },
                  {
                    id: "playful_bounce" as LoadingTheme,
                    title: "Flutuação & Bounce",
                    desc: "Animação saltitante e alegre em órbita",
                    badge: "Divertido",
                  },
                  {
                    id: "minimal_pulse" as LoadingTheme,
                    title: "Minimalista",
                    desc: "Linhas finas, anel sutil e pulso elegante",
                    badge: "Refinado",
                  },
                ].map((item) => {
                  const isSelected = settings.theme === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSettings((prev) => ({ ...prev, theme: item.id }))}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#9306CF] bg-purple-50/70 dark:bg-purple-950/30 ring-2 ring-[#9306CF]/30 shadow-xs"
                          : "border-gray-200 dark:border-[#512B54]/30 hover:border-gray-300 dark:hover:border-[#512B54]/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          {item.title}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#9306CF]" />}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ELEMENTO GRÁFICO CENTRAL */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Elemento Gráfico Central (Emoji ou Símbolo):
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {ICON_PRESETS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, centerIcon: icon }))}
                    className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                      settings.centerIcon === icon
                        ? "border-[#9306CF] bg-purple-50 dark:bg-purple-950/40 ring-2 ring-[#9306CF]/30 scale-105"
                        : "border-gray-200 dark:border-[#512B54]/30 hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={4}
                    value={settings.centerIcon}
                    onChange={(e) => setSettings((prev) => ({ ...prev, centerIcon: e.target.value }))}
                    className="w-14 text-center text-sm px-2 py-1.5 rounded-xl border border-gray-200 dark:border-[#512B54]/50 bg-gray-50 dark:bg-[#1A0A1C]"
                    placeholder="Outro"
                  />
                  <span className="text-[10px] text-gray-400">Custom</span>
                </div>
              </div>
            </div>

            {/* GERENCIAMENTO DE MENSAGENS ROTATIVAS */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Frases Rotativas Dinâmicas ({settings.phrases.length}):
                </label>
                <button
                  type="button"
                  onClick={handleResetPhrases}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-300 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar Frases Padrão</span>
                </button>
              </div>

              {/* Lista de frases existentes */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {settings.phrases.map((phrase, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400 w-4 text-right">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={phrase}
                      onChange={(e) => handleUpdatePhrase(idx, e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#512B54]/40 bg-gray-50/80 dark:bg-[#1A0A1C] text-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhrase(idx)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                      title="Excluir frase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Inserir nova frase */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newPhraseInput}
                  onChange={(e) => setNewPhraseInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPhrase()}
                  placeholder="Ex: Finalizando a calda especial de morango..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-[#512B54]/50 bg-white dark:bg-[#1A0A1C]"
                />
                <button
                  type="button"
                  onClick={handleAddPhrase}
                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 hover:bg-purple-200 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* TEMPOS E RITMO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100 dark:border-[#512B54]/30">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#9306CF]" />
                  <span>Troca de Frases:</span>
                </label>
                <select
                  value={settings.rotationInterval}
                  onChange={(e) => setSettings((prev) => ({ ...prev, rotationInterval: Number(e.target.value) }))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#512B54]/50 bg-gray-50 dark:bg-[#1A0A1C]"
                >
                  <option value={1500}>1.5 segundos (Ágil)</option>
                  <option value={2000}>2.0 segundos (Rápido)</option>
                  <option value={2400}>2.4 segundos (Recomendado)</option>
                  <option value={3000}>3.0 segundos (Tranquilo)</option>
                  <option value={4000}>4.0 segundos (Suave)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#9306CF]" />
                  <span>Duração Mínima (Anti-flicker):</span>
                </label>
                <select
                  value={settings.minDuration}
                  onChange={(e) => setSettings((prev) => ({ ...prev, minDuration: Number(e.target.value) }))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#512B54]/50 bg-gray-50 dark:bg-[#1A0A1C]"
                >
                  <option value={400}>400ms (Mínimo)</option>
                  <option value={600}>600ms (Leve)</option>
                  <option value={800}>800ms (Recomendado)</option>
                  <option value={1200}>1.2s (Elegante)</option>
                  <option value={1600}>1.6s (Prolongado)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: LIVE PREVIEW MOCK INTERATIVO (5/12) */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#9306CF]" />
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4C264F] dark:text-[#F9F5F9]">
                  Live Preview em Tempo Real
                </h4>
              </div>

              {/* Botão Alternador Claro / Escuro do Mock */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-[#180A1A] border border-gray-200 dark:border-[#512B54]/40 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewMode("light")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    previewMode === "light"
                      ? "bg-white text-amber-600 shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                  title="Testar em Modo Claro"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("dark")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    previewMode === "dark"
                      ? "bg-[#2F1333] text-purple-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                  title="Testar em Modo Escuro"
                >
                  <Moon className="w-3.5 h-3.5 text-[#9306CF] dark:text-[#E899FF]" />
                  <span>Escuro</span>
                </button>
              </div>
            </div>

            {/* QUADRO MOCK DA APLICAÇÃO (COM O FUNDO ESCOLHIDO + LOADING) */}
            <div
              className="relative rounded-2xl border border-gray-300/70 dark:border-[#512B54]/70 p-6 min-h-[360px] flex flex-col items-center justify-center shadow-inner overflow-hidden transition-all duration-300"
              style={{ background: activePreviewBackground }}
            >
              {/* Badge indicando simulação */}
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 text-white text-[9px] font-mono backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Simulação: Vitrine + Loading</span>
              </div>

              {/* Card simulado de Loading */}
              <div className="w-full max-w-xs rounded-3xl bg-white/90 dark:bg-[#1E0921]/90 backdrop-blur-md border border-purple-200/80 dark:border-[#512B54]/70 shadow-2xl p-2 transition-colors duration-200">
                <PopShakeLoading
                  overrideSettings={settings}
                  previewColorMode={previewMode}
                />
              </div>
            </div>

            {/* Botão de Salvar no Mock */}
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="w-full inline-flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 active:scale-[0.98] text-white text-xs uppercase tracking-wider shadow-md shadow-[#9306CF]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando Identidade Visual...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SALVAR IDENTIDADE VISUAL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
