"use client";

import { Bike, CheckCircle2, ShoppingBag, XCircle } from "lucide-react";
import type { OrderStatus } from "@/services/orderService";

export function formatShiftBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatShiftDuration(openedAt: string, closedAt: string | null): string {
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins.toString().padStart(2, "0")}min`;
}

export function ShiftOrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
          <CheckCircle2 className="w-3 h-3" /> Concluído
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/40">
          <XCircle className="w-3 h-3" /> Cancelado
        </span>
      );
    case "delivering":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border border-primary/20 animate-pulse">
          <Bike className="w-3 h-3" /> A Caminho
        </span>
      );
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
          <ShoppingBag className="w-3 h-3" /> Pronto p/ Saída
        </span>
      );
    case "preparing":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
          🥣 Em Preparo
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
          Novo Pedido
        </span>
      );
  }
}
