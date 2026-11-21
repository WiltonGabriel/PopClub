"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Home,
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
  Mail,
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { formatPhoneInput } from "@/components/auth/FastAccessModal";
import { PasswordRecoveryRescueModal } from "@/components/auth/PasswordRecoveryRescueModal";

interface MaskedAddressInfo {
  addressId?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  houseNumber?: string;
  [key: string]: unknown;
}

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
  const { theme, toggleTheme, resolvedTheme } = useTheme();

  const redirectTarget = searchParams?.get("redirect") || "/";
  const rawTab = searchParams?.get("tab");
  const initialTab = rawTab === "password" ? "password" : rawTab === "register" ? "register" : "fast";
  const [activeTab, setActiveTab] = useState<"fast" | "password" | "register">(initialTab);

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
  const [maskedAddress, setMaskedAddress] = useState<MaskedAddressInfo | null>(null);
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

  // Regra de 2 Tentativas de Senha & Modal de Resgate via WhatsApp / Email
  const [failedPasswordAttempts, setFailedPasswordAttempts] = useState(0);
  const [isRescueModalOpen, setIsRescueModalOpen] = useState(false);

  // Reconhecimento de cliente cadastrado na aba de Acesso Rápido
  const [fastRegisteredDetected, setFastRegisteredDetected] = useState(false);
  const [fastPassword, setFastPassword] = useState("");
  const [showFastPassword, setShowFastPassword] = useState(false);
  const [fastPasswordLoading, setFastPasswordLoading] = useState(false);
  const [isFastBypass, setIsFastBypass] = useState(false);

  useEffect(() => {
    const raw = fastPhone.replace(/\D/g, "");
    if (isFastBypass) return;
    if (raw.length === 11) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/auth/check-phone?phone=${raw}`);
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.isRegistered && data.hasPassword) {
              setFastRegisteredDetected(true);
              if (data.fullName && !fastName.trim()) {
                setFastName(data.fullName);
              }
            } else {
              setFastRegisteredDetected(false);
            }
          }
        } catch (err) {
          console.error("Erro na verificação de telefone no login:", err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setFastRegisteredDetected(false);
    }
  }, [fastPhone, isFastBypass, fastName]);

  const handleFastPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFastError(null);
    const cleanPhone = fastPhone.replace(/\D/g, "");

    if (!fastPassword) {
      setFastError("Informe sua senha de acesso.");
      return;
    }

    setFastPasswordLoading(true);
    try {
      await authService.signIn(cleanPhone, fastPassword);
      setFailedPasswordAttempts(0);
      window.location.replace(redirectTarget);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      const nextFailures = failedPasswordAttempts + 1;
      setFailedPasswordAttempts(nextFailures);
      if (nextFailures >= 2) {
        setIsRescueModalOpen(true);
      }
      setFastError(errorMsg || "Senha incorreta. Tente novamente.");
    } finally {
      setFastPasswordLoading(false);
    }
  };

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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      setFastError(errorMsg || "Erro ao identificar. Verifique seus dados.");
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
    } catch (err: unknown) {
      const errObj = err as { message?: string; code?: string };
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5 || errObj?.code === "MAX_ATTEMPTS_EXCEEDED") {
        setIsLocked(true);
        setVerifyError(
          "Limite de tentativas atingido. Por segurança, selecione 'Entrar com Senha' ou consulte seu atendente."
        );
      } else {
        setVerifyError(
          errObj?.message || `Número incorreto. Restam ${5 - nextAttempts} tentativas.`
        );
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  /* ── Aba 3: Criar Conta / Cadastro State ── */
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  /* ── Handlers de Login com Senha ── */
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await authService.signIn(loginId.trim(), loginPassword);
      setFailedPasswordAttempts(0);
      window.location.replace(redirectTarget);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      const nextFailures = failedPasswordAttempts + 1;
      setFailedPasswordAttempts(nextFailures);
      if (nextFailures >= 2) {
        setIsRescueModalOpen(true);
      }
      setLoginError(errorMsg || "Credenciais inválidas.");
    } finally {
      setLoginLoading(false);
    }
  };

  /* ── Handlers de Cadastro / Criar Conta ── */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (!registerFullName.trim() || registerFullName.trim().length < 3) {
      setRegisterError("Por favor, informe seu nome completo (mínimo 3 caracteres).");
      return;
    }
    const cleanMail = registerEmail.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes("@") || !cleanMail.includes(".")) {
      setRegisterError("Por favor, informe um e-mail válido.");
      return;
    }
    const cleanPhone = registerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setRegisterError("Por favor, informe o WhatsApp com DDD (mínimo 10 dígitos).");
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }
    if (!acceptedTerms) {
      setRegisterError("Para criar sua conta, é necessário ler e aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setRegisterLoading(true);
    try {
      await authService.signUp({
        fullName: registerFullName.trim(),
        email: cleanMail,
        phone: cleanPhone,
        password: registerPassword,
        acceptedTerms: true,
      });
      window.location.replace(redirectTarget);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      setRegisterError(errorMsg || "Erro ao realizar cadastro.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      setLoginError(errorMsg || "Erro ao conectar com Google.");
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

      {/* Top Navigation: Barra Superior com Voltar, Início e Alternador de Tema */}
      <header className="fixed top-0 left-0 right-0 z-30 w-full flex items-center justify-between p-4 sm:p-6 pointer-events-auto">
        {/* Canto Superior Esquerdo: Voltar e Home lado a lado */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push(redirectTarget || "/");
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-foreground dark:hover:text-white bg-white/80 dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 backdrop-blur-md shadow-xs hover:bg-white dark:hover:bg-zinc-800 transition-all text-xs sm:text-sm font-semibold group cursor-pointer"
            aria-label="Voltar à tela anterior"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-foreground dark:hover:text-white bg-white/80 dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 backdrop-blur-md shadow-xs hover:bg-white dark:hover:bg-zinc-800 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
            title="Ir para a Página Inicial"
            aria-label="Página Inicial"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Início</span>
          </Link>
        </div>

        {/* Canto Superior Direito: Alternador de Fundo / Tema (Dark / Light Mode) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center p-2.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-foreground dark:hover:text-white bg-white/80 dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 backdrop-blur-md shadow-xs hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
          title={(resolvedTheme || theme) === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          aria-label={(resolvedTheme || theme) === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
        >
          {(resolvedTheme || theme) === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-violet-600 animate-in spin-in-90 duration-300" />
          )}
        </button>
      </header>

      {/* ── Auth Card ── */}
      <div className="relative z-10 w-full max-w-md pt-8 sm:pt-0">
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
                className="bg-gradient-to-r from-[#9306CF] to-[#D80064] bg-clip-text text-transparent"
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
              Entrar
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "register"}
              onClick={() => setActiveTab("register")}
              className={`
                flex-1 h-10 rounded-xl text-xs sm:text-sm font-bold
                transition-all duration-200 cursor-pointer
                ${activeTab === "register"
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30"
                  : "text-[#7A587D] dark:text-[#957498] hover:text-foreground dark:hover:text-muted-foreground"
                }
              `}
            >
              Criar Conta
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

                  {fastRegisteredDetected && !isFastBypass ? (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            Identificamos que você já possui cadastro no PopClub!
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Olá, <strong>{fastName || "Cliente"}</strong>! Digite sua senha para entrar com todos os seus benefícios.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleFastPasswordSubmit} className="space-y-3.5">
                        <div className="space-y-1.5">
                          <label htmlFor="fastPasswordInput" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                            Sua Senha de Acesso
                          </label>
                          <AuthInput
                            id="fastPasswordInput"
                            type={showFastPassword ? "text" : "password"}
                            value={fastPassword}
                            onChange={(e) => {
                              setFastPassword(e.target.value);
                              if (fastError) setFastError(null);
                            }}
                            placeholder="Digite sua senha"
                            required
                            autoFocus
                            disabled={fastPasswordLoading}
                            leftIcon={<Lock className="w-4 h-4" />}
                            rightSlot={
                              <EyeToggle
                                show={showFastPassword}
                                onToggle={() => setShowFastPassword(!showFastPassword)}
                              />
                            }
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={fastPasswordLoading}
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
                          {fastPasswordLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Entrando...</span>
                            </>
                          ) : (
                            <>
                              <span>Entrar com Minha Senha</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        <div className="flex items-center justify-between text-xs pt-1 px-1">
                          <button
                            type="button"
                            onClick={() => setIsRescueModalOpen(true)}
                            className="text-primary hover:underline font-medium cursor-pointer"
                          >
                            Esqueci minha senha
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsFastBypass(true);
                              setFastRegisteredDetected(false);
                            }}
                            className="text-[#7A587D] dark:text-muted-foreground hover:text-foreground cursor-pointer text-[11px]"
                          >
                            Entrar sem senha desta vez
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
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
                  )}
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
                    <button
                      type="button"
                      onClick={() => setIsRescueModalOpen(true)}
                      className="text-xs text-primary hover:text-accent dark:hover:text-muted-foreground hover:underline transition-colors cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
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

              <div className="pt-2 text-center space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-xs text-[#7A587D] dark:text-muted-foreground hover:underline cursor-pointer block w-full"
                >
                  Não tem uma conta? <strong>Criar Conta / Cadastro</strong>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("fast")}
                  className="text-xs text-[#7A587D] dark:text-muted-foreground hover:underline cursor-pointer block w-full"
                >
                  Prefere entrar sem senha? <strong>Usar Acesso Rápido</strong>
                </button>
              </div>
            </div>
          )}

          {/* ── ABA 3: CRIAR CONTA / CADASTRO ── */}
          {activeTab === "register" && (
            <div className="space-y-4" role="tabpanel" aria-label="Criar Conta">
              <p className="text-xs text-[#7A587D] dark:text-muted-foreground text-center leading-relaxed">
                Cadastre-se para liberar cupons exclusivos, carteira de endereços e rastreamento em tempo real.
              </p>

              {registerError && <ErrorBanner message={registerError} />}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 pt-1">
                {/* Nome Completo */}
                <div className="space-y-1.5">
                  <label htmlFor="registerFullName" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                    Nome Completo *
                  </label>
                  <AuthInput
                    id="registerFullName"
                    type="text"
                    value={registerFullName}
                    onChange={(e) => {
                      setRegisterFullName(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="Ex: Maria Silva"
                    required
                    autoComplete="name"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label htmlFor="registerPhone" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                    WhatsApp com DDD *
                  </label>
                  <AuthInput
                    id="registerPhone"
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => {
                      setRegisterPhone(formatPhoneInput(e.target.value));
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="(65) 99888-1122"
                    required
                    autoComplete="tel"
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label htmlFor="registerEmail" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                    E-mail *
                  </label>
                  <AuthInput
                    id="registerEmail"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => {
                      setRegisterEmail(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="seuemail@exemplo.com"
                    required
                    autoComplete="email"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <label htmlFor="registerPassword" className="block text-xs font-semibold text-[#7A587D] dark:text-[#E2D2E4]">
                    Senha de Acesso *
                  </label>
                  <AuthInput
                    id="registerPassword"
                    type={showRegisterPassword ? "text" : "password"}
                    value={registerPassword}
                    onChange={(e) => {
                      setRegisterPassword(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightSlot={
                      <EyeToggle
                        show={showRegisterPassword}
                        onToggle={() => setShowRegisterPassword((v) => !v)}
                      />
                    }
                  />
                  <span className="text-[10px] text-[#7A587D] dark:text-[#957498] block">
                    Mínimo 6 caracteres com letras e números.
                  </span>
                </div>

                {/* Aceite dos Termos de Uso e Política de Privacidade */}
                <div className="pt-1">
                  <label
                    htmlFor="registerAcceptTerms"
                    className="flex items-start gap-2.5 text-xs text-[#7A587D] dark:text-[#E2D2E4] cursor-pointer select-none leading-relaxed"
                  >
                    <input
                      id="registerAcceptTerms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        if (registerError) setRegisterError(null);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary shrink-0 cursor-pointer accent-primary"
                    />
                    <span>
                      Li e aceito os{" "}
                      <Link
                        href="/termos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        Termos de Uso
                      </Link>{" "}
                      e a{" "}
                      <Link
                        href="/privacidade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        Política de Privacidade
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                {/* Botão de Envio */}
                <button
                  type="submit"
                  disabled={registerLoading}
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
                  {registerLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar Conta e Entrar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("password")}
                  className="text-xs text-[#7A587D] dark:text-muted-foreground hover:underline cursor-pointer block w-full"
                >
                  Já possui uma conta? <strong>Entrar com Senha</strong>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("fast")}
                  className="text-xs text-[#7A587D] dark:text-muted-foreground hover:underline cursor-pointer block w-full"
                >
                  Prefere entrar sem senha? <strong>Usar Acesso Rápido</strong>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PasswordRecoveryRescueModal
        isOpen={isRescueModalOpen}
        onClose={() => setIsRescueModalOpen(false)}
        clientName={fastName}
        clientPhone={fastPhone || loginId}
        clientEmail={loginId.includes("@") ? loginId : ""}
        onContinueWithoutPassword={() => {
          setIsFastBypass(true);
          setFastRegisteredDetected(false);
          setIsRescueModalOpen(false);
        }}
        onSuccess={({ email }) => {
          if (email) {
            setLoginId(email);
            setActiveTab("password");
          }
        }}
      />
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
