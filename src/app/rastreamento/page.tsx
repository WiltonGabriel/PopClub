"use client";

import { Suspense, useEffect, useState } from "react";
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
} from "lucide-react";
import { Order, orderService } from "@/services/orderService";
import { Button } from "@/components/ui/button";

// Carregamento dinâmico estritamente no cliente para evitar erros de SSR do Leaflet
const LeafletDeliveryMap = dynamic(
  () => import("@/components/logistics/LeafletDeliveryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] rounded-3xl bg-muted/40 animate-pulse flex flex-col items-center justify-center p-6 space-y-3 text-muted-foreground border border-border/40">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPollTime, setLastPollTime] = useState<Date>(new Date());

  // Busca inicial do pedido
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadOrder() {
      try {
        const data = await orderService.getOrderById(orderId!);
        if (isMounted) {
          setOrder(data);
          setError(null);
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
  }, [orderId]);

  // Polling a cada 10s para atualizar posição do entregador e status do pedido
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
    }, 10000);

    return () => clearInterval(interval);
  }, [orderId, order?.status]);

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
          <Button className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] text-white text-xs font-bold uppercase tracking-wider">
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

  // Coordenadas de destino gravadas no pedido ou fallback para a região
  const destCoords = {
    lat: order.delivery_address?.latitude || POP_SHAKE_DEFAULT_COORDS.lat + 0.008,
    lng: order.delivery_address?.longitude || POP_SHAKE_DEFAULT_COORDS.lng + 0.008,
  };

  const courierCoords =
    order.courier_latitude && order.courier_longitude
      ? { lat: order.courier_latitude, lng: order.courier_longitude }
      : null;

  // --------------------------------------------------------------------------
  // CASO 1: Pedido "A CAMINHO / SAIU PARA ENTREGA" (delivering)
  // Exibe o mapa Leaflet + OpenStreetMap 100% gratuito com rastreamento
  // --------------------------------------------------------------------------
  if (order.status === "delivering") {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        {/* Topbar do Rastreamento */}
        <header className="w-full bg-white/90 dark:bg-[#190B1A]/90 backdrop-blur-md border-b border-border/50 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/pedidos"
              className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-heading font-black text-sm uppercase tracking-tight text-foreground">
                  Rastreamento ao Vivo
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground block">
                Pedido #{order.id.substring(0, 6)} · {order.items?.length || 1} itens
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/pedidos">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-xl text-xs font-bold"
              >
                Detalhes
              </Button>
            </Link>
          </div>
        </header>

        {/* Área do Mapa Fullscreen / Responsivo */}
        <div className="flex-1 w-full p-2 sm:p-4 max-w-7xl mx-auto flex flex-col">
          <div className="flex-1 w-full h-[calc(100vh-140px)] min-h-[480px]">
            <LeafletDeliveryMap
              origin={POP_SHAKE_DEFAULT_COORDS}
              destination={destCoords}
              courier={courierCoords}
              isGpsActive={order.is_gps_tracking_active}
              clientAddress={clientAddress}
              clientName={clientName}
              orderId={order.id}
            />
          </div>
        </div>
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
            <div className="flex justify-between items-center pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Total:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                R$ {order.total_amount.toFixed(2).replace(".", ",")}
              </strong>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Link href="/pedidos" className="w-full">
              <Button
                variant="outline"
                className="w-full h-11 rounded-2xl text-xs font-bold uppercase tracking-wider"
              >
                Ver Lista de Pedidos
              </Button>
            </Link>

            <Link href="/" className="w-full">
              <Button className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#9306CF]/20">
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
            Carregando Rastreamento...
          </p>
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
