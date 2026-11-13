import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  sanitizeAuditMetadata,
  sanitizeDiffKeys,
  recordAdminAudit,
  listAdminAuditLogs,
} from "@/services/auditLogService";

describe("auditLogService — Sanitização de PII, Gravação Segura e Paginação", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("remove/mascara campos sensíveis e PII de metadata recursivamente", () => {
    const clean = sanitizeAuditMetadata({
      roleName: "Gerente",
      pixKey: "chave-pix-secreta@banco.com",
      passwordHash: "$2a$10$hash",
      phone: "65999990000",
      cpf: "12345678900",
      email: "user@example.com",
      nested: {
        token: "jwt-secret",
        vehicle: "Moto",
      },
      count: 4,
    });

    expect(clean).toEqual({
      roleName: "Gerente",
      pixKey: "[REDACTED]",
      passwordHash: "[REDACTED]",
      phone: "[REDACTED]",
      cpf: "[REDACTED]",
      email: "[REDACTED]",
      nested: {
        token: "[REDACTED]",
        vehicle: "Moto",
      },
      count: 4,
    });
  });

  it("filtra diffKeys removendo nomes que exponham token ou secret", () => {
    const keys = sanitizeDiffKeys([
      "storeCnpj",
      "tokenVersion",
      "jwtSecret",
      "storeCnpj",
      "whatsappNumber",
    ]);

    expect(keys).toEqual(["storeCnpj", "whatsappNumber"]);
  });

  it("recordAdminAudit persiste registro sanitizado com actorRole em maiúsculas", async () => {
    const createSpy = vi
      .spyOn(prisma.adminAuditLog, "create")
      .mockResolvedValue({ id: "audit-1" } as any);

    const ok = await recordAdminAudit({
      actor: { id: "admin-1", role: "admin" },
      action: "UPDATE_COURIER",
      resourceType: "courier",
      resourceId: "c-1",
      summary: "Atualizou entregador João (CPF 123.456.789-00).",
      diffKeys: ["status", "pixKey"],
      metadata: { pixKey: "12345678900", status: "available" },
    });

    expect(ok).toBe(true);
    expect(createSpy).toHaveBeenCalledTimes(1);
    const callData = createSpy.mock.calls[0][0].data as any;
    expect(callData.actorRole).toBe("ADMIN");
    expect(callData.summary).toContain("[CPF]");
    expect(callData.summary).not.toContain("123.456.789-00");
    expect(callData.metadata).toEqual({
      pixKey: "[REDACTED]",
      status: "available",
    });
  });

  it("recordAdminAudit não propaga erro em falha transitória de banco", async () => {
    vi.spyOn(prisma.adminAuditLog, "create").mockRejectedValue(new Error("DB down"));
    const ok = await recordAdminAudit({
      actor: { id: "admin-1", role: "admin" },
      action: "TEST",
      resourceType: "test",
      summary: "Teste",
    });
    expect(ok).toBe(false);
  });

  it("listAdminAuditLogs aplica limites seguros de paginação (1..100)", async () => {
    const findSpy = vi.spyOn(prisma.adminAuditLog, "findMany").mockResolvedValue([]);
    const countSpy = vi.spyOn(prisma.adminAuditLog, "count").mockResolvedValue(0);

    const res = await listAdminAuditLogs({ page: -5, limit: 999, resourceType: "coupon" });

    expect(res.page).toBe(1);
    expect(res.limit).toBe(100);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resourceType: "coupon" },
        skip: 0,
        take: 100,
      })
    );
    expect(countSpy).toHaveBeenCalledTimes(1);
  });
});
