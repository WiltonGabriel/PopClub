"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  History,
  LayoutDashboard,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShoppingBag,
  DollarSign,
  Printer,
  RefreshCw,
  Store,
  TrendingUp,
  User,
  Layers,
  FileText,
  ArrowRight,
} from "lucide-react";
import { orderService, Order } from "../../../services/orderService";
import { shiftService, ShiftRecord } from "../../../services/shiftService";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { OrderDetailDrawer } from "../../../components/admin/OrderDetailDrawer";
import { ShiftCardsGrid } from "@/components/admin/shifts/ShiftCardsGrid";
import { ShiftExecutivePanel } from "@/components/admin/shifts/ShiftExecutivePanel";
import {
  formatShiftBRL as formatBRL,
  ShiftOrderStatusBadge,
} from "@/components/admin/shifts/shiftFormatters";
import { printThermalReceipt } from "@/lib/thermalPrinter";
import { useToast } from "../../../components/ui/ToastNotification";
import { MobileOrientationBanner } from "@/components/admin/MobileOrientationBanner";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthorizedAdminFallbackRoute, getVisibleAdminGroups } from "@/lib/adminNavigation";

type DateRangeOption = "today" | "yesterday" | "last7days" | "last30days" | "custom" | "all";
type ViewMode = "shifts" | "individual";

