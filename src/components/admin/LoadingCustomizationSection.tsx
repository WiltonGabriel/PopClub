"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Sun,
  Moon,
  Plus,
  Trash2,
  RotateCcw,
  Clock,
  Save,
  Loader2,
  Palette,
  Smile,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../ui/ToastNotification";
import { PopShakeLoading } from "../ui/PopShakeLoading";
import {
  LoadingTheme,
  LoadingSettingsData,
  DEFAULT_LOADING_SETTINGS,
  loadingSettingsService,
} from "../../services/loadingSettingsService";

const THEME_OPTIONS: Array<{
  id: LoadingTheme;
  title: string;
  badge: string;
  description: string;
  previewGradient: string;
}> = [
  {
    id: "liquid_cream",
    title: "Preenchimento Líquido Fluido",
    badge: "Mais Popular",
    description: "Textura cremosa de açaí com ondas de luz fluidas (ripple) e barra de progresso em gradiente vibrante.",
    previewGradient: "from-[#9306CF] via-[#FF007A] to-[#940068]",
  },
  {
    id: "playful_bounce",
    title: "Flutuação & Bounce Divertida",
    badge: "Alegre & Jovem",
    description: "Movimento saltitante com balões orbitais e cores vivas de morango e manga que transmitem energia e entusiasmo.",
    previewGradient: "from-pink-500 via-amber-400 to-purple-600",
  },
  {
    id: "minimal_pulse",
    title: "Minimalista com Pulso Elegante",
    badge: "Clean & Sofisticado",
    description: "Anel giratório esguio e pulso de respiração sereno com tipografia espaçada nobre para uma atmosfera premium.",
    previewGradient: "from-[#9306CF] to-[#940068]",
  },
];

const QUICK_ICONS = ["🥣", "🍧", "🍦", "🥤", "🍓", "✨", "🍫", "🍒"];

