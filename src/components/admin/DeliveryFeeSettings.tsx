"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  DollarSign,
  Gift,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Sparkles,
  Info,
  Phone,
  ExternalLink,
} from "lucide-react";
import { storeSettingsService, StoreSettings } from "../../services/storeSettingsService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function DeliveryFeeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("5.00");
  const [enableFreeShipping, setEnableFreeShipping] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("60.00");
  const [whatsappNumber, setWhatsappNumber] = useState("5565999999999");
  const [whatsappMessage, setWhatsappMessage] = useState(
    "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria."
  );

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((settings) => {
        setDeliveryFee(settings.deliveryFee.toFixed(2));
        if (settings.freeDeliveryThreshold !== null && settings.freeDeliveryThreshold !== undefined) {
          setEnableFreeShipping(true);
          setFreeShippingThreshold(settings.freeDeliveryThreshold.toFixed(2));
        } else {
          setEnableFreeShipping(false);
          setFreeShippingThreshold("60.00");
        }
        if (settings.whatsappNumber) {
          setWhatsappNumber(settings.whatsappNumber);
        }
        if (settings.whatsappMessage) {
          setWhatsappMessage(settings.whatsappMessage);
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "error", text: "Erro ao carregar configurações da loja." });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const feeNum = parseFloat(deliveryFee);
    if (isNaN(feeNum) || feeNum < 0) {
      setMessage({ type: "error", text: "Informe uma taxa de entrega válida (maior ou igual a zero)." });
      return;
    }

    let thresholdNum: number | null = null;
    if (enableFreeShipping) {
      thresholdNum = parseFloat(freeShippingThreshold);
      if (isNaN(thresholdNum) || thresholdNum <= 0) {
        setMessage({
          type: "error",
          text: "Informe um valor mínimo válido para o frete grátis (maior que zero).",
        });
        return;
      }
    }

    setSaving(true);
    try {
      await storeSettingsService.updateSettings({
        deliveryFee: feeNum,
        freeDeliveryThreshold: thresholdNum,
        whatsappNumber: whatsappNumber.trim(),
        whatsappMessage: whatsappMessage.trim(),
      });

      setMessage({
        type: "success",
        text: "Configurações da loja (Taxa de Entrega e WhatsApp) salvas com sucesso!",
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Erro ao salvar configurações.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#9306CF]" />
        <span className="text-xs text-gray-500 font-mono">Carregando parâmetros de entrega...</span>
      </div>
    );
  }

  const feePreview = parseFloat(deliveryFee) || 0;
  const thresholdPreview = parseFloat(freeShippingThreshold) || 0;

  return (
    <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-150">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-[#512B54]/30">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2.5 text-[#4C264F] dark:text-[#F9F5F9]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9306CF] to-[#940068] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#9306CF]/20">
              <Truck className="w-5 h-5" />
            </div>
            <span>Gestão da Taxa de Entrega</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure o valor padrão cobrado pelo frete e defina metas para incentivar compras maiores com frete grátis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cálculo Dinâmico Ativo
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-3 transition-all ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/40"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Taxa Fixa Padrão */}
          <div className="bg-gray-50/80 dark:bg-[#1A0B1C]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
                Taxa Padrão de Entrega
              </h4>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Valor cobrado por padrão em todos os pedidos despachados para entrega em domicílio.
            </p>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Valor do Frete (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-gray-400">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="5.00"
                  className="pl-11 font-mono font-bold text-base h-12 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl focus-visible:ring-2 focus-visible:ring-[#9306CF]/20 focus-visible:border-[#9306CF]"
                  required
                />
              </div>
              <span className="text-[11px] text-gray-400 block">
                Ex: Digite 5.00 para cobrar R$ 5,00 ou 0 para entrega sempre gratuita.
              </span>
            </div>
          </div>

          {/* Card 2: Regra de Frete Grátis */}
          <div className="bg-gray-50/80 dark:bg-[#1A0B1C]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h4 className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
                  Regra de Frete Grátis
                </h4>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableFreeShipping}
                  onChange={(e) => setEnableFreeShipping(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Incentive seus clientes a aumentar o ticket médio oferecendo entrega zerada a partir de determinado valor.
            </p>

            {enableFreeShipping ? (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Frete Grátis a partir de (R$) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-gray-400">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="1.00"
                    min="1"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    placeholder="60.00"
                    className="pl-11 font-mono font-bold text-base h-12 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                    required={enableFreeShipping}
                  />
                </div>
                <span className="text-[11px] text-gray-400 block">
                  Ex: Digite 60.00 para pedidos acima de R$ 60,00 terem frete grátis.
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-gray-400" />
                <span>Frete grátis desativado. A taxa padrão será aplicada a todos os pedidos.</span>
              </div>
            )}
          </div>
        </div>

        {/* Card de Simulação ao Vivo e Exemplo de Aplicação */}
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-[#9306CF]/20 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#9306CF] dark:text-[#C7A9C9]">
            <Sparkles className="w-4 h-4" />
            <h5 className="font-heading font-bold text-xs uppercase tracking-wider">
              Simulação da Regra de Entrega na Loja
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/80 dark:bg-[#190B1A]/80 p-3.5 rounded-xl border border-gray-200 dark:border-[#512B54]/40 space-y-1">
              <span className="font-bold text-gray-700 dark:text-gray-300 block">
                Exemplo 1: Pedido menor (R$ {(thresholdPreview > 10 ? thresholdPreview - 10 : 35).toFixed(2).replace(".", ",")})
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Taxa de Entrega aplicada:{" "}
                <strong className="text-[#9306CF] dark:text-[#C7A9C9] font-mono">
                  R$ {feePreview.toFixed(2).replace(".", ",")}
                </strong>
              </p>
            </div>

            <div className="bg-white/80 dark:bg-[#190B1A]/80 p-3.5 rounded-xl border border-gray-200 dark:border-[#512B54]/40 space-y-1">
              <span className="font-bold text-gray-700 dark:text-gray-300 block">
                Exemplo 2: Pedido maior (R$ {(thresholdPreview + 10).toFixed(2).replace(".", ",")})
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Taxa de Entrega aplicada:{" "}
                {enableFreeShipping && thresholdPreview > 0 ? (
                  <span className="px-2 py-0.5 rounded-md font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300/40">
                    GRÁTIS 🎉
                  </span>
                ) : (
                  <strong className="text-[#9306CF] dark:text-[#C7A9C9] font-mono">
                    R$ {feePreview.toFixed(2).replace(".", ",")}
                  </strong>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Canal Oficial de Atendimento (WhatsApp Comercial) */}
        <div className="bg-gray-50/80 dark:bg-[#1A0B1C]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
                  Canal Oficial de Atendimento (WhatsApp Comercial)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure o número e a mensagem que abrem automaticamente quando os clientes clicam no botão flutuante.
                </p>
              </div>
            </div>

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                  whatsappMessage
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto"
              >
                <span>💬 Testar no WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Número do WhatsApp Comercial *
              </Label>
              <Input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="5565999999999"
                className="font-mono text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-400"
                required
              />
              <span className="text-[11px] text-gray-400 block">
                Padrão internacional: DDI + DDD + Número (ex: 5565999999999).
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Mensagem Padrão de Boas-Vindas *
              </Label>
              <Input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria."
                className="text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-400"
                required
              />
              <span className="text-[11px] text-gray-400 block">
                Texto inicial que o cliente já encontra digitado ao abrir a conversa.
              </span>
            </div>
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold h-12 px-8 shadow-md shadow-[#9306CF]/20 flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Salvando Alterações...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Configurações da Loja
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
