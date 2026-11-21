"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  CreditCard,
  Bike,
  Store,
  Award,
  MapPin,
  Filter,
  AlertTriangle,
  ArrowRightLeft,
  Flame,
  Snowflake,
  ListFilter,
  History,
  Radio,
  Clock,
  Users,
  Sparkles,
  Tag,
  Calendar,
  Layers,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  AnalyticsDomainService,
  type PeriodFilter,
  type ScopeFilter,
} from "@/domain/services/AnalyticsDomainService";
import type { Order } from "../../services/orderService";
import { productService, type Product } from "../../services/productService";
import { Button } from "../ui/button";
import { AnalyticsTooltip, formatCurrencyBRL } from "./analytics/AnalyticsTooltip";
import { AllProductsTurnoverModal } from "./analytics/AllProductsTurnoverModal";

interface AnalyticsDashboardProps {
  orders: Order[];
  loading?: boolean;
  currentShiftId?: string | null;
}

type RankingMode = "top" | "bottom";
type RankingMetric = "quantity" | "revenue";
type PaymentMetric = "revenue" | "count";

const BRAND_COLORS = {
  purple: "hsl(var(--primary))",
  magenta: "hsl(var(--accent))",
  emerald: "#10B981",
  amber: "#F59E0B",
  blue: "#3B82F6",
  indigo: "#8B5CF6",
  cyan: "#00BDAE",
  red: "#EF4444",
};

function DeltaBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
        isPositive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {isPositive ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`} vs ant.
    </span>
  );
}

function getSlaBadgeTone(avgPrepMinutes: number | null, avgLeadMinutes: number | null): string {
  if (avgPrepMinutes === null && avgLeadMinutes === null) {
    return "bg-gray-500/10 text-muted-foreground";
  }
  const prepOk = avgPrepMinutes === null || avgPrepMinutes <= 15;
  const leadOk = avgLeadMinutes === null || avgLeadMinutes <= 40;
  if (prepOk && leadOk) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  const prepWarn = avgPrepMinutes === null || avgPrepMinutes <= 25;
  const leadWarn = avgLeadMinutes === null || avgLeadMinutes <= 55;
  if (prepWarn && leadWarn) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-destructive/10 text-destructive";
}

export function AnalyticsDashboard({
  orders,
  loading = false,
  currentShiftId = null,
}: AnalyticsDashboardProps) {
  const [scope, setScope] = useState<ScopeFilter>("all_history");
  const [period, setPeriod] = useState<PeriodFilter>("tudo");
  const [rankingMode, setRankingMode] = useState<RankingMode>("top");
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("quantity");
  const [paymentMetric, setPaymentMetric] = useState<PaymentMetric>("revenue");
  const [isAllProductsModalOpen, setIsAllProductsModalOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  useEffect(() => {
    productService
      .getProducts()
      .then((prods) => setCatalogProducts(prods))
      .catch((err) => console.error("Erro ao carregar cardápio no Analytics:", err));
  }, []);

  const report = useMemo(
    () => AnalyticsDomainService.generateReport(orders, catalogProducts, scope, period, currentShiftId),
    [orders, catalogProducts, scope, period, currentShiftId]
  );

  const {
    kpis,
    salesTimeline,
    demand,
    categoryMix,
    addons,
    productStats,
    payments,
    logistics,
    neighborhoods,
    couriers,
    audit,
    coupons,
  } = report;

  const chartRankingData = useMemo(() => {
    const sorted = [...productStats].sort((a, b) => {
      const primaryA = rankingMetric === "revenue" ? a.revenue : a.quantity;
      const primaryB = rankingMetric === "revenue" ? b.revenue : b.quantity;
      if (rankingMode === "top") {
        if (primaryB !== primaryA) return primaryB - primaryA;
        return b.revenue - a.revenue;
      }
      if (primaryA !== primaryB) return primaryA - primaryB;
      return a.revenue - b.revenue;
    });

    if (rankingMode === "top") {
      const activeWithSales = sorted.filter((p) => p.quantity > 0);
      return (activeWithSales.length > 0 ? activeWithSales : sorted).slice(0, 6);
    }
    return sorted.slice(0, 6);
  }, [productStats, rankingMode, rankingMetric]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-gray-200 dark:bg-white/10 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── BARRA SUPERIOR DE ESCOPO E PERÍODO ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40">
            <button
              type="button"
              onClick={() => {
                setScope("active_shift");
                setPeriod("hoje");
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                scope === "active_shift"
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-foreground"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Turno Ativo</span>
            </button>

            <button
              type="button"
              onClick={() => setScope("all_history")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                scope === "all_history"
                  ? "bg-primary text-white shadow-sm font-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-foreground"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico Acumulado</span>
            </button>
          </div>

          <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-muted-foreground border border-gray-200/60 dark:border-border/40">
            {scope === "active_shift" ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {report.scopedOrdersCount} pedido(s) no turno corrente
              </span>
            ) : (
              <span>
                Janela ativa: <strong>{report.filteredOrdersCount}</strong> de{" "}
                <strong>{report.scopedOrdersCount}</strong> pedidos
              </span>
            )}
          </span>
        </div>

        {/* Filtros Temporais */}
        <div
          className={`flex items-center flex-wrap gap-1 bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40 ${
            scope === "active_shift" ? "opacity-50 pointer-events-none" : ""
          }`}
          aria-disabled={scope === "active_shift"}
        >
          {(
            [
              { id: "hoje", label: "Hoje" },
              { id: "7dias", label: "7 Dias" },
              { id: "mes", label: "Este Mês" },
              { id: "ano", label: "Este Ano" },
              { id: "tudo", label: "Todo o Período" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              disabled={scope === "active_shift"}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === item.id
                  ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm font-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BLOCO 1: 6 CARDS EXECUTIVOS & OPERACIONAIS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Card 1: Faturamento Bruto & Líquido */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Faturamento Válido
              </span>
              <div>
                <DeltaBadge value={kpis.deltas?.revenuePct} />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-primary flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {formatCurrencyBRL(kpis.totalRevenue)}
            </p>
            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-gray-100 dark:border-border/30">
              <span>
                Produtos: <strong>{formatCurrencyBRL(kpis.productRevenue)}</strong>
              </span>
              <span>
                Fretes: <strong>{formatCurrencyBRL(kpis.freightRevenue)}</strong>
              </span>
              {kpis.totalDiscounts > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  Descontos: <strong>-{formatCurrencyBRL(kpis.totalDiscounts)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Volume & Taxa de Conclusão */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Pedidos & Conversão
              </span>
              <div>
                <DeltaBadge value={kpis.deltas?.ordersPct} />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
                {kpis.totalOrdersCount}{" "}
                <span className="text-xs font-sans text-gray-500 font-normal">pedidos</span>
              </p>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {kpis.completedRate}% concluídos
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-border/30">
              <span className="text-emerald-600 font-semibold">{kpis.completedCount} entregues</span>
              <span className="text-amber-600 font-semibold">{kpis.inProgressCount} em curso</span>
              <span className="text-destructive font-semibold">
                {kpis.cancelledCount} cancel. ({kpis.cancelledRate}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Ticket Médio & Itens/Pedido */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Ticket Médio (Produtos)
              </span>
              <div>
                <DeltaBadge value={kpis.deltas?.ticketPct} />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {formatCurrencyBRL(kpis.averageProductTicket)}
            </p>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-border/30">
              <span>Com frete: <strong>{formatCurrencyBRL(kpis.averageTicket)}</strong></span>
              <span>Média: <strong>{kpis.avgItemsPerOrder} itens/ped.</strong></span>
            </div>
          </div>
        </div>

        {/* Card 4: SLA Operacional Real (Cozinha & Rota) */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                SLA Cozinha & Entrega
              </span>
              {kpis.slaWithinTargetRate !== null && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${getSlaBadgeTone(
                    kpis.avgPrepMinutes,
                    kpis.avgLeadTimeMinutes
                  )}`}
                >
                  {kpis.slaWithinTargetRate}% ≤ 40 min
                </span>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {kpis.avgLeadTimeMinutes !== null ? `${kpis.avgLeadTimeMinutes} min` : "—"}
            </p>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-border/30">
              <span>
                Cozinha: <strong>{kpis.avgPrepMinutes !== null ? `${kpis.avgPrepMinutes} min` : "—"}</strong>
              </span>
              <span>
                Rota: <strong>{kpis.avgRouteMinutes !== null ? `${kpis.avgRouteMinutes} min` : "—"}</strong>
              </span>
              <span>Amostra: <strong>{kpis.slaSampleCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 5: Retenção & Recompra */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Retenção & Recompra
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {kpis.repeatCustomerRate.toFixed(1)}%
            </p>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-border/30">
              <span>
                Recorrentes: <strong>{kpis.repeatCustomersCount}/{kpis.uniqueCustomersCount}</strong>
              </span>
              <span>
                Receita fiel: <strong>{kpis.repeatRevenueShare.toFixed(1)}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 6: Upsell de Adicionais & Cupons */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Upsell Adicionais & Cupons
            </span>
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {formatCurrencyBRL(addons.addonRevenue)}
            </p>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-border/30">
              <span>
                Attach Rate: <strong>{addons.attachRatePct.toFixed(1)}%</strong>
              </span>
              <span>
                Cupons: <strong>{kpis.couponOrdersCount} ({kpis.couponAdoptionRate.toFixed(0)}%)</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOCO 2: EVOLUÇÃO TEMPORAL, HORÁRIOS DE PICO & DIAS DA SEMANA ── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Evolução de Faturamento & Volume (Full width) */}
        <div className="xl:col-span-2 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Evolução de Faturamento & Pedidos Válidos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Receita válida (R$) comparada ao volume de pedidos sem cancelamentos
              </p>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Ticket médio do período:{" "}
              <strong className="text-foreground">{formatCurrencyBRL(kpis.averageTicket)}</strong>
            </div>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={salesTimeline} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_COLORS.purple} stopOpacity={0.38} />
                    <stop offset="95%" stopColor={BRAND_COLORS.purple} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento (R$)"
                  stroke={BRAND_COLORS.purple}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevMain)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pedidos"
                  name="Pedidos Válidos"
                  stroke={BRAND_COLORS.emerald}
                  strokeWidth={2.2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Horários de Pico (Hora a Hora) */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Demanda por Horário (Picos)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Volume hora a hora para dimensionamento da cozinha e entregadores
              </p>
            </div>
            {demand.peakHourLabel && (
              <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full shrink-0">
                Pico: {demand.peakHourLabel} ({demand.peakHourOrders} ped.)
              </span>
            )}
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demand.hourly} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Bar dataKey="pedidos" name="Pedidos" radius={[6, 6, 0, 0]}>
                  {demand.hourly.map((entry, idx) => (
                    <Cell
                      key={`hour-cell-${idx}`}
                      fill={entry.isPeak ? BRAND_COLORS.amber : BRAND_COLORS.indigo}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Desempenho por Dia da Semana */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Desempenho por Dia da Semana
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Faturamento acumulado por dia (Dom–Sáb)
              </p>
            </div>
            {demand.bestWeekdayLabel && demand.bestWeekdayRevenue > 0 && (
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0">
                Melhor dia: {demand.bestWeekdayLabel}
              </span>
            )}
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demand.weekdays} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Bar
                  dataKey="faturamento"
                  name="Faturamento (R$)"
                  fill={BRAND_COLORS.cyan}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── BLOCO 3: ENGENHARIA DE CARDÁPIO, CATEGORIAS, ADICIONAIS & CUPONS ── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Ranking de Produtos */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {rankingMode === "top" ? "Top Produtos" : "Menor Giro (Atenção)"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ordenação por {rankingMetric === "revenue" ? "faturamento (R$)" : "volume vendido (un.)"}
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              <div className="flex bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40">
                <button
                  type="button"
                  onClick={() => setRankingMetric("quantity")}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    rankingMetric === "quantity"
                      ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Qtd
                </button>
                <button
                  type="button"
                  onClick={() => setRankingMetric("revenue")}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    rankingMetric === "revenue"
                      ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  R$
                </button>
              </div>

              <div className="flex bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40">
                <button
                  type="button"
                  onClick={() => setRankingMode("top")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rankingMode === "top"
                      ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Top</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRankingMode("bottom")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rankingMode === "bottom"
                      ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                  <span>Baixa</span>
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAllProductsModalOpen(true)}
                className="h-8 px-2.5 text-xs font-bold rounded-xl border-dashed cursor-pointer"
              >
                <ListFilter className="w-3.5 h-3.5 mr-1" />
                Ver Todos
              </Button>
            </div>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRankingData}
                layout="vertical"
                margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={125} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Bar
                  dataKey={rankingMetric === "revenue" ? "revenue" : "quantity"}
                  name={rankingMetric === "revenue" ? "Faturamento (R$)" : "Qtd Vendida"}
                  fill={rankingMode === "top" ? BRAND_COLORS.magenta : BRAND_COLORS.amber}
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mix de Categorias */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Mix de Receita por Categoria
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Participação de cada linha do cardápio no faturamento de produtos
              </p>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {categoryMix.length} cat.
            </span>
          </div>

          {categoryMix.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              Sem vendas registradas no período selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryMix.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Bar
                      dataKey="revenue"
                      name="Receita (R$)"
                      fill={BRAND_COLORS.purple}
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-border/30">
                {categoryMix.slice(0, 6).map((cat) => (
                  <div
                    key={cat.category}
                    className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-border/30 text-[11px]"
                  >
                    <div className="font-semibold text-foreground truncate">{cat.category}</div>
                    <div className="flex items-center justify-between text-muted-foreground font-mono mt-0.5">
                      <span>{cat.sharePct.toFixed(1)}%</span>
                      <span>{cat.quantity} un.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Adicionais Mais Pedidos & Attach Rate */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                Adicionais & Attach Rate (Upsell)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {addons.attachRatePct.toFixed(1)}% dos itens levam adicionais ({addons.paidAttachRatePct.toFixed(1)}% pagos)
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-pink-600 dark:text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full">
              {formatCurrencyBRL(addons.addonRevenue)}
            </span>
          </div>

          {addons.topAddons.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
              Nenhum adicional registrado nos itens deste período.
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={addons.topAddons.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar
                    dataKey="quantity"
                    name="Qtd Adicionais"
                    fill={BRAND_COLORS.indigo}
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Performance de Cupons & Descontos */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Impacto de Cupons & Descontos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Comparação de ticket médio e desempenho por código promocional
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
              -{formatCurrencyBRL(coupons.totalDiscount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-[11px] text-muted-foreground block">Ticket c/ Cupom</span>
              <span className="text-lg font-black font-mono text-primary">
                {formatCurrencyBRL(coupons.avgTicketWithCoupon)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {coupons.couponOrdersCount} pedido(s)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-border/40">
              <span className="text-[11px] text-muted-foreground block">Ticket s/ Cupom</span>
              <span className="text-lg font-black font-mono text-foreground">
                {formatCurrencyBRL(coupons.avgTicketWithoutCoupon)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Base sem desconto
              </span>
            </div>
          </div>

          {coupons.topCoupons.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
              Nenhum cupom aplicado em pedidos válidos neste período.
            </div>
          ) : (
            <div className="space-y-2">
              {coupons.topCoupons.map((cp) => (
                <div
                  key={cp.code}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-border/30 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-foreground">{cp.code}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      {cp.uses} uso(s)
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                      {formatCurrencyBRL(cp.generatedRevenue)}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      desc. -{formatCurrencyBRL(cp.totalDiscount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── BLOCO 4: FINANCEIRO, LOGÍSTICA & QUALIDADE OPERACIONAL ── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Conciliação de Meios de Pagamento */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Conciliação por Meio de Pagamento
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Pedidos válidos (cancelados excluídos) por {paymentMetric === "revenue" ? "receita" : "volume"}
              </p>
            </div>
            <div className="flex bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40 self-start">
              <button
                type="button"
                onClick={() => setPaymentMetric("revenue")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  paymentMetric === "revenue"
                    ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Receita (R$)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMetric("count")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  paymentMetric === "count"
                    ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Pedidos (un.)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="w-full h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payments}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey={paymentMetric === "revenue" ? "revenue" : "value"}
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {payments.map((entry, index) => (
                      <Cell
                        key={`pay-cell-${index}`}
                        fill={entry.color}
                        stroke="hsl(var(--card))"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<AnalyticsTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-border/30 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <div>
                      <div className="font-bold text-foreground">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.value} ped. ({p.shareCountPct.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-foreground">{formatCurrencyBRL(p.revenue)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.shareRevenuePct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logística & Ticket Médio Limpo (Delivery vs Balcão) */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                Delivery vs Balcão (Consumo Limpo)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ticket consumido em produtos sem distorção do frete e sem cancelados
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full shrink-0">
              {logistics.diffPercent >= 0
                ? `+${logistics.diffPercent.toFixed(1)}% no Delivery`
                : `${logistics.diffPercent.toFixed(1)}% no Delivery`}
            </span>
          </div>

          <div className="space-y-4 my-auto py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    <Bike className="w-3.5 h-3.5" /> Delivery
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-600">
                    {logistics.deliveryShare.toFixed(0)}% pedidos
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyBRL(logistics.avgDeliveryProduct)}
                </p>
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-emerald-500/10">
                  <div>{logistics.deliveryCount} pedido(s)</div>
                  <div>Frete médio: {formatCurrencyBRL(logistics.avgFreight)}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 font-bold">
                    <Store className="w-3.5 h-3.5" /> Balcão
                  </span>
                  <span className="text-[10px] font-mono bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-600">
                    {logistics.pickupShare.toFixed(0)}% pedidos
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrencyBRL(logistics.avgPickupProduct)}
                </p>
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-blue-500/10">
                  <div>{logistics.pickupCount} pedido(s)</div>
                  <div>Sem taxa de frete</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Proporção de Consumo (Produtos)</span>
                <span className="font-mono font-bold">
                  {formatCurrencyBRL(logistics.deliveryProductsSubtotal + logistics.pickupProductsSubtotal)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      (logistics.deliveryProductsSubtotal /
                        Math.max(1, logistics.deliveryProductsSubtotal + logistics.pickupProductsSubtotal)) *
                        100,
                      5
                    )}%`,
                  }}
                  title="Delivery"
                />
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      (logistics.pickupProductsSubtotal /
                        Math.max(1, logistics.deliveryProductsSubtotal + logistics.pickupProductsSubtotal)) *
                        100,
                      5
                    )}%`,
                  }}
                  title="Balcão"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Bairros & Performance de Entregadores */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Top Bairros & Entregadores
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Demanda geográfica válida e produtividade da equipe de entrega
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              {formatCurrencyBRL(neighborhoods.totalTaxas)} em fretes
            </span>
          </div>

          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={neighborhoods.data}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Bar dataKey="pedidos" name="Entregas" fill="#10B981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela compacta de Entregadores */}
          <div className="pt-2 border-t border-gray-100 dark:border-border/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-primary" />
              Desempenho por Entregador
            </h4>
            {couriers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma corrida despachada com entregador atribuído no período.
              </p>
            ) : (
              <div className="space-y-1.5">
                {couriers.slice(0, 4).map((c) => (
                  <div
                    key={c.courierName}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-border/30"
                  >
                    <span className="font-semibold text-foreground">{c.courierName}</span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span>{c.deliveries} corr.</span>
                      <span className="text-muted-foreground">
                        {c.avgRouteMinutes !== null ? `${c.avgRouteMinutes} min` : "—"}
                      </span>
                      {c.issuesCount > 0 && (
                        <span className="text-amber-600 font-bold">{c.issuesCount} ocorr.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Qualidade Operacional: Cancelamentos, Motivos & Ocorrências */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Qualidade Operacional & Cancelamentos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Funil de conclusão, motivos de cancelamento e ocorrências de rota
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              {audit.conversionRate.toFixed(1)}% Sucesso
            </span>
          </div>

          <div className="w-full h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={audit.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {audit.chartData.map((entry, index) => (
                    <Cell
                      key={`audit-cell-${index}`}
                      fill={entry.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={3}
                    />
                  ))}
                </Pie>
                <Tooltip content={<AnalyticsTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {audit.lostRevenue > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Perda por Cancelamento:
                </span>
                <span className="font-bold font-mono">
                  {formatCurrencyBRL(audit.lostRevenue)} ({audit.cancelledCount} ped.)
                </span>
              </div>
              {audit.reasons.slice(0, 3).map((r) => (
                <div
                  key={r.reason}
                  className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5"
                >
                  <span className="text-foreground truncate pr-2">{r.reason}</span>
                  <span className="font-mono text-muted-foreground shrink-0">
                    {r.count}x ({formatCurrencyBRL(r.lostRevenue)})
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Zero perda por cancelamento no período
              </span>
              <span className="font-mono font-bold">100% Retenção</span>
            </div>
          )}

          {audit.totalIssuesCount > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-border/30 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Ocorrências de Entrega ({audit.issueRatePct.toFixed(1)}%)
                </span>
                <span>{audit.totalIssuesCount} registro(s)</span>
              </div>
              {audit.issues.slice(0, 3).map((iss) => (
                <div
                  key={iss.issue}
                  className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/5"
                >
                  <span className="truncate pr-2 text-foreground">{iss.issue}</span>
                  <span className="font-mono font-bold">{iss.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AllProductsTurnoverModal
        isOpen={isAllProductsModalOpen}
        onClose={() => setIsAllProductsModalOpen(false)}
        productStats={productStats}
      />
    </div>
  );
}
