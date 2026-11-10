"use client";

import React, { useEffect, useState } from "react";
import {
  BellRing,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Store,
  Bike,
  Volume2,
  VolumeX,
  Printer,
} from "lucide-react";
import { Order } from "@/services/orderService";
import { Button } from "@/components/ui/button";
import { playKitchenBellSound } from "@/lib/sound";
import { printThermalReceipt } from "@/lib/thermalPrinter";

interface OrderTriageBarProps {
  pendingOrders: Order[];
  onAcceptOrder: (order: Order) => void;
  onRejectOrder: (order: Order) => void;
  onViewOrderDetails: (order: Order) => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
}

export function OrderTriageBar({
  pendingOrders,
  onAcceptOrder,
  onRejectOrder,
  onViewOrderDetails,
  isSoundMuted,
  onToggleSound,
}: OrderTriageBarProps) {
  const [now, setNow] = useState<number>(0);

  // Atualiza tempo decorrido a cada 5 segundos
  useEffect(() => {
    setNow(Date.now());
    if (pendingOrders.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  // Alerta sonoro periódico (chime a cada 10 segundos enquanto houver pedidos pendentes)
  useEffect(() => {
    if (pendingOrders.length === 0 || isSoundMuted) return;

    // Toca imediatamente quando entra um pedido
    playKitchenBellSound();

    const soundInterval = setInterval(() => {
      playKitchenBellSound();
    }, 10000);

    return () => clearInterval(soundInterval);
  }, [pendingOrders.length, isSoundMuted]);

  if (pendingOrders.length === 0) return null;

  const count = pendingOrders.length;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-primary/10 to-pink-500/10 dark:from-amber-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border-2 border-amber-400/80 dark:border-amber-500/50 rounded-2xl p-4 shadow-lg shadow-amber-500/5 animate-in slide-in-from-top-4 duration-300 space-y-3">
      {/* Barra de Notificação Superior */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-amber-400 opacity-75" />
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 relative">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-sm sm:text-base text-foreground dark:text-foreground">
                Inbox de Triagem: {count} {count === 1 ? "pedido aguardando aceite!" : "pedidos aguardando aceite!"}
              </h3>
              <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                Ação Requerida
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Aceite para definir o tempo de preparo e gerar o comprovante
            </p>
          </div>
        </div>

        {/* Botão de Som Mute rápido */}
        <button
          onClick={onToggleSound}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-amber-900 dark:text-amber-200 flex items-center gap-1.5 transition-colors"
          title={isSoundMuted ? "Ativar som do alarme" : "Silenciar alarme"}
        >
          {isSoundMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-red-500" />
              <span>Som Silenciado</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Alarme Ativo</span>
            </>
          )}
        </button>
      </div>

      {/* Cards de Pedidos Pendentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pendingOrders.map((order) => {
          const clientName = order.user?.fullName || order.user?.username || "Cliente";
          const isPickup =
            !order.delivery_address?.street ||
            order.delivery_address?.street.toLowerCase().includes("retirada");
          const createdTime = new Date(order.created_at).getTime();
          const waitMinutes = Math.max(0, Math.floor((now - createdTime) / 60000));
          const totalItems = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
          const firstItemName = order.items?.[0]?.product?.name || "Produto";

          const isUrgent = waitMinutes >= 5;

          return (
            <div
              key={order.id}
              className={`bg-white dark:bg-background border rounded-xl p-3.5 shadow-sm transition-all flex flex-col justify-between gap-3 ${
                isUrgent
                  ? "border-red-400 dark:border-red-500/80 ring-2 ring-red-400/20"
                  : "border-amber-300/80 dark:border-amber-500/40"
              }`}
            >
              {/* Header do Card */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs bg-primary/10 dark:bg-primary/95/60 text-primary dark:text-muted-foreground px-2 py-0.5 rounded-md border border-primary/20 dark:border-primary/80/40">
                      #{order.id.substring(0, 6)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isUrgent
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 animate-pulse"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {waitMinutes < 1 ? "Agora mesmo" : `Há ${waitMinutes} min`}
                    </span>
                  </div>

                  <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                    R$ {Number(order.total_amount).toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <div className="mt-2">
                  <h4 className="font-bold text-xs text-foreground dark:text-foreground truncate">
                    {clientName}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {totalItems} {totalItems === 1 ? "item" : "itens"}: {firstItemName}
                    {totalItems > 1 ? ` +${totalItems - 1}` : ""}
                  </p>
                  {order.items?.some((it) => Boolean(it.notes?.trim())) && (
                    <p className="mt-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded px-1.5 py-0.5 truncate">
                      Obs.: {order.items.filter((it) => Boolean(it.notes?.trim())).map((it) => it.notes?.trim()).join(" • ")}
                    </p>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                  {isPickup ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-200 dark:border-amber-900/40">
                      <Store className="w-2.5 h-2.5" />
                      Retirada no Balcão
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-900/40 truncate">
                      <Bike className="w-2.5 h-2.5 shrink-0" />
                      {order.delivery_address?.neighborhood || "Entrega"}
                    </span>
                  )}
                </div>
              </div>

              {/* Botões Operacionais de Triagem */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-border/30">
                <Button
                  size="sm"
                  onClick={() => onAcceptOrder(order)}
                  className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aceitar</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRejectOrder(order)}
                  className="h-8 px-2.5 rounded-lg border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  title="Recusar pedido com justificativa"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Recusar</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printThermalReceipt(order)}
                  className="h-8 px-2 rounded-lg border-gray-200 dark:border-border/40 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 cursor-pointer"
                  title="Imprimir Comprovante"
                >
                  <Printer className="w-3.5 h-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewOrderDetails(order)}
                  className="h-8 px-2 rounded-lg border-gray-200 dark:border-border/40 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 cursor-pointer"
                  title="Ver Detalhes do Pedido"
                >
                  <FileText className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
