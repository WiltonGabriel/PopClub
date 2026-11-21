import type { Order } from "@/services/orderService";
import type { Product } from "@/services/productService";

export type PeriodFilter = "hoje" | "7dias" | "mes" | "ano" | "tudo";
export type ScopeFilter = "active_shift" | "all_history";

export interface PeriodDeltas {
  revenuePct: number | null;
  ordersPct: number | null;
  ticketPct: number | null;
}

export interface AnalyticsKpis {
  totalRevenue: number;
  productRevenue: number;
  freightRevenue: number;
  totalDiscounts: number;
  netProductRevenue: number;
  totalOrdersCount: number;
  validOrdersCount: number;
  completedCount: number;
  inProgressCount: number;
  cancelledCount: number;
  completedRate: number;
  cancelledRate: number;
  averageTicket: number;
  averageProductTicket: number;
  avgItemsPerOrder: number;
  couponOrdersCount: number;
  couponAdoptionRate: number;
  avgPrepMinutes: number | null;
  avgRouteMinutes: number | null;
  avgLeadTimeMinutes: number | null;
  slaSampleCount: number;
  slaWithinTargetRate: number | null;
  uniqueCustomersCount: number;
  repeatCustomersCount: number;
  repeatCustomerRate: number;
  repeatRevenueShare: number;
  deltas: PeriodDeltas | null;
}

export interface SalesTimelinePoint {
  label: string;
  faturamento: number;
  receitaProdutos: number;
  pedidos: number;
  cancelados: number;
  ticketMedio: number;
}

export interface HourlyDemandPoint {
  hour: number;
  label: string;
  pedidos: number;
  faturamento: number;
  avgPrepMinutes: number | null;
  isPeak: boolean;
}

export interface WeekdayDemandPoint {
  dayIndex: number;
  label: string;
  pedidos: number;
  faturamento: number;
  ticketMedio: number;
}

export interface PeakDemandSummary {
  hourly: HourlyDemandPoint[];
  weekdays: WeekdayDemandPoint[];
  peakHourLabel: string | null;
  peakHourOrders: number;
  bestWeekdayLabel: string | null;
  bestWeekdayRevenue: number;
}

export interface CategoryMixEntry {
  category: string;
  quantity: number;
  revenue: number;
  sharePct: number;
}

export interface TopAddonEntry {
  name: string;
  groupName: string;
  quantity: number;
  revenue: number;
}

export interface AddonAnalyticsSummary {
  totalItemsCount: number;
  itemsWithAddonsCount: number;
  itemsWithPaidAddonsCount: number;
  attachRatePct: number;
  paidAttachRatePct: number;
  addonRevenue: number;
  topAddons: TopAddonEntry[];
}

export interface ProductStatEntry {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  quantity: number;
  revenue: number;
  ordersCount: number;
  revenueSharePct: number;
}

export interface PaymentBreakdownEntry {
  name: "Pix" | "Cartão" | "Dinheiro" | "Outros";
  value: number;
  revenue: number;
  shareCountPct: number;
  shareRevenuePct: number;
  color: string;
}

export interface LogisticsComparison {
  deliveryCount: number;
  pickupCount: number;
  totalOrders: number;
  deliveryShare: number;
  pickupShare: number;
  avgDeliveryProduct: number;
  avgPickupProduct: number;
  avgDeliveryGrand: number;
  avgFreight: number;
  deliveryProductsSubtotal: number;
  pickupProductsSubtotal: number;
  diffPercent: number;
}

export interface NeighborhoodStatEntry {
  name: string;
  pedidos: number;
  receitaTaxa: number;
  receitaTotal: number;
  ticketMedio: number;
}

export interface NeighborhoodsSummary {
  data: NeighborhoodStatEntry[];
  totalTaxas: number;
}

export interface CourierStatEntry {
  courierName: string;
  deliveries: number;
  completedDeliveries: number;
  avgRouteMinutes: number | null;
  issuesCount: number;
  revenueDelivered: number;
}

export interface CancellationReasonEntry {
  reason: string;
  count: number;
  lostRevenue: number;
}

export interface DeliveryIssueEntry {
  issue: string;
  count: number;
}

export interface CancellationAuditSummary {
  conversionRate: number;
  lostRevenue: number;
  deliveredCount: number;
  inProgressCount: number;
  cancelledCount: number;
  totalOrders: number;
  chartData: Array<{ name: string; value: number; color: string }>;
  reasons: CancellationReasonEntry[];
  issues: DeliveryIssueEntry[];
  totalIssuesCount: number;
  issueRatePct: number;
}

export interface CouponStatEntry {
  code: string;
  uses: number;
  totalDiscount: number;
  generatedRevenue: number;
}

export interface CouponPerformanceSummary {
  totalDiscount: number;
  couponOrdersCount: number;
  avgTicketWithCoupon: number;
  avgTicketWithoutCoupon: number;
  topCoupons: CouponStatEntry[];
}

export interface AnalyticsReport {
  scopedOrdersCount: number;
  filteredOrdersCount: number;
  kpis: AnalyticsKpis;
  salesTimeline: SalesTimelinePoint[];
  demand: PeakDemandSummary;
  categoryMix: CategoryMixEntry[];
  addons: AddonAnalyticsSummary;
  productStats: ProductStatEntry[];
  payments: PaymentBreakdownEntry[];
  logistics: LogisticsComparison;
  neighborhoods: NeighborhoodsSummary;
  couriers: CourierStatEntry[];
  audit: CancellationAuditSummary;
  coupons: CouponPerformanceSummary;
}

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

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_PLAUSIBLE_SLA_MINUTES = 240;
const SLA_TARGET_MINUTES = 40;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function diffMinutesSafe(startIso?: string | null, endIso?: string | null): number | null {
  if (!startIso || !endIso) return null;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const diffMinutes = (endMs - startMs) / 60000;
  if (diffMinutes <= 0 || diffMinutes > MAX_PLAUSIBLE_SLA_MINUTES) return null;
  return diffMinutes;
}

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return round1(sum / values.length);
}

