"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Bike,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Phone,
  ShieldCheck,
  RefreshCw,
  Store,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  PackageCheck,
  Check,
  Navigation,
} from "lucide-react";
import { Order, orderService } from "@/services/orderService";
import { storeSettingsService, StoreSettings } from "@/services/storeSettingsService";
import { Button } from "@/components/ui/button";
import {
  DeliveryMetrics,
  calculateHaversineDistanceKm,
} from "@/lib/geo";

// Carregamento dinâmico estritamente no cliente para evitar erros de SSR do Leaflet
const LeafletDeliveryMap = dynamic(
  () => import("@/components/logistics/LeafletDeliveryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] bg-muted/40 animate-pulse flex flex-col items-center justify-center p-6 space-y-3 text-muted-foreground">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-[#9306CF]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <p className="font-mono text-xs uppercase tracking-wider font-bold">
          Carregando Mapa OpenStreetMap...
        </p>
      </div>
    ),
  }
);

// Coordenadas padrão da Loja Pop Shake (Várzea Grande - MT)
const POP_SHAKE_DEFAULT_COORDS = {
  lat: Number(process.env.NEXT_PUBLIC_STORE_LAT) || -15.6536,
  lng: Number(process.env.NEXT_PUBLIC_STORE_LNG) || -56.1322,
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("id");

  const [order, setOrder] = useState<Order | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number }>(POP_SHAKE_DEFAULT_COORDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPollTime, setLastPollTime] = useState<Date>(new Date());
  const [deliveryMetrics, setDeliveryMetrics] = useState<DeliveryMetrics | null>(null);
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const [showPreviewMap, setShowPreviewMap] = useState(false);

  // Busca configurações da loja (coordenadas e WhatsApp comercial)
  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((settings) => {
        setStoreSettings(settings);
        if (settings.storeLatitude && settings.storeLongitude) {
          setStoreCoords({
            lat: settings.storeLatitude,
            lng: settings.storeLongitude,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Busca inicial do pedido (com auto-resolução do último pedido ativo caso a rota seja chamada sem ?id=)
  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      try {
        let targetId = orderId;
        if (!targetId) {
          const myOrders = await orderService.getMyOrders();
          const activeOrder =
            myOrders.find((o) =>
              ["delivering", "ready", "preparing", "accepted", "pending"].includes(o.status)
            ) || myOrders[0];

          if (activeOrder && isMounted) {
            router.replace(`/rastreamento?id=${activeOrder.id}`);
            setOrder(activeOrder);
            setError(null);
            setLoading(false);
            return;
          }
        } else {
          const data = await orderService.getOrderById(targetId);
          if (isMounted) {
            setOrder(data);
            setError(null);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Não foi possível carregar os dados do pedido.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, router]);

  // Polling a cada 8s para atualizar posição do entregador e status do pedido
  useEffect(() => {
    if (!orderId || !order || order.status !== "delivering") return;

    const interval = setInterval(async () => {
      try {
        const refreshed = await orderService.getOrderById(orderId);
        setOrder(refreshed);
        setLastPollTime(new Date());
      } catch (e) {
        // Silencioso em caso de oscilação momentânea de rede
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [orderId, order?.status]);

  // Origem do despacho: prioriza a origem gravada no próprio pedido (multilojas/filiais)
  const originCoords = useMemo(() => ({
    lat: order?.origin_latitude ?? storeCoords.lat,
    lng: order?.origin_longitude ?? storeCoords.lng,
  }), [order?.origin_latitude, order?.origin_longitude, storeCoords.lat, storeCoords.lng]);

  // Coordenadas de destino gravadas no pedido
  const destCoords = useMemo(() => ({
    lat: order?.delivery_address?.latitude || originCoords.lat + 0.008,
    lng: order?.delivery_address?.longitude || originCoords.lng + 0.008,
  }), [order?.delivery_address?.latitude, order?.delivery_address?.longitude, originCoords.lat, originCoords.lng]);

  const courierLat = order?.courier_latitude;
  const courierLng = order?.courier_longitude;
  const courierCoords = useMemo(() => (
    courierLat && courierLng
      ? { lat: courierLat, lng: courierLng }
      : null
  ), [courierLat, courierLng]);

  // Métricas de entrega calculadas imediatamente (garante exibição instantânea sem atraso de carregamento)
  const initialMetrics = useMemo(() => {
    if (!order) {
      return {
        distanceKm: 0,
        formattedDistance: "0 km",
        etaMinutes: 15,
        formattedEta: "15-25 min",
        isArriving: false,
      };
    }
    const activeOrigin = courierCoords || originCoords;
    const distanceKm = calculateHaversineDistanceKm(
      activeOrigin.lat,
      activeOrigin.lng,
      destCoords.lat,
      destCoords.lng
    );
    const etaMinutes = Math.max(1, Math.round((distanceKm / 26) * 60 + 2));
    const isArriving = distanceKm <= 0.3;
    const formattedDistance =
      distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1).replace(".", ",")} km`;
    const formattedEta = isArriving ? "Chegando!" : `${etaMinutes} min`;

    return {
      distanceKm,
      formattedDistance,
      etaMinutes,
      formattedEta,
      isArriving,
    };
  }, [
    order,
    courierCoords,
    originCoords,
    destCoords,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#9306CF] to-[#940068] flex items-center justify-center text-white shadow-lg shadow-[#9306CF]/30 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Localizando seu pedido...
        </p>
      </div>
    );
  }

  // Sem pedido informado
  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-center text-[#9306CF]">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-heading text-xl font-black uppercase text-foreground">
          Nenhum pedido selecionado
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Selecione um pedido em andamento na tela de pedidos para acompanhar a entrega ao vivo.
        </p>
        <Link href="/pedidos">
          <Button className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] text-white text-xs font-bold uppercase tracking-wider cursor-pointer">
            Ver Meus Pedidos
          </Button>
        </Link>
      </div>
    );
  }

  const clientAddress = order.delivery_address
    ? `${order.delivery_address.street}, ${order.delivery_address.number} - ${order.delivery_address.neighborhood}`
    : "Endereço de Entrega";

  const clientName = order.user?.fullName || order.user?.username || "Cliente";

  // Link para contato via WhatsApp
  const rawWhatsapp = (storeSettings?.whatsappNumber || "5565999999999").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${rawWhatsapp}?text=${encodeURIComponent(
    `Olá! Gostaria de falar sobre o pedido #${order.id.substring(0, 6)} da Pop Shake Sorveteria.`
  )}`;

  // --------------------------------------------------------------------------
  // CASO 1: Pedido "A CAMINHO / SAIU PARA ENTREGA" (delivering)
  // Layout Imersivo Fullscreen Padrão iFood / Uber Eats
  // --------------------------------------------------------------------------
  if (order.status === "delivering") {
    const activeMetrics = deliveryMetrics || initialMetrics;
    const isArriving = activeMetrics.isArriving;
    const etaText = activeMetrics.formattedEta;
    const distanceText = activeMetrics.formattedDistance;

    return (
      <main className="fixed inset-0 w-full h-full overflow-hidden bg-background select-none">
        {/* Topbar Flutuante Imersiva */}
        <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white/90 dark:bg-[#190B1A]/90 backdrop-blur-md border-b border-border/50 px-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Link
              href="/pedidos"
              className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Voltar para Meus Pedidos"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h1 className="font-heading font-black text-sm uppercase tracking-tight text-foreground">
                  Rastreamento ao Vivo
                </h1>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground block">
                Pedido #{order.id.substring(0, 6)} · {order.items?.length || 1} itens
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs"
              title="Suporte da Loja no WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">WhatsApp</span>
            </a>

            <Link href="/pedidos">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-xl text-xs font-bold cursor-pointer"
              >
                Pedidos
              </Button>
            </Link>
          </div>
        </header>

        {/* ── MAPA LEAFLET EM TELA CHEIA (100% VIEWPORT) ── */}
        <div className="fixed inset-0 top-14 w-full h-[calc(100vh-56px)] z-0">
          <LeafletDeliveryMap
            origin={originCoords}
            destination={destCoords}
            courier={courierCoords}
            isGpsActive={order.is_gps_tracking_active}
            clientAddress={clientAddress}
            clientName={clientName}
            orderId={order.id}
            onMetricsUpdate={setDeliveryMetrics}
          />
        </div>

        {/* ── DESKTOP: PAINEL LATERAL FLUTUANTE ESTILO UBER EATS / RAPPI (md+) ── */}
        <aside className="hidden md:flex flex-col fixed top-18 left-6 bottom-6 w-[410px] z-20 bg-white/95 dark:bg-[#190B1A]/95 backdrop-blur-xl border border-border/70 rounded-3xl shadow-2xl p-5 overflow-y-auto space-y-4 animate-in slide-in-from-left duration-300">
          {/* Alerta de Chegada Iminente (< 300m) */}
          {isArriving && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/50 rounded-2xl flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/30 shrink-0">
                🛵
              </div>
              <div className="text-xs">
                <strong className="block font-heading font-black text-sm text-emerald-950 dark:text-emerald-200 uppercase tracking-tight">
                  Entregador chegando!
                </strong>
                <span className="text-emerald-800 dark:text-emerald-300 text-[11px]">
                  Fique atento à campainha, portão ou portaria.
                </span>
              </div>
            </div>
          )}

          {/* Card Principal de Status e ETA */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#9306CF]/10 via-[#940068]/5 to-transparent border border-[#9306CF]/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#9306CF] animate-ping" />
                <span>{isArriving ? "Aproximação Final" : "Em Deslocamento"}</span>
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                #{order.id.substring(0, 6)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center shadow-xs shrink-0">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-[#C7A9C9]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-muted-foreground uppercase font-mono font-bold block leading-tight">
                    Previsão de Chegada
                  </span>
                  <span className="font-heading font-black text-2xl text-foreground block leading-tight truncate">
                    {etaText}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] text-muted-foreground uppercase font-mono font-bold block leading-tight">
                  Distância
                </span>
                <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400 block leading-tight">
                  {distanceText}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Visual (Confirmado ➔ Preparando ➔ A Caminho ➔ Chegando) */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
            <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider block text-center">
              Progresso da Entrega
            </span>
            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
              {/* Etapa 1: Confirmado */}
              <div className="space-y-1">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-xs shadow-xs">
                  ✓
                </div>
                <span className="font-bold text-foreground block text-[10px] leading-tight">Confirmado</span>
              </div>

              {/* Etapa 2: Preparando */}
              <div className="space-y-1">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-xs shadow-xs">
                  ✓
                </div>
                <span className="font-bold text-foreground block text-[10px] leading-tight">Pronto</span>
              </div>

              {/* Etapa 3: A Caminho */}
              <div className="space-y-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto font-bold text-xs shadow-xs ${
                    isArriving
                      ? "bg-emerald-500 text-white"
                      : "bg-[#9306CF] text-white animate-pulse"
                  }`}
                >
                  🛵
                </div>
                <span className="font-bold text-[#9306CF] dark:text-[#C7A9C9] block text-[10px] leading-tight">
                  A Caminho
                </span>
              </div>

              {/* Etapa 4: Chegando */}
              <div className="space-y-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto font-bold text-xs shadow-xs ${
                    isArriving
                      ? "bg-emerald-500 text-white animate-bounce shadow-md shadow-emerald-500/40"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  📍
                </div>
                <span
                  className={`font-bold block text-[10px] leading-tight ${
                    isArriving ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-muted-foreground"
                  }`}
                >
                  Chegando
                </span>
              </div>
            </div>
          </div>

          {/* Card do Entregador */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 text-xl shrink-0">
                🛵
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-bold text-sm text-foreground truncate">
                  Entregador Pop Shake
                </h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{order.is_gps_tracking_active ? "GPS Ativo em Tempo Real" : "Em Trânsito"}</span>
                </p>
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shrink-0 shadow-xs"
              title="Falar no WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>

          {/* Acordeão de Itens e Endereço */}
          <div className="border border-border/60 rounded-2xl overflow-hidden bg-muted/20">
            <button
              type="button"
              onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#9306CF]" />
                <span>Itens do Pedido ({order.items?.length || 1})</span>
              </div>
              {bottomSheetExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {bottomSheetExpanded && (
              <div className="p-3.5 pt-0 space-y-3 text-xs border-t border-border/40">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center font-bold text-[10px] shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="truncate font-medium text-foreground">
                          {item.product?.name || "Produto Pop Shake"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-foreground shrink-0 pl-2">
                        R$ {(item.price_at_time * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border/40 space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de Entrega:</span>
                    <span>R$ {(order.delivery_fee || 0).toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                    <span>Total Pago:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      R$ {order.total_amount.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-1">
                  <div className="flex items-start gap-1.5 text-muted-foreground text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-[#9306CF] shrink-0 mt-0.5" />
                    <span>{clientAddress}</span>
                  </div>
                  {order.origin_address && (
                    <div className="flex items-start gap-1.5 text-muted-foreground text-[10px]">
                      <Store className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Origem: {order.origin_address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão de Suporte WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Falar no WhatsApp com a Loja</span>
          </a>
        </aside>

        {/* ── CARD FLUTUANTE SOBREPOSTO AO MAPA NO MOBILE (md:hidden) ── */}
        <div className="md:hidden fixed top-16 left-3.5 right-3.5 z-10 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-white/95 dark:bg-[#190B1A]/95 backdrop-blur-xl border border-border/80 dark:border-[#512B54]/60 rounded-2xl p-2.5 sm:p-3 shadow-xl flex items-center justify-between gap-2.5">
            {/* Bloco Tempo Estimado de Entrega */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/70 flex items-center justify-center text-[#9306CF] dark:text-[#C7A9C9] shrink-0 shadow-xs">
                <Clock className="w-4 h-4 text-purple-600 dark:text-[#C7A9C9]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold block leading-none">
                  Previsão de Chegada
                </span>
                <strong className="text-xs sm:text-sm font-heading font-black text-foreground truncate block pt-0.5">
                  {isArriving ? "Chegando!" : etaText}
                </strong>
              </div>
            </div>

            {/* Separador vertical */}
            <div className="h-7 w-px bg-border/60 shrink-0" />

            {/* Bloco Distância Restante */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold block leading-none">
                  Distância
                </span>
                <strong className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 block pt-0.5">
                  {distanceText}
                </strong>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
                <Navigation className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE: BOTTOM SHEET FLUTUANTE DESLIZANTE (< md) ── */}
        <aside
          className={`md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-[#190B1A]/95 backdrop-blur-xl border-t border-border/70 rounded-t-3xl shadow-2xl transition-all duration-300 ${
            bottomSheetExpanded ? "max-h-[82vh]" : "max-h-[310px]"
          } overflow-y-auto p-4 space-y-3`}
        >
          {/* Pílula de Arraste / Clique para Expandir */}
          <div
            onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
            className="w-full flex flex-col items-center cursor-pointer py-1 -mt-1"
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Alerta de Chegada Iminente (< 300m) */}
          {isArriving && (
            <div className="p-2.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-2.5 animate-pulse">
              <span className="text-xl">🛵</span>
              <div className="text-xs">
                <strong className="block font-bold text-emerald-950 dark:text-emerald-200">
                  Entregador chegando!
                </strong>
                <span className="text-emerald-800 dark:text-emerald-300 text-[10px]">
                  Fique atento à campainha ou interfone.
                </span>
              </div>
            </div>
          )}

          {/* Bloco em Destaque no Bottom Sheet: Previsão de Chegada & Distância */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent border border-[#9306CF]/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 flex items-center justify-center text-[#9306CF] dark:text-[#C7A9C9] shrink-0 shadow-xs">
                <Clock className="w-4 h-4 text-purple-600 dark:text-[#C7A9C9]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold block leading-none">
                  Previsão de Chegada
                </span>
                <strong className="font-heading font-black text-base text-foreground block pt-0.5 leading-tight truncate">
                  {isArriving ? "Chegando agora!" : etaText}
                </strong>
              </div>
            </div>

            <div className="h-7 w-px bg-border/60 shrink-0" />

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold block leading-none">
                  Distância
                </span>
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 block pt-0.5 leading-tight">
                  {distanceText}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
                <Navigation className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Status do Entregador e Botão de Detalhes */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                🛵
              </div>
              <div className="min-w-0">
                <span className="font-heading font-bold text-xs text-foreground block truncate">
                  Entregador Pop Shake
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[#9306CF] dark:text-[#C7A9C9] font-semibold">
                    {isArriving ? "Na sua rua!" : "Em trânsito com seu pedido"}
                  </span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
              className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#9306CF]/10 hover:bg-[#9306CF]/15 transition-colors cursor-pointer shrink-0"
            >
              <span>{bottomSheetExpanded ? "Menos" : "Detalhes"}</span>
              {bottomSheetExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Stepper Visual Compacto */}
          <div className="grid grid-cols-4 gap-1 text-center text-[9px] pt-1 border-t border-border/40">
            <div className="space-y-1">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-[10px]">
                ✓
              </div>
              <span className="font-bold text-foreground">Confirmado</span>
            </div>
            <div className="space-y-1">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-[10px]">
                ✓
              </div>
              <span className="font-bold text-foreground">Pronto</span>
            </div>
            <div className="space-y-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto font-bold text-[10px] ${
                  isArriving ? "bg-emerald-500 text-white" : "bg-[#9306CF] text-white animate-pulse"
                }`}
              >
                🛵
              </div>
              <span className="font-bold text-[#9306CF] dark:text-[#C7A9C9]">A Caminho</span>
            </div>
            <div className="space-y-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto font-bold text-[10px] ${
                  isArriving ? "bg-emerald-500 text-white animate-bounce" : "bg-muted text-muted-foreground"
                }`}
              >
                📍
              </div>
              <span className={`font-bold ${isArriving ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                Chegando
              </span>
            </div>
          </div>

          {/* Detalhes Expandidos no Mobile */}
          {bottomSheetExpanded && (
            <div className="space-y-3 pt-2 border-t border-border/40 animate-in fade-in duration-200">
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                    <span className="truncate text-foreground">
                      <strong className="text-[#9306CF]">{item.quantity}x</strong> {item.product?.name}
                    </span>
                    <span className="font-mono font-bold text-foreground shrink-0 pl-2">
                      R$ {(item.price_at_time * item.quantity).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs pt-1 font-bold">
                <span className="text-muted-foreground">Total do Pedido:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  R$ {order.total_amount.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#9306CF] shrink-0 mt-0.5" />
                  <span className="truncate">{clientAddress}</span>
                </div>
                {order.origin_address && (
                  <div className="flex items-start gap-1.5 text-[10px]">
                    <Store className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="truncate">Sede: {order.origin_address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão de WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Falar no WhatsApp</span>
          </a>
        </aside>
      </main>
    );
  }

  // --------------------------------------------------------------------------
  // CASO 2: Pedido em fases anteriores (pending, accepted, preparing, ready)
  // REGRA ESTRITA: Exibe apenas o Stepper Visual da esteira sem abrir o mapa
  // --------------------------------------------------------------------------
  const isPreparing = ["pending", "accepted", "preparing", "ready"].includes(order.status);
  const isCompleted = order.status === "completed";
  const isCancelled = order.status === "cancelled";

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Topbar */}
      <header className="w-full bg-white/90 dark:bg-[#190B1A]/90 backdrop-blur-md border-b border-border/50 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <Link
          href="/pedidos"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Meus Pedidos</span>
        </Link>
        <span className="font-mono text-xs font-bold bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] px-2.5 py-1 rounded-lg border border-[#9306CF]/20">
          #{order.id.substring(0, 6)}
        </span>
      </header>

      {/* Card Central com Stepper Visual */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header do Card */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#9306CF] to-[#940068] flex items-center justify-center text-white shadow-xl shadow-[#9306CF]/25 mx-auto text-3xl">
              {isCompleted ? "🎉" : isCancelled ? "❌" : "🥣"}
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
              {isCompleted
                ? "Pedido Entregue!"
                : isCancelled
                ? "Pedido Cancelado"
                : "Preparando seu Pedido"}
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {isCompleted
                ? "Seu pedido foi entregue com sucesso. Esperamos que aproveite cada colherada!"
                : isCancelled
                ? `Este pedido foi cancelado. Motivo: ${order.cancellation_reason || "Informado pela loja"}`
                : "Seu pedido está sendo montado com açaí batido na hora e complementos frescos. O rastreamento no mapa será liberado assim que o entregador sair para a entrega!"}
            </p>
          </div>

          {/* Stepper Visual da Esteira de Produção */}
          <div className="py-4 border-y border-border/50 space-y-4">
            <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground block text-center tracking-wider">
              Progresso do Atendimento
            </span>

            <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-[11px]">
              {/* Etapa 1: Recebido */}
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mx-auto font-bold border border-emerald-300 dark:border-emerald-800">
                  ✓
                </div>
                <span className="font-bold text-foreground block text-[10px] leading-tight">
                  Recebido
                </span>
              </div>

              {/* Etapa 2: Na Cozinha */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                    isPreparing
                      ? "bg-[#9306CF] text-white shadow-md shadow-[#9306CF]/30 animate-pulse"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  🥣
                </div>
                <span
                  className={`font-bold block text-[10px] leading-tight ${
                    isPreparing ? "text-[#9306CF] dark:text-[#C7A9C9]" : "text-muted-foreground"
                  }`}
                >
                  Na Cozinha
                </span>
              </div>

              {/* Etapa 3: A Caminho */}
              <div className="space-y-1.5 opacity-60">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto font-bold text-xs">
                  🛵
                </div>
                <span className="font-medium text-muted-foreground block text-[10px] leading-tight">
                  A Caminho
                </span>
              </div>

              {/* Etapa 4: Entregue */}
              <div className="space-y-1.5 opacity-60">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  🎉
                </div>
                <span className="font-medium text-muted-foreground block text-[10px] leading-tight">
                  Entregue
                </span>
              </div>
            </div>
          </div>

          {/* Dados do Pedido */}
          <div className="bg-muted/40 rounded-2xl p-4 text-xs space-y-2 border border-border/40">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Destinatário:</span>
              <strong className="text-foreground">{clientName}</strong>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">Entrega em:</span>
              <span className="text-right text-foreground font-medium">{clientAddress}</span>
            </div>
            {order.origin_address && (
              <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                <span>Filial/Origem:</span>
                <span className="font-medium">{order.origin_address}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Total:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                R$ {order.total_amount.toFixed(2).replace(".", ",")}
              </strong>
            </div>
          </div>

          {/* Visualização Opcional do Mapa da Rota durante a fase de preparo */}
          {!isCancelled && (
            <div className="space-y-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreviewMap(!showPreviewMap)}
                className="w-full h-11 rounded-2xl border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 text-[#9306CF] dark:text-[#C7A9C9] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>{showPreviewMap ? "Ocultar Mapa do Trajeto" : "🗺️ Visualizar Rota de Entrega"}</span>
              </Button>

              {showPreviewMap && (
                <div className="rounded-2xl overflow-hidden border border-border/70 shadow-inner bg-muted/20 space-y-2 p-2 animate-in fade-in duration-300">
                  <div className="w-full h-[280px] rounded-xl overflow-hidden relative">
                    <LeafletDeliveryMap
                      origin={originCoords}
                      destination={destCoords}
                      courier={courierCoords}
                      isGpsActive={order.is_gps_tracking_active}
                      clientAddress={clientAddress}
                      clientName={clientName}
                      orderId={order.id}
                      onMetricsUpdate={setDeliveryMetrics}
                    />
                  </div>
                  <div className="p-2 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>
                      Distância estimada: <strong className="text-foreground">{initialMetrics.formattedDistance}</strong>
                    </span>
                    <span>
                      Previsão: <strong className="text-foreground">{initialMetrics.formattedEta}</strong>
                    </span>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground pb-1">
                    🛵 O rastreamento em tempo real com GPS da moto será iniciado assim que o pedido for despachado.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Link href="/pedidos" className="w-full">
              <Button
                variant="outline"
                className="w-full h-11 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Ver Lista de Pedidos
              </Button>
            </Link>

            <Link href="/" className="w-full">
              <Button className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#9306CF]/20 cursor-pointer">
                Ir para o Cardápio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RastreamentoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#9306CF] to-[#940068] flex items-center justify-center text-white shadow-lg shadow-[#9306CF]/30 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Carregando sistema de rastreamento...
          </p>
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
