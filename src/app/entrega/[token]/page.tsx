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
    total: number;
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

  // Estados de Rastreamento GPS
  const [isTracking, setIsTracking] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateTimestampRef = useRef<number>(0);

  // Estados de Conclusão da Entrega
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isCompletedSuccess, setIsCompletedSuccess] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

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
        // Limita o envio a no máximo 1 vez a cada 10 segundos para economizar bateria e rede
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#190B1A] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-[#9306CF] animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-gray-400">
          Carregando dados da rota...
        </p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#190B1A] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
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
  const googleMapsUrl = destLat && destLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const wazeUrl = destLat && destLng
    ? `https://www.waze.com/ul?ll=${destLat},${destLng}&navigate=yes`
    : `https://www.waze.com/ul?q=${encodeURIComponent(fullAddress)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(fullAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#120613] text-gray-100 flex flex-col selection:bg-[#9306CF]/30 pb-safe">
      {/* Top Header */}
      <header className="w-full bg-[#1F0B22] border-b border-[#512B54]/40 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#9306CF] to-[#940068] flex items-center justify-center text-white shadow-sm shadow-[#9306CF]/30 font-bold text-lg">
            🍧
          </div>
          <div>
            <span className="font-heading font-black text-sm tracking-tight text-white block leading-none">
              Pop<span className="text-[#C7A9C9]">Shake</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
              Área do Entregador
            </span>
          </div>
        </div>

        <span className="font-mono text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg text-[#C7A9C9] border border-white/10">
          #{delivery.orderId.substring(0, 6)}
        </span>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
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
            {/* Bloco 1: Controle de GPS ao Vivo */}
            <section className="bg-[#1D0C20] border border-[#512B54]/50 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isTracking ? "bg-emerald-500 animate-ping" : "bg-gray-500"
                    }`}
                  />
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-200">
                    {isTracking ? "GPS Ativo em Tempo Real" : "GPS Não Transmitindo"}
                  </span>
                </div>
                {isTracking && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 flex items-center gap-1">
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
                <div className="text-[11px] text-gray-300 bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Última atualização:</span>
                    <strong className="text-emerald-400">{lastSentTime}</strong>
                  </div>
                  {lastAccuracy !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Precisão do GPS:</span>
                      <span className="text-gray-200">± {lastAccuracy} metros</span>
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
                  <span>Iniciar Entrega e Compartilhar GPS</span>
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  variant="outline"
                  className="w-full h-11 rounded-2xl border-amber-500/40 text-amber-300 hover:bg-amber-950/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Pausar Envio de GPS</span>
                </Button>
              )}
            </section>

            {/* Bloco 2: Atalhos para Navegação por GPS Nativo */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 rounded-2xl bg-[#1D0C20] border border-[#512B54]/60 hover:border-[#9306CF] p-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-200 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>Google Maps</span>
              </a>

              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 rounded-2xl bg-[#1D0C20] border border-[#512B54]/60 hover:border-[#9306CF] p-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-200 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Waze</span>
              </a>
            </div>

            {/* Bloco 3: Dados do Cliente e Endereço */}
            <section className="bg-[#1D0C20] border border-[#512B54]/50 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                  Destinatário
                </span>
                <strong className="text-sm font-heading font-bold text-white">
                  {client.name}
                </strong>
              </div>

              {/* Botões de Contato com o Cliente */}
              {client.phone && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${client.phone}`}
                    className="h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 text-gray-200 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ligar</span>
                  </a>

                  <a
                    href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/40 text-xs font-semibold flex items-center justify-center gap-1.5 text-emerald-300 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}

              {/* Endereço Completo */}
              <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[11px] font-mono">Endereço de Entrega</span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="text-[10px] text-[#C7A9C9] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-medium text-gray-200 leading-snug">{fullAddress}</p>
                {deliveryAddress.reference && (
                  <p className="text-[11px] text-amber-300/90 pt-1">
                    <strong>Ref:</strong> {deliveryAddress.reference}
                  </p>
                )}
              </div>
            </section>

            {/* Bloco 4: Forma de Pagamento e Total */}
            <section className="bg-[#1D0C20] border border-[#512B54]/50 rounded-3xl p-4 shadow-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400 block">
                  Pagamento na Entrega
                </span>
                <span className="font-heading font-bold text-sm text-white capitalize">
                  {payment.type === "dinheiro"
                    ? "Dinheiro"
                    : payment.type === "cartao_maquininha"
                    ? "Cartão na Maquininha"
                    : "PIX na Entrega"}
                </span>
                {payment.changeFor && (
                  <span className="text-[11px] text-amber-400 block">
                    Levar troco para R$ {payment.changeFor.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-gray-400 block">
                  Total a Cobrar
                </span>
                <span className="font-heading text-xl font-black text-emerald-400 font-mono">
                  R$ {payment.total.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </section>

            {/* Bloco 5: Resumo dos Itens da Sacola */}
            <section className="bg-[#1D0C20] border border-[#512B54]/50 rounded-3xl p-4 shadow-xl space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase text-gray-400 block">
                Itens a Entregar ({items.length})
              </span>
              <ul className="space-y-1.5 divide-y divide-white/5">
                {items.map((item) => (
                  <li key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                    <span className="text-gray-300 font-medium">
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
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#9306CF] via-[#940068] to-[#9306CF] hover:opacity-95 text-white font-heading text-sm font-black uppercase tracking-wider shadow-xl shadow-[#9306CF]/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
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
            className="w-full max-w-sm bg-[#1F0B22] border-2 border-[#512B54] rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-heading text-lg font-black uppercase tracking-tight text-white">
              Confirmar Entrega?
            </h3>

            <p className="text-xs text-gray-300 leading-relaxed">
              Você confirma que o pedido foi entregue ao cliente <strong>{client.name}</strong> e o pagamento foi conferido?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCompleteModalOpen(false)}
                disabled={completing}
                className="h-11 rounded-xl border-white/10 text-gray-300 text-xs font-bold"
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
