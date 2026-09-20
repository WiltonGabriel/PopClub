"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  History,
  LayoutDashboard,
  Calendar,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  DollarSign,
  Printer,
  Sparkles,
  RefreshCw,
  Store,
  Bike,
  MessageCircle,
  FileText,
  TrendingUp,
} from "lucide-react";
import { orderService, Order, OrderStatus } from "../../../services/orderService";
import { authService } from "../../../services/authService";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { OrderDetailDrawer } from "../../../components/admin/OrderDetailDrawer";
import { printThermalReceipt } from "@/lib/thermalPrinter";
import { useToast } from "../../../components/ui/ToastNotification";
import { MobileOrientationBanner } from "@/components/admin/MobileOrientationBanner";

type DateRangeOption = "today" | "yesterday" | "last7days" | "last30days" | "custom" | "all";

export default function AdminHistoricoPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  const [fetching, setFetching] = useState(true);

  // Filtros
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("last7days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Drawer de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Calcula strings de datas ISO para os atalhos
  const calculateDatesForOption = useCallback((option: DateRangeOption) => {
    const now = new Date();
    const toYmd = (d: Date) => d.toISOString().slice(0, 10);

    if (option === "today") {
      const todayStr = toYmd(now);
      return { start: todayStr, end: todayStr };
    }
    if (option === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toYmd(y);
      return { start: yStr, end: yStr };
    }
    if (option === "last7days") {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      return { start: toYmd(d7), end: toYmd(now) };
    }
    if (option === "last30days") {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      return { start: toYmd(d30), end: toYmd(now) };
    }
    return { start: "", end: "" };
  }, []);

  // Busca pedidos paginados
  const fetchHistoricalOrders = useCallback(
    async (targetPage = page) => {
      setFetching(true);
      try {
        let effectiveStart = startDate;
        let effectiveEnd = endDate;

        if (dateRangeOption !== "custom" && dateRangeOption !== "all") {
          const range = calculateDatesForOption(dateRangeOption);
          effectiveStart = range.start;
          effectiveEnd = range.end;
        }

        const data = await orderService.getHistoricalOrders({
          page: targetPage,
          limit: 15,
          status: statusFilter !== "all" ? statusFilter : undefined,
          startDate: effectiveStart || undefined,
          endDate: effectiveEnd || undefined,
          search: searchTerm.trim() || undefined,
        });

        setOrders(data.orders);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotalRevenue(data.totalRevenue);
        setAverageTicket(data.averageTicket);
      } catch (err: any) {
        console.error("Erro ao carregar histórico:", err);
        showToast({
          title: "Erro ao buscar histórico",
          message: err.message || "Não foi possível carregar os pedidos.",
          type: "error",
        });
      } finally {
        setFetching(false);
      }
    },
    [page, dateRangeOption, startDate, endDate, statusFilter, searchTerm, calculateDatesForOption, showToast]
  );

  // Dispara busca ao alterar filtros
  useEffect(() => {
    setPage(1);
    fetchHistoricalOrders(1);
  }, [dateRangeOption, statusFilter]);

  const handleApplyCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistoricalOrders(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchHistoricalOrders(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
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
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 animate-pulse">
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
  };

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-transparent text-foreground transition-colors duration-200">
      {/* Alerta Não-Bloqueante de Orientação Mobile */}
      <MobileOrientationBanner />

      {/* Header */}
      <header className="bg-white/85 dark:bg-[#1F0B22]/90 backdrop-blur-xl border-b border-gray-200 dark:border-[#512B54]/40 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-heading font-black text-xl tracking-tight flex items-center gap-1.5 select-none hover:opacity-85 transition-opacity">
            <div className="flex items-center gap-1">
              <span className="text-[#4C264F] dark:text-[#F9F5F9]">Pop</span>
              <span
                style={{
                  background: "linear-gradient(135deg, #9306CF 0%, #940068 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Shake
              </span>
              <span className="ml-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
                Histórico & Auditoria
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/pedidos"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-[#9306CF] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Central da Esteira</span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-[#9306CF] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Painel Operacional</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-[#9306CF] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Página Inicial</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Título e Ações de Topo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
              <History className="w-6 h-6 text-[#9306CF]" /> Histórico Geral de Pedidos
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Consulte pedidos arquivados de turnos anteriores, audite pagamentos e reimprima comprovantes térmicos.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchHistoricalOrders(page)}
            disabled={fetching}
            className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 h-10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            <span>Atualizar Lista</span>
          </Button>
        </div>

        {/* Cards de Métricas do Filtro */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 min-h-[105px] shadow-sm flex items-center justify-between gap-4 overflow-hidden">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1 truncate">
                Total de Pedidos
              </span>
              <span className="font-heading font-black text-2xl sm:text-3xl text-[#4C264F] dark:text-[#F9F5F9] leading-tight sm:leading-normal block truncate">
                {total}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#9306CF]/10 text-[#9306CF] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 min-h-[105px] shadow-sm flex items-center justify-between gap-4 overflow-hidden">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1 truncate">
                Faturamento do Filtro
              </span>
              <span className="font-heading font-black text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-tight sm:leading-normal block truncate">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRevenue)}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 min-h-[105px] shadow-sm flex items-center justify-between gap-4 overflow-hidden">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1 truncate">
                Ticket Médio
              </span>
              <span className="font-heading font-black text-2xl sm:text-3xl text-purple-600 dark:text-purple-400 font-mono tracking-tight leading-tight sm:leading-normal block truncate">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(averageTicket)}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Barra de Filtros e Busca */}
        <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-gray-100 dark:border-[#512B54]/30">
            {/* Seletor de Intervalo Rápido */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "today", label: "Hoje" },
                { key: "yesterday", label: "Ontem" },
                { key: "last7days", label: "Últimos 7 dias" },
                { key: "last30days", label: "Últimos 30 dias" },
                { key: "all", label: "Todo o Histórico" },
                { key: "custom", label: "Customizado" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDateRangeOption(opt.key as DateRangeOption)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    dateRangeOption === opt.key
                      ? "bg-[#9306CF] text-white border-[#9306CF] shadow-xs"
                      : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Filtro por Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 dark:bg-[#1A0B1C] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-[#9306CF]"
              >
                <option value="all">Todos os Status</option>
                <option value="completed">Concluídos / Entregues</option>
                <option value="cancelled">Cancelados</option>
                <option value="delivering">A Caminho</option>
                <option value="ready">Prontos</option>
                <option value="preparing">Em Preparo</option>
                <option value="pending">Novos</option>
              </select>
            </div>
          </div>

          {/* Linha de Busca e Intervalo Customizado */}
          <form onSubmit={handleApplyCustomSearch} className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por cliente, telefone, rua ou código #XXXXXX..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl bg-gray-50/70 dark:bg-[#1A0B1C] border-gray-200 dark:border-[#512B54]/40"
              />
            </div>

            {dateRangeOption === "custom" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-gray-50/70 dark:bg-[#1A0B1C] border-gray-200 dark:border-[#512B54]/40"
                />
                <span className="text-xs text-gray-400 font-mono">até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-gray-50/70 dark:bg-[#1A0B1C] border-gray-200 dark:border-[#512B54]/40"
                />
              </div>
            )}

            <Button
              type="submit"
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider shrink-0 w-full sm:w-auto shadow-sm shadow-[#9306CF]/20"
            >
              Filtrar
            </Button>
          </form>
        </section>

        {/* Lista Paginada de Pedidos */}
        <section className="space-y-3">
          {fetching ? (
            <div className="py-16 text-center text-xs text-gray-500 bg-white dark:bg-[#230E26] rounded-2xl border border-gray-200 dark:border-[#512B54]/40">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#9306CF] mb-2" />
              <span>Carregando histórico de pedidos...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-500 bg-white dark:bg-[#230E26] rounded-2xl border border-dashed border-gray-200 dark:border-[#512B54]/40">
              <p className="font-heading font-bold text-sm text-foreground mb-1">Nenhum pedido encontrado</p>
              <p>Tente ajustar os filtros de data, status ou o termo pesquisado.</p>
            </div>
          ) : (
            orders.map((order) => {
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
                  className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[#9306CF]/30"
                >
                  {/* Coluna 1: ID, Data, Badges e Cliente */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-[#9306CF] dark:text-[#C7A9C9] bg-[#9306CF]/10 px-2 py-0.5 rounded-md border border-[#9306CF]/20">
                        #{order.id.substring(0, 6)}
                      </span>

                      <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {createdDate.toLocaleDateString("pt-BR")} às{" "}
                        {createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>

                      {getStatusBadge(order.status)}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                        {isPickup ? "🛍️ Retirada" : "🛵 Entrega"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] truncate">
                        {clientName}
                      </h4>
                      {order.user?.phone && (
                        <span className="text-xs text-gray-500 font-mono hidden sm:inline">
                          {order.user.phone}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      <strong>{totalItems} item(ns):</strong> {firstItem}
                      {(order.items?.length || 1) > 1 ? ` + ${(order.items?.length || 1) - 1} outros` : ""}
                    </p>
                  </div>

                  {/* Coluna 2: Pagamento e Valor */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-[#512B54]/30">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                        Forma de Pagamento
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {order.payment_method_type === "dinheiro" && "💵 Dinheiro"}
                        {order.payment_method_type === "pix_entrega" && "⚡ Pix"}
                        {order.payment_method_type === "cartao_maquininha" && "💳 Cartão"}
                        {!order.payment_method_type && "⚡ Pix"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                        Valor Total
                      </span>
                      <span className="font-heading font-black text-base text-emerald-600 dark:text-emerald-400 font-mono">
                        R$ {order.total_amount?.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printThermalReceipt(order)}
                        className="h-9 px-2.5 rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold gap-1 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                        title="Imprimir Comprovante (80mm / 58mm)"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#9306CF]" />
                        <span className="hidden sm:inline">Comprovante</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        className="h-9 px-3 rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        Ver Ficha
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Barra de Paginação */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Mostrando {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} de {total} pedidos
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold gap-1 h-9 px-3"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </Button>

              <div className="flex items-center gap-1 px-2 font-mono text-xs font-bold text-foreground">
                <span>Página {page} de {totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold gap-1 h-9 px-3"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Drawer de Detalhes do Pedido */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
