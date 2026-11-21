import { describe, it, expect } from "vitest";
import { AnalyticsDomainService } from "@/domain/services/AnalyticsDomainService";
import type { Order } from "@/services/orderService";
import type { Product } from "@/services/productService";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: overrides.id ?? "ord-1",
    user_id: overrides.user_id ?? "user-1",
    status: overrides.status ?? "completed",
    subtotal: overrides.subtotal ?? 40,
    discount_amount: overrides.discount_amount ?? 0,
    coupon_code: overrides.coupon_code ?? null,
    delivery_fee: overrides.delivery_fee ?? 5,
    total_amount: overrides.total_amount ?? 45,
    payment_method_type: overrides.payment_method_type ?? "pix_entrega",
    delivery_address: overrides.delivery_address ?? {
      street: "Av. Couto Magalhães",
      number: "100",
      neighborhood: "Centro",
    },
    created_at: overrides.created_at ?? "2026-11-21T18:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-11-21T18:30:00.000Z",
    dispatched_at: overrides.dispatched_at ?? "2026-11-21T18:10:00.000Z",
    delivered_at: overrides.delivered_at ?? "2026-11-21T18:30:00.000Z",
    items: overrides.items ?? [
      {
        id: "item-1",
        order_id: overrides.id ?? "ord-1",
        product_id: "prod-acai-500",
        quantity: 1,
        price_at_time: 40,
        product: {
          id: "prod-acai-500",
          name: "Copo 500ml",
          description: "",
          price: 40,
          imageUrl: "",
        },
        selected_addons: null,
      },
    ],
    ...overrides,
  };
}

const catalog: Product[] = [
  {
    id: "prod-acai-500",
    name: "Copo 500ml",
    description: "",
    price: 40,
    category: "Copos de Açaí",
    imageUrl: "",
  },
  {
    id: "prod-shake-300",
    name: "Milk Shake 300ml",
    description: "",
    price: 20,
    category: "Milk Shakes",
    imageUrl: "",
  },
  {
    id: "prod-sem-giro",
    name: "Picolé Experimental",
    description: "",
    price: 8,
    category: "Sorvetes",
    imageUrl: "",
  },
];

