"use client";

import React from "react";
import {
  WifiOff,
  Database,
  MapPin,
  RotateCcw,
  MessageCircle,
  X,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { AppApiError } from "@/lib/fetchClient";

export interface ResilientErrorAlertProps {
  error: AppApiError | Error | { code?: string; message: string; details?: any } | string | null;
  onRetry?: () => void;
  onReviewAddress?: () => void;
  onDismiss?: () => void;
  whatsappNumber?: string | null;
  cartSummary?: string;
  className?: string;
  isRetrying?: boolean;
}

export function ResilientErrorAlert({
  error,
  onRetry,
  onReviewAddress,
  onDismiss,
  whatsappNumber,
  cartSummary,
  className = "",
  isRetrying = false,
}: ResilientErrorAlertProps) {
  if (!error) return null;

  // Normalização do erro
  let code = "REQUEST_FAILED";
  let message = typeof error === "string" ? error : error.message || "Ocorreu um erro inesperado.";
  let details: any = null;
  let status: number | undefined = undefined;

  if (typeof error !== "string" && error) {
    if ("code" in error && typeof error.code === "string") {
      code = error.code;
    }
    if ("status" in error && typeof error.status === "number") {
      status = error.status;
    }
    if ("details" in error) {
      details = error.details;
    }
  }

  // Classificação dos Cenários
  const isOffline =
    code === "NETWORK_OFFLINE" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    message.toLowerCase().includes("sem conexão") ||
    message.toLowerCase().includes("failed to fetch");

  const isDbOrServerDown =
    code === "DATABASE_UNAVAILABLE" ||
    code === "SERVER_DOWN" ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.toLowerCase().includes("banco de dados") ||
    message.toLowerCase().includes("servidor");

  const isValidationOrAddress =
    code === "VALIDATION_ERROR" ||
    code === "PRISMA_VALIDATION_ERROR" ||
    code === "RESOURCE_NOT_FOUND_OR_RELATION_MISSING" ||
    message.toLowerCase().includes("endereço") ||
    message.toLowerCase().includes("bairro") ||
    message.toLowerCase().includes("rua") ||
    message.toLowerCase().includes("obrigatório");

  // Formatação de WhatsApp
  const cleanPhone = whatsappNumber ? whatsappNumber.replace(/\D/g, "") : null;
  const defaultWhatsappMsg = cartSummary
    ? `Olá! Gostaria de finalizar meu pedido pelo WhatsApp:\n\n${cartSummary}`
    : "Olá! Tive uma instabilidade ao finalizar meu pedido pelo aplicativo e gostaria de concluir por aqui.";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultWhatsappMsg)}`
    : null;

  // Renderização Cenário 1: Falha de Banco / Servidor (503 / 502 / 504)
  if (isDbOrServerDown && !isOffline) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-md shadow-lg shadow-amber-500/5 transition-all animate-in fade-in slide-in-from-top-2 ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <Database className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                Instabilidade Temporária
              </span>
            </div>
            <h4 className="font-heading text-sm font-black uppercase tracking-tight text-amber-900 dark:text-amber-100">
              Serviço momentaneamente instável
            </h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed font-sans">
              {message}
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/80 font-medium">
              ✨ Seus itens e configurações continuam 100% preservados na sua sacola.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                  {isRetrying ? "Tentando novamente..." : "Tentar Novamente"}
                </button>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Enviar Pedido no WhatsApp
                </a>
              )}
            </div>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-amber-700/60 hover:text-amber-900 dark:text-amber-300/60 dark:hover:text-amber-100 hover:bg-amber-500/10 transition-colors"
              aria-label="Fechar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Renderização Cenário 2: Offline / Sem Conexão
  if (isOffline) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 backdrop-blur-md shadow-lg shadow-orange-500/5 transition-all animate-in fade-in slide-in-from-top-2 ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0">
            <WifiOff className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300">
                Sem Conexão
              </span>
            </div>
            <h4 className="font-heading text-sm font-black uppercase tracking-tight text-orange-900 dark:text-orange-100">
              Parece que você está offline
            </h4>
            <p className="text-xs text-orange-800/90 dark:text-orange-200/90 leading-relaxed font-sans">
              Não conseguimos enviar os dados para a loja. Por favor, verifique seu Wi-Fi ou conexão de dados móveis antes de tentar novamente.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider bg-orange-600 hover:bg-orange-700 active:scale-95 text-white shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                  {isRetrying ? "Verificando..." : "Tentar Novamente"}
                </button>
              )}
            </div>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-orange-700/60 hover:text-orange-900 dark:text-orange-300/60 dark:hover:text-orange-100 hover:bg-orange-500/10 transition-colors"
              aria-label="Fechar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Renderização Cenário 3: Validação de Dados / Endereço Incompleto
  if (isValidationOrAddress) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 backdrop-blur-md shadow-lg shadow-purple-500/5 transition-all animate-in fade-in slide-in-from-top-2 ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-[#9306CF] dark:text-purple-300 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300">
                Atenção ao Preenchimento
              </span>
            </div>
            <h4 className="font-heading text-sm font-black uppercase tracking-tight text-purple-950 dark:text-purple-100">
              Revise as informações do pedido
            </h4>
            <p className="text-xs text-purple-900/90 dark:text-purple-200/90 leading-relaxed font-sans">
              {message}
            </p>

            {/* Detalhes de validação se fornecidos */}
            {Array.isArray(details) && details.length > 0 && (
              <ul className="text-xs text-purple-800 dark:text-purple-300 list-disc list-inside space-y-0.5 pt-1">
                {details.map((d: any, idx: number) => (
                  <li key={idx}>
                    <strong className="font-semibold">{d.field || "Campo"}:</strong> {d.message}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {onReviewAddress && (
                <button
                  type="button"
                  onClick={onReviewAddress}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 active:scale-95 text-white shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Revisar Endereço de Entrega
                </button>
              )}

              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-semibold text-purple-900 dark:text-purple-200 hover:bg-purple-500/10 border border-purple-500/20 transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                  Tentar Novamente
                </button>
              )}
            </div>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-purple-700/60 hover:text-purple-900 dark:text-purple-300/60 dark:hover:text-purple-100 hover:bg-purple-500/10 transition-colors"
              aria-label="Fechar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Renderização Cenário 4: Erro Crítico / Desconhecido com Botão de Contingência WhatsApp
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 backdrop-blur-md shadow-lg shadow-rose-500/5 transition-all animate-in fade-in slide-in-from-top-2 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300">
              Não se preocupe
            </span>
          </div>
          <h4 className="font-heading text-sm font-black uppercase tracking-tight text-rose-950 dark:text-rose-100">
            Não conseguimos concluir pelo app no momento
          </h4>
          <p className="text-xs text-rose-900/90 dark:text-rose-200/90 leading-relaxed font-sans">
            {message}
          </p>
          <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 font-medium">
            Você pode tentar novamente ou enviar o pedido diretamente para o nosso WhatsApp com um clique.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Finalizar Pedido pelo WhatsApp
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-semibold text-rose-900 dark:text-rose-200 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                {isRetrying ? "Processando..." : "Tentar Novamente"}
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-rose-700/60 hover:text-rose-900 dark:text-rose-300/60 dark:hover:text-rose-100 hover:bg-rose-500/10 transition-colors"
            aria-label="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
