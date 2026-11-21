"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Phone, Loader2, CheckCircle2, LogOut, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { formatPhoneInput } from "@/components/auth/FastAccessModal";
import { useToast } from "@/components/ui/ToastNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EXEMPT_PATH_PREFIXES = [
  "/login",
  "/cadastro",
  "/termos",
  "/privacidade",
  "/cookies",
  "/esqueci-senha",
  "/redefinir-senha",
  "/verificar-email",
];

export function MandatoryPhoneModal() {
  const { user, loading, refreshUser, signOut } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname() || "";

  const [phoneInput, setPhoneInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !user) return null;

  const isClient = String(user.role || "").toUpperCase() === "CLIENT";
  const currentDigits = String(user.phone || "").replace(/\D/g, "");
  const isMissingPhone = isClient && currentDigits.length < 10;

  if (!isMissingPhone) return null;

  const isExemptRoute = EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isExemptRoute) return null;

  const cleanDigits = phoneInput.replace(/\D/g, "");
  const isPhoneValid = cleanDigits.length >= 10 && cleanDigits.length <= 11;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await userService.updateProfile(user.id, { phone: cleanDigits });
      await refreshUser();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("popclub:phone-completed"));
      }
      showToast({
        type: "success",
        title: "WhatsApp vinculado!",
        message: "Seu número foi salvo para confirmação de pedidos e entregas.",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar seu número de WhatsApp.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandatory-phone-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2
              id="mandatory-phone-title"
              className="font-heading font-bold text-lg text-gray-900 dark:text-white leading-tight"
            >
              Informe seu WhatsApp
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Precisamos do seu número com DDD para confirmar pedidos, atualizar o status da entrega e identificar sua conta na loja.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="mandatory-phone-input"
              className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
            >
              WhatsApp / Celular com DDD
            </Label>
            <Input
              id="mandatory-phone-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              required
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(formatPhoneInput(e.target.value));
                if (error) setError(null);
              }}
              placeholder="(65) 99999-9999"
              className="h-12 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-base font-mono"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-1 flex flex-col gap-2.5">
            <Button
              type="submit"
              disabled={!isPhoneValid || submitting}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white font-heading font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-md shadow-[#9306CF]/20 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Continuar</span>
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut || submitting}
              className="h-9 w-full rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{signingOut ? "Saindo..." : "Trocar de conta / Sair"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
