"use client";

import React from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Layers,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Order } from "@/services/orderService";
import type { ShiftRecord } from "@/services/shiftService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatShiftBRL,
  formatShiftDuration,
  ShiftOrderStatusBadge,
} from "./shiftFormatters";

interface ShiftExecutivePanelProps {
  shift: ShiftRecord;
  shiftOrders: Order[];
  shiftOrdersTotal: number;
  shiftOrdersPage: number;
  shiftOrdersTotalPages: number;
  loadingShiftOrders: boolean;
  shiftOrderSearch: string;
  shiftOrderStatusFilter: string;
  onShiftOrderSearchChange: (val: string) => void;
  onShiftOrderStatusFilterChange: (val: string) => void;
  onApplyShiftSearch: (e: React.FormEvent) => void;
  onPageChange: (page: number) => void;
  onPrintReceipt: (order: Order) => void;
  onSelectOrder: (order: Order) => void;
}

export function ShiftExecutivePanel({
  shift,
  shiftOrders,
  shiftOrdersTotal,
  shiftOrdersPage,
  shiftOrdersTotalPages,
  loadingShiftOrders,
  shiftOrderSearch,
  shiftOrderStatusFilter,
  onShiftOrderSearchChange,
  onShiftOrderStatusFilterChange,
  onApplyShiftSearch,
  onPageChange,
  onPrintReceipt,
  onSelectOrder,
}: ShiftExecutivePanelProps) {
  return (
    <section className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-border/40 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-border/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-black text-xl text-foreground">
              Fechamento Executivo: {shift.code}
            </span>
            {shift.isOpen ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                Turno Atual em Aberto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300">
                Fechado & Auditado
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Iniciado em {new Date(shift.openedAt).toLocaleString("pt-BR")} • Duração:{" "}
            <strong>{formatShiftDuration(shift.openedAt, shift.closedAt)}</strong>
            {shift.notes ? ` • Obs: "${shift.notes}"` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Volume: {shift.totalOrders} pedidos totais
          </span>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Faturamento Bruto */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-4 min-h-[108px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 truncate">
              Faturamento Bruto
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400 tracking-tight leading-none block truncate">
              {formatShiftBRL(shift.totalRevenue)}
            </span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
              Exclusivo pedidos concluídos
            </span>
          </div>
        </div>

        {/* Concluídos vs Cancelados */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 min-h-[108px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary truncate">
              Status dos Pedidos
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-heading font-extrabold text-xl sm:text-2xl text-foreground tracking-tight leading-none">
                {shift.completedOrders}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">concluídos</span>
              {shift.cancelledOrders > 0 && (
                <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                  ({shift.cancelledOrders} canc.)
                </span>
              )}
            </div>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
              Taxa de Sucesso:{" "}
              {shift.totalOrders > 0
                ? `${Math.round((shift.completedOrders / shift.totalOrders) * 100)}%`
                : "0%"}
            </span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 rounded-2xl p-4 min-h-[108px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 truncate">
              Ticket Médio
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl sm:text-2xl text-purple-600 dark:text-purple-400 tracking-tight leading-none block truncate">
              {formatShiftBRL(shift.completedOrders > 0 ? shift.totalRevenue / shift.completedOrders : 0)}
            </span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
              Média por pedido concluído
            </span>
          </div>
        </div>

        {/* Total de Pedidos */}
        <div className="bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-border/40 rounded-2xl p-4 min-h-[108px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
              Total de Pedidos
            </span>
            <div className="w-8 h-8 rounded-xl bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl sm:text-2xl text-foreground tracking-tight leading-none block truncate">
              {shift.totalOrders}
            </span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
              {shift.cancelledOrders} cancelamento(s)
            </span>
          </div>
        </div>
      </div>

      {/* Divisão Financeira Detalhada (PIX, Cartão, Dinheiro) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-emerald-500" /> Fechamento por Modalidade Financeira
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* PIX */}
          <div className="bg-white dark:bg-[#1E0922] border border-teal-200/80 dark:border-teal-900/50 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1.5 truncate">
                <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" /> PIX (Entrega / Balcão)
              </span>
              <span className="font-heading font-extrabold text-lg sm:text-xl text-teal-700 dark:text-teal-300 tracking-tight block truncate">
                {formatShiftBRL(shift.pixTotal)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
                {shift.totalRevenue > 0 ? `${Math.round((shift.pixTotal / shift.totalRevenue) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Cartão */}
          <div className="bg-white dark:bg-[#1E0922] border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5 truncate">
                <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /> Cartão (Maquininha)
              </span>
              <span className="font-heading font-extrabold text-lg sm:text-xl text-blue-700 dark:text-blue-300 tracking-tight block truncate">
                {formatShiftBRL(shift.cardTotal)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                {shift.totalRevenue > 0 ? `${Math.round((shift.cardTotal / shift.totalRevenue) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Dinheiro */}
          <div className="bg-white dark:bg-[#1E0922] border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5 truncate">
                <Banknote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /> Dinheiro em Espécie
              </span>
              <span className="font-heading font-extrabold text-lg sm:text-xl text-amber-800 dark:text-amber-300 tracking-tight block truncate">
                {formatShiftBRL(shift.cashTotal)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                {shift.totalRevenue > 0 ? `${Math.round((shift.cashTotal / shift.totalRevenue) * 100)}%` : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro e Tabela de Pedidos do Turno */}
      <div className="pt-4 border-t border-gray-100 dark:border-border/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Pedidos deste Turno ({shiftOrdersTotal})
          </h3>

          <form onSubmit={onApplyShiftSearch} className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar cliente, rua ou #XXXX..."
                value={shiftOrderSearch}
                onChange={(e) => onShiftOrderSearchChange(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl bg-gray-50/70 dark:bg-background border-gray-200 dark:border-border/40 w-48 sm:w-64"
              />
            </div>

            <select
              value={shiftOrderStatusFilter}
              onChange={(e) => onShiftOrderStatusFilterChange(e.target.value)}
              className="bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl px-2.5 h-9 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
              <option value="delivering">A Caminho</option>
              <option value="ready">Prontos</option>
              <option value="preparing">Em Preparo</option>
            </select>

            <Button type="submit" size="sm" className="h-9 px-3 rounded-xl bg-primary text-white text-xs font-bold shrink-0">
              Filtrar
            </Button>
          </form>
        </div>

        {loadingShiftOrders ? (
          <div className="py-12 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-border/40">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
            <span>Carregando pedidos deste turno...</span>
          </div>
        ) : shiftOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-border/40">
            <p className="font-heading font-bold text-sm text-foreground mb-1">Nenhum pedido encontrado neste turno</p>
            <p>Tente ajustar o termo de pesquisa ou o filtro de status.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shiftOrders.map((order) => {
              const createdDate = new Date(order.created_at);
              const clientName = order.user?.fullName || order.user?.username || "Cliente";
              const isPickup =
                !order.delivery_address?.street ||
                order.delivery_address?.street.toLowerCase().includes("retirada");
              const totalItems = order.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
              const firstItem = order.items?.[0]?.product?.name || "Item";

              return (
                <div
                  key={order.id}
                  className="bg-gray-50/60 dark:bg-[#1E0922]/80 border border-gray-200/80 dark:border-border/30 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-primary/30"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        #{order.id.substring(0, 6)}
                      </span>
                      <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <ShiftOrderStatusBadge status={order.status} />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                        {isPickup ? "🛍️ Retirada" : "🛵 Entrega"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground truncate">{clientName}</h4>
                      {order.user?.phone && (
                        <span className="text-xs text-gray-500 font-mono hidden sm:inline">• {order.user.phone}</span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      <strong>{totalItems} item(ns):</strong> {firstItem}
                      {(order.items?.length || 1) > 1 ? ` + ${(order.items?.length || 1) - 1} outros` : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200/60 dark:border-border/20">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                        Pagamento
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {order.payment_method_type === "dinheiro" && "💵 Dinheiro"}
                        {order.payment_method_type === "pix_entrega" && "⚡ Pix"}
                        {order.payment_method_type === "cartao_maquininha" && "💳 Cartão"}
                        {!order.payment_method_type && "⚡ Pix"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Total</span>
                      <span className="font-heading font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatShiftBRL(order.total_amount || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPrintReceipt(order)}
                        className="h-8 px-2 rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                        title="Imprimir Comprovante Térmico"
                      >
                        <Printer className="w-3.5 h-3.5 text-primary" />
                        <span className="hidden md:inline">Via</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectOrder(order)}
                        className="h-8 px-2.5 rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        Ver Ficha
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {shiftOrdersTotalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-border/30">
            <span className="text-xs text-gray-500 font-mono">
              Página {shiftOrdersPage} de {shiftOrdersTotalPages} ({shiftOrdersTotal} pedidos)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(shiftOrdersPage - 1)}
                disabled={shiftOrdersPage <= 1}
                className="h-8 px-2 rounded-xl text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(shiftOrdersPage + 1)}
                disabled={shiftOrdersPage >= shiftOrdersTotalPages}
                className="h-8 px-2 rounded-xl text-xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
