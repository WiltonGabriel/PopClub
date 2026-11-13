/**
 * Plano estruturado de restauração e limpeza controlada pré-lançamento.
 * Centraliza a ordem topológica de tabelas (snake_case no PostgreSQL),
 * preservação obrigatória de equipe/catálogo e checklist de higiene pré-produção.
 */

export const RESTORE_INSERT_ORDER = [
  "store_settings",
  "loading_settings",
  "highlight_banners",
  "card_badges",
  "categories",
  "custom_audience_lists",
  "avatar_presets",
  "notification_templates",
  "loyalty_badge_configs",
  "custom_roles",
  "couriers",
  "shifts",
  "coupons",
  "addon_groups",
  "users",
  "user_locations",
  "products",
  "addon_items",
  "product_addon_groups",
  "combo_items",
  "promotions",
  "notifications",
  "user_notifications",
  "orders",
  "order_items",
  "coupon_redemptions",
  "admin_audit_logs",
] as const;

export const CLEANUP_DELETE_TABLES_ORDER = [
  "coupon_redemptions",
  "order_items",
  "orders",
  "user_notifications",
  "notifications",
  "custom_audience_lists",
  "user_locations",
  "users (role = CLIENT)",
  "shifts",
] as const;

export const PRESERVED_SYSTEM_TABLES = [
  "users (role IN ADMIN, EDITOR)",
  "custom_roles",
  "store_settings",
  "loading_settings",
  "highlight_banners",
  "card_badges",
  "categories",
  "products",
  "combo_items",
  "addon_groups",
  "addon_items",
  "product_addon_groups",
  "promotions",
  "coupons (regras preservadas, uses = 0)",
  "avatar_presets",
  "notification_templates",
  "loyalty_badge_configs",
  "couriers",
  "admin_audit_logs",
] as const;

export const PLACEHOLDER_VALUES = {
  whatsappNumbers: ["5565999999999", "5565992345678"],
  mockCourierNames: ["Carlos Silva", "Marcos Vinícius", "Lucas Ferreira"],
  defaultAdminEmails: ["admin@popclub.com"],
} as const;

export interface PrelaunchSnapshotInput {
  counts: {
    activeAdmins: number;
    editors: number;
    clientsTotal: number;
    clientsRegistered: number;
    clientsFastAccess: number;
    orders: number;
    orderItems: number;
    couponRedemptions: number;
    notifications: number;
    userNotifications: number;
    customAudienceLists: number;
    userLocations: number;
    shifts: number;
    coupons: number;
    products: number;
    promotions: number;
    categories: number;
    couriers: number;
  };
  storeSettings?: {
    whatsappNumber?: string | null;
    supportPhone?: string | null;
    storeCnpj?: string | null;
    storeAddress?: string | null;
  } | null;
  courierNames?: string[];
  adminEmails?: string[];
}

export interface PrelaunchCleanupPlanReport {
  safeToExecute: boolean;
  blockReason: string | null;
  willDelete: {
    couponRedemptions: number;
    orderItems: number;
    orders: number;
    userNotifications: number;
    notifications: number;
    customAudienceLists: number;
    userLocations: number;
    clientUsers: number;
    clientsRegistered: number;
    clientsFastAccess: number;
    shifts: number;
  };
  willResetCounters: {
    storeSettingsShiftFields: number;
    couponsUsesReset: number;
    productsScarcityReset: number;
    promotionsScarcityReset: number;
  };
  willPreserve: {
    activeAdmins: number;
    editors: number;
    categories: number;
    products: number;
    promotions: number;
    coupons: number;
    couriers: number;
  };
  hygieneWarnings: string[];
}

/**
 * Gera relatório determinístico e sem PII sensível do impacto da limpeza pré-lançamento.
 */
export function buildPrelaunchCleanupReport(
  snapshot: PrelaunchSnapshotInput
): PrelaunchCleanupPlanReport {
  const { counts, storeSettings, courierNames = [], adminEmails = [] } = snapshot;

  const blockReason =
    counts.activeAdmins < 1
      ? "Bloqueado: Nenhum administrador ativo (ADMIN) encontrado. O sistema exige ao menos 1 ADMIN preservado."
      : null;

  const hygieneWarnings: string[] = [];

  if (
    storeSettings?.whatsappNumber &&
    (PLACEHOLDER_VALUES.whatsappNumbers as readonly string[]).includes(
      storeSettings.whatsappNumber.replace(/\D/g, "")
    )
  ) {
    hygieneWarnings.push(
      "StoreSettings.whatsappNumber ainda utiliza número padrão de desenvolvimento."
    );
  }

  if (!storeSettings?.storeCnpj || !storeSettings.storeCnpj.trim()) {
    hygieneWarnings.push(
      "StoreSettings.storeCnpj está vazio (preencha em Canais & Atendimento se aplicável)."
    );
  }

  const matchedMockCouriers = courierNames.filter((name) =>
    (PLACEHOLDER_VALUES.mockCourierNames as readonly string[]).includes(name.trim())
  );
  if (matchedMockCouriers.length > 0) {
    hygieneWarnings.push(
      `Entregadores possivelmente de exemplo detectados: ${matchedMockCouriers.join(", ")}.`
    );
  }

  const matchedDefaultAdmins = adminEmails.filter((email) =>
    (PLACEHOLDER_VALUES.defaultAdminEmails as readonly string[]).includes(email.trim().toLowerCase())
  );
  if (matchedDefaultAdmins.length > 0) {
    hygieneWarnings.push(
      "Conta administrativa padrão (admin@popclub.com) detectada: certifique-se de que a senha padrão de dev foi alterada."
    );
  }

  return {
    safeToExecute: blockReason === null,
    blockReason,
    willDelete: {
      couponRedemptions: counts.couponRedemptions,
      orderItems: counts.orderItems,
      orders: counts.orders,
      userNotifications: counts.userNotifications,
      notifications: counts.notifications,
      customAudienceLists: counts.customAudienceLists,
      userLocations: counts.userLocations,
      clientUsers: counts.clientsTotal,
      clientsRegistered: counts.clientsRegistered,
      clientsFastAccess: counts.clientsFastAccess,
      shifts: counts.shifts,
    },
    willResetCounters: {
      storeSettingsShiftFields: storeSettings ? 1 : 0,
      couponsUsesReset: counts.coupons,
      productsScarcityReset: counts.products,
      promotionsScarcityReset: counts.promotions,
    },
    willPreserve: {
      activeAdmins: counts.activeAdmins,
      editors: counts.editors,
      categories: counts.categories,
      products: counts.products,
      promotions: counts.promotions,
      coupons: counts.coupons,
      couriers: counts.couriers,
    },
    hygieneWarnings,
  };
}
