"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Clock,
  MapPin,
  ArrowLeft,
  Home,
  ShoppingBag,
  RefreshCw,
  Store,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Navigation,
  AlertTriangle,
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
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <p className="font-mono text-xs uppercase tracking-wider font-bold">
          Carregando Mapa OpenStreetMap...
        </p>
      </div>
    ),
  }
);

const DELIVERY_ISSUE_LABELS: Record<string, string> = {
  CLIENTE_AUSENTE: "Cliente ausente / Não atende o interfone/telefone",
  ENDERECO_INCORRETO: "Endereço não localizado / Número inexistente",
  PEDIDO_AVARIADO: "Avaria no transporte do pedido",
  RECUSA_CLIENTE: "Recusa do cliente",
  PROBLEMA_VEICULO: "Imprevisto mecânico no trajeto com entregador",
  SUSPEITA_GOLPE: "Dificuldade de acesso / Insegurança no local",
};

// Coordenadas padrão da Loja Pop Shake (Várzea Grande - MT)
const POP_SHAKE_DEFAULT_COORDS = {
  lat: Number(process.env.NEXT_PUBLIC_STORE_LAT) || -15.6536,
  lng: Number(process.env.NEXT_PUBLIC_STORE_LNG) || -56.1322,
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("id");

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/pedidos");
    }
  };

  const [order, setOrder] = useState<Order | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number }>(POP_SHAKE_DEFAULT_COORDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Busca inicial do pedido (com auto-resolução do pedido ativo mais recente caso a rota seja chamada sem ?id=)
  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      try {
        const targetId = orderId;
        if (!targetId) {
          const myOrders = await orderService.getMyOrders();
          // Ordena decrescente pela data mais recente
          const sortedOrders = [...myOrders].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          // Prioriza o pedido ativo mais recente criado pelo cliente (evita pegar pedidos antigos entregues ou em rota)
          const activeOrder =
            sortedOrders.find((o) =>
              !["completed", "cancelled"].includes(o.status)
            ) || sortedOrders[0];

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
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Não foi possível carregar os dados do pedido.";
          setError(msg);
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

  // Polling saudável a cada 15s para atualizar status e posição de pedidos ativos, pausando em abas ocultas
  useEffect(() => {
    if (!orderId || !order || ["completed", "cancelled"].includes(order.status)) return;

    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return; // Pausa se a aba estiver em segundo plano para evitar sobrecarga de rede
      }
      try {
        const refreshed = await orderService.getOrderById(orderId);
        if (refreshed) {
          setOrder(refreshed);
        }
      } catch {
        // Silencioso em caso de oscilação momentânea de rede
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [orderId, order]);

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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/30 animate-spin">
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
        <div className="w-16 h-16 rounded-2xl bg-primary/5 dark:bg-primary/95/40 border border-primary/20/60 dark:border-primary/90/40 flex items-center justify-center text-primary">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-heading text-xl font-black uppercase text-foreground">
          Nenhum pedido selecionado
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          {error || "Selecione um pedido em andamento na tela de pedidos para acompanhar a entrega ao vivo."}
        </p>
        <Link href="/pedidos">
          <Button className="h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold uppercase tracking-wider cursor-pointer">
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
        <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white/90 dark:bg-background/90 backdrop-blur-md border-b border-border/50 px-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title="Voltar à tela anterior"
              aria-label="Voltar à tela anterior"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title="Ir para a Página Inicial"
              aria-label="Página Inicial"
            >
              <Home className="w-4 h-4" />
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
        <aside className="hidden md:flex flex-col fixed top-18 left-6 bottom-6 w-[410px] z-20 bg-white/95 dark:bg-background/95 backdrop-blur-xl border border-border/70 rounded-3xl shadow-2xl p-5 overflow-y-auto space-y-4 animate-in slide-in-from-left duration-300">
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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary dark:text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>{isArriving ? "Aproximação Final" : "Em Deslocamento"}</span>
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                #{order.id.substring(0, 6)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-primary/95/70 text-primary dark:text-muted-foreground flex items-center justify-center shadow-xs shrink-0">
                  <Clock className="w-5 h-5 text-primary dark:text-muted-foreground" />
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
                      : "bg-primary text-white animate-pulse"
                  }`}
                >
                  🛵
                </div>
                <span className="font-bold text-primary dark:text-muted-foreground block text-[10px] leading-tight">
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
                <ShoppingBag className="w-4 h-4 text-primary" />
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
                        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
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
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
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
          <div className="bg-white/95 dark:bg-background/95 backdrop-blur-xl border border-border/80 dark:border-border/60 rounded-2xl p-2.5 sm:p-3 shadow-xl flex items-center justify-between gap-2.5">
            {/* Bloco Tempo Estimado de Entrega */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/95/70 flex items-center justify-center text-primary dark:text-muted-foreground shrink-0 shadow-xs">
                <Clock className="w-4 h-4 text-primary dark:text-muted-foreground" />
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
          className={`md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-background/95 backdrop-blur-xl border-t border-border/70 rounded-t-3xl shadow-2xl transition-all duration-300 ${
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
          <div className="p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-pink-500/10 to-transparent border border-primary/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/95/70 flex items-center justify-center text-primary dark:text-muted-foreground shrink-0 shadow-xs">
                <Clock className="w-4 h-4 text-primary dark:text-muted-foreground" />
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
                  {order.courier_name ? `Entregador: ${order.courier_name}` : "Entregador Pop Shake"}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-primary dark:text-muted-foreground font-semibold">
                    {isArriving ? "Na sua rua!" : "Em trânsito com seu pedido"}
                  </span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
              className="text-xs font-bold text-primary dark:text-muted-foreground flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors cursor-pointer shrink-0"
            >
              <span>{bottomSheetExpanded ? "Menos" : "Detalhes"}</span>
              {bottomSheetExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Feedback de Ocorrência (se houver) */}
          {order.delivery_issue && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-left">
                <strong className="text-amber-900 dark:text-amber-200 block font-bold">
                  Aviso sobre sua entrega
                </strong>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                  Tivemos um imprevisto com sua entrega:{" "}
                  <strong>
                    {DELIVERY_ISSUE_LABELS[order.delivery_issue] || order.delivery_issue}
                  </strong>
                  {order.delivery_issue_notes ? ` (${order.delivery_issue_notes})` : ""}. Nossa equipe já está em contato via WhatsApp!
                </p>
              </div>
            </div>
          )}

          {/* Stepper Visual Compacto de 5 Etapas */}
          <div className="grid grid-cols-5 gap-1 text-center text-[9px] pt-1 border-t border-border/40">
            <div className="space-y-1">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-[9px]">
                ✓
              </div>
              <span className="font-bold text-foreground">Recebido</span>
            </div>
            <div className="space-y-1">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-[9px]">
                ✓
              </div>
              <span className="font-bold text-foreground">Na Fila</span>
            </div>
            <div className="space-y-1">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-[9px]">
                ✓
              </div>
              <span className="font-bold text-foreground">Preparo</span>
            </div>
            <div className="space-y-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto font-bold text-[9px] ${
                  isArriving ? "bg-emerald-500 text-white" : "bg-primary text-white animate-pulse"
                }`}
              >
                🛵
              </div>
              <span className="font-bold text-primary dark:text-muted-foreground">A Caminho</span>
            </div>
            <div className="space-y-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto font-bold text-[9px] ${
                  isArriving ? "bg-emerald-500 text-white animate-bounce" : "bg-muted text-muted-foreground"
                }`}
              >
                🎉
              </div>
              <span className={`font-bold ${isArriving ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                Entregue
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
                      <strong className="text-primary">{item.quantity}x</strong> {item.product?.name}
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
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
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
  // REGRA ESTRITA: Exibe Stepper Visual da esteira sem abrir o mapa
  // --------------------------------------------------------------------------
  const isPending = order.status === "pending";
  const isAccepted = order.status === "accepted";
  const isPreparing = order.status === "preparing";
  const isDelivering = (order.status as string) === "delivering";
  const isReady = order.status === "ready";
  const isDeliveringOrReady = isDelivering || isReady;
  const isCompleted = order.status === "completed";
  const isCancelled = order.status === "cancelled";
  const isPickup =
    !order.delivery_address?.street ||
    order.delivery_address?.street.toLowerCase().includes("retirada");

  // Índices das 5 etapas operacionais
  const stepIndex = isCancelled
    ? -1
    : isCompleted
    ? 4
    : isDeliveringOrReady
    ? 3
    : isPreparing
    ? 2
    : isAccepted
    ? 1
    : 0;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Topbar */}
      <header className="w-full bg-white/90 dark:bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer active:scale-95"
            title="Voltar à tela anterior"
            aria-label="Voltar à tela anterior"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <Link
            href="/"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer active:scale-95"
            title="Ir para a Página Inicial"
            aria-label="Página Inicial"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>

        <span className="font-mono text-xs font-bold bg-primary/10 text-primary dark:text-muted-foreground px-2.5 py-1 rounded-lg border border-primary/20">
          #{order.id.substring(0, 6)}
        </span>
      </header>

      {/* Card Central com Stepper Visual */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header do Card */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-xl shadow-primary/25 mx-auto text-3xl">
              {isCompleted ? "🎉" : isCancelled ? "❌" : isPending ? "⏳" : isAccepted ? "📋" : isPreparing ? "🥣" : isReady ? (isPickup ? "🛍️" : "📦") : "🛵"}
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
              {isCompleted
                ? "Pedido Entregue!"
                : isCancelled
                ? "Pedido Cancelado"
                : isPending
                ? "Pedido Recebido!"
                : isAccepted
                ? "Na Fila de Espera"
                : isPreparing
                ? "Em Preparo na Cozinha"
                : isReady
                ? (isPickup ? "Pronto para Retirada!" : "Pronto p/ Saída!")
                : "Saiu para Entrega!"}
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {isCompleted
                ? "Seu pedido foi entregue com sucesso. Esperamos que aproveite cada colherada!"
                : isCancelled
                ? `Este pedido foi cancelado. Motivo: ${order.cancellation_reason || "Informado pela loja"}`
                : isPending
                ? "Recebemos seu pedido com sucesso! A loja foi notificada e vai confirmar o pedido na fila em instantes."
                : isAccepted
                ? "Pedido confirmado! Está posicionado na fila de produção da cozinha aguardando o preparo."
                : isPreparing
                ? "Seu pedido está sendo montado e embalado com todo o carinho pela nossa equipe."
                : isReady
                ? (isPickup
                    ? "Seu pedido está embalado e aguardando você no balcão da sorveteria!"
                    : `Seu pedido está pronto com ${order.courier_name || "o entregador"} e saindo para entrega!`)
                : `Seu pedido saiu para entrega com ${order.courier_name || "o entregador"}. Fique atento à campainha!`}
            </p>
          </div>

          {/* Feedback de Ocorrência com Orientação de Suporte */}
          {order.delivery_issue && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/70 rounded-2xl flex items-start gap-3.5 text-left animate-in fade-in duration-200">
              <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-900/80 flex items-center justify-center shrink-0 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1 text-xs min-w-0 flex-1">
                <strong className="block font-bold text-amber-950 dark:text-amber-100 text-sm">
                  Tivemos um imprevisto com sua entrega
                </strong>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  Motivo:{" "}
                  <strong className="font-bold underline">
                    {DELIVERY_ISSUE_LABELS[order.delivery_issue] || order.delivery_issue}
                  </strong>
                  {order.delivery_issue_notes ? ` (${order.delivery_issue_notes})` : ""}.
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/80 font-medium">
                  Nossa equipe já está em contato via WhatsApp para garantir que tudo seja resolvido!
                </p>
              </div>
            </div>
          )}

          {/* Stepper Visual da Esteira de Produção (5 Etapas) */}
          <div className="py-4 border-y border-border/50 space-y-4">
            <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground block text-center tracking-wider">
              Linha do Tempo Operacional
            </span>

            <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
              {/* Etapa 1: Recebido */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                    stepIndex > 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : stepIndex === 0
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stepIndex > 0 ? "✓" : "📝"}
                </div>
                <span className={`block text-[10px] leading-tight ${stepIndex === 0 ? "font-bold text-amber-600 dark:text-amber-400" : "font-semibold text-foreground"}`}>
                  Recebido
                </span>
                <span className="block text-[9px] text-muted-foreground">Triagem</span>
              </div>

              {/* Etapa 2: Na Fila de Espera */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                    stepIndex > 1
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : stepIndex === 1
                      ? "bg-primary text-white shadow-md shadow-primary/30 animate-pulse"
                      : "bg-muted text-muted-foreground opacity-60"
                  }`}
                >
                  {stepIndex > 1 ? "✓" : "📋"}
                </div>
                <span className={`block text-[10px] leading-tight ${stepIndex === 1 ? "font-bold text-primary dark:text-muted-foreground" : "font-semibold text-foreground"}`}>
                  Na Fila
                </span>
                <span className="block text-[9px] text-muted-foreground">Aguardando</span>
              </div>

              {/* Etapa 3: Em Preparo na Cozinha */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                    stepIndex > 2
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : stepIndex === 2
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 animate-pulse"
                      : "bg-muted text-muted-foreground opacity-60"
                  }`}
                >
                  {stepIndex > 2 ? "✓" : "🥣"}
                </div>
                <span className={`block text-[10px] leading-tight ${stepIndex === 2 ? "font-bold text-amber-600 dark:text-amber-400" : "font-semibold text-foreground"}`}>
                  Em Preparo
                </span>
                <span className="block text-[9px] text-muted-foreground">Cozinha</span>
              </div>

              {/* Etapa 4: A Caminho / Pronto */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                    stepIndex > 3
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : stepIndex === 3
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 animate-pulse"
                      : "bg-muted text-muted-foreground opacity-60"
                  }`}
                >
                  {stepIndex > 3 ? "✓" : isPickup ? "🛍️" : "🛵"}
                </div>
                <span className={`block text-[10px] leading-tight ${stepIndex === 3 ? "font-bold text-blue-600 dark:text-blue-400" : "font-semibold text-foreground"}`}>
                  {isPickup ? "No Balcão" : "A Caminho"}
                </span>
                <span className="block text-[9px] text-muted-foreground truncate max-w-[65px] mx-auto">
                  {order.courier_name || (isPickup ? "Retirada" : "Entrega")}
                </span>
              </div>

              {/* Etapa 5: Pedido Entregue (Concluído) */}
              <div className="space-y-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-xs ${
                    stepIndex === 4
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                      : "bg-muted text-muted-foreground opacity-60"
                  }`}
                >
                  🎉
                </div>
                <span className={`block text-[10px] leading-tight ${stepIndex === 4 ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground opacity-60"}`}>
                  Entregue
                </span>
                <span className="block text-[9px] text-muted-foreground">Concluído</span>
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
                className="w-full h-11 rounded-2xl border-primary/20 dark:border-primary/90/50 bg-primary/5/50 dark:bg-primary/95/20 text-primary dark:text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/10 dark:hover:bg-primary/95/40 transition-colors cursor-pointer"
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
              <Button className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20 cursor-pointer">
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/30 animate-spin">
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