export function LoadingCustomizationSection() {
  const [theme, setTheme] = useState<LoadingTheme>(DEFAULT_LOADING_SETTINGS.theme);
  const [centerIcon, setCenterIcon] = useState<string>(DEFAULT_LOADING_SETTINGS.centerIcon);
  const [phrases, setPhrases] = useState<string[]>(DEFAULT_LOADING_SETTINGS.phrases);
  const [rotationInterval, setRotationInterval] = useState<number>(DEFAULT_LOADING_SETTINGS.rotationInterval);
  const [minDuration, setMinDuration] = useState<number>(DEFAULT_LOADING_SETTINGS.minDuration);

  const [newPhrase, setNewPhrase] = useState("");
  const [previewColorMode, setPreviewColorMode] = useState<"light" | "dark">("dark");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadingSettingsService
      .getLoadingSettings()
      .then((data) => {
        setTheme(data.theme);
        setCenterIcon(data.centerIcon);
        setPhrases(data.phrases);
        setRotationInterval(data.rotationInterval);
        setMinDuration(data.minDuration);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingInitial(false);
      });
  }, []);

  const handleAddPhrase = () => {
    const trimmed = newPhrase.trim();
    if (!trimmed) return;
    if (phrases.includes(trimmed)) {
      showToast({
        title: "Frase já existe",
        message: "Esta mensagem já está cadastrada na lista de rotação.",
        type: "warning",
      });
      return;
    }
    setPhrases((prev) => [...prev, trimmed]);
    setNewPhrase("");
  };

  const handleRemovePhrase = (indexToRemove: number) => {
    if (phrases.length <= 1) {
      showToast({
        title: "Mínimo de 1 frase",
        message: "A tela de loading necessita de ao menos uma frase cadastrada.",
        type: "warning",
      });
      return;
    }
    setPhrases((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleRestoreDefaultPhrases = () => {
    setPhrases(DEFAULT_LOADING_SETTINGS.phrases);
    showToast({
      title: "Frases Restauradas",
      message: "As mensagens padrão recomendadas da Pop Shake foram aplicadas.",
      type: "info",
    });
  };

  const handleSave = async () => {
    if (phrases.length === 0) {
      showToast({
        title: "Lista Vazia",
        message: "Adicione ao menos uma frase antes de salvar.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<LoadingSettingsData> = {
        theme,
        centerIcon: centerIcon.trim() || "🥣",
        phrases,
        rotationInterval,
        minDuration,
      };

      await loadingSettingsService.updateLoadingSettings(payload);

      showToast({
        title: "Personalização Salva! ✨",
        message: "A nova tela de carregamento já está ativa e refletirá imediatamente na loja.",
        type: "success",
      });
    } catch (err: any) {
      showToast({
        title: "Erro ao Salvar",
        message: err.message || "Não foi possível gravar as alterações do loading.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-[#512B54]/30">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
              <Palette className="w-5 h-5 text-[#9306CF]" />
              Personalização da Tela de Carregamento (Loading)
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
              Dinâmico
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure o estilo visual, ícone central, mensagens rotativas e tempo de transição exibidos durante o carregamento do app.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isLoadingInitial}
          className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-10 px-5 shadow-md shadow-[#9306CF]/20 cursor-pointer self-start sm:self-auto"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Salvar Loading</span>
        </Button>
      </div>

      {/* Grid Principal: Configurações na Esquerda + Preview ao Vivo na Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: Formulários e Ajustes (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Seleção dos 3 Temas Visuais */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#9306CF]" />
              1. Estilo Visual da Animação (3 Temas)
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? "border-[#9306CF] bg-[#9306CF]/10 ring-2 ring-[#9306CF]/30 shadow-md"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`h-1.5 w-full rounded-full bg-gradient-to-r ${opt.previewGradient} mb-2.5`}
                    />
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-heading font-bold text-xs text-[#4C264F] dark:text-[#F9F5F9] leading-tight">
                          {opt.title}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#9306CF] shrink-0" />}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#9306CF] dark:text-[#C7A9C9] block mb-1">
                        {opt.badge}
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Ícone / Elemento Gráfico Central */}
          <div className="space-y-3 p-4 rounded-2xl bg-gray-50/70 dark:bg-[#1A0B1C]/50 border border-gray-200 dark:border-[#512B54]/40">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-[#9306CF]" />
              2. Ícone ou Elemento Gráfico Central
            </Label>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Escolha uma ilustração rápida da marca ou digite qualquer emoji/símbolo personalizado:
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {QUICK_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCenterIcon(emoji)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                    centerIcon === emoji
                      ? "bg-[#9306CF] text-white border-[#9306CF] shadow-sm scale-110"
                      : "bg-white dark:bg-[#230E26] border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
                >
                  {emoji}
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                <span className="text-xs text-gray-500 font-medium">Personalizado:</span>
                <Input
                  type="text"
                  maxLength={4}
                  value={centerIcon}
                  onChange={(e) => setCenterIcon(e.target.value)}
                  placeholder="Ex: 🍧"
                  className="w-16 h-10 text-center text-lg font-bold rounded-xl border-gray-200 dark:border-[#512B54]/50 bg-white dark:bg-[#230E26]"
                />
              </div>
            </div>
          </div>

          {/* 3. Mensagens Dinâmicas Editáveis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#9306CF]" />
                3. Frases Rotativas durante o Carregamento ({phrases.length})
              </Label>
              <button
                type="button"
                onClick={handleRestoreDefaultPhrases}
                className="text-[11px] font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar Padrões
              </button>
            </div>

            {/* Inclusão de Nova Frase */}
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Ex: Montando sua tigela especial com muito capricho..."
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPhrase();
                  }
                }}
                className="flex-1 rounded-xl h-10 text-xs border-gray-200 dark:border-[#512B54]/50 bg-white dark:bg-[#230E26]"
              />
              <Button
                type="button"
                onClick={handleAddPhrase}
                className="rounded-xl h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>

            {/* Listagem das Frases Ativas */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {phrases.map((phrase, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-[#512B54]/40 bg-white dark:bg-[#230E26] shadow-xs text-xs transition-colors group hover:border-[#9306CF]/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-200 truncate font-medium">
                      {phrase}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePhrase(idx)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
                    title="Remover Frase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Tempo e Ritmo de Exibição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50/70 dark:bg-[#1A0B1C]/50 border border-gray-200 dark:border-[#512B54]/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#9306CF]" />
                Troca de Frases (Intervalo)
              </Label>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Velocidade em que uma frase dá lugar à próxima.
              </p>
              <select
                value={rotationInterval}
                onChange={(e) => setRotationInterval(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#512B54]/50 bg-white dark:bg-[#230E26] text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <option value={1600}>Rápido (1,6 segundos)</option>
                <option value={2000}>Dinâmico (2,0 segundos)</option>
                <option value={2400}>Equilibrado / Padrão (2,4 segundos)</option>
                <option value={3000}>Calmo (3,0 segundos)</option>
                <option value={4000}>Lento (4,0 segundos)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9306CF]" />
                Tempo Mínimo na Tela
              </Label>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Evita transições bruscas em carregamentos instantâneos.
              </p>
              <select
                value={minDuration}
                onChange={(e) => setMinDuration(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#512B54]/50 bg-white dark:bg-[#230E26] text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <option value={400}>Instantâneo (400 ms)</option>
                <option value={800}>Suave / Padrão (800 ms)</option>
                <option value={1200}>Destacado (1,2 segundos)</option>
                <option value={1600}>Cênico (1,6 segundos)</option>
              </select>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Pré-Visualização Interativa ao Vivo (5 colunas) */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#512B54]/30">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#4C264F] dark:text-[#F9F5F9] block">
                Pré-Visualização ao Vivo
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Teste as 6 combinações (3 temas x 2 modos de luz)
              </span>
            </div>

            {/* Alternador de Modo Claro / Escuro para o Preview */}
            <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPreviewColorMode("light")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  previewColorMode === "light"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>Claro</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewColorMode("dark")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  previewColorMode === "dark"
                    ? "bg-[#1E0921] text-purple-200 shadow-xs"
                    : "text-gray-500 hover:text-gray-200"
                }`}
              >
                <Moon className="w-3 h-3 text-purple-400" />
                <span>Escuro</span>
              </button>
            </div>
          </div>

          {/* Caixa de Visualização da Tela de Carregamento */}
          <div
            className={`rounded-3xl border shadow-xl overflow-hidden p-6 transition-colors duration-300 relative flex flex-col items-center justify-center min-h-[380px] ${
              previewColorMode === "dark"
                ? "bg-[#0E040F] border-[#512B54]/70"
                : "bg-gray-100 border-gray-200"
            }`}
          >
            {/* Tag indicativa da combinação ativa */}
            <div className="absolute top-3 left-3 z-10">
              <span
                className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  previewColorMode === "dark"
                    ? "bg-[#1E0921]/90 text-[#E899FF] border-[#512B54]"
                    : "bg-white/90 text-purple-800 border-purple-200"
                }`}
              >
                {theme === "liquid_cream" && "Líquido Cremoso"}
                {theme === "playful_bounce" && "Flutuação & Bounce"}
                {theme === "minimal_pulse" && "Minimalista Pulso"}
                {" • "}
                {previewColorMode === "dark" ? "Modo Noturno" : "Modo Diurno"}
              </span>
            </div>

            <PopShakeLoading
              compact={false}
              fullScreen={false}
              themeOverride={theme}
              centerIconOverride={centerIcon}
              phrasesOverride={phrases}
              rotationIntervalOverride={rotationInterval}
              previewColorMode={previewColorMode}
            />
          </div>

          <p className="text-[11px] text-center text-gray-500 dark:text-gray-400 italic">
            💡 As preferências salvas são transmitidas em tempo real para todos os clientes conectados.
          </p>
        </div>
      </div>
    </div>
  );
}
