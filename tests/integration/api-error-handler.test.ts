import { describe, it, expect } from "vitest";
import { handleApiError } from "@/lib/api-error-handler";
import {
  StoreClosedException,
  ConveyorPausedException,
  OutOfStockException,
  ForbiddenActionException,
  UnauthorizedException,
  ResourceNotFoundException,
} from "@/domain/errors";

describe("handleApiError (Interceptação e Padronização de Exceções de Domínio)", () => {
  it("converte StoreClosedException em resposta HTTP 422 com metadados de vitrine", async () => {
    const error = new StoreClosedException("13:00", "23:30", "12:59");
    const response = handleApiError(error, "TEST /api/checkout");

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("STORE_CLOSED");
    expect(body.canAcceptOrders).toBe(false);
    expect(body.openingTime).toBe("13:00");
    expect(body.closingTime).toBe("23:30");
    expect(body.layer).toBe("domain");
    expect(body.module).toBe("schedule");
    expect(body.action).toBe("validate_store_schedule");
    expect(body.message).toContain("13:00");
  });

  it("converte ConveyorPausedException em resposta HTTP 422 com canAcceptOrders = false", async () => {
    const error = new ConveyorPausedException("13:00", "23:30");
    const response = handleApiError(error, "TEST /api/checkout");

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("CONVEYOR_PAUSED");
    expect(body.canAcceptOrders).toBe(false);
    expect(body.message).toContain("Finalizando os preparativos da cozinha");
  });

  it("converte OutOfStockException em resposta HTTP 400 com detalhes do produto", async () => {
    const error = new OutOfStockException("Copão Pop 500ml", 2, 5, "prod-99");
    const response = handleApiError(error, "TEST /api/checkout");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("OUT_OF_STOCK");
    expect(body.details).toEqual({
      productName: "Copão Pop 500ml",
      available: 2,
      requested: 5,
      productId: "prod-99",
    });
  });

  it("converte ForbiddenActionException em resposta HTTP 403 para violações de RBAC", async () => {
    const error = new ForbiddenActionException("ORDERS_KANBAN");
    const response = handleApiError(error, "TEST /api/admin");

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("FORBIDDEN_INSUFFICIENT_PERMISSIONS");
    expect(body.details).toEqual({ requiredPermission: "ORDERS_KANBAN" });
  });

  it("converte UnauthorizedException em resposta HTTP 401 para sessões ausentes", async () => {
    const error = new UnauthorizedException("Sessão expirada");
    const response = handleApiError(error, "TEST /api/auth");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.message).toBe("Sessão expirada");
  });

  it("converte ResourceNotFoundException em resposta HTTP 404", async () => {
    const error = new ResourceNotFoundException("Produto", "prod-not-found");
    const response = handleApiError(error, "TEST /api/products");

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("RESOURCE_NOT_FOUND");
    expect(body.details).toEqual({ entity: "Produto", id: "prod-not-found" });
  });

  it("converte erros desconhecidos em HTTP 500 genérico sem vazar segredos", async () => {
    const error = new Error("Database password leaked in log");
    const response = handleApiError(error, "TEST /api/order", "Erro ao processar o seu pedido.");

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.message).toBe("Erro ao processar o seu pedido.");
  });
});
