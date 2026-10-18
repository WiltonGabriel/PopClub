import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  couponFailedAttemptsLimiter,
  createRateLimitResponse,
  adminOperationsLimiter,
} from "@/lib/rateLimit";
import { ArchiveRetentionService, INACTIVE_RETENTION_DAYS } from "@/services/archiveRetentionService";
import { prisma } from "@/lib/prisma";

describe("Eixo 1 & 2: Rate Limiting Realista, Proporcional e UX Humanizada", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tolerância Humana e Bloqueio Granular de Tentativas de Cupons", () => {
    it("permite digitação e erros pontuais (até 4 tentativas) sem penalizar o cliente", () => {
      const clientIp = "192.168.1.100";
      couponFailedAttemptsLimiter.reset(clientIp);

      // 4 tentativas consecutivas inválidas (ex: erro de digitação de maiúsculas/minúsculas)
      for (let i = 1; i <= 4; i++) {
        const check = couponFailedAttemptsLimiter.check(clientIp);
        expect(check.success).toBe(true);
        expect(couponFailedAttemptsLimiter.isBlocked(clientIp)).toBeNull();
      }

      couponFailedAttemptsLimiter.reset(clientIp);
    });

    it("ativa bloqueio defensivo ao exceder a tolerância consecutiva com mensagem amigável e acolhedora", () => {
      const clientIp = "192.168.1.101";
      couponFailedAttemptsLimiter.reset(clientIp);

      for (let i = 1; i <= 5; i++) {
        couponFailedAttemptsLimiter.check(clientIp);
      }

      // Tentativa excedente dentro da janela de 2 minutos
      const blockedAttempt = couponFailedAttemptsLimiter.check(clientIp);
      expect(blockedAttempt.success).toBe(false);
      expect(blockedAttempt.retryAfter).toBeGreaterThan(0);

      // isBlocked agora retorna o status de bloqueio sem consumir tokens adicionais
      const blockedStatus = couponFailedAttemptsLimiter.isBlocked(clientIp);
      expect(blockedStatus).not.toBeNull();
      expect(blockedStatus?.success).toBe(false);

      // Resposta humanizada
      const friendlyMsg =
        "Você testou alguns cupons seguidos. Respire fundo e aguarde 2 minutinhos para tentar outro código.";
      const response = createRateLimitResponse(blockedAttempt, friendlyMsg);
      expect(response.status).toBe(429);

      couponFailedAttemptsLimiter.reset(clientIp);
    });

    it("zera o histórico de erros assim que um cupom válido é aplicado com sucesso", () => {
      const clientIp = "192.168.1.102";
      couponFailedAttemptsLimiter.reset(clientIp);

      // O cliente errou 3 vezes
      couponFailedAttemptsLimiter.check(clientIp);
      couponFailedAttemptsLimiter.check(clientIp);
      couponFailedAttemptsLimiter.check(clientIp);

      // Acertou o código do cupom: reset efetuado
      couponFailedAttemptsLimiter.reset(clientIp);

      // Nova verificação deve ter a cota completamente renovada
      const freshAttempt = couponFailedAttemptsLimiter.check(clientIp);
      expect(freshAttempt.success).toBe(true);
      expect(freshAttempt.remaining).toBe(4);

      couponFailedAttemptsLimiter.reset(clientIp);
    });

    it("gera payloads semânticos sem expor termos técnicos frios ou alarmistas", async () => {
      const mockResult = {
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 90000,
        retryAfter: 90,
      };

      const response = createRateLimitResponse(
        mockResult,
        "Já estamos processando um pedido seu. Aguarde alguns instantes antes de enviar novamente."
      );

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("90");

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.retryAfter).toBe(90);
      expect(body.retryAfterFormatted).toBe("2 minutinhos");
      expect(body.message).toContain("Já estamos processando um pedido seu");
      // Não deve conter termos técnicos agressivos
      expect(body.message).not.toContain("Too Many Requests");
      expect(body.message).not.toContain("HTTP 429");
    });
  });

  describe("Elasticidade para Operações do Lojista (Painel Administrativo)", () => {
    it("concede margem ampla para edições e cadastros em lote sem falsos positivos de DoS", () => {
      const adminIp = "admin-session-ip-1";
      adminOperationsLimiter.reset(adminIp);

      // Simula 50 operações rápidas de atualização de catálogo
      for (let i = 0; i < 50; i++) {
        const check = adminOperationsLimiter.check(adminIp);
        expect(check.success).toBe(true);
      }

      adminOperationsLimiter.reset(adminIp);
    });
  });
});

