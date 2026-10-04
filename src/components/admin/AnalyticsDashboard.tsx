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
  Search,
  X,
  Flame,
  Snowflake,
  ListFilter,
  Package,
  Activity,
  History,
  Radio,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { Order } from "../../services/orderService";
import { productService, Product } from "../../services/productService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface AnalyticsDashboardProps {
  orders: Order[];
  loading?: boolean;
  currentShiftId?: string | null;
}

type PeriodFilter = "hoje" | "7dias" | "mes" | "ano" | "tudo";
type ScopeFilter = "active_shift" | "all_history";
type RankingMode = "top" | "bottom";

const BRAND_COLORS = {
  purple: "hsl(var(--primary))",
  magenta: "hsl(var(--accent))",
  emerald: "#10B981",
  amber: "#F59E0B",
  blue: "#3B82F6",
  indigo: "#8B5CF6",
  pix: "#00BDAE",
  card: "#7C3AED",
  cash: "#F59E0B",
  delivery: "#10B981",
  pickup: "#3B82F6",
  cancelled: "#EF4444",
};

const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-background/95 border border-gray-200 dark:border-border/70 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans space-y-1">
        <p className="font-bold text-foreground border-b border-gray-100 dark:border-border/40 pb-1">
          {label}
        </p>
        {payload.map((entry: TooltipEntry, index: number) => {
          const entryName = entry.name || "";
          const entryValue = entry.value ?? "";
          return (
            <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium text-gray-700 dark:text-gray-300">{entryName}:</span>
              <span className="font-bold font-mono">
                {entryName.toLowerCase().includes("faturamento") || entryName.toLowerCase().includes("receita")
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(entryValue) || 0)
                  : entryName.toLowerCase().includes("pedidos") || entryName.toLowerCase().includes("qtd") || entryName.toLowerCase().includes("entregas")
                  ? `${entryValue} un.`
                  : entryValue}
              </span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
}

export function AnalyticsDashboard({ orders, loading = false, currentShiftId = null }: AnalyticsDashboardProps) {
  // Filtros principais: Escopo (Turno Ativo vs Histórico Geral) e Período Temporal
  const [scope, setScope] = useState<ScopeFilter>("all_history");
  const [period, setPeriod] = useState<PeriodFilter>("tudo");

  // Visualização do ranking de produtos
  const [rankingMode, setRankingMode] = useState<RankingMode>("top");
  const [isAllProductsModalOpen, setIsAllProductsModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilterType, setProductFilterType] = useState<"all" | "with_sales" | "no_sales">("all");

  // Catálogo completo de produtos carregado da API
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  useEffect(() => {
    productService
      .getProducts()
      .then((prods) => setCatalogProducts(prods))
      .catch((err) => console.error("Erro ao carregar cardápio no Analytics:", err));
  }, []);

  // 1. Filtragem por Escopo (Turno Ativo vs Histórico Acumulado)
  const scopedOrders = useMemo(() => {
    if (scope === "active_shift") {
      return orders.filter(
        (o) => !o.is_archived || (currentShiftId && o.shift_id === currentShiftId)
      );
    }
    return orders;
  }, [orders, scope, currentShiftId]);

  // 2. Filtragem Temporal sobre os pedidos do escopo selecionado
  const filteredOrders = useMemo(() => {
    if (scope === "active_shift") {
      // O turno ativo representa o período operacional em andamento
      return scopedOrders;
    }

    const now = new Date();
    return scopedOrders.filter((order) => {
      const orderDate = new Date(order.created_at);

      if (period === "hoje") {
        return orderDate.toDateString() === now.toDateString();
      }

      if (period === "7dias") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return orderDate >= sevenDaysAgo;
      }

      if (period === "mes") {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === "ano") {
        return orderDate.getFullYear() === now.getFullYear();
      }

      if (period === "tudo") {
        return true;
      }

      return true;
    });
  }, [scopedOrders, scope, period]);

  // Cálculos de KPIs Consolidados
  const kpis = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.status !== "cancelled");
    const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelled");
    const completedOrders = filteredOrders.filter((o) => o.status === "completed");

    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const productRevenue = validOrders.reduce((sum, o) => {
      const prodSubtotal = o.subtotal !== undefined
        ? Number(o.subtotal)
        : Number(o.total_amount) - (Number(o.delivery_fee) || 0);
      return sum + prodSubtotal;
    }, 0);
    const freightRevenue = validOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);

    const totalOrdersCount = filteredOrders.length;
    const completedCount = completedOrders.length;
    const cancelledCount = cancelledOrders.length;

    const completedRate = totalOrdersCount > 0
      ? Math.round((completedCount / totalOrdersCount) * 100)
      : 0;

    const cancelledRate = totalOrdersCount > 0
      ? Math.round((cancelledCount / totalOrdersCount) * 100)
      : 0;

    const averageTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;
    const averageProductTicket = validOrders.length > 0 ? productRevenue / validOrders.length : 0;

    return {
      totalRevenue,
      productRevenue,
      freightRevenue,
      totalOrdersCount,
      completedCount,
      cancelledCount,
      completedRate,
      cancelledRate,
      averageTicket,
      averageProductTicket,
      averageTimeMinutes: 24,
    };
  }, [filteredOrders]);

  // Gráfico 1: Linha do Tempo de Faturamento & Pedidos
  const salesTimelineData = useMemo(() => {
    const now = new Date();

    if (period === "hoje" || scope === "active_shift") {
      const hoursMap: Record<string, { faturamento: number; pedidos: number }> = {};
      const hourSlots = ["10h", "12h", "14h", "16h", "18h", "20h", "22h"];
      hourSlots.forEach((slot) => {
        hoursMap[slot] = { faturamento: 0, pedidos: 0 };
      });

      filteredOrders.forEach((o) => {
        const hour = new Date(o.created_at).getHours();
        let slot = "22h";
        if (hour < 12) slot = "10h";
        else if (hour < 14) slot = "12h";
        else if (hour < 16) slot = "14h";
        else if (hour < 18) slot = "16h";
        else if (hour < 20) slot = "18h";
        else if (hour < 22) slot = "20h";

        if (o.status !== "cancelled") {
          hoursMap[slot].faturamento += Number(o.total_amount);
        }
        hoursMap[slot].pedidos += 1;
      });

      return hourSlots.map((slot) => ({
        label: slot,
        faturamento: Number(hoursMap[slot].faturamento.toFixed(2)),
        pedidos: hoursMap[slot].pedidos,
      }));
    }

    if (period === "7dias") {
      const daysList: { sortKey: string; label: string; faturamento: number; pedidos: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        daysList.push({ sortKey, label, faturamento: 0, pedidos: 0 });
      }

      filteredOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const item = daysList.find((entry) => entry.sortKey === sortKey);
        if (item) {
          if (o.status !== "cancelled") {
            item.faturamento += Number(o.total_amount);
          }
          item.pedidos += 1;
        }
      });

      return daysList.map((entry) => ({
        label: entry.label,
        faturamento: Number(entry.faturamento.toFixed(2)),
        pedidos: entry.pedidos,
      }));
    }

    if (period === "mes") {
      const daysMap: Record<string, { sortKey: string; label: string; faturamento: number; pedidos: number }> = {};

      filteredOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!daysMap[sortKey]) {
          daysMap[sortKey] = { sortKey, label, faturamento: 0, pedidos: 0 };
        }
        if (o.status !== "cancelled") {
          daysMap[sortKey].faturamento += Number(o.total_amount);
        }
        daysMap[sortKey].pedidos += 1;
      });

      const sortedKeys = Object.keys(daysMap).sort();
      if (sortedKeys.length === 0) {
        return [{ label: "Sem dados", faturamento: 0, pedidos: 0 }];
      }

      return sortedKeys.map((k) => ({
        label: daysMap[k].label,
        faturamento: Number(daysMap[k].faturamento.toFixed(2)),
        pedidos: daysMap[k].pedidos,
      }));
    }

    if (period === "ano") {
      const monthsList = MONTH_NAMES.map((name) => ({
        label: name,
        faturamento: 0,
        pedidos: 0,
      }));

      filteredOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const monthIndex = d.getMonth();
        if (monthsList[monthIndex]) {
          if (o.status !== "cancelled") {
            monthsList[monthIndex].faturamento += Number(o.total_amount);
          }
          monthsList[monthIndex].pedidos += 1;
        }
      });

      return monthsList.map((entry) => ({
        label: entry.label,
        faturamento: Number(entry.faturamento.toFixed(2)),
        pedidos: entry.pedidos,
      }));
    }

    // "tudo" - Histórico acumulado por mês/ano
    const monthsMap: Record<string, { sortKey: string; label: string; faturamento: number; pedidos: number }> = {};

    filteredOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
      if (!monthsMap[sortKey]) {
        monthsMap[sortKey] = { sortKey, label, faturamento: 0, pedidos: 0 };
      }
      if (o.status !== "cancelled") {
        monthsMap[sortKey].faturamento += Number(o.total_amount);
      }
      monthsMap[sortKey].pedidos += 1;
    });

    const sortedKeys = Object.keys(monthsMap).sort();
    if (sortedKeys.length === 0) {
      return [{ label: "Sem dados", faturamento: 0, pedidos: 0 }];
    }

    return sortedKeys.map((k) => ({
      label: monthsMap[k].label,
      faturamento: Number(monthsMap[k].faturamento.toFixed(2)),
      pedidos: monthsMap[k].pedidos,
    }));
  }, [filteredOrders, period, scope]);

  // ── 2. RANKING DE PRODUTOS COMPLETO & SEM DUPLICIDADES ──
  const allProductStats = useMemo(() => {
    // Mapa chaveado por ID único do produto
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        price: number;
        imageUrl?: string;
        category?: string;
        quantity: number;
        revenue: number;
        ordersCount: number;
      }
    >();

    // Pré-popula todos os produtos ativos do cardápio para garantir que produtos com 0 vendas apareçam
    catalogProducts.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        imageUrl: p.imageUrl,
        category: p.category,
        quantity: 0,
        revenue: 0,
        ordersCount: 0,
      });
    });

    // Agrega estritamente por ID único do produto a partir dos itens de pedidos
    filteredOrders.forEach((o) => {
      if (o.status === "cancelled") return;
      o.items?.forEach((it) => {
        const targetId = it.product_id || it.product?.id;
        const targetName = it.product?.name || "Açaí Pop Shake";

        let entry = targetId ? map.get(targetId) : null;
        if (!entry) {
          // Busca secundária por nome para legados ou combos
          entry = Array.from(map.values()).find((item) => item.name === targetName);
        }

        if (!entry) {
          entry = {
            id: targetId || targetName,
            name: targetName,
            price: Number(it.price_at_time) || 0,
            imageUrl: it.product?.imageUrl,
            quantity: 0,
            revenue: 0,
            ordersCount: 0,
          };
          map.set(entry.id, entry);
        }

        entry.quantity += it.quantity;
        entry.revenue += Number(it.price_at_time) * it.quantity;
        entry.ordersCount += 1;
      });
    });

    return Array.from(map.values());
  }, [catalogProducts, filteredOrders]);

  // Top 5 Mais Vendidos (Ordenação Decrescente)
  const topProductsData = useMemo(() => {
    const sorted = [...allProductStats].sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      return b.revenue - a.revenue;
    });

    const activeWithSales = sorted.filter((p) => p.quantity > 0);
    return (activeWithSales.length > 0 ? activeWithSales : sorted).slice(0, 5);
  }, [allProductStats]);

  // Top 5 Menos Vendidos (Ordenação Crescente - Giro Crítico / Sem Vendas)
  const bottomProductsData = useMemo(() => {
    const sorted = [...allProductStats].sort((a, b) => {
      if (a.quantity !== b.quantity) return a.quantity - b.quantity;
      return a.revenue - b.revenue;
    });

    return sorted.slice(0, 5);
  }, [allProductStats]);

  // Lista para o gráfico ativo (Mais vs Menos Vendidos)
  const chartRankingData = rankingMode === "top" ? topProductsData : bottomProductsData;

  // Lista filtrada para o modal de visualização completa do cardápio
  const modalFilteredProducts = useMemo(() => {
    return allProductStats
      .filter((p) => {
        if (productFilterType === "with_sales") return p.quantity > 0;
        if (productFilterType === "no_sales") return p.quantity === 0;
        return true;
      })
      .filter((p) => {
        if (!productSearch.trim()) return true;
        const q = productSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.quantity - a.quantity);
  }, [allProductStats, productFilterType, productSearch]);

  // Gráfico 3: Distribuição de Pagamentos
  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = { Pix: 0, Cartão: 0, Dinheiro: 0 };

    filteredOrders.forEach((o) => {
      const type = (o.payment_method_type || "").toLowerCase();
      if (type.includes("pix")) counts.Pix += 1;
      else if (type.includes("cartao") || type.includes("card") || type.includes("crédito") || type.includes("debito") || type.includes("débito")) counts.Cartão += 1;
      else if (type.includes("dinheiro") || type.includes("cash")) counts.Dinheiro += 1;
      else counts.Pix += 1;
    });

    return [
      { name: "Pix", value: counts.Pix, color: "#00BDAE" },
      { name: "Cartão", value: counts.Cartão, color: "#7C3AED" },
      { name: "Dinheiro", value: counts.Dinheiro, color: "#F59E0B" },
    ].filter((item) => item.value > 0);
  }, [filteredOrders]);

  // Gráfico 4: Logística e Ticket Médio Limpo de Produtos (Delivery vs Balcão)
  const logisticsTicketData = useMemo(() => {
    let deliveryCount = 0;
    let deliveryProductsSubtotal = 0;
    let deliveryGrandTotal = 0;
    let deliveryFreightTotal = 0;

    let pickupCount = 0;
    let pickupProductsSubtotal = 0;

    filteredOrders.forEach((o) => {
      const isPickup =
        !o.delivery_address?.street ||
        o.delivery_address?.street.toLowerCase().includes("retirada");

      const fee = Number(o.delivery_fee) || 0;
      const total = Number(o.total_amount) || 0;
      const productSubtotal = o.subtotal !== undefined
        ? Number(o.subtotal)
        : Math.max(0, total - fee);

      if (isPickup) {
        pickupCount += 1;
        pickupProductsSubtotal += productSubtotal;
      } else {
        deliveryCount += 1;
        deliveryProductsSubtotal += productSubtotal;
        deliveryGrandTotal += total;
        deliveryFreightTotal += fee;
      }
    });

    // Consumo Médio Real em PRODUTOS (livre de taxa de frete)
    const avgDeliveryProduct = deliveryCount > 0 ? deliveryProductsSubtotal / deliveryCount : 0;
    const avgPickupProduct = pickupCount > 0 ? pickupProductsSubtotal / pickupCount : 0;
    const avgDeliveryGrand = deliveryCount > 0 ? deliveryGrandTotal / deliveryCount : 0;
    const avgFreight = deliveryCount > 0 ? deliveryFreightTotal / deliveryCount : 0;

    const diffPercent =
      avgPickupProduct > 0 ? ((avgDeliveryProduct - avgPickupProduct) / avgPickupProduct) * 100 : 0;

    const totalOrders = deliveryCount + pickupCount;
    const deliveryShare = totalOrders > 0 ? (deliveryCount / totalOrders) * 100 : 0;
    const pickupShare = totalOrders > 0 ? (pickupCount / totalOrders) * 100 : 0;

    return {
      deliveryCount,
      pickupCount,
      totalOrders,
      deliveryShare,
      pickupShare,
      avgDeliveryProduct,
      avgPickupProduct,
      avgDeliveryGrand,
      avgFreight,
      deliveryProductsSubtotal,
      pickupProductsSubtotal,
      diffPercent,
    };
  }, [filteredOrders]);

  // Gráfico 5: Top Bairros com Mais Entregas
  const topNeighborhoodsData = useMemo(() => {
    const neighborhoodMap: Record<string, { pedidos: number; receitaTaxa: number }> = {};

    filteredOrders.forEach((o) => {
      const isPickup =
        !o.delivery_address?.street ||
        o.delivery_address?.street.toLowerCase().includes("retirada");

      if (!isPickup) {
        const rawNeighborhood = o.delivery_address?.neighborhood?.trim();
        const neighborhood = rawNeighborhood && rawNeighborhood.length > 0 ? rawNeighborhood : "Centro";
        if (!neighborhoodMap[neighborhood]) {
          neighborhoodMap[neighborhood] = { pedidos: 0, receitaTaxa: 0 };
        }
        neighborhoodMap[neighborhood].pedidos += 1;
        neighborhoodMap[neighborhood].receitaTaxa += Number(o.delivery_fee) || 0;
      }
    });

    const list = Object.entries(neighborhoodMap).map(([name, data]) => ({
      name,
      pedidos: data.pedidos,
      receitaTaxa: Number(data.receitaTaxa.toFixed(2)),
    }));

    list.sort((a, b) => b.pedidos - a.pedidos);
    const totalDeliveryFee = list.reduce((acc, curr) => acc + curr.receitaTaxa, 0);

    return {
      data: list.slice(0, 5),
      totalTaxas: totalDeliveryFee,
    };
  }, [filteredOrders]);

  // Gráfico 6: Funil Operacional & Cancelamentos
  const conversionFunnelData = useMemo(() => {
    let delivered = 0;
    let cancelled = 0;
    let lostRevenue = 0;
    let otherCount = 0;

    filteredOrders.forEach((o) => {
      const st = (o.status || "").toLowerCase();
      if (st === "completed" || st === "delivered") {
        delivered += 1;
      } else if (st === "cancelled" || st === "cancelado") {
        cancelled += 1;
        lostRevenue += Number(o.total_amount) || 0;
      } else {
        otherCount += 1;
      }
    });

    const total = delivered + cancelled + otherCount;
    const conversionRate = total > 0 ? (delivered / total) * 100 : 100;

    const chartData = [
      { name: "Pedidos Entregues", value: delivered, color: "#10B981" },
      { name: "Cancelados", value: cancelled, color: "#EF4444" },
      { name: "Em Andamento / Outros", value: otherCount, color: "#F59E0B" },
    ].filter((item) => item.value > 0);

    return {
      conversionRate,
      lostRevenue,
      chartData,
      deliveredCount: delivered,
      cancelledCount: cancelled,
      totalOrders: total,
    };
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-gray-200 dark:bg-white/10 rounded-2xl w-full" />
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── BARRA SUPERIOR DE ESCOPO E PERÍODO DE ANÁLISE ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 p-4 rounded-2xl shadow-sm">
        {/* Alternador de Escopo: Turno Ativo vs Histórico Geral */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40">
            <button
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
                {scopedOrders.length} pedido(s) no turno corrente
              </span>
            ) : (
              <span>Base consolidada: <strong>{scopedOrders.length}</strong> pedidos totais</span>
            )}
          </span>
        </div>

        {/* Filtros Temporais (Ativos principalmente no Histórico Acumulado) */}
        <div className="flex items-center flex-wrap gap-1 bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40">
          <button
            onClick={() => setPeriod("hoje")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              period === "hoje"
                ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm font-black"
                : "text-gray-600 dark:text-gray-400 hover:text-foreground"
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriod("7dias")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              period === "7dias"
                ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm font-black"
                : "text-gray-600 dark:text-gray-400 hover:text-foreground"
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setPeriod("mes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              period === "mes"
                ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm font-black"
                : "text-gray-600 dark:text-gray-400 hover:text-foreground"
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriod("ano")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              period === "ano"
                ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm font-black"
                : "text-gray-600 dark:text-gray-400 hover:text-foreground"
            }`}
          >
            Este Ano
          </button>
          <button
            onClick={() => setPeriod("tudo")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              period === "tudo"
                ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm font-black"
                : "text-gray-600 dark:text-gray-400 hover:text-foreground"
            }`}
          >
            Todo o Período
          </button>
        </div>
      </div>

      {/* ── 1. CARDS DE KPIS CONSOLIDADOS ── */}
      <section className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Faturamento Bruto Total */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Faturamento Bruto
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.totalRevenue)}
            </p>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-gray-100 dark:border-border/30">
              <span>Produtos: <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.productRevenue)}</strong></span>
              <span>Fretes: <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.freightRevenue)}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Volume de Pedidos */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Volume de Pedidos
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {kpis.totalOrdersCount}{" "}
              <span className="text-xs font-sans text-gray-500 font-normal">pedidos</span>
            </p>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-gray-100 dark:border-border/30">
              <span className="text-emerald-600 font-semibold">{kpis.completedCount} entregues</span>
              <span className="text-destructive font-semibold">{kpis.cancelledCount} cancelados</span>
            </div>
          </div>
        </div>

        {/* Card 3: Ticket Médio em Produtos */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Ticket Médio (Produtos)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.averageProductTicket)}
            </p>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-gray-100 dark:border-border/30">
              Com frete: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.averageTicket)}
            </p>
          </div>
        </div>

        {/* Card 4: Taxa de Sucesso Operacional */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Taxa de Conclusão
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {kpis.completedRate}%
            </p>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-gray-100 dark:border-border/30">
              Cancelamento: {kpis.cancelledRate}%
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. SEÇÃO DE GRÁFICOS PRINCIPAIS ── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gráfico 1: Picos de Venda e Evolução */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Evolução de Vendas no Período
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Faturamento e quantidade de pedidos no intervalo selecionado
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              Volume
            </span>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTimelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_COLORS.purple} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={BRAND_COLORS.purple} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento"
                  stroke={BRAND_COLORS.purple}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Ranking de Produtos (Mais vs Menos Vendidos + Ver Todos) */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {rankingMode === "top" ? "Top Mais Vendidos" : "Menos Vendidos (Atenção)"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {rankingMode === "top"
                  ? "Itens com maior volume de saída"
                  : "Itens com menor giro ou sem saída no período"}
              </p>
            </div>

            {/* Alternador de Modo e Botão Ver Todos */}
            <div className="flex items-center gap-1.5">
              <div className="flex bg-gray-100 dark:bg-background p-1 rounded-xl border border-gray-200 dark:border-border/40">
                <button
                  type="button"
                  onClick={() => setRankingMode("top")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rankingMode === "top"
                      ? "bg-white dark:bg-[#2B102E] text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Ver mais vendidos"
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
                  title="Ver menos vendidos"
                >
                  <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                  <span>Baixa</span>
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAllProductsModalOpen(true)}
                className="h-8 px-2.5 text-xs font-bold rounded-xl border-dashed"
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
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="quantity"
                  name="Qtd Vendida"
                  fill={rankingMode === "top" ? BRAND_COLORS.magenta : "#F59E0B"}
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Distribuição de Pagamentos */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Distribuição de Pagamentos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Preferência dos clientes entre PIX, Cartão e Dinheiro
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 rounded-full">
              Semântico
            </span>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={3}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Logística & Ticket Médio Limpo (Delivery vs Balcão) */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                Delivery vs Balcão (Consumo Limpo de Produtos)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Comparação real do ticket consumido em produtos sem a distorção do frete
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              {logisticsTicketData.diffPercent >= 0
                ? `+${logisticsTicketData.diffPercent.toFixed(1)}% no Delivery`
                : `${logisticsTicketData.diffPercent.toFixed(1)}% no Delivery`}
            </span>
          </div>

          <div className="space-y-4 my-auto py-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Delivery */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    <Bike className="w-3.5 h-3.5" /> Delivery
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-600">
                    {logisticsTicketData.deliveryShare.toFixed(0)}% pedidos
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    logisticsTicketData.avgDeliveryProduct
                  )}
                </p>
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-emerald-500/10">
                  <div>{logisticsTicketData.deliveryCount} pedido(s)</div>
                  <div>Frete médio: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(logisticsTicketData.avgFreight)}</div>
                </div>
              </div>

              {/* Balcão */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 font-bold">
                    <Store className="w-3.5 h-3.5" /> Balcão
                  </span>
                  <span className="text-[10px] font-mono bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-600">
                    {logisticsTicketData.pickupShare.toFixed(0)}% pedidos
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    logisticsTicketData.avgPickupProduct
                  )}
                </p>
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-blue-500/10">
                  <div>{logisticsTicketData.pickupCount} pedido(s)</div>
                  <div>Sem taxa de frete</div>
                </div>
              </div>
            </div>

            {/* Barras Comparativas de Consumo em Produtos */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Proporção de Consumo (Produtos)</span>
                <span className="font-mono font-bold">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    logisticsTicketData.deliveryProductsSubtotal + logisticsTicketData.pickupProductsSubtotal
                  )}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      (logisticsTicketData.deliveryProductsSubtotal /
                        Math.max(
                          1,
                          logisticsTicketData.deliveryProductsSubtotal + logisticsTicketData.pickupProductsSubtotal
                        )) *
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
                      (logisticsTicketData.pickupProductsSubtotal /
                        Math.max(
                          1,
                          logisticsTicketData.deliveryProductsSubtotal + logisticsTicketData.pickupProductsSubtotal
                        )) *
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

        {/* Gráfico 5: Top Bairros com Mais Entregas */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Top Bairros com Mais Entregas
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Regiões com maior volume de pedidos e receita de frete
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                topNeighborhoodsData.totalTaxas
              )}{" "}
              em fretes
            </span>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topNeighborhoodsData.data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="pedidos"
                  name="Entregas"
                  fill="#10B981"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 6: Funil Operacional & Eficiência */}
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-border/30">
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Funil & Conversão Operacional
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Proporção entre entregas concluídas e pedidos cancelados
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              {conversionFunnelData.conversionRate.toFixed(1)}% Sucesso
            </span>
          </div>

          <div className="w-full h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conversionFunnelData.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {conversionFunnelData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {conversionFunnelData.lostRevenue > 0 ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive mt-2">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Perda por Cancelamento:
              </span>
              <span className="font-bold font-mono">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  conversionFunnelData.lostRevenue
                )}{" "}
                ({conversionFunnelData.cancelledCount} ped.)
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Zero perda por cancelamento no período
              </span>
              <span className="font-mono font-bold">100% Retenção</span>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. MODAL COMPLETO DE GIRO DE PRODUTOS DO CARDÁPIO ── */}
      {isAllProductsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl p-6 flex flex-col overflow-hidden text-card-foreground">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Giro Completo de Produtos do Cardápio
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Desempenho de vendas de todos os itens cadastrados no período selecionado
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAllProductsModalOpen(false)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border/30">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar produto por nome ou categoria..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-9 pl-9 text-xs rounded-xl bg-background"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setProductFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    productFilterType === "all"
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos ({allProductStats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilterType("with_sales")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    productFilterType === "with_sales"
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Com Vendas ({allProductStats.filter((p) => p.quantity > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilterType("no_sales")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    productFilterType === "no_sales"
                      ? "bg-destructive text-white font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sem Vendas ({allProductStats.filter((p) => p.quantity === 0).length})
                </button>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="flex-1 overflow-auto w-full min-w-0 overscroll-contain-x my-2">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-md text-muted-foreground border-b border-border/50 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3 text-right">Preço</th>
                    <th className="py-2.5 px-3 text-center">Qtd Vendida</th>
                    <th className="py-2.5 px-3 text-right">Faturamento</th>
                    <th className="py-2.5 px-3 text-center">Giro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium">
                  {modalFilteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum produto corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    modalFilteredProducts.map((p, idx) => {
                      const isHighGiro = p.quantity >= 5;
                      const isMediumGiro = p.quantity > 0 && p.quantity < 5;

                      return (
                        <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-muted-foreground">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground">{p.name}</div>
                            {p.category && (
                              <div className="text-[10px] text-muted-foreground">{p.category}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            {p.quantity}{" "}
                            <span className="text-[10px] font-normal text-muted-foreground">un.</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.revenue)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isHighGiro ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                <Flame className="w-3 h-3" /> Alto Giro
                              </span>
                            ) : isMediumGiro ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                <Activity className="w-3 h-3" /> Médio Giro
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-muted-foreground">
                                <Snowflake className="w-3 h-3" /> Sem Saída
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé do Modal */}
            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Exibindo <strong>{modalFilteredProducts.length}</strong> de{" "}
                <strong>{allProductStats.length}</strong> produtos
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAllProductsModalOpen(false)}
                className="h-8 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
