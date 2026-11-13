import { ADMIN_ONLY_TABS, PermissionKey, hasPermission, isUserAdmin } from "./permissions";

export type AdminGroupId =
  | "operacao"
  | "catalogo"
  | "marketing"
  | "fidelidade"
  | "sistema";

export type AdminTabId =
  | "metricas"
  | "logistica_entregadores"
  | "categorias"
  | "complementos"
  | "combos"
  | "promocoes"
  | "banners_selos"
  | "cupons"
  | "disparos_notificacoes"
  | "selos_fidelidade"
  | "avatares"
  | "identidade_visual"
  | "canais_atendimento"
  | "auditoria";

export interface AdminTabMeta {
  id: AdminTabId;
  groupId: AdminGroupId;
  label: string;
  shortLabel?: string;
  description: string;
  perm: PermissionKey | null;
  adminOnly?: boolean;
  iconKey:
    | "BarChart3"
    | "Truck"
    | "FolderTree"
    | "IceCream"
    | "Zap"
    | "Tag"
    | "ImageIcon"
    | "Ticket"
    | "Bell"
    | "Award"
    | "User"
    | "Palette"
    | "MessageCircle"
    | "ShieldCheck";
}

export interface AdminGroupMeta {
  id: AdminGroupId;
  label: string;
  description: string;
  iconKey: "Activity" | "Store" | "Megaphone" | "Award" | "Settings";
  tabs: AdminTabMeta[];
}

export interface NavUserContext {
  role?: string | null;
  permissions?: string[] | null;
  customRole?: { permissions?: string[] } | null;
}

/**
 * Arquitetura de Informação em 2 Níveis (5 Grupos Principais -> Sub-abas Contextuais).
 * Ordem definida pelo critério de frequência operacional e separação clara entre vitrine e fidelidade.
 */