describe("Eixo 3: Gestão de Dados Inativos / Arquivados e Ciclo de Retenção (TTL 60 Dias)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calcula a data de corte precisa para a política de retenção de 60 dias", () => {
    const now = Date.now();
    const cutoff = ArchiveRetentionService.getCutoffDate(INACTIVE_RETENTION_DAYS);
    const expectedDiffMs = 60 * 24 * 60 * 60 * 1000;
    const actualDiffMs = now - cutoff.getTime();

    // Tolerância de 1 segundo para execução
    expect(Math.abs(actualDiffMs - expectedDiffMs)).toBeLessThan(1000);
  });

  it("expurga cupons inativos ou expirados há mais de 60 dias sem quebrar pedidos passados", async () => {
    const deleteManySpy = vi.spyOn(prisma.coupon, "deleteMany").mockResolvedValue({ count: 7 });

    const purged = await ArchiveRetentionService.purgeInactiveCoupons(60);
    expect(purged).toBe(7);
    expect(deleteManySpy).toHaveBeenCalledTimes(1);

    const callArg = deleteManySpy.mock.calls[0][0] as any;
    expect(callArg.where.OR).toBeDefined();
    expect(callArg.where.OR).toHaveLength(2);
  });

  it("expurga promoções inativas há mais de 60 dias preservando o histórico de preços dos pedidos", async () => {
    const deleteManySpy = vi.spyOn(prisma.promotion, "deleteMany").mockResolvedValue({ count: 4 });

    const purged = await ArchiveRetentionService.purgeInactivePromotions(60);
    expect(purged).toBe(4);
    expect(deleteManySpy).toHaveBeenCalledTimes(1);
  });

  it("protege estritamente combos que já possuem histórico de vendas contra exclusão física", async () => {
    // 1. Quando há 2 combos inativos antigos, mas apenas 1 nunca recebeu pedidos
    const findManySpy = vi.spyOn(prisma.product, "findMany").mockResolvedValue([
      { id: "combo-sem-vendas-1" },
    ] as any);
    const deleteManySpy = vi.spyOn(prisma.product, "deleteMany").mockResolvedValue({ count: 1 });

    const purged = await ArchiveRetentionService.purgeInactiveCombos(60);

    expect(findManySpy).toHaveBeenCalledTimes(1);
    const findArg = findManySpy.mock.calls[0][0] as any;
    // Garante que o critério orderItems: { none: {} } foi aplicado na busca
    expect(findArg.where.orderItems).toEqual({ none: {} });
    expect(findArg.where.isCombo).toBe(true);
    expect(findArg.where.isAvailable).toBe(false);

    expect(deleteManySpy).toHaveBeenCalledWith({
      where: {
        id: { in: ["combo-sem-vendas-1"] },
      },
    });
    expect(purged).toBe(1);
  });

  it("consolida a rotina de expurgo total retornando métricas claras para o operador", async () => {
    vi.spyOn(prisma.coupon, "deleteMany").mockResolvedValue({ count: 3 });
    vi.spyOn(prisma.promotion, "deleteMany").mockResolvedValue({ count: 2 });
    vi.spyOn(prisma.product, "findMany").mockResolvedValue([{ id: "combo-1" }] as any);
    vi.spyOn(prisma.product, "deleteMany").mockResolvedValue({ count: 1 });

    const result = await ArchiveRetentionService.purgeAll(60);

    expect(result.purgedCoupons).toBe(3);
    expect(result.purgedPromotions).toBe(2);
    expect(result.purgedCombos).toBe(1);
    expect(result.message).toContain("Expurgo concluído com sucesso");
    expect(result.cutoffDate).toBeDefined();
  });
});
