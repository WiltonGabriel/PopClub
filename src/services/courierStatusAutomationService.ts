import { prisma } from "@/lib/prisma";

export interface CourierOrderRef {
  courierId?: string | null;
  courierPhone?: string | null;
  courierName?: string | null;
}

export interface CourierMatchCandidate {
  id: string;
  name: string;
  phone: string;
  status: string;
  isActive: boolean;
}

export interface CourierAutomationResult {
  updated: boolean;
  courierId: string | null;
  status?: string;
}

interface CourierAutomationDb {
  courier: {
    findUnique: typeof prisma.courier.findUnique;
    findMany: typeof prisma.courier.findMany;
    update: typeof prisma.courier.update;
  };
  order: {
    findMany: typeof prisma.order.findMany;
  };
}

/**
 * Normaliza telefone para comparação resiliente (apenas dígitos, removendo DDI 55).
 */
export function normalizeCourierPhone(phone?: string | null): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Verifica se uma referência de pedido corresponde a um entregador cadastrado.
 */
export function doesOrderMatchCourier(
  orderRef: CourierOrderRef,
  courier: { id: string; name: string; phone: string }
): boolean {
  if (orderRef.courierId && orderRef.courierId === courier.id) {
    return true;
  }

  const normalizedOrderPhone = normalizeCourierPhone(orderRef.courierPhone);
  const normalizedCourierPhone = normalizeCourierPhone(courier.phone);
  if (
    normalizedOrderPhone.length >= 8 &&
    normalizedCourierPhone.length >= 8 &&
    normalizedOrderPhone === normalizedCourierPhone
  ) {
    return true;
  }

  const orderName = String(orderRef.courierName || "").trim().toLowerCase();
  const courierName = String(courier.name || "").trim().toLowerCase();
  return Boolean(orderName && courierName && orderName === courierName);
}

/**
 * Localiza o entregador ativo vinculado ao pedido por ID, telefone ou nome exato.
 */
export async function findMatchingCourierForOrder(
  orderRef: CourierOrderRef,
  db: CourierAutomationDb = prisma
): Promise<CourierMatchCandidate | null> {
  if (orderRef.courierId) {
    const byId = await db.courier.findUnique({
      where: { id: orderRef.courierId },
      select: { id: true, name: true, phone: true, status: true, isActive: true },
    });
    if (byId && byId.isActive) {
      return byId;
    }
    return null;
  }

  const normalizedTargetPhone = normalizeCourierPhone(orderRef.courierPhone);
  const targetName = String(orderRef.courierName || "").trim().toLowerCase();
  if (!normalizedTargetPhone && !targetName) {
    return null;
  }

  const activeCouriers = await db.courier.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true, status: true, isActive: true },
  });

  if (normalizedTargetPhone.length >= 8) {
    const byPhone = activeCouriers.find(
      (c) => normalizeCourierPhone(c.phone) === normalizedTargetPhone
    );
    if (byPhone) return byPhone;
  }

  if (targetName) {
    const byName = activeCouriers.find(
      (c) => String(c.name || "").trim().toLowerCase() === targetName
    );
    if (byName) return byName;
  }

  return null;
}

/**
 * Marca o entregador correspondente como "in_transit" (Em Rota) ao iniciar entrega.
 */
export async function markCourierInTransitForOrder(
  orderRef: CourierOrderRef,
  db: CourierAutomationDb = prisma
): Promise<CourierAutomationResult> {
  const courier = await findMatchingCourierForOrder(orderRef, db);
  if (!courier) {
    return { updated: false, courierId: null };
  }

  if (courier.status === "in_transit") {
    return { updated: false, courierId: courier.id, status: "in_transit" };
  }

  await db.courier.update({
    where: { id: courier.id },
    data: { status: "in_transit" },
  });

  return { updated: true, courierId: courier.id, status: "in_transit" };
}

/**
 * Retorna o entregador para "available" (Disponível) após finalizar/cancelar rota,
 * caso não haja outra entrega ativa ("delivering") atribuída a ele.
 * Nunca sobrescreve status manuais "off_duty" (Folga) ou "unavailable" (Indisponível).
 */
export async function releaseCourierIfNoActiveDeliveries(
  orderRef: CourierOrderRef,
  finishedOrderId: string,
  db: CourierAutomationDb = prisma
): Promise<CourierAutomationResult> {
  const courier = await findMatchingCourierForOrder(orderRef, db);
  if (!courier) {
    return { updated: false, courierId: null };
  }

  if (courier.status !== "in_transit") {
    return { updated: false, courierId: courier.id, status: courier.status };
  }

  const otherActiveDeliveries = await db.order.findMany({
    where: {
      status: "delivering",
      deliveredAt: null,
      isArchived: false,
      id: { not: finishedOrderId },
    },
    select: {
      id: true,
      courierId: true,
      courierPhone: true,
      courierName: true,
    },
  });

  const stillHasActiveDelivery = otherActiveDeliveries.some((other) =>
    doesOrderMatchCourier(other, courier)
  );

  if (stillHasActiveDelivery) {
    return { updated: false, courierId: courier.id, status: "in_transit" };
  }

  await db.courier.update({
    where: { id: courier.id },
    data: { status: "available" },
  });

  return { updated: true, courierId: courier.id, status: "available" };
}
