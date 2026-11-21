"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, X } from "lucide-react";
import {
  classifyHtmlApiError,
  extractFetchMethod,
  isSameOriginApiUrl,
} from "@/lib/apiFetchInterceptor";

const CF_CHALLENGE_EVENT = "popclub:cloudflare-challenge";

export function CloudflareChallengeGuard() {
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleChallengeEvent = () => {
      setChallengeOpen(true);
    };
    window.addEventListener(CF_CHALLENGE_EVENT, handleChallengeEvent);

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const response = await originalFetch(input, init);

      if (!isSameOriginApiUrl(input, window.location.origin)) {
        return response;
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/event-stream") ||
        contentType.includes("image/") ||
        contentType.includes("application/octet-stream")
      ) {
        return response;
      }

      try {
        const cloned = response.clone();
        const rawText = await cloned.text();
        const trimmed = rawText.trimStart();

        if (!trimmed.startsWith("<")) {
          return response;
        }

        const classified = classifyHtmlApiError(
          response.status,
          response.headers,
          trimmed
        );

        const method = extractFetchMethod(input, init);
        const isMutation =
          method === "POST" ||
          method === "PUT" ||
          method === "PATCH" ||
          method === "DELETE";

        if (
          classified.isCloudflareChallenge &&
          (isMutation || window.location.pathname.startsWith("/admin"))
        ) {
          window.dispatchEvent(new CustomEvent(CF_CHALLENGE_EVENT));
        }

        const jsonHeaders = new Headers(response.headers);
        jsonHeaders.set("content-type", "application/json; charset=utf-8");

        return new Response(
          JSON.stringify({
            error: classified.message,
            message: classified.message,
            code: classified.code,
          }),
          {
            status: response.ok ? 503 : response.status,
            statusText: response.statusText,
            headers: jsonHeaders,
          }
        );
      } catch {
        return response;
      }
    };

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener(CF_CHALLENGE_EVENT, handleChallengeEvent);
    };
  }, []);

  if (!challengeOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cf-challenge-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#181D2D] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="cf-challenge-title"
                className="font-heading font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-tight"
              >
                Verificação da Cloudflare Expirada
              </h2>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-0.5">
                Renovação de sessão necessária
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setChallengeOpen(false)}
            aria-label="Fechar aviso"
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          O firewall da Cloudflare solicitou uma nova confirmação rápida de segurança (anti-robô) no seu navegador. Clique no botão abaixo para recarregar a página e renovar sua conexão automaticamente.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setChallengeOpen(false)}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Agora não
          </button>
          <button
            type="button"
            disabled={reloading}
            onClick={() => {
              setReloading(true);
              window.location.reload();
            }}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-heading font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
            <span>{reloading ? "Recarregando..." : "Recarregar e Validar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