describe("AnalyticsDomainService (Métricas Operacionais, SLA e BI)", () => {
  const refDate = new Date("2026-11-21T20:00:00.000Z");

  it("exclui pedidos cancelados de faturamento, pagamentos, logística Delivery/Balcão e Top Bairros", () => {
    const orders: Order[] = [
      makeOrder({
        id: "valid-delivery",
        status: "completed",
        subtotal: 40,
        delivery_fee: 5,
        total_amount: 45,
        payment_method_type: "pix_entrega",
        delivery_address: { street: "Rua A", number: "10", neighborhood: "Cristo Rei" },
      }),
      makeOrder({
        id: "valid-pickup",
        status: "completed",
        subtotal: 20,
        delivery_fee: 0,
        total_amount: 20,
        payment_method_type: "dinheiro",
        delivery_address: { street: "Retirada no Balcão", number: "S/N", neighborhood: "Balcão" },
      }),
      makeOrder({
        id: "cancelled-card",
        status: "cancelled",
        subtotal: 999,
        delivery_fee: 15,
        total_amount: 1014,
        payment_method_type: "cartao_maquininha",
        delivery_address: { street: "Rua Z", number: "99", neighborhood: "Bairro Fantasma" },
        cancellation_reason: "Cliente desistiu",
      }),
    ];

    const report = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "tudo",
      null,
      refDate
    );

    expect(report.kpis.totalRevenue).toBe(65);
    expect(report.kpis.productRevenue).toBe(60);
    expect(report.kpis.freightRevenue).toBe(5);
    expect(report.kpis.cancelledCount).toBe(1);
    expect(report.payments.map((p) => p.name)).toEqual(["Pix", "Dinheiro"]);
    expect(report.payments.find((p) => p.name === "Cartão")).toBeUndefined();
    expect(report.logistics.deliveryCount).toBe(1);
    expect(report.logistics.pickupCount).toBe(1);
    expect(report.neighborhoods.data.map((n) => n.name)).toEqual(["Cristo Rei"]);
    expect(report.audit.lostRevenue).toBe(1014);
    expect(report.audit.reasons[0]).toEqual({
      reason: "Cliente desistiu",
      count: 1,
      lostRevenue: 1014,
    });
  });

  it("calcula SLA real (cozinha, rota e lead time), descarta timestamps inválidos/outliers (>240min) e retorna null sem amostra", () => {
    const orders: Order[] = [
      makeOrder({
        id: "sla-1",
        created_at: "2026-11-21T18:00:00.000Z",
        dispatched_at: "2026-11-21T18:10:00.000Z", // 10 min cozinha
        delivered_at: "2026-11-21T18:30:00.000Z", // 20 min rota, 30 min total (<= 40)
      }),
      makeOrder({
        id: "sla-2",
        created_at: "2026-11-21T19:00:00.000Z",
        dispatched_at: "2026-11-21T19:20:00.000Z", // 20 min cozinha
        delivered_at: "2026-11-21T19:50:00.000Z", // 30 min rota, 50 min total (> 40)
      }),
      makeOrder({
        id: "sla-outlier",
        created_at: "2026-11-21T10:00:00.000Z",
        dispatched_at: "2026-11-21T09:50:00.000Z", // negativo (ignorar)
        delivered_at: "2026-11-21T20:00:00.000Z", // 600 min outlier > 240 (ignorar)
        updated_at: "2026-11-21T20:00:00.000Z",
      }),
    ];

    const report = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "tudo",
      null,
      refDate
    );

    expect(report.kpis.avgPrepMinutes).toBe(15);
    expect(report.kpis.avgRouteMinutes).toBe(25);
    expect(report.kpis.avgLeadTimeMinutes).toBe(40);
    expect(report.kpis.slaSampleCount).toBe(2);
    expect(report.kpis.slaWithinTargetRate).toBe(50);

    const noTimestampsReport = AnalyticsDomainService.generateReport(
      [
        makeOrder({
          id: "no-ts",
          status: "pending",
          dispatched_at: null,
          delivered_at: null,
        }),
      ],
      catalog,
      "all_history",
      "tudo",
      null,
      refDate
    );

    expect(noTimestampsReport.kpis.avgPrepMinutes).toBeNull();
    expect(noTimestampsReport.kpis.avgRouteMinutes).toBeNull();
    expect(noTimestampsReport.kpis.avgLeadTimeMinutes).toBeNull();
    expect(noTimestampsReport.kpis.slaWithinTargetRate).toBeNull();
  });

  it("calcula delta % comparativo contra período anterior e retorna null para tudo e active_shift", () => {
    const orders: Order[] = [
      makeOrder({
        id: "today-1",
        total_amount: 120,
        created_at: "2026-11-21T15:00:00.000Z",
      }),
      makeOrder({
        id: "yesterday-1",
        total_amount: 80,
        created_at: "2026-11-20T15:00:00.000Z",
      }),
    ];

    const todayReport = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "hoje",
      null,
      refDate
    );
    expect(todayReport.kpis.deltas).toEqual({
      revenuePct: 50,
      ordersPct: 0,
      ticketPct: 50,
    });

    const allReport = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "tudo",
      null,
      refDate
    );
    expect(allReport.kpis.deltas).toBeNull();

    const shiftReport = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "active_shift",
      "hoje",
      null,
      refDate
    );
    expect(shiftReport.kpis.deltas).toBeNull();
  });

  it("calcula retenção e recompra corretamente por cliente", () => {
    const orders: Order[] = [
      makeOrder({ id: "o1", user_id: "u1", total_amount: 40 }),
      makeOrder({ id: "o2", user_id: "u1", total_amount: 60 }),
      makeOrder({ id: "o3", user_id: "u2", total_amount: 100 }),
    ];

    const report = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "tudo",
      null,
      refDate
    );

    expect(report.kpis.uniqueCustomersCount).toBe(2);
    expect(report.kpis.repeatCustomersCount).toBe(1);
    expect(report.kpis.repeatCustomerRate).toBe(50);
    expect(report.kpis.repeatRevenueShare).toBe(50);
  });

  it("identifica horários de pico hora a hora e distribuição semanal", () => {
    // 2026-11-21 é sábado (dayIndex 6) em UTC; usamos horários locais consistentes via Date constructor
    const h18a = new Date(2026, 10, 21, 18, 15, 0).toISOString();
    const h18b = new Date(2026, 10, 21, 18, 45, 0).toISOString();
    const h20 = new Date(2026, 10, 20, 20, 10, 0).toISOString();

    const orders: Order[] = [
      makeOrder({ id: "p1", created_at: h18a, total_amount: 50 }),
      makeOrder({ id: "p2", created_at: h18b, total_amount: 70 }),
      makeOrder({ id: "p3", created_at: h20, total_amount: 30 }),
    ];

    const report = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "tudo",
      null,
      new Date(2026, 10, 21, 22, 0, 0)
    );

    expect(report.demand.peakHourLabel).toBe("18h");
    expect(report.demand.peakHourOrders).toBe(2);
    const slot18 = report.demand.hourly.find((h) => h.hour === 18);
    expect(slot18?.isPeak).toBe(true);
    expect(report.demand.bestWeekdayLabel).toBe("Sáb");
    expect(report.demand.bestWeekdayRevenue).toBe(120);
  });

  it("calcula mix por categoria, ranking com itens sem saída, attach rate e ranking de adicionais", () => {
    const orders: Order[] = [
      makeOrder({
        id: "upsell-1",
        items: [
          {
            id: "it-1",
            order_id: "upsell-1",
            product_id: "prod-acai-500",
            quantity: 2,
            price_at_time: 40,
            product: { id: "prod-acai-500", name: "Copo 500ml", description: "", price: 40, imageUrl: "" },
            selected_addons: [
              { id: "ad-1", name: "Nutella Pura", groupName: "Cremes", price: 7, quantity: 1 },
              { id: "ad-2", name: "Não preciso de colher", groupName: "Talheres", price: 0, quantity: 1 },
            ],
          },
          {
            id: "it-2",
            order_id: "upsell-1",
            product_id: "prod-shake-300",
            quantity: 1,
            price_at_time: 20,
            product: { id: "prod-shake-300", name: "Milk Shake 300ml", description: "", price: 20, imageUrl: "" },
            selected_addons: null,
          },
        ],
      }),
    ];

    const report = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "tudo",
      null,
      refDate
    );

    expect(report.categoryMix[0]).toMatchObject({
      category: "Copos de Açaí",
      quantity: 2,
      revenue: 80,
      sharePct: 80,
    });
    expect(report.addons.totalItemsCount).toBe(2);
    expect(report.addons.itemsWithAddonsCount).toBe(1);
    expect(report.addons.attachRatePct).toBe(50);
    expect(report.addons.addonRevenue).toBe(14);
    expect(report.addons.topAddons).toHaveLength(1);
    expect(report.addons.topAddons[0].name).toBe("Nutella Pura");

    const zeroSalesItem = report.productStats.find((p) => p.id === "prod-sem-giro");
    expect(zeroSalesItem?.quantity).toBe(0);
  });

  it("agrupa cupons, performance de entregadores e ocorrências de entrega", () => {
    const orders: Order[] = [
      makeOrder({
        id: "c1",
        coupon_code: "POP10",
        discount_amount: 10,
        total_amount: 90,
        courier_name: "Carlos Silva",
        dispatched_at: "2026-11-21T18:00:00.000Z",
        delivered_at: "2026-11-21T18:18:00.000Z",
        delivery_issue: "Cliente ausente temporariamente",
      }),
      makeOrder({
        id: "c2",
        coupon_code: null,
        discount_amount: 0,
        total_amount: 50,
        courier_name: "Carlos Silva",
        dispatched_at: "2026-11-21T19:00:00.000Z",
        delivered_at: "2026-11-21T19:22:00.000Z",
      }),
    ];

    const report = AnalyticsDomainService.generateReport(
      orders,
      catalog,
      "all_history",
      "tudo",
      null,
      refDate
    );

    expect(report.coupons.totalDiscount).toBe(10);
    expect(report.coupons.avgTicketWithCoupon).toBe(90);
    expect(report.coupons.avgTicketWithoutCoupon).toBe(50);
    expect(report.coupons.topCoupons[0]).toEqual({
      code: "POP10",
      uses: 1,
      totalDiscount: 10,
      generatedRevenue: 90,
    });

    expect(report.couriers[0]).toEqual({
      courierName: "Carlos Silva",
      deliveries: 2,
      completedDeliveries: 2,
      avgRouteMinutes: 20,
      issuesCount: 1,
      revenueDelivered: 140,
    });

    expect(report.audit.totalIssuesCount).toBe(1);
    expect(report.audit.issues[0]).toEqual({
      issue: "Cliente ausente temporariamente",
      count: 1,
    });
  });

  it("lida com array vazio sem gerar NaN ou Infinity", () => {
    const report = AnalyticsDomainService.generateReport(
      [],
      [],
      "all_history",
      "hoje",
      null,
      refDate
    );

    expect(report.kpis.totalRevenue).toBe(0);
    expect(report.kpis.averageTicket).toBe(0);
    expect(report.kpis.completedRate).toBe(0);
    expect(report.kpis.repeatCustomerRate).toBe(0);
    expect(report.kpis.avgLeadTimeMinutes).toBeNull();
    expect(report.kpis.deltas).toBeNull();
    expect(report.addons.attachRatePct).toBe(0);
    expect(report.demand.weekdays).toHaveLength(7);
  });
});
