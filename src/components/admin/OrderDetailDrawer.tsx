"use client";

import React, { useEffect } from "react";
import {
  X,
  User,
  Phone,
  MessageCircle,
  MapPin,
  Store,
  CreditCard,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Bike,
  Printer,
} from "lucide-react";
import { Order, OrderStatus } from "../../services/orderService";
import { Button } from "../ui/button";
import { printThermalReceipt } from "@/lib/thermalPrinter";

interface OrderDetailDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvance?: (orderId: string, status: OrderStatus) => void;
  onRevert?: (orderId: string, status: OrderStatus) => void;
  onRequestCancel?: (order: Order) => void;
  onOpenDispatchModal?: (order: Order) => void;
  clientRecurrenceText?: string;
}

export function OrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onAdvance,
  onRevert,
  onRequestCancel,
  onOpenDispatchModal,
  clientRecurrenceText,
}: OrderDetailDrawerProps) {
  // Fecha com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";
  const isPickup =
    !order.delivery_address?.street ||
    order.delivery_address?.street.toLowerCase().includes("retirada");

  const createdDate = new Date(order.created_at);

  // Link do WhatsApp
  const phone = order.user?.phone;
  let whatsAppLink: string | null = null;
  if (phone) {
    const clean = phone.replace(/\D/g, "");
    if (clean.length >= 10) {
      const full = clean.startsWith("55") ? clean : `55${clean}`;
      const msg = encodeURIComponent(
        `Olá ${clientName}! Aqui é da equipe PopClub referente ao seu pedido #${order.id.substring(0, 6)}.`
      );
      whatsAppLink = `https://wa.me/${full}?text=${msg}`;
    }
  }

  // Próxima etapa
  const getNextStage = (currentStatus: OrderStatus): { nextStatus: OrderStatus; label: string } | null => {
    switch (currentStatus) {
      case "accepted":
        return { nextStatus: "preparing", label: "Iniciar Preparo ➔" };
      case "preparing":
        return { nextStatus: "ready", label: "Pronto p/ Saída ➔" };
      case "ready":
        return { nextStatus: "delivering", label: "Despachar Entrega 🛵" };
      case "delivering":
        return { nextStatus: "completed", label: "Finalizar Pedido ✓" };
      default:
        return null;
    }
  };

  // Etapa anterior
  const getPrevStage = (currentStatus: OrderStatus): { prevStatus: OrderStatus; label: string } | null => {
    switch (currentStatus) {
      case "preparing":
        return { prevStatus: "accepted", label: "Voltar p/ Novos" };
      case "ready":
        return { prevStatus: "preparing", label: "Voltar para Preparo" };
      case "delivering":
        return { prevStatus: "ready", label: "Voltar para Pronto" };
      case "completed":
        return { prevStatus: "delivering", label: "Reabrir Entrega" };
      default:
        return null;
    }
  };

  const nextStage = getNextStage(order.status);
  const prevStage = getPrevStage(order.status);

  // Status visual
  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return { label: "Aguardando Triagem", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200" };
      case "accepted":
        return { label: "Novo (Aceito)", color: "bg-[#9306CF]/10 text-[#9306CF] border-[#9306CF]/30" };
      case "preparing":
        return { label: "Em Preparo", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200" };
      case "ready":
        return { label: "Pronto p/ Saída", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" };
      case "delivering":
        return { label: "A Caminho / Despachado", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200" };
      case "completed":
        return { label: "Concluído & Entregue", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200" };
      case "cancelled":
        return { label: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200" };
    }
  };

  const statusInfo = getStatusDisplay(order.status);

  // Pagamento formatado
  const paymentType = (order.payment_method_type || "").toLowerCase();
  const isCash = paymentType.includes("dinheiro") || paymentType.includes("cash");
  const isPix = paymentType.includes("pix");
  const isCard = paymentType.includes("cartao") || paymentType.includes("card") || paymentType.includes("maquininha");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-[#1A0B1C] shadow-2xl border-l border-gray-200 dark:border-[#512B54]/40 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-[#512B54]/30 flex items-center justify-between bg-gray-50/50 dark:bg-[#1F0B22]/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-lg text-[#9306CF] dark:text-[#C7A9C9]">
                  #{order.id.substring(0, 8)}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Registrado em {createdDate.toLocaleDateString("pt-BR")} às {createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printThermalReceipt(order)}
                className="h-8 px-2.5 rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold gap-1 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                title="Imprimir Comprovante (80mm / 58mm)"
              >
                <Printer className="w-3.5 h-3.5 text-[#9306CF]" />
                <span className="hidden sm:inline">Comprovante</span>
              </Button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body com Scroll */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 1. Ficha do Cliente Registrado */}
            <div className="bg-gray-50 dark:bg-[#230E26] rounded-2xl p-4 border border-gray-200 dark:border-[#512B54]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#9306CF]" />
                  Perfil do Cliente
                </span>

                {clientRecurrenceText && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
                    <Sparkles className="w-2.5 h-2.5" />
                    {clientRecurrenceText}
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-bold text-base text-[#4C264F] dark:text-[#F9F5F9]">
                  {clientName}
                </h4>
                {order.user?.email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{order.user.email}</p>
                )}
              </div>

              {phone ? (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-[#512B54]/30">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-mono">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{phone}</span>
                  </div>

                  {whatsAppLink && (
                    <a
                      href={whatsAppLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 transition-colors shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Abrir WhatsApp</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-200/60 dark:border-[#512B54]/30">
                  Telefone não cadastrado na conta.
                </p>
              )}
            </div>

            {/* 2. Endereço ou Retirada */}
            <div className="bg-gray-50 dark:bg-[#230E26] rounded-2xl p-4 border border-gray-200 dark:border-[#512B54]/40 space-y-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                {isPickup ? <Store className="w-3.5 h-3.5 text-blue-500" /> : <Bike className="w-3.5 h-3.5 text-[#9306CF]" />}
                Modalidade de Atendimento
              </span>

              {isPickup ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 text-xs">
                  <strong className="block font-bold mb-0.5">🛍️ Retirada no Balcão</strong>
                  <span>O cliente irá retirar os itens diretamente no balcão da loja.</span>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#9306CF] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#4C264F] dark:text-[#F9F5F9]">
                        {order.delivery_address?.street}, {order.delivery_address?.number}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {order.delivery_address?.neighborhood}
                        {order.delivery_address?.city ? ` — ${order.delivery_address.city}` : ""}
                      </p>
                      {order.delivery_address?.complement && (
                        <p className="text-gray-600 dark:text-gray-300 mt-0.5">
                          <strong>Complemento:</strong> {order.delivery_address.complement}
                        </p>
                      )}
                      {order.delivery_address?.reference && (
                        <p className="text-[#9306CF] dark:text-[#C7A9C9] font-medium mt-1 bg-[#9306CF]/5 p-2 rounded-lg border border-[#9306CF]/15">
                          <strong>Ponto de Referência:</strong> {order.delivery_address.reference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Lista de Itens do Pedido */}
            <div className="bg-gray-50 dark:bg-[#230E26] rounded-2xl p-4 border border-gray-200 dark:border-[#512B54]/40 space-y-3">
              <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#9306CF]" />
                Itens do Pedido ({order.items?.length || 0})
              </span>

              <div className="divide-y divide-gray-200/60 dark:divide-[#512B54]/30">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it) => (
                    <div key={it.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] font-black text-xs flex items-center justify-center">
                              {it.quantity}x
                            </span>
                            <span className="font-bold text-[#4C264F] dark:text-[#F9F5F9] text-sm">
                              {it.product?.name || "Item Personalizado"}
                            </span>
                          </div>
                          {it.product?.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6 leading-relaxed">
                              {it.product.description}
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-300 text-xs shrink-0">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            it.price_at_time * it.quantity
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">Nenhum item detalhado.</p>
                )}
              </div>
            </div>

            {/* 4. Pagamento e Troco */}
            <div className="bg-gray-50 dark:bg-[#230E26] rounded-2xl p-4 border border-gray-200 dark:border-[#512B54]/40 space-y-3">
              <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#9306CF]" />
                Forma de Pagamento & Faturamento
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Método Escolhido:</span>
                  <span className="font-bold capitalize text-[#4C264F] dark:text-[#F9F5F9]">
                    {isPix ? "⚡ Pix (Entrega)" : isCash ? "💵 Dinheiro" : isCard ? "💳 Cartão (Maquininha)" : order.payment_method_type || "Outro"}
                  </span>
                </div>

                {isCash && (order.change_for || order.payment_change_for) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="flex justify-between">
                      <span>Total do Pedido:</span>
                      <span>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.total_amount))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pagar com:</span>
                      <strong>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          Number(order.change_for || order.payment_change_for)
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-amber-200/60 dark:border-amber-900/60 text-emerald-700 dark:text-emerald-400 font-black text-xs">
                      <span>LEVAR DE TROCO:</span>
                      <span>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          Number(
                            order.change_to_return ??
                            Math.max(0, Number(order.change_for || order.payment_change_for) - Number(order.total_amount))
                          )
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {order.subtotal && Number(order.subtotal) > 0 ? (
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal dos Itens:</span>
                    <span className="font-mono">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.subtotal))}
                    </span>
                  </div>
                ) : null}

                {order.discount_amount && Number(order.discount_amount) > 0 ? (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Desconto Aplicado:</span>
                    <span className="font-mono">
                      - {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.discount_amount))}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                  <span>Taxa de Entrega:</span>
                  {order.delivery_fee && Number(order.delivery_fee) > 0 ? (
                    <span className="font-mono font-bold text-[#4C264F] dark:text-[#F9F5F9]">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.delivery_fee))}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                      Grátis
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-[#512B54]/40 font-heading text-sm font-black text-[#4C264F] dark:text-[#F9F5F9]">
                  <span>Total do Pedido:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base font-mono">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.total_amount))}
                  </span>
                </div>
              </div>
            </div>

            {/* Motivo de Cancelamento se Houver */}
            {order.status === "cancelled" && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300">
                <strong>Motivo do Cancelamento:</strong>
                <p className="mt-1">{order.cancellation_reason || "Não informado pelo atendente."}</p>
              </div>
            )}
          </div>

          {/* Footer Operacional de Ações */}
          <div className="p-4 border-t border-gray-100 dark:border-[#512B54]/30 bg-gray-50/80 dark:bg-[#1F0B22]/80 space-y-2">
            {order.status === "delivering" && onOpenDispatchModal && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenDispatchModal(order)}
                className="w-full text-xs font-bold uppercase tracking-wider rounded-xl border-[#9306CF]/40 text-[#9306CF] dark:text-[#C7A9C9] h-9 hover:bg-[#9306CF]/10 flex items-center justify-center gap-1.5"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Link / Rastreamento GPS do Entregador</span>
              </Button>
            )}

            <div className="flex items-center gap-2">
              {prevStage && onRevert && (
                <Button
                  variant="outline"
                  onClick={() => onRevert(order.id, order.status)}
                  className="flex-1 text-xs font-bold uppercase tracking-wider rounded-xl border-gray-200 dark:border-[#512B54]/40 h-10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </Button>
              )}

              {nextStage && onAdvance && (
                <Button
                  onClick={() => onAdvance(order.id, order.status)}
                  className="flex-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white h-10 shadow-md shadow-[#9306CF]/20 flex items-center justify-center gap-1.5"
                >
                  <span>{nextStage.label}</span>
                </Button>
              )}
            </div>

            {order.status !== "completed" && order.status !== "cancelled" && onRequestCancel && (
              <button
                onClick={() => onRequestCancel(order)}
                className="w-full py-2 text-center text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline transition-colors"
              >
                Cancelar este Pedido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
