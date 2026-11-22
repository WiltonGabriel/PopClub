"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  Store,
  TrendingUp,
} from "lucide-react";
import { orderService, Order } from "@/services/orderService";
import { shiftService, ShiftRecord } from "@/services/shiftService";
import { Button } from "@/components/ui/button";
import { OrderDetailDrawer } from "@/components/admin/OrderDetailDrawer";
import { ShiftCardsGrid } from "@/components/admin/shifts/ShiftCardsGrid";
import { ShiftExecutivePanel } from "@/components/admin/shifts/ShiftExecutivePanel";
import { printThermalReceipt } from "@/lib/thermalPrinter";
import { useToast } from "@/components/ui/ToastNotification";
import { MobileOrientationBanner } from "@/components/admin/MobileOrientationBanner";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthorizedAdminFallbackRoute, getVisibleAdminGroups } from "@/lib/adminNavigation";

const SHIFTS_PER_PAGE = 30;

function getVisiblePageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (currentPage > 3) {
    pages.push("ellipsis");
  }
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }
  pages.push(totalPages);
  return pages;
}

export default function AdminHistoricoTurnosPage() {
  const { user, loading: authLoading, isAdmin, canAccess } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const canViewHistory = isAdmin || canAccess("ORDERS_HISTORY");
  const hasOperationalPanel = isAdmin || getVisibleAdminGroups(user).length > 0;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/admin/historico/turnos");
      return;
    }
    if (!canViewHistory) {
      router.push(getAuthorizedAdminFallbackRoute(user, "/admin/historico/turnos"));
    }
  }, [user, authLoading, canViewHistory, router]);

  const [shiftsPage, setShiftsPage] = useState(1);
  const [totalShifts, setTotalShifts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [loadingShifts, setLoadingShifts] = useState(true);

  const [shiftOrders, setShiftOrders] = useState<Order[]>([]);
  const [shiftOrdersTotal, setShiftOrdersTotal] = useState(0);
  const [shiftOrdersPage, setShiftOrdersPage] = useState(1);
  const [shiftOrdersTotalPages, setShiftOrdersTotalPages] = useState(1);
  const [loadingShiftOrders, setLoadingShiftOrders] = useState(false);
  const [shiftOrderSearch, setShiftOrderSearch] = useState("");
  const [shiftOrderStatusFilter, setShiftOrderStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadShifts = useCallback(
    async (targetPage: number) => {
      setLoadingShifts(true);
      try {
        const data = await shiftService.getShiftData({
          page: targetPage,
          limit: SHIFTS_PER_PAGE,
        });
        const loadedShifts = data.shifts || [];
        setShifts(loadedShifts);
        setTotalShifts(typeof data.totalShifts === "number" ? data.totalShifts : loadedShifts.length);
        setShiftsPage(typeof data.page === "number" ? data.page : targetPage);
        setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
        setSelectedShift((prev) => {
          if (loadedShifts.length === 0) return null;
          if (!prev) return loadedShifts[0];
          const found = loadedShifts.find((s) => s.id === prev.id);
          return found || loadedShifts[0];
        });
      } catch (err: unknown) {
        console.error("Erro ao carregar turnos paginados:", err);
        showToast({
          title: "Erro ao buscar expedientes",
          message: "Não foi possível carregar os turnos desta página.",
          type: "error",
        });
      } finally {
        setLoadingShifts(false);
      }
    },
    [showToast]
  );

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

  useEffect(() => {
    if (!authLoading && canViewHistory) {
      loadShifts(shiftsPage);
    }
  }, [authLoading, canViewHistory, shiftsPage, loadShifts]);

  useEffect(() => {
    if (selectedShift?.id) {
      loadShiftOrders(selectedShift.id, 1);
    }
  }, [selectedShift?.id, shiftOrderStatusFilter, loadShiftOrders]);

  const handleShiftsPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === shiftsPage) return;
    setShiftsPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleShiftSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShift) {
      loadShiftOrders(selectedShift.id, 1);
    }
  };

  const handleShiftOrdersPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= shiftOrdersTotalPages && selectedShift) {
      loadShiftOrders(selectedShift.id, newPage);
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  const pageNumbers = getVisiblePageNumbers(shiftsPage, totalPages);
  const startItem = totalShifts === 0 ? 0 : (shiftsPage - 1) * SHIFTS_PER_PAGE + 1;
  const endItem = Math.min(shiftsPage * SHIFTS_PER_PAGE, totalShifts);

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-transparent text-foreground transition-colors duration-200">
      <MobileOrientationBanner />

      <header className="bg-white/85 dark:bg-[#1F0B22]/90 backdrop-blur-xl border-b border-gray-200 dark:border-border/40 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-heading font-black text-xl tracking-tight flex items-center gap-1.5 select-none hover:opacity-85 transition-opacity"
          >
            <div className="flex items-center gap-0.5 font-heading font-black text-xl tracking-tight">
              <span className="text-foreground">Pop</span>
              <span className="text-primary font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">Shake</span>
              <span className="ml-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Todos os Expedientes
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/historico"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-primary border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Voltar ao Histórico</span>
          </Link>

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
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-primary border border-gray-200 dark:border-border/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Loja</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground">
              <Layers className="w-6 h-6 text-primary" /> Arquivo Completo de Expedientes
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Navegue por todos os turnos registrados ({totalShifts} no total, até {SHIFTS_PER_PAGE} por página) e inspecione qualquer fechamento executivo.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => loadShifts(shiftsPage)}
            disabled={loadingShifts}
            className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 h-10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingShifts ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </Button>
        </div>

        <ShiftCardsGrid
          shifts={shifts}
          selectedShiftId={selectedShift?.id || null}
          onSelectShift={setSelectedShift}
          loading={loadingShifts}
          title={`Expedientes • Página ${shiftsPage} de ${totalPages}`}
          subtitle={
            totalShifts > 0
              ? `Mostrando ${startItem}–${endItem} de ${totalShifts} turnos`
              : "Selecione um turno para inspecionar os detalhes"
          }
          footer={
            totalPages > 1 ? (
              <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Página {shiftsPage} de {totalPages} ({totalShifts} expedientes)
                </span>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleShiftsPageChange(shiftsPage - 1)}
                    disabled={shiftsPage <= 1 || loadingShifts}
                    className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1 h-9 px-3"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </Button>

                  {pageNumbers.map((item, idx) =>
                    item === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400 font-mono">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleShiftsPageChange(item)}
                        disabled={loadingShifts}
                        className={`min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          item === shiftsPage
                            ? "bg-primary text-white border-primary shadow-xs shadow-primary/30"
                            : "bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-border/40 hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleShiftsPageChange(shiftsPage + 1)}
                    disabled={shiftsPage >= totalPages || loadingShifts}
                    className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1 h-9 px-3"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
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
      </main>

      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
