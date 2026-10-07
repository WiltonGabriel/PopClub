"use client";

import React from "react";
import {
  Flame,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Calendar,
  Hourglass,
  SunMedium,
  Check,
} from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export interface UrgencyScarcityValues {
  // Escassez
  showScarcity: boolean;
  scarcityType: "strategic" | "real";
  scarcityUnits: string;
  scarcityInitial?: string;
  showProgressBar: boolean;

  // Urgência
  showDuration: boolean;
  urgencyType: "date" | "day" | "session";
  expiresAt: string; // ISO ou YYYY-MM-DDTHH:mm
  sessionMinutes: string;
}

interface UrgencyScarcityConfigProps {
  value: UrgencyScarcityValues;
  onChange: (updates: Partial<UrgencyScarcityValues>) => void;
  titlePrefix?: string; // ex: "Promoção" ou "Combo"
}

export function UrgencyScarcityConfig({
  value,
  onChange,
  titlePrefix = "Oferta",
}: UrgencyScarcityConfigProps) {
  const unitsNum = parseInt(value.scarcityUnits, 10);
  const isHighUnits = !isNaN(unitsNum) && unitsNum > 20;

  // Atalhos de Data Limite
  const handleQuickAddDays = (days: number) => {
    const base = value.expiresAt ? new Date(value.expiresAt) : new Date();
    const effectiveBase = base.getTime() > Date.now() ? base : new Date();
    const target = new Date(effectiveBase.getTime() + days * 24 * 60 * 60 * 1000);
    // Formata para datetime-local (YYYY-MM-DDTHH:mm)
    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    onChange({ expiresAt: localIso });
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-[#512B54]/40 bg-gray-50/60 dark:bg-black/20 p-4 sm:p-5 space-y-6">
      {/* Título do Módulo */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200/70 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              Gatilhos de Urgência & Escassez
              <span className="text-[10px] font-semibold text-primary dark:text-violet-400 bg-primary/10 px-2 py-0.5 rounded-full">
                Conversão Alta
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configure escassez de unidades e contagem regressiva para acelerar a decisão do cliente.
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PARTE 1: ESCASSEZ DE LOTE / UNIDADES
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Switch Principal de Escassez */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1E0B22] border border-gray-200 dark:border-white/5 shadow-2xs">
          <div className="space-y-0.5 pr-2">
            <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 cursor-pointer">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Ativar Gatilho de Escassez de Unidades
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Exibe badge com quantidade restante e estimula o sentimento de oportunidade única.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value.showScarcity}
            onClick={() => onChange({ showScarcity: !value.showScarcity })}
            className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
              value.showScarcity ? "bg-primary" : "bg-gray-300 dark:bg-zinc-700"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                value.showScarcity ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Campos de Escassez (Visíveis se Ativo) */}
        {value.showScarcity && (
          <div className="space-y-4 pl-1 sm:pl-3 border-l-2 border-amber-500/40 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Escolha do Modo: Estratégico vs Real */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Modo do Lote Promocional
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Opção A: Lote Estratégico */}
                <button
                  type="button"
                  onClick={() => onChange({ scarcityType: "strategic" })}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    value.scarcityType === "strategic"
                      ? "bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs"
                      : "bg-white dark:bg-[#1E0B22] border-gray-200 dark:border-white/5 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading font-bold text-xs flex items-center gap-1.5">
                      🎯 Lote Estratégico (Marketing)
                    </span>
                    {value.scarcityType === "strategic" && (
                      <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Decrementa visualmente para passar credibilidade, mas <strong>não bloqueia vendas</strong> se zerar.
                  </p>
                </button>

                {/* Opção B: Lote Real */}
                <button
                  type="button"
                  onClick={() => onChange({ scarcityType: "real" })}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    value.scarcityType === "real"
                      ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs"
                      : "bg-white dark:bg-[#1E0B22] border-gray-200 dark:border-white/5 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading font-bold text-xs flex items-center gap-1.5">
                      🏷️ Lote Real (Estoque Limitado)
                    </span>
                    {value.scarcityType === "real" && (
                      <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Deduz do estoque da campanha. Ao zerar, encerra a promoção ou pausa o combo na loja.
                  </p>
                </button>
              </div>
            </div>

            {/* Input de Quantidade e Aviso Conversão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Quantidade de Unidades no Lote *
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={value.scarcityUnits}
                  onChange={(e) => onChange({ scarcityUnits: e.target.value })}
                  placeholder="Ex: 5"
                  className="font-mono font-bold bg-white dark:bg-[#1E0B22] h-10 rounded-xl"
                />
              </div>

              {/* Checkbox de Barra de Progresso */}
              <div className="flex items-center sm:items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={value.showProgressBar}
                    onChange={(e) => onChange({ showProgressBar: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary"
                  />
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    Exibir barra visual de lote reservado
                  </span>
                </label>
              </div>
            </div>

            {/* Dica Preventiva de Conversão (se > 20 unidades) */}
            {isHighUnits && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>💡 Dica de conversão:</strong> Lotes com mais de 20 unidades diminuem o senso de urgência. Sugerimos entre 3 e 10 unidades para máxima conversão.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PARTE 2: URGÊNCIA TEMPORAL / CRONÔMETRO
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-2 border-t border-gray-200/70 dark:border-white/5">
        {/* Switch Principal de Urgência Temporal */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1E0B22] border border-gray-200 dark:border-white/5 shadow-2xs">
          <div className="space-y-0.5 pr-2">
            <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 cursor-pointer">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Ativar Contagem Regressiva de Tempo
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Mostra cronômetro regressivo na vitrine e banner ativo no modal de detalhes.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value.showDuration}
            onClick={() => onChange({ showDuration: !value.showDuration })}
            className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
              value.showDuration ? "bg-primary" : "bg-gray-300 dark:bg-zinc-700"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                value.showDuration ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Modos de Tempo (Visíveis se Ativo) */}
        {value.showDuration && (
          <div className="space-y-4 pl-1 sm:pl-3 border-l-2 border-blue-500/40 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 3 Modos: Data Limite vs Oferta do Dia vs Sessão */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Formato do Cronômetro
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Data Limite Real */}
                <button
                  type="button"
                  onClick={() => onChange({ urgencyType: "date" })}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    value.urgencyType === "date"
                      ? "bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold"
                      : "bg-white dark:bg-[#1E0B22] border-gray-200 dark:border-white/5 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>Data Limite</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Até data e hora configuradas
                  </p>
                </button>

                {/* 2. Oferta do Dia / Turno */}
                <button
                  type="button"
                  onClick={() => onChange({ urgencyType: "day" })}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    value.urgencyType === "day"
                      ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold"
                      : "bg-white dark:bg-[#1E0B22] border-gray-200 dark:border-white/5 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                    <span>Oferta do Dia</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Até o fechamento da loja hoje
                  </p>
                </button>

                {/* 3. Sessão Fixa */}
                <button
                  type="button"
                  onClick={() => onChange({ urgencyType: "session" })}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    value.urgencyType === "session"
                      ? "bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold"
                      : "bg-white dark:bg-[#1E0B22] border-gray-200 dark:border-white/5 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <Hourglass className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sessão Fixa</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Duração fixa configurável
                  </p>
                </button>
              </div>
            </div>

            {/* Configuração específica de cada modo de tempo */}
            {value.urgencyType === "date" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Data e Hora de Encerramento (expiresAt)
                </Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={value.expiresAt || ""}
                    onChange={(e) => onChange({ expiresAt: e.target.value })}
                    className="bg-white dark:bg-[#1E0B22] h-10 rounded-xl font-mono text-xs"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickAddDays(1)}
                      className="px-2.5 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      +24h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddDays(3)}
                      className="px-2.5 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      +3 dias
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddDays(7)}
                      className="px-2.5 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      +7 dias
                    </button>
                  </div>
                </div>
              </div>
            )}

            {value.urgencyType === "day" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <p>
                  <strong>🌅 Modo Oferta do Dia ativado:</strong> O cronômetro contará regressivamente até o encerramento do expediente no dia (23:59 ou horário de fechamento).
                </p>
              </div>
            )}

            {value.urgencyType === "session" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Duração da Sessão
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "30 minutos", val: "30" },
                    { label: "45 minutos", val: "45" },
                    { label: "1 hora", val: "60" },
                    { label: "2 horas", val: "120" },
                    { label: "4 horas", val: "240" },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => onChange({ sessionMinutes: s.val })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        value.sessionMinutes === s.val
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-white dark:bg-[#1E0B22] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