function isPickupOrder(order: Order): boolean {
  const street = order.delivery_address?.street?.trim() || "";
  return street.length === 0 || street.toLowerCase().includes("retirada");
}

function getOrderProductSubtotal(order: Order): number {
  if (order.subtotal !== undefined && Number.isFinite(Number(order.subtotal))) {
    return Math.max(0, Number(order.subtotal));
  }
  const total = Number(order.total_amount) || 0;
  const fee = Number(order.delivery_fee) || 0;
  return Math.max(0, total - fee);
}

function getCustomerKey(order: Order): string | null {
  if (order.user_id && order.user_id.trim().length > 0) {
    return `id:${order.user_id.trim()}`;
  }
  const cleanPhone = order.user?.phone?.replace(/\D/g, "") || "";
  if (cleanPhone.length >= 10) {
    return `phone:${cleanPhone}`;
  }
  const cleanEmail = order.user?.email?.toLowerCase().trim() || "";
  if (cleanEmail.includes("@")) {
    return `email:${cleanEmail}`;
  }
  return null;
}

function isNegativeCutleryChoice(addonName: string): boolean {
  const normalized = addonName.toLowerCase();
  return (
    normalized.includes("não preciso de colher") ||
    normalized.includes("nao preciso de colher") ||
    normalized.includes("sem colher")
  );
}

function computeDeltaPct(currentValue: number, previousValue: number): number | null {
  if (!Number.isFinite(previousValue) || previousValue <= 0) return null;
  return round1(((currentValue - previousValue) / previousValue) * 100);
}

export class AnalyticsDomainService {
  static filterOrdersByScope(
    orders: Order[],
    scope: ScopeFilter,
    currentShiftId?: string | null
  ): Order[] {
    if (scope === "active_shift") {
      return orders.filter(
        (o) => !o.is_archived || (Boolean(currentShiftId) && o.shift_id === currentShiftId)
      );
    }
    return orders;
  }

