"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import {
  Bike,
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  ShieldCheck,
  DollarSign,
  Package,
  Radio,
  Loader2,
  Sparkles,
  Sun,
  Moon,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryDetails {
  orderId: string;
  status: string;
  isGpsTrackingActive: boolean;
  courierLatitude?: number | null;
  courierLongitude?: number | null;
  courierUpdatedAt?: string | null;
  client: {
    name: string;
    phone?: string | null;
  };
  deliveryAddress: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    complement?: string | null;
    reference?: string | null;
    zip?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  payment: {
    type: string;
    changeFor?: number | null;
    changeToReturn?: number | null;
    total: number;
    isPaid?: boolean;
  };
  items: {
    id: string;
    quantity: number;
    productName: string;
  }[];
  storeOrigin: {
    lat: number;
    lng: number;
  };
}

export default function CourierDeliveryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alternador de Tema (Modo Claro para luz solar forte / Modo Escuro)
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("popshake_courier_theme") === "light";
    }
    return false;
  });

  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("popshake_courier_theme", next ? "light" : "dark");
      }
      return next;
    });
  };

  // Estados de Rastreamento GPS
  const [isTracking, setIsTracking] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateTimestampRef = useRef<number>(0);

  // Estados de Conclusão e Compartilhamento
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deliveryPinInput, setDeliveryPinInput] = useState("");
  const [isCompletedSuccess, setIsCompletedSuccess] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedDeliveryLink, setCopiedDeliveryLink] = useState(false);

  // Carrega dados da entrega
  const fetchDelivery = async () => {
    try {
      const res = await fetch(`/api/delivery/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Entrega não encontrada.");
      }
      setDelivery(data);
      if (data.status === "completed") {
        setIsCompletedSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Falha ao carregar entrega.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
  }, [token]);

  // Envia coordenadas para a API
  const sendCoordinates = async (lat: number, lng: number, accuracy?: number) => {
    try {
      const res = await fetch(`/api/delivery/${token}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (res.ok) {
        const now = new Date();
        setLastSentTime(
          now.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        if (accuracy !== undefined) setLastAccuracy(Math.round(accuracy));
        setGpsError(null);
      }
    } catch (err) {
      console.warn("Falha ao enviar coordenada GPS:", err);
    }
  };

  // Inicia transmissão de GPS contínua via watchPosition
  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocalização não é suportada neste navegador.");
      return;
    }

    setGpsError(null);
    setIsTracking(true);

    // Se o pedido ainda está na bancada (status 'ready'), ativa a transição oficial para 'delivering' na esteira
    if (delivery && delivery.status !== "delivering" && delivery.status !== "completed") {
      fetch(`/api/delivery/${token}/start`, { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            setDelivery((prev) => (prev ? { ...prev, status: "delivering" } : prev));
          }
        })
        .catch((err) => console.warn("Aviso ao iniciar rota na API:", err));
    }

    // Envia a primeira coordenada imediatamente
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
        lastUpdateTimestampRef.current = Date.now();
      },
      (err) => {
        console.error("Erro ao obter posição inicial:", err);
        setGpsError("Permissão de GPS negada. Por favor, autorize a localização.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );

    // Monitora movimento com throttle de 10 segundos
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastUpdateTimestampRef.current >= 10000) {
          lastUpdateTimestampRef.current = now;
          sendCoordinates(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy
          );
        }
      },
      (err) => {
        console.warn("Aviso de geolocalização:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );

    watchIdRef.current = watchId;
  };

  // Pausa a transmissão de GPS
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  // Limpa watch ao desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Marca como entregue
  const handleCompleteDelivery = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/delivery/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: deliveryPinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao finalizar entrega.");
      }
      stopTracking();
      setIsCompletedSuccess(true);
      setIsCompleteModalOpen(false);
      if (delivery) {
        setDelivery({ ...delivery, status: "completed" });
      }
    } catch (err: any) {
      alert(err.message || "Falha ao concluir entrega.");
    } finally {
      setCompleting(false);
    }
  };

  // Copia link da entrega
  const handleCopyDeliveryLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      if (!url) return;
      await navigator.clipboard.writeText(url);
      setCopiedDeliveryLink(true);
      setTimeout(() => setCopiedDeliveryLink(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isLightMode ? "bg-slate-100 text-slate-800" : "bg-background text-white"} flex flex-col items-center justify-center p-6 space-y-4`}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-gray-400">
          Carregando dados da rota...
        </p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className={`min-h-screen ${isLightMode ? "bg-slate-100 text-slate-800" : "bg-background text-white"} flex flex-col items-center justify-center p-6 text-center space-y-4`}>
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="font-heading text-xl font-bold uppercase">Entrega não encontrada</h1>
        <p className="text-xs text-gray-400 max-w-sm">
          {error || "Este link de entrega é inválido ou expirou. Confirme com o atendente da Pop Shake."}
        </p>
      </div>
    );
  }

  const { client, deliveryAddress, payment, items } = delivery;
  const fullAddress = `${deliveryAddress.street}, ${deliveryAddress.number}${
    deliveryAddress.complement ? ` (${deliveryAddress.complement})` : ""
  }, ${deliveryAddress.neighborhood}, ${deliveryAddress.city}`;

  const destLat = deliveryAddress.latitude;
  const destLng = deliveryAddress.longitude;

  // URLs diretas para navegação GPS nativa no celular
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

  const wazeUrl = destLat && destLng
    ? `https://www.waze.com/ul?ll=${destLat},${destLng}&navigate=yes`
    : `https://www.waze.com/ul?q=${encodeURIComponent(fullAddress)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(fullAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  // WhatsApp Sanitizado com encodeURIComponent
  const getClientWhatsAppUrl = () => {
    if (!client.phone) return "#";
    const rawDigits = client.phone.replace(/\D/g, "");
    const digitsNo55 = rawDigits.startsWith("55") && (rawDigits.length === 12 || rawDigits.length === 13)
      ? rawDigits.slice(2)
      : rawDigits;
    const finalPhone = `55${digitsNo55}`;

    const shortId = delivery.orderId.substring(0, 6);
    const message = `🍧 *Pop Shake Sorveteria — Entrega do Pedido #${shortId}*\n\n` +
      `Olá, *${client.name}*!\n` +
      `Sou o entregador da Pop Shake e estou a caminho com o seu pedido.\n\n` +
      `📍 *Endereço:* ${deliveryAddress.street}, ${deliveryAddress.number} - ${deliveryAddress.neighborhood}\n` +
      (deliveryAddress.complement ? `🏢 *Complemento:* ${deliveryAddress.complement}\n` : "") +
      (deliveryAddress.reference ? `🔍 *Referência:* ${deliveryAddress.reference}\n` : "") +
      `\nQualquer dúvida ou ponto de referência estou à disposição! 🛵💨`;

    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  // Status de Cobrança
  const isPaidOnline = payment.type === "online" || payment.type === "pix_online" || payment.type === "pago" || payment.isPaid === true;
  const isCash = payment.type === "dinheiro";
  const isCard = payment.type === "cartao_maquininha";
  const isPixDelivery = payment.type === "pix_entrega";

  const changeFor = payment.changeFor || null;
  const changeToReturn = payment.changeToReturn || (changeFor ? Math.max(0, changeFor - payment.total) : null);

  // Classes do tema
  const pageBgClass = isLightMode ? "bg-slate-100 text-slate-900" : "bg-[#120613] text-gray-100";
  const headerBgClass = isLightMode ? "bg-white border-slate-200 text-slate-900" : "bg-[#1F0B22] border-border/40 text-white";
  const cardBgClass = isLightMode ? "bg-white border-slate-200 shadow-md text-slate-900" : "bg-[#1D0C20] border-border/50 shadow-xl text-gray-100";
  const mutedTextClass = isLightMode ? "text-slate-500" : "text-gray-400";
  const headingTextClass = isLightMode ? "text-slate-900" : "text-white";

  return (
    <div className={`min-h-screen min-h-[100dvh] ${pageBgClass} flex flex-col selection:bg-primary/30 pb-safe transition-colors duration-200`}>
      {/* Top Header */}
      <header className={`w-full ${headerBgClass} border-b px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-lg`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-sm shadow-primary/30 font-bold text-lg">
            🍧
          </div>
          <div>
            <span className={`font-heading font-black text-sm tracking-tight ${headingTextClass} block leading-none`}>
              Pop<span className="text-primary dark:text-muted-foreground">Shake</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-500 dark:text-emerald-400 font-bold">
              Área do Entregador
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Tema: Sol (Modo Claro sob luz solar forte) / Lua */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLightMode ? "Ativar Modo Escuro" : "Ativar Modo Claro sob luz do Sol"}
            className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              isLightMode
                ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
                : "bg-white/10 border-white/10 text-amber-300 hover:bg-white/20"
            }`}
          >
            {isLightMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="hidden sm:inline text-[11px]">Modo Sol</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-primary/30" />
                <span className="hidden sm:inline text-[11px]">Modo Escuro</span>
              </>
            )}
          </button>

          <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
            isLightMode ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-white/10 text-muted-foreground border-white/10"
          }`}>
            #{delivery.orderId.substring(0, 6)}
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* Barra Rápida de Ações (Copiar Link de Entrega) */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopyDeliveryLink}
            className={`flex-1 h-11 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
              copiedDeliveryLink
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                : isLightMode
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
                : "bg-[#1D0C20] border-border/60 text-gray-200 hover:bg-[#25102a]"
            }`}
          >
            {copiedDeliveryLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>✅ Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-primary" />
                <span>📋 Copiar Link de Entrega</span>
              </>
            )}
          </button>
        </div>

        {/* Banner de Status Concluído */}
        {isCompletedSuccess ? (
          <div className="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-3xl p-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="font-heading text-xl font-black text-emerald-300 uppercase tracking-tight">
              Entrega Finalizada!
            </h2>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              O pedido foi concluído com sucesso e o cliente já foi notificado. Muito obrigado pelo seu excelente trabalho!
            </p>
          </div>
        ) : (
          <>
            {/* Bloco Destaque Visual de Cobrança (Prevenção de Erros de Caixa) */}
            {isPaidOnline ? (
              <div className="rounded-3xl p-5 border-2 border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 shadow-lg space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow">
                    ✓
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider block font-bold text-emerald-600 dark:text-emerald-400">
                      Status Financeiro
                    </span>
                    <h3 className="font-heading text-base sm:text-lg font-black uppercase text-emerald-700 dark:text-emerald-300">
                      ✅ JÁ PAGO ONLINE
                    </h3>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                      NÃO COBRAR NADA DO CLIENTE
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl p-5 border-2 border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold text-xl shrink-0 shadow">
                    ⚠️
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider block font-bold text-amber-700 dark:text-amber-400">
                      Cobrança Obrigatória na Entrega
                    </span>
                    <h3 className="font-heading text-lg sm:text-xl font-black uppercase text-amber-800 dark:text-amber-300">
                      COBRAR R$ {payment.total.toFixed(2).replace(".", ",")}
                    </h3>
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 pt-0.5">
                      Receber via:{" "}
                      <strong className="uppercase underline">
                        {isCash ? "Dinheiro" : isCard ? "Cartão / Maquininha" : "PIX na Entrega"}
                      </strong>
                    </p>
                  </div>
                </div>

                {isCash && changeFor && (
                  <div className={`rounded-2xl p-3.5 space-y-2 text-xs border ${
                    isLightMode ? "bg-white/90 border-amber-300 text-slate-800" : "bg-black/40 border-amber-400/30 text-gray-200"
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={mutedTextClass}>Cliente vai entregar:</span>
                      <strong className="font-mono text-sm">
                        R$ {changeFor.toFixed(2).replace(".", ",")}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={mutedTextClass}>Valor do Pedido:</span>
                      <span className="font-mono">R$ {payment.total.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="pt-2 border-t border-amber-400/30 flex justify-between items-center text-sm font-black text-amber-800 dark:text-amber-300">
                      <span>💰 LEVAR DE TROCO:</span>
                      <span className="font-mono text-base bg-amber-500 text-black px-2.5 py-0.5 rounded-lg shadow-sm">
                        R$ {changeToReturn?.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bloco 1: Controle de GPS ao Vivo */}
            <section className={`${cardBgClass} rounded-3xl p-4 sm:p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isTracking ? "bg-emerald-500 animate-ping" : "bg-gray-400"
                    }`}
                  />
                  <span className={`font-heading font-bold text-xs uppercase tracking-wider ${headingTextClass}`}>
                    {isTracking ? "GPS Ativo em Tempo Real" : "GPS Não Transmitindo"}
                  </span>
                </div>
                {isTracking && (
                  <span className="text-[10px] font-mono text-emerald-500 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 font-bold">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Ao Vivo
                  </span>
                )}
              </div>

              {gpsError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{gpsError}</span>
                </div>
              )}

              {isTracking && lastSentTime && (
                <div className={`text-[11px] p-2.5 rounded-xl border space-y-1 font-mono ${
                  isLightMode ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/40 border-white/5 text-gray-300"
                }`}>
                  <div className="flex justify-between">
                    <span className={mutedTextClass}>Última atualização:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{lastSentTime}</strong>
                  </div>
                  {lastAccuracy !== null && (
                    <div className="flex justify-between">
                      <span className={mutedTextClass}>Precisão do GPS:</span>
                      <span className={headingTextClass}>± {lastAccuracy} metros</span>
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Ativação / Pausa de GPS */}
              {!isTracking ? (
                <Button
                  onClick={startTracking}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:opacity-95 text-white font-heading text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  <span>
                    {delivery.status !== "delivering"
                      ? "🚀 Iniciar Rota & Ligar GPS"
                      : "Iniciar Entrega e Compartilhar GPS"}
                  </span>
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  variant="outline"
                  className="w-full h-11 rounded-2xl border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Pausar Envio de GPS</span>
                </Button>
              )}
            </section>

            {/* Bloco 2: Navegação Nativa por GPS */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`h-12 rounded-2xl border p-3 flex items-center justify-center gap-2 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                  isLightMode
                    ? "bg-white border-slate-200 hover:border-primary text-slate-800"
                    : "bg-[#1D0C20] border-border/60 hover:border-primary text-gray-200"
                }`}
              >
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Abrir no GPS</span>
              </a>

              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`h-12 rounded-2xl border p-3 flex items-center justify-center gap-2 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                  isLightMode
                    ? "bg-white border-slate-200 hover:border-primary text-slate-800"
                    : "bg-[#1D0C20] border-border/60 hover:border-primary text-gray-200"
                }`}
              >
                <Navigation className="w-4 h-4 text-cyan-500" />
                <span>Waze</span>
              </a>
            </div>

            {/* Bloco 3: Dados do Cliente e Endereço */}
            <section className={`${cardBgClass} rounded-3xl p-4 sm:p-5 space-y-3`}>
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <span className={`text-[10px] font-mono uppercase tracking-wider ${mutedTextClass}`}>
                  Destinatário
                </span>
                <strong className={`text-sm font-heading font-bold ${headingTextClass}`}>
                  {client.name}
                </strong>
              </div>

              {/* Botões de Contato com o Cliente */}
              {client.phone && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${client.phone}`}
                    className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isLightMode
                        ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-200"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    <span>Ligar</span>
                  </a>

                  <a
                    href={getClientWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                    <span>Chamar WhatsApp</span>
                  </a>
                </div>
              )}

              {/* Endereço Completo */}
              <div className={`p-3 rounded-2xl border space-y-1 text-xs ${
                isLightMode ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`${mutedTextClass} text-[11px] font-mono`}>Endereço de Entrega</span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className={`font-medium leading-snug ${headingTextClass}`}>{fullAddress}</p>
                {deliveryAddress.reference && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-300 pt-1">
                    <strong>Ref:</strong> {deliveryAddress.reference}
                  </p>
                )}
              </div>
            </section>

            {/* Bloco 5: Resumo dos Itens da Sacola */}
            <section className={`${cardBgClass} rounded-3xl p-4 space-y-2 text-xs`}>
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${mutedTextClass}`}>
                Itens a Entregar ({items.length})
              </span>
              <ul className="space-y-1.5 divide-y divide-border/30">
                {items.map((item) => (
                  <li key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                    <span className={`font-medium ${isLightMode ? "text-slate-800" : "text-gray-300"}`}>
                      {item.quantity}x {item.productName}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Botão Fixo de Conclusão da Entrega */}
            <div className="pt-2">
              <Button
                onClick={() => setIsCompleteModalOpen(true)}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary hover:opacity-95 text-white font-heading text-sm font-black uppercase tracking-wider shadow-xl shadow-primary/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Marcar Pedido como Entregue ✓</span>
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Modal de Confirmação para Finalizar Entrega */}
      {isCompleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsCompleteModalOpen(false)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center border-2 ${
              isLightMode ? "bg-white border-slate-300 text-slate-900" : "bg-[#1F0B22] border-border text-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-heading text-lg font-black uppercase tracking-tight">
              Confirmar Entrega?
            </h3>

            <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-gray-300"}`}>
              Você confirma que o pedido foi entregue ao cliente <strong>{client.name}</strong> e o pagamento foi conferido?
            </p>

            <div className="pt-2 text-left space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
                Código PIN do Cliente (4 dígitos)
              </label>
              <input
                type="text"
                maxLength={6}
                value={deliveryPinInput}
                onChange={(e) => setDeliveryPinInput(e.target.value.toUpperCase())}
                placeholder="Ex: 4821"
                className={`w-full text-center text-xl font-mono font-black tracking-widest uppercase py-2.5 px-3 rounded-xl border outline-none transition-all ${
                  isLightMode
                    ? "bg-slate-100 border-slate-300 focus:border-primary text-slate-900"
                    : "bg-white/10 border-white/20 focus:border-primary text-white"
                }`}
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Peça ao cliente o código exibido na tela de rastreamento dele.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCompleteModalOpen(false)}
                disabled={completing}
                className="h-11 rounded-xl text-xs font-bold"
              >
                Voltar
              </Button>

              <Button
                type="button"
                onClick={handleCompleteDelivery}
                disabled={completing}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider"
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Sim, Entregue!"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
