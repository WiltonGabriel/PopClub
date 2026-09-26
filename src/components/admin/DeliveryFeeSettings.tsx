"use client";

import { useState, useEffect, useRef } from "react";
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
  AlertTriangle,
  X,
  ShieldAlert,
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
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
  const [latInput, setLatInput] = useState("-15.653600");
  const [lngInput, setLngInput] = useState("-56.132200");
  const [isStoreSettingsLoaded, setIsStoreSettingsLoaded] = useState(false);
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

        const lat = settings.storeLatitude !== undefined && settings.storeLatitude !== null ? settings.storeLatitude : -15.6536;
        const lng = settings.storeLongitude !== undefined && settings.storeLongitude !== null ? settings.storeLongitude : -56.1322;
        const address = settings.storeAddress || "Várzea Grande, MT";

        setStoreLatitude(lat);
        setStoreLongitude(lng);
        setLatInput(lat.toFixed(6));
        setLngInput(lng.toFixed(6));
        setStoreAddress(address);
        setIsStoreSettingsLoaded(true);
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
    setLatInput(result.latitude.toFixed(6));
    setLngInput(result.longitude.toFixed(6));
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
        setLatInput(lat.toFixed(6));
        setLngInput(lng.toFixed(6));

        try {
          const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            let suggestedAddress = "";
            if (data.road && data.neighborhood) {
              suggestedAddress = `${data.road}, ${data.neighborhood}${data.city ? ` - ${data.city}` : ""}`;
            } else if (data.displayName) {
              suggestedAddress = data.displayName;
            }
            if (suggestedAddress) {
              setStoreAddress(suggestedAddress);
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

  // Sincronização via interação no mapa (arraste ou clique)
  const handleLocationSelectFromMap = (
    coords: { lat: number; lng: number },
    details?: any
  ) => {
    setStoreLatitude(coords.lat);
    setStoreLongitude(coords.lng);
    setLatInput(coords.lat.toFixed(6));
    setLngInput(coords.lng.toFixed(6));

    if (details) {
      let suggestedAddress = "";
      if (details.road && details.neighborhood) {
        suggestedAddress = `${details.road}, ${details.neighborhood}${details.city ? ` - ${details.city}` : ""}`;
      } else if (details.displayName) {
        suggestedAddress = details.displayName;
      }
      if (suggestedAddress) {
        setStoreAddress(suggestedAddress);
      }
    }
  };

  // Estados da Trava de Segurança e Modal de Confirmação
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState("");
  const confirmInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isConfirmModalOpen) {
      const timer = setTimeout(() => {
        confirmInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isConfirmModalOpen]);

  const isConfirmed = confirmInputText.trim().toLowerCase() === "sim";

  const handleOpenConfirmModal = (e: React.FormEvent) => {
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

    if (!storeAddress.trim()) {
      setMessage({ type: "error", text: "Informe o endereço oficial da sede da loja." });
      return;
    }

    if (!whatsappNumber.trim()) {
      setMessage({ type: "error", text: "Informe o número do WhatsApp comercial." });
      return;
    }

    setConfirmInputText("");
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmInputText("");
  };

  const handleExecuteSave = async () => {
    if (!isConfirmed || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const rawFee = parseFloat(deliveryFee.replace(",", "."));
      const feeNum = !isNaN(rawFee) && rawFee >= 0 ? rawFee : 5.0;

      let thresholdNum: number | null = null;
      if (enableFreeShipping) {
        const rawThresh = parseFloat(freeShippingThreshold.replace(",", "."));
        thresholdNum = !isNaN(rawThresh) && rawThresh >= 0 ? rawThresh : 60.0;
      }

      const parsedLat = parseFloat(latInput.trim().replace(",", "."));
      const parsedLng = parseFloat(lngInput.trim().replace(",", "."));
      const finalLat = !isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90 ? parsedLat : storeLatitude;
      const finalLng = !isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180 ? parsedLng : storeLongitude;

      await storeSettingsService.updateSettings({
        deliveryFee: feeNum,
        freeDeliveryThreshold: thresholdNum,
        whatsappNumber: whatsappNumber.trim(),
        whatsappMessage: whatsappMessage.trim(),
        storeLatitude: finalLat,
        storeLongitude: finalLng,
        storeAddress: storeAddress.trim(),
      });

      setIsConfirmModalOpen(false);
      setConfirmInputText("");
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
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-gray-500 font-mono">Carregando parâmetros de entrega...</span>
      </div>
    );
  }

  const feePreview = parseFloat(deliveryFee) || 0;
  const thresholdPreview = parseFloat(freeShippingThreshold) || 0;

  return (
    <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-150">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-border/30">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground dark:text-foreground">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
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

      <form onSubmit={handleOpenConfirmModal} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Taxa Fixa Padrão */}
          <div className="bg-gray-50/80 dark:bg-background/80 border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="font-heading font-bold text-sm text-foreground dark:text-foreground uppercase tracking-wide">
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
                  className="pl-11 font-mono font-bold text-base h-12 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  required
                />
              </div>
              <span className="text-[11px] text-gray-400 block">
                Ex: Digite 5.00 para cobrar R$ 5,00 ou 0 para entrega sempre gratuita.
              </span>
            </div>
          </div>

          {/* Card 2: Regra de Frete Grátis */}
          <div className="bg-gray-50/80 dark:bg-background/80 border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h4 className="font-heading font-bold text-sm text-foreground dark:text-foreground uppercase tracking-wide">
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
                    className="pl-11 font-mono font-bold text-base h-12 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
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
        <div className="bg-gradient-to-r from-primary/10 via-pink-500/10 to-amber-500/10 border border-primary/20 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-primary dark:text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <h5 className="font-heading font-bold text-xs uppercase tracking-wider">
              Simulação da Regra de Entrega na Loja
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/80 dark:bg-background/80 p-3.5 rounded-xl border border-gray-200 dark:border-border/40 space-y-1">
              <span className="font-bold text-gray-700 dark:text-gray-300 block">
                Exemplo 1: Pedido menor (R$ {(thresholdPreview > 10 ? thresholdPreview - 10 : 35).toFixed(2).replace(".", ",")})
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Taxa de Entrega aplicada:{" "}
                <strong className="text-primary dark:text-muted-foreground font-mono">
                  R$ {feePreview.toFixed(2).replace(".", ",")}
                </strong>
              </p>
            </div>

            <div className="bg-white/80 dark:bg-background/80 p-3.5 rounded-xl border border-gray-200 dark:border-border/40 space-y-1">
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
                  <strong className="text-primary dark:text-muted-foreground font-mono">
                    R$ {feePreview.toFixed(2).replace(".", ",")}
                  </strong>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Canal Oficial de Atendimento (WhatsApp Comercial) */}
        <div className="bg-gray-50/80 dark:bg-background/80 border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground dark:text-foreground uppercase tracking-wide">
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
                className="font-mono text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-400"
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
                className="text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-400"
                required
              />
              <span className="text-[11px] text-gray-400 block">
                Texto inicial que o cliente já encontra digitado ao abrir a conversa.
              </span>
            </div>
          </div>
        </div>

        {/* Bloco: Ponto Geográfico e Sede da Loja */}
        <div className="bg-gray-50/80 dark:bg-background/80 border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60 dark:border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-foreground dark:text-foreground uppercase tracking-wide flex items-center gap-2">
                  <span>Ponto Geográfico e Sede da Loja</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-muted-foreground border border-primary/20">
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary dark:text-muted-foreground text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
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
                  className="pl-10 text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleSearchStoreAddress()}
                disabled={isSearchingStore || !storeSearchQuery.trim()}
                className="bg-primary hover:bg-[#7c05ae] text-white text-xs font-bold h-11 px-5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Posicionamento Exato da Loja Física</span>
              </Label>
              <span className="text-[11px] text-muted-foreground font-medium">
                Arraste o ícone 🍧 até a entrada do estabelecimento
              </span>
            </div>

            {isStoreSettingsLoaded ? (
              <LocationPickerMap
                initialCoords={{ lat: storeLatitude, lng: storeLongitude }}
                initialAddress={storeAddress}
                height="300px"
                pinEmoji="🍧"
                pinLabel="Sede Pop Shake"
                onLocationSelect={handleLocationSelectFromMap}
              />
            ) : (
              <div className="w-full h-[300px] rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-medium font-mono">Carregando coordenadas salvas da sede...</span>
              </div>
            )}
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
                className="text-sm h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
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
                  type="text"
                  inputMode="decimal"
                  value={latInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLatInput(val);
                    const normalized = val.trim().replace(",", ".");
                    const num = parseFloat(normalized);
                    if (!isNaN(num) && num >= -90 && num <= 90) {
                      setStoreLatitude(num);
                    }
                  }}
                  onBlur={() => {
                    const normalized = latInput.trim().replace(",", ".");
                    const num = parseFloat(normalized);
                    if (!isNaN(num) && num >= -90 && num <= 90) {
                      setLatInput(num.toFixed(6));
                      setStoreLatitude(num);
                    } else {
                      setLatInput(storeLatitude.toFixed(6));
                    }
                  }}
                  placeholder="-15.653600"
                  className="font-mono text-xs h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Longitude *
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={lngInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLngInput(val);
                    const normalized = val.trim().replace(",", ".");
                    const num = parseFloat(normalized);
                    if (!isNaN(num) && num >= -180 && num <= 180) {
                      setStoreLongitude(num);
                    }
                  }}
                  onBlur={() => {
                    const normalized = lngInput.trim().replace(",", ".");
                    const num = parseFloat(normalized);
                    if (!isNaN(num) && num >= -180 && num <= 180) {
                      setLngInput(num.toFixed(6));
                      setStoreLongitude(num);
                    } else {
                      setLngInput(storeLongitude.toFixed(6));
                    }
                  }}
                  placeholder="-56.132200"
                  className="font-mono text-xs h-11 bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
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
            className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold h-12 px-8 shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer"
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

      {/* Modal Crítico de Confirmação com Trava de Digitação ("Sim") */}
      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              handleCloseConfirmModal();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !saving) {
              handleCloseConfirmModal();
            }
          }}
        >
          <div className="bg-white dark:bg-[#1E091B] border border-gray-200 dark:border-border/60 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="confirm-modal-title"
                    className="font-heading font-bold text-base sm:text-lg text-foreground dark:text-foreground leading-snug"
                  >
                    Você tem certeza que deseja salvar estas alterações?
                  </h3>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 uppercase font-semibold">
                    Ação crítica de configuração
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseConfirmModal}
                disabled={saving}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Texto de Alerta */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Alterações na sede da loja, raios de entrega ou canais de atendimento alteram imediatamente os cálculos de frete e rotas dos pedidos ativos.
              </span>
            </div>

            {/* Campo de Confirmação com Digitação */}
            <div className="space-y-2 pt-1">
              <Label
                htmlFor="confirm-sim-input"
                className="text-xs font-bold text-gray-700 dark:text-gray-300 block"
              >
                Para confirmar, digite exatamente <strong className="text-primary dark:text-muted-foreground font-black underline">Sim</strong> no campo abaixo:
              </Label>
              <div className="relative">
                <Input
                  ref={confirmInputRef}
                  id="confirm-sim-input"
                  type="text"
                  autoComplete="off"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (isConfirmed && !saving) {
                        handleExecuteSave();
                      }
                    }
                  }}
                  placeholder="Digite Sim para confirmar"
                  className={`text-sm h-11 bg-white dark:bg-[#200B22] border-2 rounded-xl transition-all ${
                    isConfirmed
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold"
                      : "border-gray-300 dark:border-border/60 focus-visible:border-primary"
                  }`}
                  disabled={saving}
                />
                {isConfirmed && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2 animate-in zoom-in-50" />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground block">
                {isConfirmed
                  ? "✓ Palavra de confirmação válida. Você já pode salvar."
                  : "A digitação diferencia a intenção de gravação para evitar cliques acidentais."}
              </span>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-border/30">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseConfirmModal}
                disabled={saving}
                className="h-11 px-5 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleExecuteSave}
                disabled={!isConfirmed || saving}
                className={`h-11 px-6 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                  isConfirmed && !saving
                    ? "bg-gradient-to-r from-primary to-accent text-white hover:opacity-95 shadow-primary/30"
                    : "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500 border border-transparent cursor-not-allowed opacity-60 shadow-none"
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
