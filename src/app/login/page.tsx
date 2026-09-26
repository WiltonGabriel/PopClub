"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  Phone,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldAlert,
  MapPin,
  X,
  ArrowRight,
} from "lucide-react";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { formatPhoneInput } from "@/components/auth/FastAccessModal";
import { Button } from "@/components/ui/button";

/* ─── Reusable styled input wrapper ─── */
interface AuthInputProps {
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  leftIcon: React.ReactNode;
  rightSlot?: React.ReactNode;
}

function AuthInput({
  id,
  type,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  disabled,
  autoFocus,
  leftIcon,
  rightSlot,
}: AuthInputProps) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A587D] dark:text-[#957498] pointer-events-none">
        {leftIcon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        autoFocus={autoFocus}
        className="
          w-full h-12 rounded-xl
          border border-gray-200 bg-white text-gray-900 
          dark:border-border/50 dark:bg-[#1F0B22] dark:text-white
          pl-10 pr-10
          text-sm placeholder-[#7A587D] dark:placeholder-[#957498]
          outline-none
          focus:border-primary dark:focus:border-primary/70 focus:ring-2 focus:ring-primary/20
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
        "
      />
      {rightSlot && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {rightSlot}
        </span>
      )}
    </div>
  );
}

/* ─── Eye toggle button ─── */
function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-[#7A587D] dark:text-[#957498] hover:text-foreground dark:hover:text-muted-foreground transition-colors"
      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

/* ─── Error banner ─── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
      <X className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ─── Main inner component (needs Suspense for useSearchParams) ─── */
function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, fastAccess, verifyDevice } = useAuth();

  const redirectTarget = searchParams?.get("redirect") || "/";
  const initialTab = searchParams?.get("tab") === "password" ? "password" : "fast";
  const [activeTab, setActiveTab] = useState<"fast" | "password">(initialTab);

  // Redireciona usuários autenticados para a home ou página alvo
  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirectTarget);
    }
  }, [user, authLoading, router, redirectTarget]);

  /* ── Aba 1: Acesso Rápido State ── */
  const [fastName, setFastName] = useState("");
  const [fastPhone, setFastPhone] = useState("");
  const [fastLoading, setFastLoading] = useState(false);
  const [fastError, setFastError] = useState<string | null>(null);

  // Verificação de novo aparelho em Acesso Rápido
  const [isVerifyingDevice, setIsVerifyingDevice] = useState(false);
  const [maskedAddress, setMaskedAddress] = useState<any>(null);
  const [houseNumber, setHouseNumber] = useState("");
  const [isNoNumber, setIsNoNumber] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  /* ── Aba 2: Entrar com Senha State ── */
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  /* ── Handlers de Acesso Rápido ── */
  const handleFastAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFastError(null);

    const cleanPhone = fastPhone.replace(/\D/g, "");
    if (!fastName.trim() || fastName.trim().length < 3) {
      setFastError("Por favor, informe seu nome completo (mínimo 3 caracteres).");
      return;
    }
    if (cleanPhone.length < 10) {
      setFastError("Por favor, inclua o DDD com 2 dígitos antes do número (ex: 65, 11).");
      return;
    }

    setFastLoading(true);
    try {
      const res = await fastAccess(fastName.trim(), cleanPhone);
      if (res.status === "new_device_detected") {
        setMaskedAddress(res.maskedAddress);
        setIsVerifyingDevice(true);
      } else if (res.status === "authenticated") {
        window.location.replace(redirectTarget);
      }
    } catch (err: any) {
      setFastError(err.message || "Erro ao identificar. Verifique seus dados.");
    } finally {
      setFastLoading(false);
    }
  };

  const handleConfirmHouseNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setVerifyError(null);

    if (!isNoNumber && !houseNumber.trim()) {
      setVerifyError("Digite o número da residência ou marque a opção S/N.");
      return;
    }

    const cleanPhone = fastPhone.replace(/\D/g, "");
    setVerifyLoading(true);
    try {
      const res = await verifyDevice({
        phone: cleanPhone,
        addressId: maskedAddress?.addressId,
        houseNumber: isNoNumber ? "S/N" : houseNumber.trim(),
        isNoNumber,
        updatedName: fastName.trim(),
      });

      if (res.status === "authenticated") {
        window.location.replace(redirectTarget);
      }
    } catch (err: any) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5 || err?.code === "MAX_ATTEMPTS_EXCEEDED") {
        setIsLocked(true);
        setVerifyError(
          "Limite de tentativas atingido. Por segurança, selecione 'Entrar com Senha' ou consulte seu atendente."
        );
      } else {
        setVerifyError(
          err.message || `Número incorreto. Restam ${5 - nextAttempts} tentativas.`
        );
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  /* ── Handlers de Login com Senha ── */
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await authService.signIn(loginId.trim(), loginPassword);
      window.location.replace(redirectTarget);
    } catch (err: any) {
      setLoginError(err.message || "Credenciais inválidas.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setLoginError(err.message || "Erro ao conectar com Google.");
    }
  };

  /* ── Loading / redirect guard ── */
  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent/5 dark:bg-accent/10 blur-3xl" />
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-[#7A587D] dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors text-sm font-medium group"
        aria-label="Voltar à loja"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar à loja
      </Link>

      {/* ── Auth Card ── */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-3xl shadow-2xl p-6 sm:p-8">

          {/* Logo / Brand */}
          <Link
            href="/"
            className="flex flex-col items-center mb-6 cursor-pointer hover:opacity-85 transition-opacity duration-200"
            aria-label="Pop Shake — Início"
          >
            <span className="font-heading font-black text-3xl tracking-tight">
              <span className="text-foreground dark:text-foreground">Pop</span>
              <span
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Shake
              </span>
            </span>
            <span className="text-[#7A587D] dark:text-[#957498] text-xs font-semibold mt-0.5 tracking-wide">
              Pop Shake Sorveteria • Açaí & Sorvetes
            </span>
          </Link>

          {/* ── Segmented Control (Abas Claras) ── */}
          <div className="flex p-1 bg-[#F8F9FA] dark:bg-background rounded-2xl mb-6 border border-gray-100 dark:border-transparent" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "fast"}
              onClick={() => {
                setActiveTab("fast");
                setIsVerifyingDevice(false);
              }}
              className={`
                flex-1 h-10 rounded-xl text-xs sm:text-sm font-bold
                transition-all duration-200 cursor-pointer
                ${activeTab === "fast"
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30"
                  : "text-[#7A587D] dark:text-[#957498] hover:text-foreground dark:hover:text-muted-foreground"
                }
              `}
            >
              Acesso Rápido
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "password"}
              onClick={() => setActiveTab("password")}
              className={`
                flex-1 h-10 rounded-xl text-xs sm:text-sm font-bold
                transition-all duration-200 cursor-pointer
                ${activeTab === "password"
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30"
                  : "text-[#7A587D] dark:text-[#957498] hover:text-foreground dark:hover:text-muted-foreground"
                }
              `}
            >
              Entrar com Senha
            </button>
          </div>

          {/* ── ABA 1: ACESSO RÁPIDO (PADRÃO) ── */}
          {activeTab === "fast" && (
            <div className="space-y-4">
              {!isVerifyingDevice ? (
                <>
                  <p className="text-xs text-[#7A587D] dark:text-muted-foreground text-center leading-relaxed">
                    Entre direto apenas com seu WhatsApp. Sem necessidade de decorar senhas!
                  </p>

                  {fastError && <ErrorBanner message={fastError} />}

                  <form onSubmit={handleFastAccessSubmit} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label htmlFor="fastName" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                        Seu Nome Completo *
                      </label>
                      <AuthInput
                        id="fastName"
                        type="text"
                        value={fastName}
                        onChange={(e) => {
                          setFastName(e.target.value);
                          if (fastError) setFastError(null);
                        }}
                        placeholder="Ex: Lucas Ferreira"
                        required
                        autoComplete="name"
                        leftIcon={<User className="w-4 h-4" />}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="fastPhone" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                        WhatsApp com DDD *
                      </label>
                      <AuthInput
                        id="fastPhone"
                        type="tel"
                        value={fastPhone}
                        onChange={(e) => {
                          setFastPhone(formatPhoneInput(e.target.value));
                          if (fastError) setFastError(null);
                        }}
                        placeholder="(65) 99999-9999"
                        required
                        autoComplete="tel"
                        leftIcon={<Phone className="w-4 h-4" />}
                      />
                      <span className="text-[10px] text-[#7A587D] dark:text-[#957498] block">
                        Informe o DDD com 2 dígitos antes do número (ex: 65, 11).
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={fastLoading}
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
                      {fastLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Conectando...</span>
                        </>
                      ) : (
                        <>
                          <span>Continuar com Acesso Rápido</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Sub-etapa: Verificação de Novo Aparelho */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      🔒 Novo aparelho detectado
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Identificamos seu número. Por segurança, digite apenas o número da residência para confirmar a entrega.
                    </p>
                  </div>

                  {verifyError && <ErrorBanner message={verifyError} />}

                  {/* Card com endereço mascarado */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="text-muted-foreground leading-relaxed font-mono">
                          {maskedAddress?.street || "Rua cadastrada"}, nº{" "}
                          <span className="inline-block px-1.5 py-0.5 border border-dashed border-primary text-primary font-bold rounded bg-primary/5">
                            [ ? ]
                          </span>{" "}
                          - {maskedAddress?.neighborhood || "Bairro"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmHouseNumber} className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="houseNumber" className="block text-xs font-semibold text-foreground">
                        Número da Residência
                      </label>
                      <AuthInput
                        id="houseNumber"
                        type="text"
                        value={isNoNumber ? "" : houseNumber}
                        onChange={(e) => {
                          setHouseNumber(e.target.value);
                          if (verifyError) setVerifyError(null);
                        }}
                        placeholder={isNoNumber ? "Sem número (S/N)" : "Ex: 142"}
                        disabled={isNoNumber || isLocked || verifyLoading}
                        autoFocus={!isNoNumber}
                        required={!isNoNumber}
                        leftIcon={<MapPin className="w-4 h-4" />}
                      />

                      {/* Checkbox S/N */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id="login-sn-checkbox"
                          type="checkbox"
                          checked={isNoNumber}
                          disabled={isLocked || verifyLoading}
                          onChange={(e) => {
                            setIsNoNumber(e.target.checked);
                            if (e.target.checked) setHouseNumber("");
                            if (verifyError) setVerifyError(null);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="login-sn-checkbox" className="text-xs text-muted-foreground select-none cursor-pointer">
                          Minha residência não tem número (S/N)
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {!isLocked && (
                        <button
                          type="submit"
                          disabled={verifyLoading}
                          className="
                            w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider text-white
                            bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/30
                            flex items-center justify-center gap-2 cursor-pointer
                          "
                        >
                          {verifyLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Confirmando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirmar e Entrar</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveTab("password")}
                        className="w-full h-10 rounded-xl text-xs font-semibold text-primary dark:text-muted-foreground border border-gray-200 dark:border-border/40 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        Entrar com senha em vez disso
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── ABA 2: ENTRAR COM SENHA ── */}
          {activeTab === "password" && (
            <div className="space-y-4" role="tabpanel" aria-label="Entrar com Senha">
              {loginError && <ErrorBanner message={loginError} />}

              <form onSubmit={handlePasswordLoginSubmit} className="space-y-4">
                {/* User/Email field */}
                <div className="space-y-1.5">
                  <label htmlFor="loginId" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                    E-mail ou Usuário *
                  </label>
                  <AuthInput
                    id="loginId"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="seu@email.com ou usuario"
                    required
                    autoComplete="username"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="loginPassword" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                      Sua Senha *
                    </label>
                    <Link
                      href="/recuperar-senha"
                      className="text-xs text-primary hover:text-accent dark:hover:text-muted-foreground hover:underline transition-colors"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <AuthInput
                    id="loginPassword"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightSlot={
                      <EyeToggle
                        show={showLoginPassword}
                        onToggle={() => setShowLoginPassword((v) => !v)}
                      />
                    }
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loginLoading}
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
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar com Senha"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-200 dark:bg-border/50" />
                <span className="text-[#7A587D] dark:text-[#957498] text-xs font-medium">OU</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-border/50" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="
                  w-full h-12 rounded-xl
                  flex items-center justify-center gap-3
                  border border-gray-200 dark:border-border/60
                  bg-transparent hover:bg-black/5 dark:hover:bg-white/5
                  text-foreground dark:text-[#E2D2E4] text-sm font-medium
                  transition-all duration-200 cursor-pointer
                  active:scale-[0.98]
                "
              >
                <GoogleIcon />
                Continuar com Google
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("fast")}
                  className="text-xs text-[#7A587D] dark:text-muted-foreground hover:underline cursor-pointer"
                >
                  Prefere entrar sem senha? <strong>Usar Acesso Rápido</strong>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Google SVG icon ─── */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* ─── Page export with Suspense for useSearchParams ─── */
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
