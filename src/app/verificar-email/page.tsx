"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Home,
  KeyRound,
  Loader2,
  Mail,
  Moon,
  RefreshCw,
  Sun,
  User,
  X,
} from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import {
  navigationHistoryService,
  sanitizeSafeInternalRoute,
} from "@/services/navigationHistoryService";

const RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_CODE_LENGTH = 6;

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return fallback;
}

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { theme, toggleTheme, resolvedTheme } = useTheme();

  const urlEmail = searchParams?.get("email")?.trim() || "";
  const urlCode = (searchParams?.get("code") || "")
    .replace(/\D/g, "")
    .slice(0, VERIFICATION_CODE_LENGTH);
  const safeRedirect = sanitizeSafeInternalRoute(searchParams?.get("redirect")) || "/";
  const justRegistered =
    searchParams?.get("justRegistered") === "1" ||
    searchParams?.get("justRegistered") === "true";

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState(urlCode);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    justRegistered
      ? "Enviamos um código de 6 dígitos para o seu e-mail. Confira sua caixa de entrada ou spam."
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const autoAttemptedRef = useRef(false);

  // Sincroniza e-mail da sessão apenas se o campo ainda estiver vazio
  useEffect(() => {
    const sessionEmail = user?.email?.trim();
    if (sessionEmail) {
      setEmail((prev) => prev || sessionEmail);
    }
  }, [user?.email]);

  // Cooldown regressivo para reenvio do código
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  // Validação automática quando o usuário chega clicando no link do e-mail (?email=...&code=123456)
  useEffect(() => {
    if (autoAttemptedRef.current) return;
    if (!urlEmail || urlCode.length !== VERIFICATION_CODE_LENGTH) return;

    autoAttemptedRef.current = true;
    let active = true;

    const runAutoVerification = async () => {
      setVerifying(true);
      setError(null);
      try {
        const result = await authService.verifyEmail(urlCode, urlEmail);
        if (!active) return;
        setVerified(true);
        setAlreadyVerified(Boolean(result.alreadyVerified));
        setStatusMessage(
          result.message ||
            (result.alreadyVerified
              ? "Este e-mail já estava confirmado."
              : "E-mail confirmado com sucesso!")
        );
        await refreshUser();
      } catch (err: unknown) {
        if (!active) return;
        setError(
          extractErrorMessage(
            err,
            "Código inválido ou expirado. Confira os dígitos ou solicite um novo código."
          )
        );
      } finally {
        if (active) setVerifying(false);
      }
    };

    runAutoVerification();
    return () => {
      active = false;
    };
  }, [urlEmail, urlCode, refreshUser]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH);
    const cleanEmail = email.trim().toLowerCase();

    if (cleanCode.length !== VERIFICATION_CODE_LENGTH) {
      setError("Informe o código numérico de 6 dígitos enviado para o seu e-mail.");
      return;
    }

    if (!cleanEmail && !user?.email) {
      setError("Informe o e-mail da conta que deseja confirmar.");
      return;
    }

    setVerifying(true);
    try {
      const result = await authService.verifyEmail(
        cleanCode,
        cleanEmail || undefined
      );
      setVerified(true);
      setAlreadyVerified(Boolean(result.alreadyVerified));
      setStatusMessage(
        result.message ||
          (result.alreadyVerified
            ? "Seu e-mail já estava confirmado!"
            : "E-mail confirmado com sucesso!")
      );
      await refreshUser();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          "Não foi possível confirmar o código. Verifique os dígitos e tente novamente."
        )
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resending || cooldownSeconds > 0) return;
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail && !user?.email) {
      setError("Informe o e-mail cadastrado antes de solicitar um novo código.");
      return;
    }

    setResending(true);
    try {
      const result = await authService.resendVerificationEmail(
        cleanEmail || undefined
      );
      if (result.alreadyVerified) {
        setVerified(true);
        setAlreadyVerified(true);
        setStatusMessage(result.message || "Seu e-mail já está confirmado!");
        await refreshUser();
        return;
      }

      setStatusMessage(
        result.message || "Enviamos um novo código de 6 dígitos para o seu e-mail."
      );
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          "Não foi possível reenviar o código agora. Aguarde alguns instantes."
        )
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent/5 dark:bg-accent/10 blur-3xl" />
      </div>

      {/* Header com Voltar contextual, Início e Tema */}
      <header className="fixed top-0 left-0 right-0 z-30 w-full flex items-center justify-between p-4 sm:p-6 pointer-events-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigationHistoryService.goBack(router, "/conta")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-foreground dark:hover:text-white bg-white/80 dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 backdrop-blur-md shadow-xs hover:bg-white dark:hover:bg-zinc-800 transition-all text-xs sm:text-sm font-semibold group cursor-pointer"
            aria-label="Voltar à tela anterior"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-foreground dark:hover:text-white bg-white/80 dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 backdrop-blur-md shadow-xs hover:bg-white dark:hover:bg-zinc-800 transition-all text-xs sm:text-sm font-semibold"
            title="Ir para a Página Inicial"
            aria-label="Página Inicial"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Início</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center p-2.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-foreground dark:hover:text-white bg-white/80 dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 backdrop-blur-md shadow-xs hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
          title={(resolvedTheme || theme) === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          aria-label={(resolvedTheme || theme) === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
        >
          {(resolvedTheme || theme) === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-violet-600" />
          )}
        </button>
      </header>

      <main className="relative z-10 w-full max-w-md pt-14 sm:pt-0">
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Logo / Cabeçalho do Card */}
          <div className="flex flex-col items-center mb-6 text-center">
            <Link
              href="/"
              className="font-heading font-black text-3xl tracking-tight mb-2 hover:opacity-85 transition-opacity"
            >
              <span className="text-foreground dark:text-foreground">Pop</span>
              <span className="bg-gradient-to-r from-[#9306CF] to-[#D80064] bg-clip-text text-transparent">
                Shake
              </span>
            </Link>

            <h1 className="text-foreground dark:text-foreground text-xl font-bold tracking-tight">
              {verified ? "E-mail Confirmado!" : "Confirmar E-mail"}
            </h1>
            <p className="text-[#7A587D] dark:text-[#957498] text-sm mt-1">
              {verified
                ? alreadyVerified
                  ? "Sua conta já estava com o e-mail verificado."
                  : "Seu endereço de e-mail foi confirmado com segurança."
                : "Digite o código de 6 dígitos enviado para o seu e-mail."}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4"
            >
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && !error && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm mb-4 border ${
                verified
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
                  : "bg-primary/5 text-foreground border-primary/20 dark:bg-primary/10 dark:border-primary/30"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {verified ? (
            <div className="space-y-4 text-center pt-1">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <Link
                  href={safeRedirect}
                  className="
                    w-full h-12 rounded-xl
                    font-semibold text-sm text-white
                    bg-gradient-to-r from-primary to-accent
                    hover:from-[#a30de8] hover:to-[#b0007c]
                    active:scale-[0.98]
                    transition-all duration-200
                    shadow-lg shadow-primary/30
                    flex items-center justify-center gap-2
                  "
                >
                  <span>Ir para a loja</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/conta"
                  className="
                    w-full h-11 rounded-xl
                    font-semibold text-sm
                    border border-gray-200 dark:border-border/50
                    text-foreground dark:text-foreground
                    hover:bg-black/5 dark:hover:bg-white/5
                    transition-colors
                    flex items-center justify-center gap-2
                  "
                >
                  <User className="w-4 h-4 text-primary" />
                  <span>Ir para Minha Conta</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="verify-email-address"
                  className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]"
                >
                  E-mail da Conta
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A587D] dark:text-[#957498] pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="verify-email-address"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="seu@email.com"
                    required={!user?.email}
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="
                      w-full h-12 rounded-xl
                      border border-gray-200 bg-white text-gray-900
                      dark:border-border/50 dark:bg-[#1F0B22] dark:text-white
                      pl-10 pr-4
                      text-sm placeholder-[#7A587D] dark:placeholder-[#957498]
                      outline-none
                      focus:border-primary dark:focus:border-primary/70 focus:ring-2 focus:ring-primary/20
                      transition-all duration-200
                    "
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="verify-email-code"
                  className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]"
                >
                  Código de Verificação (6 dígitos)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A587D] dark:text-[#957498] pointer-events-none">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    id="verify-email-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={VERIFICATION_CODE_LENGTH}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby="verify-code-help"
                    aria-invalid={Boolean(error)}
                    value={code}
                    onChange={(e) => {
                      setCode(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, VERIFICATION_CODE_LENGTH)
                      );
                      if (error) setError(null);
                    }}
                    placeholder="000000"
                    required
                    className="
                      w-full h-12 rounded-xl
                      border border-gray-200 bg-white text-gray-900
                      dark:border-border/50 dark:bg-[#1F0B22] dark:text-white
                      pl-10 pr-4
                      text-base font-mono tracking-[0.3em]
                      placeholder-[#7A587D] dark:placeholder-[#957498]
                      outline-none
                      focus:border-primary dark:focus:border-primary/70 focus:ring-2 focus:ring-primary/20
                      transition-all duration-200
                    "
                  />
                </div>
                <p
                  id="verify-code-help"
                  className="text-[11px] text-[#7A587D] dark:text-[#957498]"
                >
                  Você pode colar o código de 6 dígitos diretamente aqui.
                </p>
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="
                  w-full h-12 rounded-xl mt-2
                  font-semibold text-sm text-white
                  bg-gradient-to-r from-primary to-accent
                  hover:from-[#a30de8] hover:to-[#b0007c]
                  active:scale-[0.98]
                  transition-all duration-200
                  shadow-lg shadow-primary/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 cursor-pointer
                "
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validando código...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar E-mail</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending || cooldownSeconds > 0}
                className="
                  w-full h-11 rounded-xl
                  font-semibold text-xs sm:text-sm
                  border border-gray-200 dark:border-border/50
                  text-foreground dark:text-[#E2D2E4]
                  hover:bg-black/5 dark:hover:bg-white/5
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                  flex items-center justify-center gap-2 cursor-pointer
                "
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reenviando código...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Reenviar código em {cooldownSeconds}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span>Reenviar código</span>
                  </>
                )}
              </button>

              {justRegistered && (
                <div className="pt-2 text-center">
                  <Link
                    href={safeRedirect}
                    className="text-xs text-[#7A587D] dark:text-muted-foreground hover:text-primary hover:underline transition-colors"
                  >
                    Confirmar mais tarde e ir para a loja
                  </Link>
                </div>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