export const ADMIN_NAV_GROUPS: AdminGroupMeta[] = [
  {
    id: "operacao",
    label: "Operação",
    description: "Desempenho em tempo real, frota de entregadores e logística.",
    iconKey: "Activity",
    tabs: [
      {
        id: "metricas",
        groupId: "operacao",
        label: "Métricas & Desempenho",
        shortLabel: "Métricas",
        description: "Faturamento, ticket médio e pedidos por hora.",
        perm: "metrics_view",
        iconKey: "BarChart3",
      },
      {
        id: "logistica_entregadores",
        groupId: "operacao",
        label: "Logística & Entregadores",
        shortLabel: "Logística",
        description: "Turno da frota, taxas de entrega, raio, sede e horários.",
        perm: "logistics_manage",
        iconKey: "Truck",
      },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    description: "Cardápio, acompanhamentos, kits e destaques da vitrine.",
    iconKey: "Store",
    tabs: [
      {
        id: "categorias",
        groupId: "catalogo",
        label: "Categorias",
        description: "Organização das seções do cardápio.",
        perm: "menu_manage",
        iconKey: "FolderTree",
      },
      {
        id: "complementos",
        groupId: "catalogo",
        label: "Complementos",
        description: "Grupos de adicionais e acompanhamentos.",
        perm: "menu_manage",
        iconKey: "IceCream",
      },
      {
        id: "combos",
        groupId: "catalogo",
        label: "Combos",
        description: "Kits especiais e lotes em vigência.",
        perm: "menu_manage",
        iconKey: "Zap",
      },
      {
        id: "promocoes",
        groupId: "catalogo",
        label: "Promoções",
        description: "Descontos diretos em produtos e ofertas relâmpago.",
        perm: "promotions_manage",
        iconKey: "Tag",
      },
      {
        id: "banners_selos",
        groupId: "catalogo",
        label: "Banners & Selos dos Cards",
        shortLabel: "Banners & Selos",
        description: "Faixa principal da vitrine e etiquetas visuais dos produtos.",
        perm: "theme_manage",
        iconKey: "ImageIcon",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Cupons promocionais e campanhas de comunicação.",
    iconKey: "Megaphone",
    tabs: [
      {
        id: "cupons",
        groupId: "marketing",
        label: "Cupons de Desconto",
        shortLabel: "Cupons",
        description: "Regras de desconto, validade e uso em pedidos.",
        perm: "coupons_manage",
        iconKey: "Ticket",
      },
      {
        id: "disparos_notificacoes",
        groupId: "marketing",
        label: "Disparos & Notificações",
        shortLabel: "Disparos",
        description: "Modelos de aviso, segmentação CRM e envio manual.",
        perm: "notifications_manage",
        iconKey: "Bell",
      },
    ],
  },
  {
    id: "fidelidade",
    label: "Fidelidade",
    description: "Regras independentes de progressão e avatares oficiais.",
    iconKey: "Award",
    tabs: [
      {
        id: "selos_fidelidade",
        groupId: "fidelidade",
        label: "Selos de Fidelidade",
        shortLabel: "Selos Fidelidade",
        description: "Níveis de fidelidade por tempo e assinatura no perfil.",
        perm: "loyalty_manage",
        iconKey: "Award",
      },
      {
        id: "avatares",
        groupId: "fidelidade",
        label: "Avatares Oficiais",
        shortLabel: "Avatares",
        description: "Catálogo independente de avatares oficiais dos clientes.",
        perm: "loyalty_manage",
        iconKey: "User",
      },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    description: "Aparência, canais de atendimento e trilha de auditoria.",
    iconKey: "Settings",
    tabs: [
      {
        id: "identidade_visual",
        groupId: "sistema",
        label: "Identidade Visual",
        description: "Paleta, layout e carregamento da vitrine.",
        perm: "theme_manage",
        iconKey: "Palette",
      },
      {
        id: "canais_atendimento",
        groupId: "sistema",
        label: "Canais & Atendimento",
        shortLabel: "Canais & CNPJ",
        description: "WhatsApp, redes sociais, CNPJ, rodapé e mensagens automáticas.",
        perm: "settings_manage",
        iconKey: "MessageCircle",
      },
      {
        id: "auditoria",
        groupId: "sistema",
        label: "Auditoria & Logs",
        shortLabel: "Auditoria",
        description: "Histórico imutável de ações administrativas sensíveis.",
        perm: null,
        adminOnly: true,
        iconKey: "ShieldCheck",
      },
    ],
  },
];

export const ADMIN_TABS: AdminTabMeta[] = ADMIN_NAV_GROUPS.flatMap((g) => g.tabs);

const TAB_META_BY_ID = new Map<AdminTabId, AdminTabMeta>(
  ADMIN_TABS.map((t) => [t.id, t])
);

export function getAdminTabMeta(tabId: string | null | undefined): AdminTabMeta | null {
  if (!tabId) return null;
  return TAB_META_BY_ID.get(tabId as AdminTabId) || null;
}

/**
 * Avalia se o usuário pode acessar determinada aba de /admin.
 * ADMIN sempre acessa tudo; EDITOR segue exatamente o mapa granular e nunca vê abas adminOnly.
 */
export function isAdminTabAccessible(
  user: NavUserContext | null | undefined,
  tabId: AdminTabId | string
): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;

  const meta = getAdminTabMeta(tabId);
  if (!meta) return false;
  if (meta.adminOnly || ADMIN_ONLY_TABS.has(meta.id)) {
    return false;
  }
  if (!meta.perm) {
    return false;
  }
  return hasPermission(user, meta.perm);
}

/**
 * Retorna apenas os grupos e sub-abas visíveis ao usuário atual.
 */
export function getVisibleAdminGroups(user: NavUserContext | null | undefined): AdminGroupMeta[] {
  if (!user) return [];
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    tabs: group.tabs.filter((tab) => isAdminTabAccessible(user, tab.id)),
  })).filter((group) => group.tabs.length > 0);
}

export function getDefaultAdminSelection(
  user: NavUserContext | null | undefined
): { groupId: AdminGroupId; tabId: AdminTabId } | null {
  const groups = getVisibleAdminGroups(user);
  const firstGroup = groups[0];
  const firstTab = firstGroup?.tabs[0];
  if (!firstGroup || !firstTab) return null;
  return { groupId: firstGroup.id, tabId: firstTab.id };
}

/**
 * Resolve deep-links legados e atuais (`?tab=...`) para o respectivo grupo + sub-aba,
 * preservando compatibilidade e respeitando RBAC rigoroso.
 */
export function resolveAdminTabParam(
  tabParam: string | null | undefined,
  user: NavUserContext | null | undefined
): {
  valid: boolean;
  unauthorized: boolean;
  groupId: AdminGroupId | null;
  tabId: AdminTabId | null;
} {
  if (!tabParam) {
    return { valid: false, unauthorized: false, groupId: null, tabId: null };
  }
  const normalized = tabParam.trim() as AdminTabId;
  const meta = getAdminTabMeta(normalized);
  if (!meta) {
    return { valid: false, unauthorized: false, groupId: null, tabId: null };
  }
  if (!isAdminTabAccessible(user, meta.id)) {
    return { valid: true, unauthorized: true, groupId: meta.groupId, tabId: meta.id };
  }
  return { valid: true, unauthorized: false, groupId: meta.groupId, tabId: meta.id };
}
