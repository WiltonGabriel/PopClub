"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  User,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ArrowRight,
  MapPin,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FastAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedAddress?: any) => void;
  onRequestNewAddress?: () => void;
}

export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.replace(/^55/, "");
  }
  digits = digits.slice(0, 11);
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
}: FastAccessModalProps) {
  const { fastAccess, verifyDevice } = useAuth();

  // Etapas: "identify" | "verify_device"
  const [step, setStep] = useState<"identify" | "verify_device">("identify");

  // Campos de identificação
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos de novo aparelho detectado
  const [maskedAddress, setMaskedAddress] = useState<any>(null);
  const [houseNumberInput, setHouseNumberInput] = useState("");
  const [isNoNumber, setIsNoNumber] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

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
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar. Verifique seus dados.");
    } finally {
      setLoading(false);
    }
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
        onSuccess(res.verifiedAddress);
        onClose();
      }
    } catch (err: any) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5 || err?.code === "MAX_ATTEMPTS_EXCEEDED") {
        setIsLocked(true);
        setVerifyError(
          "Limite de tentativas atingido. Por segurança, selecione 'Entregar em outro endereço' para preencher o local de entrega."
        );
      } else {
        setVerifyError(
          err.message || `Número residencial incorreto. Tentativas restantes: ${5 - nextAttempts}.`
        );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
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
                    placeholder="Ex: João da Silva"
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
                  className="w-full h-11 rounded-xl font-bold gap-2 text-sm shadow-md"
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
  );
}
