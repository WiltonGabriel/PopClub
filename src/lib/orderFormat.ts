import { Prisma } from "@prisma/client";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";

export type DbOrderPayload = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
  };
}> & {
  user?: {
    fullName?: string | null;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    isRegistered?: boolean | null;
  } | null;
};

export type AddonItemSummary = {
  id: string;
  name: string;
  groupName?: string;
  price: number;
  quantity: number;
};

export function formatOrder(o: DbOrderPayload, shiftCode?: string | null) {
  return {
    id: o.id,
    user_id: o.userId,
    status: o.status,
    subtotal: Number(o.subtotal),
    discount_amount: Number(o.discountAmount),
    delivery_fee: Number(o.deliveryFee || 0),
    total_amount: Number(o.totalAmount),
    payment_method_type: o.paymentMethodType,
    payment_change_for: o.paymentChangeFor ? Number(o.paymentChangeFor) : (o.changeFor ? Number(o.changeFor) : null),
    change_for: o.changeFor ? Number(o.changeFor) : (o.paymentChangeFor ? Number(o.paymentChangeFor) : null),
    change_to_return: o.changeToReturn ? Number(o.changeToReturn) : null,
    shift_id: o.shiftId,
    shift_code: shiftCode !== undefined ? shiftCode : null,
    is_archived: o.isArchived,
    tracking_token: o.trackingToken || null,
    is_gps_tracking_active: Boolean(o.isGpsTrackingActive),
    courier_latitude: o.courierLatitude ?? null,
    courier_longitude: o.courierLongitude ?? null,
    courier_updated_at: o.courierUpdatedAt ? o.courierUpdatedAt.toISOString() : null,
    origin_latitude: o.originLatitude ?? -15.6536,
    origin_longitude: o.originLongitude ?? -56.1322,
    origin_address: o.originAddress || "Várzea Grande, MT",
    branch_id: o.branchId || "store_config",
    delivery_address: {
      street: o.deliveryStreet,
      number: o.deliveryNumber,
      neighborhood: o.deliveryNeighborhood,
      city: o.deliveryCity,
      complement: o.deliveryComplement,
      reference: o.deliveryReference,
      zip: o.deliveryZip,
      latitude: o.deliveryLatitude,
      longitude: o.deliveryLongitude,
    },
    cancellation_reason: o.cancellationReason || null,
    cancelled_at: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    courier_name: o.courierName || null,
    courier_phone: o.courierPhone || null,
    courier_code: o.courierCode || null,
    order_pin: o.orderPin || null,
    dispatched_at: o.dispatchedAt ? o.dispatchedAt.toISOString() : null,
    delivered_at: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    delivery_issue: o.deliveryIssue || null,
    delivery_issue_notes: o.deliveryIssueNotes || null,
    delivery_issue_at: o.deliveryIssueAt ? o.deliveryIssueAt.toISOString() : null,
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
    items: (o.items || []).map((it) => ({
      id: it.id,
      order_id: it.orderId,
      product_id: it.productId,
      quantity: it.quantity,
      price_at_time: Number(it.priceAtTime),
      notes: it.notes || null,
      selected_addons: Array.isArray(it.selectedAddons)
        ? AddonOrganizationService.organizeOrderAddons(it.selectedAddons as unknown as AddonItemSummary[]).flatSorted
        : null,
      product: it.product
        ? {
            id: it.product.id,
            name: it.product.name,
            description: it.product.description || "",
            price: Number(it.product.price),
            imageUrl: it.product.imageUrl || "",
          }
        : undefined,
    })),
    user: o.user,
  };
}
