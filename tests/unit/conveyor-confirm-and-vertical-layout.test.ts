import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getConveyorConfirmContent } from "@/components/admin/StoreStatusTopWidget";

describe("Confirmação da Esteira (Gerenciar Pedidos & Painel Operacional) e Layout em Monitor Vertical", () => {
  it("gera diálogo destrutivo ao pausar a esteira, incluindo aviso quando há pedidos ativos", () => {
    const semPedidos = getConveyorConfirmContent(false, 0);
    expect(semPedidos.title).toBe("Pausar a esteira operacional?");
    expect(semPedidos.confirmLabel).toBe("Sim, Pausar Esteira");
    expect(semPedidos.variant).toBe("danger");
    expect(semPedidos.description).toContain("novos pedidos ficarão bloqueados");
    expect(semPedidos.description).not.toContain("Atenção: há");

    const comPedidos = getConveyorConfirmContent(false, 3);
    expect(comPedidos.variant).toBe("danger");
    expect(comPedidos.description).toContain("Atenção: há 3 pedido(s) em andamento na cozinha");
  });

  it("gera diálogo de confirmação positivo ao ligar/abrir a esteira novamente", () => {
    const ligar = getConveyorConfirmContent(true, 0);
    expect(ligar.title).toBe("Colocar a esteira para rodar?");
    expect(ligar.confirmLabel).toBe("Sim, Ligar Esteira");
    expect(ligar.variant).toBe("success");
    expect(ligar.description).toContain("loja ficará imediatamente aberta na vitrine pública");
  });

  it("garante que StoreStatusTopWidget exige confirmação antes de alternar a esteira e respeita RBAC", () => {
    const widgetPath = path.resolve(
      process.cwd(),
      "src/components/admin/StoreStatusTopWidget.tsx"
    );
    const src = fs.readFileSync(widgetPath, "utf-8");

    expect(src).toContain("ConfirmDialog");
    expect(src).toContain("getConveyorConfirmContent");
    expect(src).toContain("pendingTargetOpen");
    expect(src).toContain("handleRequestToggle(!isConveyorOpen)");
    expect(src).toContain("handleRequestToggle(true)");
    expect(src).toContain('canAccess("ORDERS_KANBAN")');
    expect(src).toContain('canAccess("settings_manage")');
    expect(src).toContain("canManageConveyor");

    const hookPath = path.resolve(process.cwd(), "src/hooks/useStoreStatus.ts");
    const hookSrc = fs.readFileSync(hookPath, "utf-8");
    expect(hookSrc).toContain("if (!res.ok)");
    expect(hookSrc).toContain("throw new Error");
  });

  it("sincroniza StoreStatusTopWidget com a Mini Esteira Live no Painel Operacional e em Gerenciar Pedidos", () => {
    const adminPagePath = path.resolve(process.cwd(), "src/app/admin/page.tsx");
    const adminSrc = fs.readFileSync(adminPagePath, "utf-8");
    expect(adminSrc).toContain("<StoreStatusTopWidget");
    expect(adminSrc).toContain("activeOrdersCount=");
    expect(adminSrc).toContain("onStatusChange=");
    expect(adminSrc).toContain("storeSettingsService.getSettings()");

    const pedidosPath = path.resolve(process.cwd(), "src/app/admin/pedidos/page.tsx");
    const pedidosSrc = fs.readFileSync(pedidosPath, "utf-8");
    expect(pedidosSrc).toContain("conveyorRefreshTrigger");
    expect(pedidosSrc).toContain("refreshTrigger={conveyorRefreshTrigger}");
    expect(pedidosSrc).toContain("activeOrdersCount={activeOrders.length}");
  });

  it("elimina overflow horizontal do Kanban e cabeçalho em monitores verticais (md/lg)", () => {
    const pedidosPath = path.resolve(process.cwd(), "src/app/admin/pedidos/page.tsx");
    const pedidosSrc = fs.readFileSync(pedidosPath, "utf-8");

    expect(pedidosSrc).toContain(
      "hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4 items-start w-full min-w-0"
    );
    expect(pedidosSrc).not.toContain("w-[300px] sm:w-[320px] shrink-0");
    expect(pedidosSrc).toContain("w-full min-w-0 transition-colors");
    expect(pedidosSrc).toContain("flex flex-wrap justify-between items-center gap-2 sticky top-0");

    const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");
    const globalsSrc = fs.readFileSync(globalsCssPath, "utf-8");
    expect(globalsSrc).toContain("overflow-x: clip;");
  });
});