  static filterOrdersByPeriod(
    orders: Order[],
    period: PeriodFilter,
    referenceDate: Date = new Date()
  ): Order[] {
    if (period === "tudo") return orders;

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      if (Number.isNaN(orderDate.getTime())) return false;

      if (period === "hoje") {
        return isSameCalendarDay(orderDate, referenceDate);
      }

      if (period === "7dias") {
        const start = new Date(referenceDate);
        start.setDate(referenceDate.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        return orderDate >= start && orderDate <= referenceDate;
      }

      if (period === "mes") {
        return (
          orderDate.getMonth() === referenceDate.getMonth() &&
          orderDate.getFullYear() === referenceDate.getFullYear()
        );
      }

      if (period === "ano") {
        return orderDate.getFullYear() === referenceDate.getFullYear();
      }

      return true;
    });
  }

  static filterOrdersByPreviousPeriod(
    orders: Order[],
    period: PeriodFilter,
    referenceDate: Date = new Date()
  ): Order[] {
    if (period === "tudo") return [];

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      if (Number.isNaN(orderDate.getTime())) return false;

      if (period === "hoje") {
        const yesterday = new Date(referenceDate);
        yesterday.setDate(referenceDate.getDate() - 1);
        return isSameCalendarDay(orderDate, yesterday);
      }

      if (period === "7dias") {
        const currentStart = new Date(referenceDate);
        currentStart.setDate(referenceDate.getDate() - 6);
        currentStart.setHours(0, 0, 0, 0);

        const prevStart = new Date(currentStart);
        prevStart.setDate(currentStart.getDate() - 7);
        return orderDate >= prevStart && orderDate < currentStart;
      }

      if (period === "mes") {
        const prevMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
        return (
          orderDate.getMonth() === prevMonthDate.getMonth() &&
          orderDate.getFullYear() === prevMonthDate.getFullYear()
        );
      }

      if (period === "ano") {
        return orderDate.getFullYear() === referenceDate.getFullYear() - 1;
      }

      return false;
    });
  }

  static computeKpis(
    currentOrders: Order[],
    previousOrders: Order[],
    scope: ScopeFilter,
    period: PeriodFilter
  ): AnalyticsKpis {
    const validOrders = currentOrders.filter((o) => o.status !== "cancelled");
    const cancelledOrders = currentOrders.filter((o) => o.status === "cancelled");
    const completedOrders = currentOrders.filter((o) => o.status === "completed");
    const inProgressOrders = currentOrders.filter(
      (o) => o.status !== "completed" && o.status !== "cancelled"
    );

    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const productRevenue = validOrders.reduce((sum, o) => sum + getOrderProductSubtotal(o), 0);
    const freightRevenue = validOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
    const totalDiscounts = validOrders.reduce(
      (sum, o) => sum + Math.max(0, Number(o.discount_amount) || 0),
      0
    );
    const netProductRevenue = Math.max(0, productRevenue - totalDiscounts);

    const totalOrdersCount = currentOrders.length;
    const validOrdersCount = validOrders.length;
    const completedCount = completedOrders.length;
    const inProgressCount = inProgressOrders.length;
    const cancelledCount = cancelledOrders.length;

    const completedRate =
      totalOrdersCount > 0 ? Math.round((completedCount / totalOrdersCount) * 100) : 0;
    const cancelledRate =
      totalOrdersCount > 0 ? Math.round((cancelledCount / totalOrdersCount) * 100) : 0;

    const averageTicket = validOrdersCount > 0 ? totalRevenue / validOrdersCount : 0;
    const averageProductTicket = validOrdersCount > 0 ? productRevenue / validOrdersCount : 0;

    const totalItemUnits = validOrders.reduce(
      (sum, o) => sum + (o.items || []).reduce((itemAcc, it) => itemAcc + (Number(it.quantity) || 0), 0),
      0
    );
    const avgItemsPerOrder = validOrdersCount > 0 ? round1(totalItemUnits / validOrdersCount) : 0;

    const couponOrdersCount = validOrders.filter(
      (o) => Boolean(o.coupon_code) || (Number(o.discount_amount) || 0) > 0
    ).length;
    const couponAdoptionRate =
      validOrdersCount > 0 ? round1((couponOrdersCount / validOrdersCount) * 100) : 0;

    // SLA real
    const prepSamples: number[] = [];
    const routeSamples: number[] = [];
    const leadTimeSamples: number[] = [];

    validOrders.forEach((o) => {
      const prep = diffMinutesSafe(o.created_at, o.dispatched_at);
      if (prep !== null) prepSamples.push(prep);

      const route = diffMinutesSafe(o.dispatched_at, o.delivered_at);
      if (route !== null) routeSamples.push(route);

      if (o.status === "completed") {
        const lead = diffMinutesSafe(o.created_at, o.delivered_at || o.updated_at);
        if (lead !== null) leadTimeSamples.push(lead);
      }
    });

    const avgPrepMinutes = averageOrNull(prepSamples);
    const avgRouteMinutes = averageOrNull(routeSamples);
    const avgLeadTimeMinutes = averageOrNull(leadTimeSamples);
    const slaSampleCount = leadTimeSamples.length;
    const slaWithinTargetRate =
      slaSampleCount > 0
        ? round1(
            (leadTimeSamples.filter((m) => m <= SLA_TARGET_MINUTES).length / slaSampleCount) * 100
          )
        : null;

    // Retenção e recompra
    const customerMap = new Map<string, { orders: number; revenue: number }>();
    let identifiedRevenue = 0;

    validOrders.forEach((o) => {
      const key = getCustomerKey(o);
      if (!key) return;
      const orderTotal = Number(o.total_amount) || 0;
      identifiedRevenue += orderTotal;
      const existing = customerMap.get(key) || { orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += orderTotal;
      customerMap.set(key, existing);
    });

    const uniqueCustomersCount = customerMap.size;
    let repeatCustomersCount = 0;
    let repeatRevenue = 0;
    customerMap.forEach((entry) => {
      if (entry.orders >= 2) {
        repeatCustomersCount += 1;
        repeatRevenue += entry.revenue;
      }
    });

    const repeatCustomerRate =
      uniqueCustomersCount > 0 ? round1((repeatCustomersCount / uniqueCustomersCount) * 100) : 0;
    const repeatRevenueShare =
      identifiedRevenue > 0 ? round1((repeatRevenue / identifiedRevenue) * 100) : 0;

    // Deltas vs período anterior
    let deltas: PeriodDeltas | null = null;
    if (scope === "all_history" && period !== "tudo") {
      const prevValid = previousOrders.filter((o) => o.status !== "cancelled");
      if (prevValid.length > 0) {
        const prevRevenue = prevValid.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const prevAvgTicket = prevRevenue / prevValid.length;
        deltas = {
          revenuePct: computeDeltaPct(totalRevenue, prevRevenue),
          ordersPct: computeDeltaPct(validOrdersCount, prevValid.length),
          ticketPct: computeDeltaPct(averageTicket, prevAvgTicket),
        };
      }
    }

    return {
      totalRevenue: round2(totalRevenue),
      productRevenue: round2(productRevenue),
      freightRevenue: round2(freightRevenue),
      totalDiscounts: round2(totalDiscounts),
      netProductRevenue: round2(netProductRevenue),
      totalOrdersCount,
      validOrdersCount,
      completedCount,
      inProgressCount,
      cancelledCount,
      completedRate,
      cancelledRate,
      averageTicket: round2(averageTicket),
      averageProductTicket: round2(averageProductTicket),
      avgItemsPerOrder,
      couponOrdersCount,
      couponAdoptionRate,
      avgPrepMinutes,
      avgRouteMinutes,
      avgLeadTimeMinutes,
      slaSampleCount,
      slaWithinTargetRate,
      uniqueCustomersCount,
      repeatCustomersCount,
      repeatCustomerRate,
      repeatRevenueShare,
      deltas,
    };
  }

  static buildSalesTimeline(
    orders: Order[],
    period: PeriodFilter,
    scope: ScopeFilter,
    referenceDate: Date = new Date()
  ): SalesTimelinePoint[] {
    if (period === "hoje" || scope === "active_shift") {
      let minHour = 13;
      let maxHour = 23;
      orders.forEach((o) => {
        const h = new Date(o.created_at).getHours();
        if (Number.isFinite(h)) {
          if (h < minHour) minHour = h;
          if (h > maxHour) maxHour = h;
        }
      });

      const hourBuckets = new Map<
        number,
        { faturamento: number; receitaProdutos: number; pedidos: number; cancelados: number }
      >();
      for (let h = minHour; h <= maxHour; h++) {
        hourBuckets.set(h, { faturamento: 0, receitaProdutos: 0, pedidos: 0, cancelados: 0 });
      }

      orders.forEach((o) => {
        const h = new Date(o.created_at).getHours();
        const bucket = hourBuckets.get(h);
        if (!bucket) return;
        if (o.status === "cancelled") {
          bucket.cancelados += 1;
        } else {
          bucket.faturamento += Number(o.total_amount) || 0;
          bucket.receitaProdutos += getOrderProductSubtotal(o);
          bucket.pedidos += 1;
        }
      });

      return Array.from(hourBuckets.entries()).map(([h, b]) => ({
        label: `${String(h).padStart(2, "0")}h`,
        faturamento: round2(b.faturamento),
        receitaProdutos: round2(b.receitaProdutos),
        pedidos: b.pedidos,
        cancelados: b.cancelados,
        ticketMedio: b.pedidos > 0 ? round2(b.faturamento / b.pedidos) : 0,
      }));
    }

    if (period === "7dias") {
      const daysList: Array<{
        sortKey: string;
        label: string;
        faturamento: number;
        receitaProdutos: number;
        pedidos: number;
        cancelados: number;
      }> = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(referenceDate);
        d.setDate(referenceDate.getDate() - i);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        daysList.push({
          sortKey,
          label,
          faturamento: 0,
          receitaProdutos: 0,
          pedidos: 0,
          cancelados: 0,
        });
      }

      orders.forEach((o) => {
        const d = new Date(o.created_at);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const item = daysList.find((entry) => entry.sortKey === sortKey);
        if (!item) return;
        if (o.status === "cancelled") {
          item.cancelados += 1;
        } else {
          item.faturamento += Number(o.total_amount) || 0;
          item.receitaProdutos += getOrderProductSubtotal(o);
          item.pedidos += 1;
        }
      });

      return daysList.map((entry) => ({
        label: entry.label,
        faturamento: round2(entry.faturamento),
        receitaProdutos: round2(entry.receitaProdutos),
        pedidos: entry.pedidos,
        cancelados: entry.cancelados,
        ticketMedio: entry.pedidos > 0 ? round2(entry.faturamento / entry.pedidos) : 0,
      }));
    }

    if (period === "mes") {
      const daysMap = new Map<
        string,
        { label: string; faturamento: number; receitaProdutos: number; pedidos: number; cancelados: number }
      >();

      orders.forEach((o) => {
        const d = new Date(o.created_at);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!daysMap.has(sortKey)) {
          daysMap.set(sortKey, { label, faturamento: 0, receitaProdutos: 0, pedidos: 0, cancelados: 0 });
        }
        const entry = daysMap.get(sortKey)!;
        if (o.status === "cancelled") {
          entry.cancelados += 1;
        } else {
          entry.faturamento += Number(o.total_amount) || 0;
          entry.receitaProdutos += getOrderProductSubtotal(o);
          entry.pedidos += 1;
        }
      });

      const sortedKeys = Array.from(daysMap.keys()).sort();
      if (sortedKeys.length === 0) {
        return [
          {
            label: "Sem dados",
            faturamento: 0,
            receitaProdutos: 0,
            pedidos: 0,
            cancelados: 0,
            ticketMedio: 0,
          },
        ];
      }

      return sortedKeys.map((k) => {
        const entry = daysMap.get(k)!;
        return {
          label: entry.label,
          faturamento: round2(entry.faturamento),
          receitaProdutos: round2(entry.receitaProdutos),
          pedidos: entry.pedidos,
          cancelados: entry.cancelados,
          ticketMedio: entry.pedidos > 0 ? round2(entry.faturamento / entry.pedidos) : 0,
        };
      });
    }

    if (period === "ano") {
      const monthsList = MONTH_NAMES.map((name) => ({
        label: name,
        faturamento: 0,
        receitaProdutos: 0,
        pedidos: 0,
        cancelados: 0,
      }));

      orders.forEach((o) => {
        const monthIndex = new Date(o.created_at).getMonth();
        const entry = monthsList[monthIndex];
        if (!entry) return;
        if (o.status === "cancelled") {
          entry.cancelados += 1;
        } else {
          entry.faturamento += Number(o.total_amount) || 0;
          entry.receitaProdutos += getOrderProductSubtotal(o);
          entry.pedidos += 1;
        }
      });

      return monthsList.map((entry) => ({
        label: entry.label,
        faturamento: round2(entry.faturamento),
        receitaProdutos: round2(entry.receitaProdutos),
        pedidos: entry.pedidos,
        cancelados: entry.cancelados,
        ticketMedio: entry.pedidos > 0 ? round2(entry.faturamento / entry.pedidos) : 0,
      }));
    }

    // "tudo"
    const monthsMap = new Map<
      string,
      { label: string; faturamento: number; receitaProdutos: number; pedidos: number; cancelados: number }
    >();

    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
      if (!monthsMap.has(sortKey)) {
        monthsMap.set(sortKey, { label, faturamento: 0, receitaProdutos: 0, pedidos: 0, cancelados: 0 });
      }
      const entry = monthsMap.get(sortKey)!;
      if (o.status === "cancelled") {
        entry.cancelados += 1;
      } else {
        entry.faturamento += Number(o.total_amount) || 0;
        entry.receitaProdutos += getOrderProductSubtotal(o);
        entry.pedidos += 1;
      }
    });

    const sortedKeys = Array.from(monthsMap.keys()).sort();
    if (sortedKeys.length === 0) {
      return [
        {
          label: "Sem dados",
          faturamento: 0,
          receitaProdutos: 0,
          pedidos: 0,
          cancelados: 0,
          ticketMedio: 0,
        },
      ];
    }

    return sortedKeys.map((k) => {
      const entry = monthsMap.get(k)!;
      return {
        label: entry.label,
        faturamento: round2(entry.faturamento),
        receitaProdutos: round2(entry.receitaProdutos),
        pedidos: entry.pedidos,
        cancelados: entry.cancelados,
        ticketMedio: entry.pedidos > 0 ? round2(entry.faturamento / entry.pedidos) : 0,
      };
    });
  }

  static buildPeakHoursAndWeekdays(orders: Order[]): PeakDemandSummary {
    const validOrders = orders.filter((o) => o.status !== "cancelled");

    let minHour = 13;
    let maxHour = 23;
    validOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      if (Number.isFinite(h)) {
        if (h < minHour) minHour = h;
        if (h > maxHour) maxHour = h;
      }
    });

    const hourBuckets = new Map<number, { pedidos: number; faturamento: number; prepSamples: number[] }>();
    for (let h = minHour; h <= maxHour; h++) {
      hourBuckets.set(h, { pedidos: 0, faturamento: 0, prepSamples: [] });
    }

    const weekdayBuckets = WEEKDAY_NAMES.map((label, dayIndex) => ({
      dayIndex,
      label,
      pedidos: 0,
      faturamento: 0,
    }));

    validOrders.forEach((o) => {
      const d = new Date(o.created_at);
      if (Number.isNaN(d.getTime())) return;
      const h = d.getHours();
      const dayIdx = d.getDay();
      const total = Number(o.total_amount) || 0;

      const hourEntry = hourBuckets.get(h);
      if (hourEntry) {
        hourEntry.pedidos += 1;
        hourEntry.faturamento += total;
        const prep = diffMinutesSafe(o.created_at, o.dispatched_at);
        if (prep !== null) hourEntry.prepSamples.push(prep);
      }

      if (weekdayBuckets[dayIdx]) {
        weekdayBuckets[dayIdx].pedidos += 1;
        weekdayBuckets[dayIdx].faturamento += total;
      }
    });

    let maxHourlyPedidos = 0;
    hourBuckets.forEach((entry) => {
      if (entry.pedidos > maxHourlyPedidos) maxHourlyPedidos = entry.pedidos;
    });

    let peakHourLabel: string | null = null;
    const hourly: HourlyDemandPoint[] = Array.from(hourBuckets.entries()).map(([hour, entry]) => {
      const label = `${String(hour).padStart(2, "0")}h`;
      const isPeak = maxHourlyPedidos > 0 && entry.pedidos === maxHourlyPedidos;
      if (isPeak && !peakHourLabel) {
        peakHourLabel = label;
      }
      return {
        hour,
        label,
        pedidos: entry.pedidos,
        faturamento: round2(entry.faturamento),
        avgPrepMinutes: averageOrNull(entry.prepSamples),
        isPeak,
      };
    });

    let bestWeekdayLabel: string | null = null;
    let bestWeekdayRevenue = 0;
    const weekdays: WeekdayDemandPoint[] = weekdayBuckets.map((entry) => {
      const rev = round2(entry.faturamento);
      if (rev > bestWeekdayRevenue) {
        bestWeekdayRevenue = rev;
        bestWeekdayLabel = entry.label;
      }
      return {
        dayIndex: entry.dayIndex,
        label: entry.label,
        pedidos: entry.pedidos,
        faturamento: rev,
        ticketMedio: entry.pedidos > 0 ? round2(rev / entry.pedidos) : 0,
      };
    });

    return {
      hourly,
      weekdays,
      peakHourLabel,
      peakHourOrders: maxHourlyPedidos,
      bestWeekdayLabel,
      bestWeekdayRevenue,
    };
  }

  static buildCategoryMix(orders: Order[], catalogProducts: Product[]): CategoryMixEntry[] {
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const idToCategory = new Map<string, string>();
    const nameToCategory = new Map<string, string>();

    catalogProducts.forEach((p) => {
      const cat = p.category?.trim() || "Outros";
      idToCategory.set(p.id, cat);
      nameToCategory.set(p.name.trim().toLowerCase(), cat);
    });

    const catMap = new Map<string, { quantity: number; revenue: number }>();
    let totalRevenue = 0;

    validOrders.forEach((o) => {
      o.items?.forEach((it) => {
        const pid = it.product_id || it.product?.id;
        const pname = (it.product?.name || "").trim().toLowerCase();
        const category =
          (pid && idToCategory.get(pid)) ||
          (pname && nameToCategory.get(pname)) ||
          "Outros";
        const qty = Number(it.quantity) || 0;
        const rev = (Number(it.price_at_time) || 0) * qty;
        totalRevenue += rev;

        const existing = catMap.get(category) || { quantity: 0, revenue: 0 };
        existing.quantity += qty;
        existing.revenue += rev;
        catMap.set(category, existing);
      });
    });

    return Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        quantity: data.quantity,
        revenue: round2(data.revenue),
        sharePct: totalRevenue > 0 ? round1((data.revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  static buildAddonAnalytics(orders: Order[]): AddonAnalyticsSummary {
    const validOrders = orders.filter((o) => o.status !== "cancelled");

    let totalItemsCount = 0;
    let itemsWithAddonsCount = 0;
    let itemsWithPaidAddonsCount = 0;
    let addonRevenue = 0;

    const addonMap = new Map<string, { name: string; groupName: string; quantity: number; revenue: number }>();

    validOrders.forEach((o) => {
      o.items?.forEach((it) => {
        const itemQty = Math.max(1, Number(it.quantity) || 1);
        totalItemsCount += 1;

        const rawAddons = it.selected_addons || it.selectedAddons || [];
        const effectiveAddons = Array.isArray(rawAddons)
          ? rawAddons.filter((ad) => ad?.name && !isNegativeCutleryChoice(ad.name))
          : [];

        if (effectiveAddons.length > 0) {
          itemsWithAddonsCount += 1;
        }

        let hasPaidAddon = false;

        effectiveAddons.forEach((ad) => {
          const unitPrice = Math.max(0, Number(ad.price) || 0);
          const adQty = Math.max(1, Number(ad.quantity) || 1) * itemQty;
          const rev = unitPrice * adQty;

          if (unitPrice > 0) {
            hasPaidAddon = true;
          }
          addonRevenue += rev;

          const cleanName = ad.name.trim();
          const key = cleanName.toLowerCase();
          const existing = addonMap.get(key) || {
            name: cleanName,
            groupName: ad.groupName?.trim() || "Adicional",
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += adQty;
          existing.revenue += rev;
          addonMap.set(key, existing);
        });

        if (hasPaidAddon) {
          itemsWithPaidAddonsCount += 1;
        }
      });
    });

    const topAddons = Array.from(addonMap.values())
      .map((entry) => ({
        ...entry,
        revenue: round2(entry.revenue),
      }))
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return b.quantity - a.quantity;
      })
      .slice(0, 8);

    return {
      totalItemsCount,
      itemsWithAddonsCount,
      itemsWithPaidAddonsCount,
      attachRatePct: totalItemsCount > 0 ? round1((itemsWithAddonsCount / totalItemsCount) * 100) : 0,
      paidAttachRatePct:
        totalItemsCount > 0 ? round1((itemsWithPaidAddonsCount / totalItemsCount) * 100) : 0,
      addonRevenue: round2(addonRevenue),
      topAddons,
    };
  }

  static buildProductStats(orders: Order[], catalogProducts: Product[]): ProductStatEntry[] {
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const map = new Map<string, Omit<ProductStatEntry, "revenueSharePct">>();

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

    let totalItemsRevenue = 0;

    validOrders.forEach((o) => {
      o.items?.forEach((it) => {
        const targetId = it.product_id || it.product?.id;
        const targetName = it.product?.name || "Item do Cardápio";

        let entry = targetId ? map.get(targetId) : undefined;
        if (!entry) {
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

        const qty = Number(it.quantity) || 0;
        const rev = (Number(it.price_at_time) || 0) * qty;
        entry.quantity += qty;
        entry.revenue += rev;
        entry.ordersCount += 1;
        totalItemsRevenue += rev;
      });
    });

    return Array.from(map.values()).map((entry) => ({
      ...entry,
      revenue: round2(entry.revenue),
      revenueSharePct: totalItemsRevenue > 0 ? round1((entry.revenue / totalItemsRevenue) * 100) : 0,
    }));
  }

  static buildPaymentBreakdown(orders: Order[]): PaymentBreakdownEntry[] {
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const buckets: Record<"Pix" | "Cartão" | "Dinheiro" | "Outros", { count: number; revenue: number }> = {
      Pix: { count: 0, revenue: 0 },
      Cartão: { count: 0, revenue: 0 },
      Dinheiro: { count: 0, revenue: 0 },
      Outros: { count: 0, revenue: 0 },
    };

    let totalRevenue = 0;
    validOrders.forEach((o) => {
      const type = (o.payment_method_type || "").toLowerCase();
      const amount = Number(o.total_amount) || 0;
      totalRevenue += amount;

      if (type.includes("pix")) {
        buckets.Pix.count += 1;
        buckets.Pix.revenue += amount;
      } else if (
        type.includes("cartao") ||
        type.includes("card") ||
        type.includes("crédito") ||
        type.includes("credito") ||
        type.includes("debito") ||
        type.includes("débito")
      ) {
        buckets.Cartão.count += 1;
        buckets.Cartão.revenue += amount;
      } else if (type.includes("dinheiro") || type.includes("cash")) {
        buckets.Dinheiro.count += 1;
        buckets.Dinheiro.revenue += amount;
      } else {
        buckets.Outros.count += 1;
        buckets.Outros.revenue += amount;
      }
    });

    const totalCount = validOrders.length;
    const colors: Record<"Pix" | "Cartão" | "Dinheiro" | "Outros", string> = {
      Pix: "#00BDAE",
      Cartão: "#7C3AED",
      Dinheiro: "#F59E0B",
      Outros: "#64748B",
    };

    return (Object.keys(buckets) as Array<keyof typeof buckets>)
      .filter((key) => buckets[key].count > 0)
      .map((key) => ({
        name: key,
        value: buckets[key].count,
        revenue: round2(buckets[key].revenue),
        shareCountPct: totalCount > 0 ? round1((buckets[key].count / totalCount) * 100) : 0,
        shareRevenuePct: totalRevenue > 0 ? round1((buckets[key].revenue / totalRevenue) * 100) : 0,
        color: colors[key],
      }));
  }

  static buildLogisticsAndNeighborhoods(orders: Order[]): {
    logistics: LogisticsComparison;
    neighborhoods: NeighborhoodsSummary;
  } {
    const validOrders = orders.filter((o) => o.status !== "cancelled");

    let deliveryCount = 0;
    let deliveryProductsSubtotal = 0;
    let deliveryGrandTotal = 0;
    let deliveryFreightTotal = 0;
    let pickupCount = 0;
    let pickupProductsSubtotal = 0;

    const neighborhoodMap = new Map<
      string,
      { pedidos: number; receitaTaxa: number; receitaTotal: number }
    >();

    validOrders.forEach((o) => {
      const fee = Number(o.delivery_fee) || 0;
      const total = Number(o.total_amount) || 0;
      const productSubtotal = getOrderProductSubtotal(o);

      if (isPickupOrder(o)) {
        pickupCount += 1;
        pickupProductsSubtotal += productSubtotal;
      } else {
        deliveryCount += 1;
        deliveryProductsSubtotal += productSubtotal;
        deliveryGrandTotal += total;
        deliveryFreightTotal += fee;

        const rawNeighborhood = o.delivery_address?.neighborhood?.trim();
        const neighborhood =
          rawNeighborhood && rawNeighborhood.length > 0 ? rawNeighborhood : "Centro";
        const current = neighborhoodMap.get(neighborhood) || {
          pedidos: 0,
          receitaTaxa: 0,
          receitaTotal: 0,
        };
        current.pedidos += 1;
        current.receitaTaxa += fee;
        current.receitaTotal += total;
        neighborhoodMap.set(neighborhood, current);
      }
    });

    const avgDeliveryProduct = deliveryCount > 0 ? deliveryProductsSubtotal / deliveryCount : 0;
    const avgPickupProduct = pickupCount > 0 ? pickupProductsSubtotal / pickupCount : 0;
    const avgDeliveryGrand = deliveryCount > 0 ? deliveryGrandTotal / deliveryCount : 0;
    const avgFreight = deliveryCount > 0 ? deliveryFreightTotal / deliveryCount : 0;
    const diffPercent =
      avgPickupProduct > 0
        ? ((avgDeliveryProduct - avgPickupProduct) / avgPickupProduct) * 100
        : 0;

    const totalOrders = deliveryCount + pickupCount;
    const deliveryShare = totalOrders > 0 ? (deliveryCount / totalOrders) * 100 : 0;
    const pickupShare = totalOrders > 0 ? (pickupCount / totalOrders) * 100 : 0;

    const neighborhoodList: NeighborhoodStatEntry[] = Array.from(neighborhoodMap.entries())
      .map(([name, data]) => ({
        name,
        pedidos: data.pedidos,
        receitaTaxa: round2(data.receitaTaxa),
        receitaTotal: round2(data.receitaTotal),
        ticketMedio: data.pedidos > 0 ? round2(data.receitaTotal / data.pedidos) : 0,
      }))
      .sort((a, b) => b.pedidos - a.pedidos);

    const totalTaxas = neighborhoodList.reduce((acc, item) => acc + item.receitaTaxa, 0);

    return {
      logistics: {
        deliveryCount,
        pickupCount,
        totalOrders,
        deliveryShare,
        pickupShare,
        avgDeliveryProduct: round2(avgDeliveryProduct),
        avgPickupProduct: round2(avgPickupProduct),
        avgDeliveryGrand: round2(avgDeliveryGrand),
        avgFreight: round2(avgFreight),
        deliveryProductsSubtotal: round2(deliveryProductsSubtotal),
        pickupProductsSubtotal: round2(pickupProductsSubtotal),
        diffPercent: round1(diffPercent),
      },
      neighborhoods: {
        data: neighborhoodList.slice(0, 6),
        totalTaxas: round2(totalTaxas),
      },
    };
  }

  static buildCourierPerformance(orders: Order[]): CourierStatEntry[] {
    const validOrders = orders.filter((o) => o.status !== "cancelled" && Boolean(o.courier_name?.trim()));
    const map = new Map<
      string,
      {
        courierName: string;
        deliveries: number;
        completedDeliveries: number;
        routeSamples: number[];
        issuesCount: number;
        revenueDelivered: number;
      }
    >();

    validOrders.forEach((o) => {
      const courierName = o.courier_name!.trim();
      const entry = map.get(courierName) || {
        courierName,
        deliveries: 0,
        completedDeliveries: 0,
        routeSamples: [],
        issuesCount: 0,
        revenueDelivered: 0,
      };

      entry.deliveries += 1;
      if (o.status === "completed") {
        entry.completedDeliveries += 1;
      }
      entry.revenueDelivered += Number(o.total_amount) || 0;
      if (o.delivery_issue?.trim()) {
        entry.issuesCount += 1;
      }
      const route = diffMinutesSafe(o.dispatched_at, o.delivered_at);
      if (route !== null) {
        entry.routeSamples.push(route);
      }

      map.set(courierName, entry);
    });

    return Array.from(map.values())
      .map((entry) => ({
        courierName: entry.courierName,
        deliveries: entry.deliveries,
        completedDeliveries: entry.completedDeliveries,
        avgRouteMinutes: averageOrNull(entry.routeSamples),
        issuesCount: entry.issuesCount,
        revenueDelivered: round2(entry.revenueDelivered),
      }))
      .sort((a, b) => b.deliveries - a.deliveries);
  }

  static buildCancellationAndIssueAudit(orders: Order[]): CancellationAuditSummary {
    let deliveredCount = 0;
    let cancelledCount = 0;
    let inProgressCount = 0;
    let lostRevenue = 0;

    const reasonsMap = new Map<string, { count: number; lostRevenue: number }>();
    const issuesMap = new Map<string, number>();
    let totalIssuesCount = 0;

    orders.forEach((o) => {
      const st = (o.status || "").toLowerCase();
      if (st === "completed" || st === "delivered") {
        deliveredCount += 1;
      } else if (st === "cancelled" || st === "cancelado") {
        cancelledCount += 1;
        const amount = Number(o.total_amount) || 0;
        lostRevenue += amount;

        const reason = o.cancellation_reason?.trim() || "Motivo não informado";
        const currentReason = reasonsMap.get(reason) || { count: 0, lostRevenue: 0 };
        currentReason.count += 1;
        currentReason.lostRevenue += amount;
        reasonsMap.set(reason, currentReason);
      } else {
        inProgressCount += 1;
      }

      const issue = o.delivery_issue?.trim();
      if (issue) {
        totalIssuesCount += 1;
        issuesMap.set(issue, (issuesMap.get(issue) || 0) + 1);
      }
    });

    const totalOrders = deliveredCount + cancelledCount + inProgressCount;
    const conversionRate = totalOrders > 0 ? round1((deliveredCount / totalOrders) * 100) : 100;

    const chartData = [
      { name: "Pedidos Entregues", value: deliveredCount, color: "#10B981" },
      { name: "Cancelados", value: cancelledCount, color: "#EF4444" },
      { name: "Em Andamento / Outros", value: inProgressCount, color: "#F59E0B" },
    ].filter((item) => item.value > 0);

    const reasons = Array.from(reasonsMap.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        lostRevenue: round2(data.lostRevenue),
      }))
      .sort((a, b) => b.count - a.count);

    const issues = Array.from(issuesMap.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    return {
      conversionRate,
      lostRevenue: round2(lostRevenue),
      deliveredCount,
      inProgressCount,
      cancelledCount,
      totalOrders,
      chartData,
      reasons,
      issues,
      totalIssuesCount,
      issueRatePct: totalOrders > 0 ? round1((totalIssuesCount / totalOrders) * 100) : 0,
    };
  }

  static buildCouponPerformance(orders: Order[]): CouponPerformanceSummary {
    const validOrders = orders.filter((o) => o.status !== "cancelled");

    let withCouponTotal = 0;
    let withCouponCount = 0;
    let withoutCouponTotal = 0;
    let withoutCouponCount = 0;
    let totalDiscount = 0;

    const couponMap = new Map<
      string,
      { uses: number; totalDiscount: number; generatedRevenue: number }
    >();

    validOrders.forEach((o) => {
      const discount = Math.max(0, Number(o.discount_amount) || 0);
      const total = Number(o.total_amount) || 0;
      const code = o.coupon_code?.trim().toUpperCase();

      if (code || discount > 0) {
        withCouponCount += 1;
        withCouponTotal += total;
        totalDiscount += discount;

        if (code) {
          const entry = couponMap.get(code) || {
            uses: 0,
            totalDiscount: 0,
            generatedRevenue: 0,
          };
          entry.uses += 1;
          entry.totalDiscount += discount;
          entry.generatedRevenue += total;
          couponMap.set(code, entry);
        }
      } else {
        withoutCouponCount += 1;
        withoutCouponTotal += total;
      }
    });

    const topCoupons = Array.from(couponMap.entries())
      .map(([code, data]) => ({
        code,
        uses: data.uses,
        totalDiscount: round2(data.totalDiscount),
        generatedRevenue: round2(data.generatedRevenue),
      }))
      .sort((a, b) => {
        if (b.uses !== a.uses) return b.uses - a.uses;
        return b.generatedRevenue - a.generatedRevenue;
      })
      .slice(0, 6);

    return {
      totalDiscount: round2(totalDiscount),
      couponOrdersCount: withCouponCount,
      avgTicketWithCoupon: withCouponCount > 0 ? round2(withCouponTotal / withCouponCount) : 0,
      avgTicketWithoutCoupon:
        withoutCouponCount > 0 ? round2(withoutCouponTotal / withoutCouponCount) : 0,
      topCoupons,
    };
  }

  static generateReport(
    orders: Order[],
    catalogProducts: Product[],
    scope: ScopeFilter,
    period: PeriodFilter,
    currentShiftId?: string | null,
    referenceDate: Date = new Date()
  ): AnalyticsReport {
    const scopedOrders = this.filterOrdersByScope(orders, scope, currentShiftId);
    const filteredOrders =
      scope === "active_shift"
        ? scopedOrders
        : this.filterOrdersByPeriod(scopedOrders, period, referenceDate);

    const previousOrders =
      scope === "active_shift"
        ? []
        : this.filterOrdersByPreviousPeriod(scopedOrders, period, referenceDate);

    const kpis = this.computeKpis(filteredOrders, previousOrders, scope, period);
    const salesTimeline = this.buildSalesTimeline(filteredOrders, period, scope, referenceDate);
    const demand = this.buildPeakHoursAndWeekdays(filteredOrders);
    const categoryMix = this.buildCategoryMix(filteredOrders, catalogProducts);
    const addons = this.buildAddonAnalytics(filteredOrders);
    const productStats = this.buildProductStats(filteredOrders, catalogProducts);
    const payments = this.buildPaymentBreakdown(filteredOrders);
    const { logistics, neighborhoods } = this.buildLogisticsAndNeighborhoods(filteredOrders);
    const couriers = this.buildCourierPerformance(filteredOrders);
    const audit = this.buildCancellationAndIssueAudit(filteredOrders);
    const coupons = this.buildCouponPerformance(filteredOrders);

    return {
      scopedOrdersCount: scopedOrders.length,
      filteredOrdersCount: filteredOrders.length,
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
    };
  }
}