export default function AdminHistoricoPage() {
  const { user, loading: authLoading, isAdmin, canAccess } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const canViewHistory = isAdmin || canAccess("ORDERS_HISTORY");
  const canManageKanban = isAdmin || canAccess("ORDERS_KANBAN");
  const canManageStock = isAdmin || canAccess("STOCK_CONTROL") || canAccess("menu_manage");
  const canAccessPedidos = canManageKanban || canManageStock;
  const hasOperationalPanel = isAdmin || getVisibleAdminGroups(user).length > 0;

  // Guard de Acesso: Apenas Admin ou Editor com ORDERS_HISTORY
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/admin/historico");
      return;
    }
    if (!canViewHistory) {
      router.push(getAuthorizedAdminFallbackRoute(user, "/admin/historico"));
    }
  }, [user, authLoading, canViewHistory, router]);

  // Modo de visualização: Turnos vs Pedidos Individuais
  const [viewMode, setViewMode] = useState<ViewMode>("shifts");

  // Estados dos Turnos (máx. 20 mais recentes nesta página)
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [totalShifts, setTotalShifts] = useState(0);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  // Mapa de Id -> Código de Turno para enriquecimento rápido
  const shiftCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shifts) {
      if (s.id && s.code) {
        map.set(s.id, s.code);
      }
    }
    return map;
  }, [shifts]);
  const [shiftOrders, setShiftOrders] = useState<Order[]>([]);
  const [shiftOrdersTotal, setShiftOrdersTotal] = useState(0);
  const [shiftOrdersPage, setShiftOrdersPage] = useState(1);
  const [shiftOrdersTotalPages, setShiftOrdersTotalPages] = useState(1);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingShiftOrders, setLoadingShiftOrders] = useState(false);
  const [shiftOrderSearch, setShiftOrderSearch] = useState("");
  const [shiftOrderStatusFilter, setShiftOrderStatusFilter] = useState("all");

  // Estados de Pedidos Individuais
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  const [fetching, setFetching] = useState(true);

  // Filtros de Pedidos Individuais
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("last7days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Drawer de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Carrega listagem dos 20 turnos mais recentes
  const loadShifts = useCallback(async () => {
    setLoadingShifts(true);
    try {
      const data = await shiftService.getShiftData({ page: 1, limit: 20 });
      const loadedShifts = data.shifts || [];
      setShifts(loadedShifts);
      setTotalShifts(typeof data.totalShifts === "number" ? data.totalShifts : loadedShifts.length);
      // Seleciona o primeiro turno automaticamente se não houver um selecionado
      if (loadedShifts.length > 0) {
        setSelectedShift((prev) => {
          if (!prev) return loadedShifts[0];
          const found = loadedShifts.find((s) => s.id === prev.id);
          return found || loadedShifts[0];
        });
      }
    } catch (err: unknown) {
      console.error("Erro ao carregar turnos:", err);
      showToast({
        title: "Erro ao buscar turnos",
        message: "Não foi possível carregar o histórico de expedientes.",
        type: "error",
      });
    } finally {
      setLoadingShifts(false);
    }
  }, [showToast]);

  // Carrega pedidos do turno selecionado
  const loadShiftOrders = useCallback(
    async (shiftId: string, pageNum = 1) => {
      setLoadingShiftOrders(true);
      try {
        const data = await orderService.getHistoricalOrders({
          shiftId,
          page: pageNum,
          limit: 15,
          search: shiftOrderSearch.trim() || undefined,
          status: shiftOrderStatusFilter !== "all" ? shiftOrderStatusFilter : undefined,
        });
        setShiftOrders(data.orders);
        setShiftOrdersTotal(data.total);
        setShiftOrdersPage(data.page);
        setShiftOrdersTotalPages(data.totalPages);
      } catch (err: unknown) {
        console.error("Erro ao carregar pedidos do turno:", err);
        showToast({
          title: "Erro ao carregar pedidos do turno",
          message: "Não foi possível carregar os pedidos deste expediente.",
          type: "error",
        });
      } finally {
        setLoadingShiftOrders(false);
      }
    },
    [shiftOrderSearch, shiftOrderStatusFilter, showToast]
  );

  // Recarrega pedidos do turno quando muda o turno selecionado ou filtros do turno
  useEffect(() => {
    if (viewMode === "shifts" && selectedShift?.id) {
      loadShiftOrders(selectedShift.id, 1);
    }
  }, [viewMode, selectedShift?.id, shiftOrderStatusFilter, loadShiftOrders]);

  // Carrega turnos na montagem
  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // Calcula strings de datas ISO para os atalhos de pedidos individuais
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

  // Busca pedidos individuais paginados
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
      } catch (err: unknown) {
        console.error("Erro ao carregar histórico:", err);
        const message = err instanceof Error ? err.message : "Não foi possível carregar os pedidos.";
        showToast({
          title: "Erro ao buscar histórico",
          message,
          type: "error",
        });
      } finally {
        setFetching(false);
      }
    },
    [page, dateRangeOption, startDate, endDate, statusFilter, searchTerm, calculateDatesForOption, showToast]
  );

  // Dispara busca individual ao alterar filtros
  useEffect(() => {
    if (viewMode === "individual") {
      setPage(1);
      fetchHistoricalOrders(1);
    }
  }, [viewMode, dateRangeOption, statusFilter, fetchHistoricalOrders]);

  const handleApplyCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistoricalOrders(1);
  };

  const handleShiftSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShift) {
      loadShiftOrders(selectedShift.id, 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchHistoricalOrders(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleShiftOrdersPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= shiftOrdersTotalPages && selectedShift) {
      loadShiftOrders(selectedShift.id, newPage);
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-transparent text-foreground transition-colors duration-200">
      {/* Alerta Não-Bloqueante de Orientação Mobile */}
      <MobileOrientationBanner />

      {/* Header */}
      <header className="bg-white/85 dark:bg-[#1F0B22]/90 backdrop-blur-xl border-b border-gray-200 dark:border-border/40 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-heading font-black text-xl tracking-tight flex items-center gap-1.5 select-none hover:opacity-85 transition-opacity">
            <div className="flex items-center gap-0.5 font-heading font-black text-xl tracking-tight">
              <span className="text-foreground">Pop</span>
              <span className="text-primary font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">Shake</span>
              <span className="ml-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Histórico & Auditoria
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          {canAccessPedidos && (
            <Link
              href="/admin/pedidos"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-primary border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">{canManageKanban ? "Central da Esteira" : "Controle de Estoque"}</span>
            </Link>
          )}

          {hasOperationalPanel && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-primary border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Painel Operacional</span>
            </Link>
          )}

          <Link
            href="/conta"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-primary border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <User className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Meu Perfil</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-primary border border-gray-200 dark:border-border/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Página Inicial</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Título e Ações de Topo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground">
              <History className="w-6 h-6 text-primary" /> Histórico Gerencial de Pedidos
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Audite turnos e expedientes concluídos, consulte faturamentos consolidados e reimprima comprovantes térmicos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (viewMode === "shifts") {
                  loadShifts();
                  if (selectedShift) loadShiftOrders(selectedShift.id, shiftOrdersPage);
                } else {
                  fetchHistoricalOrders(page);
                }
              }}
              disabled={loadingShifts || loadingShiftOrders || fetching}
              className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 h-10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loadingShifts || loadingShiftOrders || fetching) ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* 1. SELETOR DE MODO NO TOPO */}
        <div className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-border/40 rounded-2xl p-1.5 shadow-sm flex items-center gap-1.5 max-w-md">
          <button
            type="button"
            onClick={() => setViewMode("shifts")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              viewMode === "shifts"
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>⏱️ Histórico por Turno / Esteira</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("individual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              viewMode === "individual"
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📋 Pedidos Individuais</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* VISÃO 1: HISTÓRICO POR TURNO / ESTEIRA                   */}
        {/* ======================================================== */}
        {viewMode === "shifts" && (
          <div className="space-y-6">
            <ShiftCardsGrid
              shifts={shifts}
              selectedShiftId={selectedShift?.id || null}
              onSelectShift={setSelectedShift}
              loading={loadingShifts}
              title={
                totalShifts > 20
                  ? `Expedientes Registrados (20 mais recentes de ${totalShifts})`
                  : `Expedientes Registrados (${totalShifts || shifts.length})`
              }
              subtitle="Selecione um turno para inspecionar os detalhes"
              footer={
                totalShifts > 20 ? (
                  <div className="pt-2 flex justify-center">
                    <Link
                      href="/admin/historico/turnos"
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary/10 hover:bg-primary hover:text-white text-primary border border-primary/30 transition-all shadow-xs"
                    >
                      <span>Ver mais expedientes ({totalShifts} no total)</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : undefined
              }
            />

            {selectedShift && (
              <ShiftExecutivePanel
                shift={selectedShift}
                shiftOrders={shiftOrders}
                shiftOrdersTotal={shiftOrdersTotal}
                shiftOrdersPage={shiftOrdersPage}
                shiftOrdersTotalPages={shiftOrdersTotalPages}
                loadingShiftOrders={loadingShiftOrders}
                shiftOrderSearch={shiftOrderSearch}
                shiftOrderStatusFilter={shiftOrderStatusFilter}
                onShiftOrderSearchChange={setShiftOrderSearch}
                onShiftOrderStatusFilterChange={setShiftOrderStatusFilter}
                onApplyShiftSearch={handleShiftSearch}
                onPageChange={handleShiftOrdersPageChange}
                onPrintReceipt={printThermalReceipt}
                onSelectOrder={setSelectedOrder}
              />
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VISÃO 2: PEDIDOS INDIVIDUAIS & BUSCA RÁPIDA              */}
        {/* ======================================================== */}
        {viewMode === "individual" && (
          <div className="space-y-6">
            {/* Cards de Métricas do Filtro Individual */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-4.5 min-h-[96px] shadow-sm flex items-center justify-between gap-3 overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1 truncate">
                    Total de Pedidos
                  </span>
                  <span className="font-heading font-extrabold text-xl sm:text-2xl text-foreground tracking-tight leading-none block truncate">
                    {total}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-4.5 min-h-[96px] shadow-sm flex items-center justify-between gap-3 overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1 truncate">
                    Faturamento do Filtro
                  </span>
                  <span className="font-heading font-extrabold text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400 tracking-tight leading-none block truncate">
                    {formatBRL(totalRevenue)}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white/95 dark:bg-[#230E26]/95 backdrop-blur-md border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-4.5 min-h-[96px] shadow-sm flex items-center justify-between gap-3 overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1 truncate">
                    Ticket Médio
                  </span>
                  <span className="font-heading font-extrabold text-xl sm:text-2xl text-primary tracking-tight leading-none block truncate">
                    {formatBRL(averageTicket)}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </section>

            {/* Barra de Filtros e Busca Multicritério */}
            <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-gray-100 dark:border-border/30">
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
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-border/40 hover:bg-gray-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Filtro Rápido por Status: Todos, Entregues/Concluídos, Cancelados */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Status:</span>
                  {[
                    { key: "all", label: "Todos" },
                    { key: "completed", label: "Entregues" },
                    { key: "cancelled", label: "Cancelados" },
                  ].map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setStatusFilter(st.key)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        statusFilter === st.key
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-xs"
                          : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-border/40 hover:bg-gray-100"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:border-primary ml-1"
                  >
                    <option value="all">Mais opções...</option>
                    <option value="completed">Concluídos / Entregues</option>
                    <option value="cancelled">Cancelados</option>
                    <option value="delivering">A Caminho</option>
                    <option value="ready">Prontos</option>
                    <option value="preparing">Em Preparo</option>
                    <option value="pending">Novos</option>
                  </select>
                </div>
              </div>

              {/* Linha de Busca Instantânea e Intervalo Customizado */}
              <form onSubmit={handleApplyCustomSearch} className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Busca por ID (#192a13), nome do cliente, telefone ou rua..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-xl bg-gray-50/70 dark:bg-background border-gray-200 dark:border-border/40"
                  />
                </div>

                {dateRangeOption === "custom" && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-gray-50/70 dark:bg-background border-gray-200 dark:border-border/40"
                    />
                    <span className="text-xs text-gray-400 font-mono">até</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-gray-50/70 dark:bg-background border-gray-200 dark:border-border/40"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider shrink-0 w-full sm:w-auto shadow-sm shadow-primary/20"
                >
                  Pesquisar
                </Button>
              </form>
            </section>

            {/* Lista Paginada de Pedidos Individuais */}
            <section className="space-y-3">
              {fetching ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white dark:bg-[#230E26] rounded-2xl border border-gray-200 dark:border-border/40">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  <span>Carregando histórico de pedidos...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500 bg-white dark:bg-[#230E26] rounded-2xl border border-dashed border-gray-200 dark:border-border/40">
                  <p className="font-heading font-bold text-sm text-foreground mb-1">Nenhum pedido individual encontrado</p>
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
                  const shiftCode = order.shift_code || (order.shift_id ? shiftCodeMap.get(order.shift_id) : null);

                  return (
                    <div
                      key={order.id}
                      className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary/30"
                    >
                      {/* Coluna 1: ID, Data, Badges e Cliente */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-primary dark:text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            #{order.id.substring(0, 6)}
                          </span>

                          <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {createdDate.toLocaleDateString("pt-BR")} às{" "}
                            {createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>

                          <ShiftOrderStatusBadge status={order.status} />

                          {shiftCode && (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                              title={`Turno / Esteira de Origem: ${shiftCode}`}
                            >
                              <Layers className="w-3 h-3 text-purple-500 shrink-0" />
                              <span>{shiftCode}</span>
                            </span>
                          )}

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                            {isPickup ? "🛍️ Retirada" : "🛵 Entrega"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-sm text-foreground truncate">
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
                      <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-border/30">
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
                          <span className="font-heading font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                            {formatBRL(order.total_amount || 0)}
                          </span>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printThermalReceipt(order)}
                            className="h-9 px-2.5 rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                            title="Imprimir Comprovante Térmico / Via Cozinha"
                          >
                            <Printer className="w-3.5 h-3.5 text-primary" />
                            <span className="hidden sm:inline">Comprovante</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                            className="h-9 px-3 rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5"
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

            {/* Barra de Paginação dos Pedidos Individuais */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Mostrando {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} de {total} pedidos
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1 h-9 px-3"
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
                    className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1 h-9 px-3"
                  >
                    <span>Próximo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Drawer / Modal de Detalhes Auditáveis do Pedido */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
