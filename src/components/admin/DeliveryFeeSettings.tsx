"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
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
  MapPin,
  Store,
  Navigation,
  Search,
  Crosshair,
} from "lucide-react";
import { storeSettingsService, StoreSettings } from "../../services/storeSettingsService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const LocationPickerMap = dynamic(
  () => import("@/components/logistics/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin text-[#9306CF]" />
        <span className="text-xs font-medium font-mono">Carregando mapa da sede da loja...</span>
      </div>
    ),
  }
);

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

  // Estados de Ponto Geográfico e Sede da Loja
  const [storeLatitude, setStoreLatitude] = useState(-15.6536);
  const [storeLongitude, setStoreLongitude] = useState(-56.1322);
  const [storeAddress, setStoreAddress] = useState("Várzea Grande, MT");
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [isSearchingStore, setIsSearchingStore] = useState(false);
  const [storeSearchResults, setStoreSearchResults] = useState<any[]>([]);
  const [isLocatingStore, setIsLocatingStore] = useState(false);

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
        if (settings.storeLatitude !== undefined && settings.storeLatitude !== null) {
          setStoreLatitude(settings.storeLatitude);
        }
        if (settings.storeLongitude !== undefined && settings.storeLongitude !== null) {
          setStoreLongitude(settings.storeLongitude);
        }
        if (settings.storeAddress) {
          setStoreAddress(settings.storeAddress);
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "error", text: "Erro ao carregar configurações da loja." });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearchStoreAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!storeSearchQuery.trim() || storeSearchQuery.trim().length < 2) return;

    setIsSearchingStore(true);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(storeSearchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setStoreSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Erro ao buscar endereço da loja:", err);
    } finally {
      setIsSearchingStore(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    setStoreLatitude(result.latitude);
    setStoreLongitude(result.longitude);
    setStoreAddress(result.displayName);
    setStoreSearchResults([]);
    setStoreSearchQuery("");
  };

  const handleUseCurrentGpsAsStore = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsLocatingStore(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setStoreLatitude(lat);
        setStoreLongitude(lng);

        try {
          const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.displayName) {
              setStoreAddress(data.displayName);
            }
          }
        } catch (e) {
          console.warn("Aviso ao fazer reverse geocode do GPS da loja:", e);
        } finally {
          setIsLocatingStore(false);
        }
      },
      (err) => {
        console.warn("Erro ao obter GPS da loja:", err);
        setIsLocatingStore(false);
        alert("Não foi possível obter o sinal do GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
        storeLatitude,
        storeLongitude,
        storeAddress: storeAddress.trim(),
      });

      setMessage({
        type: "success",
        text: "Configurações da loja (Taxa de Entrega, Sede da Loja e WhatsApp) salvas com sucesso!",
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

        {/* Bloco: Ponto Geográfico e Sede da Loja */}
        <div className="bg-gray-50/80 dark:bg-[#1A0B1C]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60 dark:border-[#512B54]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9306CF] to-[#940068] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#9306CF]/20">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide flex items-center gap-2">
                  <span>Ponto Geográfico e Sede da Loja</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
                    Origem de Despacho
                  </span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Defina o endereço e a coordenada exata da loja física. Este ponto é a <strong>origem oficial</strong> para cálculo de distância de entrega, frete e rota de despacho do entregador.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseCurrentGpsAsStore}
                disabled={isLocatingStore}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#9306CF]/30 bg-[#9306CF]/10 hover:bg-[#9306CF]/15 text-[#9306CF] dark:text-[#C7A9C9] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="Capturar coordenadas do GPS atual deste computador/celular"
              >
                {isLocatingStore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" />
                )}
                <span>Usar GPS do Aparelho</span>
              </button>
            </div>
          </div>

          {/* Barra de Pesquisa de Endereço da Loja */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Buscar Endereço da Sorveteria no Mapa
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchStoreAddress();
                    }
                  }}
                  placeholder="Ex: Av. Couto Magalhães, Centro, Várzea Grande"
                  className="pl-10 text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl focus-visible:ring-2 focus-visible:ring-[#9306CF]"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleSearchStoreAddress()}
                disabled={isSearchingStore || !storeSearchQuery.trim()}
                className="bg-[#9306CF] hover:bg-[#7c05ae] text-white text-xs font-bold h-11 px-5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSearchingStore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Pesquisar</span>
              </Button>
            </div>

            {/* Lista de Resultados Encontrados */}
            {storeSearchResults.length > 0 && (
              <div className="p-2 bg-white dark:bg-[#200B22] border border-border/80 rounded-xl shadow-lg space-y-1 animate-in fade-in">
                <span className="text-[11px] font-bold text-muted-foreground px-2 py-1 block">
                  Selecione um resultado para posicionar o alfinete:
                </span>
                {storeSearchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-muted/80 text-xs text-foreground transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-[#9306CF] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{res.displayName}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {res.latitude.toFixed(5)}, {res.longitude.toFixed(5)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Componente de Mapa com Alfinete Arrastável */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#9306CF]" />
                <span>Posicionamento Exato da Loja Física</span>
              </Label>
              <span className="text-[11px] text-muted-foreground font-medium">
                Arraste o ícone 🍧 até a entrada do estabelecimento
              </span>
            </div>

            <LocationPickerMap
              initialCoords={{ lat: storeLatitude, lng: storeLongitude }}
              height="300px"
              pinEmoji="🍧"
              pinLabel="Sede Pop Shake"
              onLocationSelect={(coords, details) => {
                setStoreLatitude(coords.lat);
                setStoreLongitude(coords.lng);
                if (details?.displayName) {
                  setStoreAddress(details.displayName);
                }
              }}
            />
          </div>

          {/* Campos de Endereço e Coordenadas Detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Endereço Oficial da Sede *
              </Label>
              <Input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Ex: Av. Filinto Müller, 1234 - Centro, Várzea Grande - MT"
                className="text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl focus-visible:ring-2 focus-visible:ring-[#9306CF]"
                required
              />
              <span className="text-[11px] text-gray-400 block">
                Nome completo ou logradouro da matriz/filial para exibição em rotas e comprovantes.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Latitude *
                </Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={storeLatitude}
                  onChange={(e) => setStoreLatitude(parseFloat(e.target.value) || 0)}
                  className="font-mono text-xs h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Longitude *
                </Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={storeLongitude}
                  onChange={(e) => setStoreLongitude(parseFloat(e.target.value) || 0)}
                  className="font-mono text-xs h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 rounded-xl"
                  required
                />
              </div>
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
