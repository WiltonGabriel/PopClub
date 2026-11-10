"use client";

import React, { useState, useEffect } from "react";
import {
  Bike,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Loader2,
} from "lucide-react";
import { Order } from "@/services/orderService";
import { Button } from "@/components/ui/button";

interface OrderDeliveryInboxProps {
  deliveringOrders: Order[];
  onCompleteOrder: (order: Order, courierCode?: string, orderCode?: string) => Promise<void>;
  onReportIssue: (order: Order) => void;
  onViewOrderDetails: (order: Order) => void;
}

export function OrderDeliveryInbox({
  deliveringOrders,
  onCompleteOrder,
  onReportIssue,
  onViewOrderDetails,
}: OrderDeliveryInboxProps) {
  const [courierCodes, setCourierCodes] = useState<Record<string, string>>({});
  const [orderPins, setOrderPins] = useState<Record<string, string>>({});
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(0);

  // Atualiza tempo a cada 10 segundos para calcular tempo em rota
  useEffect(() => {
    setNow(Date.now());
    if (deliveringOrders.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, [deliveringOrders.length]);

  if (deliveringOrders.length === 0) return null;

  const count = deliveringOrders.length;

  const getElapsedMinutes = (dateStr?: string | Date | null) => {
    if (!dateStr) return 0;
    const diff = now - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  const handleComplete = async (order: Order) => {
    const courierCode = courierCodes[order.id] || order.courier_code || "";
    const orderCode = orderPins[order.id] || order.order_pin || order.id.slice(-4).toUpperCase();
    setCompletingId(order.id);
    try {
      await onCompleteOrder(order, courierCode, orderCode);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-primary/10 to-emerald-500/10 dark:from-blue-950/40 dark:via-purple-950/40 dark:to-emerald-950/40 border-2 border-blue-400/80 dark:border-blue-500/50 rounded-2xl p-4 shadow-lg shadow-blue-500/5 animate-in slide-in-from-top-4 duration-300 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-blue-400 opacity-75" />
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 relative">
              <Bike className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-sm sm:text-base text-foreground">
                Inbox de Entrega: {count} {count === 1 ? "corrida em andamento" : "corridas em andamento"}
              </h3>
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                Auditoria & Fechamento
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Confirme os códigos do entregador e do pedido para arquivar ou registre ocorrência
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Cards Compactos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {deliveringOrders.map((order) => {
          const clientName = order.user?.fullName || order.user?.username || "Cliente";
          const courierName =
            order.courier_name ||
            (order.status === "ready" ? "Pronto / Sem Entregador" : "Motoboy Despachado");
          const shortId = order.id.substring(0, 6).toUpperCase();
          const elapsed = getElapsedMinutes(order.dispatched_at || order.created_at);
          const defaultCourierCode = order.courier_code || "MB-01";
          const defaultOrderPin = order.order_pin || order.id.slice(-4).toUpperCase();
          const currentCourierCode = courierCodes[order.id] !== undefined ? courierCodes[order.id] : defaultCourierCode;
          const currentOrderPin = orderPins[order.id] !== undefined ? orderPins[order.id] : defaultOrderPin;
          const isCompleting = completingId === order.id;
          const isDeliveredOnStreet = Boolean(order.delivered_at);

          const addressLine = order.delivery_address
            ? `${order.delivery_address.street}, ${order.delivery_address.number} - ${order.delivery_address.neighborhood}`
            : "Retirada no Balcão";

          return (
            <div
              key={order.id}
              className={`bg-card border rounded-xl p-3.5 shadow-sm space-y-3 transition-all ${
                isDeliveredOnStreet
                  ? "border-emerald-500/80 dark:border-emerald-500/60 ring-2 ring-emerald-500/20"
                  : "border-border/80 dark:border-border hover:border-blue-400 dark:hover:border-blue-500/70"
              }`}
            >
              {/* Top info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewOrderDetails(order)}
                    title="Ver ficha completa do pedido"
                    className="font-mono font-bold text-xs bg-muted hover:bg-muted/80 px-2 py-0.5 rounded text-foreground transition-colors cursor-pointer"
                  >
                    #{shortId}
                  </button>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <Bike className="w-3 h-3" />
                    {courierName}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>{elapsed} min em rota</span>
                </div>
              </div>

              {/* Status de Entrega na Rua */}
              {isDeliveredOnStreet && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Entregue na Rua (PIN OK)
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black">
                      Conferir Caixa
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Cobrado na entrega:</span>
                    <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                      R$ {Number(order.total_amount || 0).toFixed(2).replace(".", ",")} ({(order.payment_method_type || "dinheiro").replace("_", " ").toUpperCase()})
                    </strong>
                  </div>
                </div>
              )}

              {/* Client & Address */}
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-1 text-foreground font-semibold truncate">
                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{clientName}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{addressLine}</span>
                </div>
              </div>

              {/* Inputs de Conferência */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Cód. Entregador
                  </label>
                  <input
                    type="text"
                    value={currentCourierCode}
                    onChange={(e) =>
                      setCourierCodes((prev) => ({ ...prev, [order.id]: e.target.value.toUpperCase() }))
                    }
                    placeholder="Ex: MB-01"
                    className="w-full h-8 px-2 rounded-lg bg-background border border-border text-xs font-mono font-bold text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    PIN do Pedido
                  </label>
                  <input
                    type="text"
                    value={currentOrderPin}
                    onChange={(e) =>
                      setOrderPins((prev) => ({ ...prev, [order.id]: e.target.value.toUpperCase() }))
                    }
                    placeholder="Ex: 1234"
                    className="w-full h-8 px-2 rounded-lg bg-background border border-border text-xs font-mono font-bold text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  type="button"
                  onClick={() => handleComplete(order)}
                  disabled={isCompleting}
                  className={`flex-1 h-9 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm ${
                    isDeliveredOnStreet
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  {isCompleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isDeliveredOnStreet ? "Confirmar Acerto & Dar Baixa" : "Aceitar e Confirmar"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onReportIssue(order)}
                  disabled={isCompleting}
                  className="h-9 px-2.5 rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-bold flex items-center gap-1"
                  title="Registrar Ocorrência / Problema com a entrega"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Problemas</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
