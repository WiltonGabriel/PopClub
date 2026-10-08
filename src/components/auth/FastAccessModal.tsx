"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  User,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ArrowRight,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRecoveryRescueModal } from "@/components/auth/PasswordRecoveryRescueModal";

export interface VerifiedAddressPayload {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  complement?: string | null;
  reference?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
}

interface FastAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedAddress?: VerifiedAddressPayload, clientInfo?: { name: string; phone: string }) => void;
  onRequestNewAddress?: () => void;
  initialName?: string;
  initialPhone?: string;
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function FastAccessModal({
  isOpen,
  onClose,
  onSuccess,
  onRequestNewAddress,
  initialName = "",
  initialPhone = "",
}: FastAccessModalProps) {
  const { fastAccess, verifyDevice, refreshUser } = useAuth();

  // Etapas: "identify" | "verify_device"
  const [step, setStep] = useState<"identify" | "verify_device">("identify");

  // Campos de identificação
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ? formatPhoneInput(initialPhone) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialName) setName(initialName);
      if (initialPhone) setPhone(formatPhoneInput(initialPhone));
    }
  }, [isOpen, initialName, initialPhone]);

  // Reconhecimento de cliente cadastrado
  const [isRegisteredDetected, setIsRegisteredDetected] = useState(false);
  const [isBypassActive, setIsBypassActive] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failedPasswordAttempts, setFailedPasswordAttempts] = useState(0);
  const [isRescueModalOpen, setIsRescueModalOpen] = useState(false);

  // Campos de novo aparelho detectado
  const [maskedAddress, setMaskedAddress] = useState<{
    addressId?: string;
    maskedStreet?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
  } | null>(null);
  const [houseNumberInput, setHouseNumberInput] = useState("");
  const [isNoNumber, setIsNoNumber] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Detecção automática com debounce ao completar 11 dígitos
  useEffect(() => {
    const raw = phone.replace(/\D/g, "");
    if (isBypassActive) return;
    if (raw.length === 11) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/auth/check-phone?phone=${raw}`);
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.isRegistered && data.hasPassword) {
              setIsRegisteredDetected(true);
              if (data.fullName && !name.trim()) {
                setName(data.fullName);
              }
            } else {
              setIsRegisteredDetected(false);
            }
          }
        } catch (err) {
          console.error("Erro na verificação de telefone:", err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsRegisteredDetected(false);
    }
  }, [phone, isBypassActive, name]);

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneInput(e.target.value));
    if (error) setError(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) setError(null);
  };

  const handleSubmitFastAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawPhone = phone.replace(/\D/g, "");
    if (!name.trim() || name.trim().length < 3) {
      setError("Por favor, informe seu nome completo (mínimo 3 caracteres).");
      return;
    }
    if (rawPhone.length < 10) {
      setError("Por favor, inclua o DDD com 2 dígitos antes do número (ex: 65, 11).");
      return;
    }

    setLoading(true);
    try {
      const res = await fastAccess(name.trim(), rawPhone);

      if (res.status === "new_device_detected") {
        setMaskedAddress(res.maskedAddress);
        setStep("verify_device");
      } else if (res.status === "authenticated") {
        onSuccess(undefined, { name: name.trim(), phone: rawPhone });
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao conectar. Verifique seus dados.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    const cleanPhone = phone.replace(/\D/g, "");

    if (!password) {
      setPasswordError("Informe sua senha de acesso.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanPhone, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const nextFailures = failedPasswordAttempts + 1;
        setFailedPasswordAttempts(nextFailures);
        if (nextFailures >= 2) {
          setIsRescueModalOpen(true);
        }
        throw new Error(data.error || "Senha incorreta. Tente novamente.");
      }

      setFailedPasswordAttempts(0);
      await refreshUser();
      onSuccess(undefined, { name: name.trim(), phone: cleanPhone });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Senha incorreta. Tente novamente.";
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmergencyBypass = () => {
    setIsBypassActive(true);
    setIsRegisteredDetected(false);
    setIsRescueModalOpen(false);
  };

  const handleConfirmHouseNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setVerifyError(null);

    if (!isNoNumber && !houseNumberInput.trim()) {
      setVerifyError("Digite o número da residência ou marque a opção S/N.");
      return;
    }

    const rawPhone = phone.replace(/\D/g, "");
    setVerifyLoading(true);
    try {
      const res = await verifyDevice({
        phone: rawPhone,
        addressId: maskedAddress?.addressId,
        houseNumber: isNoNumber ? "S/N" : houseNumberInput.trim(),
        isNoNumber,
        updatedName: name.trim(),
      });

      if (res.status === "authenticated") {
        onSuccess(res.verifiedAddress, { name: name.trim(), phone: rawPhone });
        onClose();
      }
    } catch (err: unknown) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      const isMaxExceeded = nextAttempts >= 5 || (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "MAX_ATTEMPTS_EXCEEDED");
      if (isMaxExceeded) {
        setIsLocked(true);
        setVerifyError(
          "Limite de tentativas atingido. Por segurança, selecione 'Entregar em outro endereço' para preencher o local de entrega."
        );
      } else {
        const message = err instanceof Error ? err.message : `Número residencial incorreto. Tentativas restantes: ${5 - nextAttempts}.`;
        setVerifyError(message);
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDeliverOtherAddress = () => {
    onClose();
    if (onRequestNewAddress) {
      onRequestNewAddress();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden">
          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {step === "identify" ? (
            <div>
              {/* Cabeçalho */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3">
                  <Phone className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Acesso Rápido PopShake
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Informe seu WhatsApp para contato direto da loja caso haja dúvidas na entrega.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* CARD DE DETECÇÃO DE CADASTRO PRÉVIO */}
              {isRegisteredDetected ? (
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
                        Olá, <strong>{name || "Cliente"}</strong>! Digite sua senha para entrar mantendo seu carrinho e endereço intactos.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="registered-password" className="text-xs font-semibold text-foreground">
                        Sua Senha de Acesso
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="registered-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) setPasswordError(null);
                          }}
                          className="pl-9 pr-10 text-sm h-11 rounded-xl"
                          autoFocus
                          disabled={passwordLoading}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {passwordError && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                        {failedPasswordAttempts >= 2 && (
                          <button
                            type="button"
                            onClick={() => setIsRescueModalOpen(true)}
                            className="underline font-bold text-xs shrink-0 cursor-pointer"
                          >
                            Ajuda?
                          </button>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-bold gap-2 text-sm shadow-md cursor-pointer"
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar e Continuar Pedido
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>

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
                        onClick={handleEmergencyBypass}
                        className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px]"
                      >
                        Concluir pedido sem senha desta vez
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleSubmitFastAccess} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fast-access-name" className="text-xs font-semibold text-foreground">
                      Nome Completo
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fast-access-name"
                        type="text"
                        placeholder="Ex: Maria Silva"
                        value={name}
                        onChange={handleNameChange}
                        className="pl-9 text-sm h-11 rounded-xl"
                        disabled={loading}
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fast-access-phone" className="text-xs font-semibold text-foreground">
                      WhatsApp / Celular
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fast-access-phone"
                        type="tel"
                        placeholder="(65) 99999-9999"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="pl-9 text-sm h-11 rounded-xl font-mono"
                        disabled={loading}
                        autoComplete="tel"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-bold gap-2 text-sm shadow-md cursor-pointer"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Continuar para Entrega
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-center pt-1">
                    <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Ambiente seguro. Seus dados nunca são compartilhados.
                    </p>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              {/* Step: Novo Aparelho Detectado */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-1.5">
                  <span>🔒 Novo aparelho detectado</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Identificamos seu número. Por segurança, digite apenas o número da residência para confirmar a entrega.
                </p>
              </div>

              {verifyError && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Card com endereço mascarado */}
              <div className="mb-4 p-4 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-foreground">Endereço identificado:</p>
                    <p className="text-muted-foreground leading-relaxed font-mono">
                      {maskedAddress?.street || "Rua cadastrada"}, nº{" "}
                      <span className="inline-block px-2 py-0.5 border border-dashed border-primary text-primary font-bold rounded bg-primary/5">
                        [ ? ]
                      </span>{" "}
                      - {maskedAddress?.neighborhood || "Bairro"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {maskedAddress?.city || "Várzea Grande, MT"}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleConfirmHouseNumber} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="verify-house-number" className="text-xs font-semibold text-foreground">
                    Número da Residência
                  </Label>
                  <Input
                    id="verify-house-number"
                    type="text"
                    placeholder={isNoNumber ? "Sem número (S/N)" : "Ex: 142 ou 105-B"}
                    value={isNoNumber ? "" : houseNumberInput}
                    onChange={(e) => {
                      setHouseNumberInput(e.target.value);
                      if (verifyError) setVerifyError(null);
                    }}
                    className="h-11 rounded-xl text-center font-bold font-mono text-base"
                    disabled={isNoNumber || isLocked || verifyLoading}
                    autoFocus={!isNoNumber}
                    required={!isNoNumber}
                  />

                  {/* Suporte a Sem Número (S/N) */}
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      id="modal-sn-checkbox"
                      type="checkbox"
                      checked={isNoNumber}
                      disabled={isLocked || verifyLoading}
                      onChange={(e) => {
                        setIsNoNumber(e.target.checked);
                        if (e.target.checked) setHouseNumberInput("");
                        if (verifyError) setVerifyError(null);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-[#9306CF] focus:ring-[#9306CF] cursor-pointer"
                    />
                    <label htmlFor="modal-sn-checkbox" className="text-xs text-muted-foreground select-none cursor-pointer">
                      Minha residência não tem número (S/N)
                    </label>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  {!isLocked && (
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-bold gap-2 text-sm shadow-md cursor-pointer"
                      disabled={verifyLoading}
                    >
                      {verifyLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Confirmando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmar e Continuar
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant={isLocked ? "default" : "outline"}
                    onClick={handleDeliverOtherAddress}
                    className={`w-full ${
                      isLocked
                        ? "h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        : "h-10 text-xs text-muted-foreground hover:text-foreground"
                    } rounded-xl cursor-pointer`}
                  >
                    Entregar em outro endereço
                  </Button>
                </div>

                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
                  💡 <strong>Dica:</strong> Cadastre um e-mail e senha para completar seu cadastro e entrar direto em qualquer aparelho.
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <PasswordRecoveryRescueModal
        isOpen={isRescueModalOpen}
        onClose={() => setIsRescueModalOpen(false)}
        clientName={name}
        clientPhone={phone}
        onContinueWithoutPassword={handleEmergencyBypass}
      />
    </>
  );
}
