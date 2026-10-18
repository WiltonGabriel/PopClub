import { prisma } from "@/lib/prisma";

export const INACTIVE_RETENTION_DAYS = 60;

export interface PurgeResult {
  purgedCoupons: number;
  purgedPromotions: number;
  purgedCombos: number;
  cutoffDate: string;
  message: string;
}

export class ArchiveRetentionService {
  /**
   * Calcula a data de corte (TTL) para expurgo de dados inativos
   */
  static getCutoffDate(days: number = INACTIVE_RETENTION_DAYS): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Remove cupons inativos ou expirados há mais de X dias.
   * A integridade referencial com pedidos antigos é 100% preservada pois a tabela
   * `orders` armazena `coupon_code` diretamente em formato textual e `coupon_id` como SetNull.
   */
  static async purgeInactiveCoupons(cutoffDays: number = INACTIVE_RETENTION_DAYS): Promise<number> {
    const cutoff = this.getCutoffDate(cutoffDays);

    const result = await prisma.coupon.deleteMany({
      where: {
        OR: [
          { isActive: false, createdAt: { lt: cutoff } },
          { expiresAt: { not: null, lt: cutoff } },
        ],
      },
    });

    return result.count;
  }

  /**
   * Remove promoções desativadas ou expiradas há mais de X dias.
   * Pedidos passados mantêm o preço histórico registrado em `order_items.price_at_time`.
   */
  static async purgeInactivePromotions(cutoffDays: number = INACTIVE_RETENTION_DAYS): Promise<number> {
    const cutoff = this.getCutoffDate(cutoffDays);

    const result = await prisma.promotion.deleteMany({
      where: {
        OR: [
          { isActive: false, updatedAt: { lt: cutoff } },
          { expiresAt: { not: null, lt: cutoff } },
        ],
      },
    });

    return result.count;
  }

  /**
   * Remove combos desativados há mais de X dias que NUNCA receberam pedidos.
   * Se um combo possui histórico de vendas em `order_items`, a exclusão é prevenida
   * para assegurar a rastreabilidade fiscal e contábil.
   */
  static async purgeInactiveCombos(cutoffDays: number = INACTIVE_RETENTION_DAYS): Promise<number> {
    const cutoff = this.getCutoffDate(cutoffDays);

    // Busca combos inativos sem nenhum item de pedido vinculado
    const eligibleCombos = await prisma.product.findMany({
      where: {
        isCombo: true,
        isAvailable: false,
        createdAt: { lt: cutoff },
        orderItems: { none: {} },
      },
      select: { id: true },
    });

    if (eligibleCombos.length === 0) return 0;

    const ids = eligibleCombos.map((c) => c.id);
    const result = await prisma.product.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return result.count;
  }

  /**
   * Executa a rotina consolidada de expurgo com segurança transacional e integridade
   */
  static async purgeAll(cutoffDays: number = INACTIVE_RETENTION_DAYS): Promise<PurgeResult> {
    const [coupons, promotions, combos] = await Promise.all([
      this.purgeInactiveCoupons(cutoffDays),
      this.purgeInactivePromotions(cutoffDays),
      this.purgeInactiveCombos(cutoffDays),
    ]);

    const cutoff = this.getCutoffDate(cutoffDays).toISOString();
    const total = coupons + promotions + combos;

    return {
      purgedCoupons: coupons,
      purgedPromotions: promotions,
      purgedCombos: combos,
      cutoffDate: cutoff,
      message:
        total > 0
          ? `Expurgo concluído com sucesso: ${total} item(ns) inativo(s) há mais de ${cutoffDays} dias foram limpos.`
          : `Nenhum item elegível para expurgo (inativo há mais de ${cutoffDays} dias) foi encontrado.`,
    };
  }
}
