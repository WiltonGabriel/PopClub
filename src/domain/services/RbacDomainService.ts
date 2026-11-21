import {
  ALL_PERMISSIONS,
  DEFAULT_EDITOR_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PermissionDefinition,
  PermissionKey,
  isUserAdmin,
  isUserEditor,
  isValidPermissionKey,
  validatePermissionsInput,
} from "@/lib/permissions";

export const MAX_ACTIVE_ADMINS = 2;
export const MAX_CUSTOM_ROLES = 4;
export const MAX_MEMBERS_PER_CUSTOM_ROLE = 4;

export const VALID_ROLE_COLORS = [
  "blue",
  "purple",
  "emerald",
  "amber",
  "rose",
  "cyan",
  "indigo",
  "orange",
] as const;

export type RoleBadgeColor = (typeof VALID_ROLE_COLORS)[number];

export interface PermissionUiGroup {
  id: "operacao" | "catalogo" | "marketing" | "sistema";
  label: string;
  description: string;
  permissions: PermissionDefinition[];
}

export interface RoleTemplate {
  id: string;
  label: string;
  description: string;
  permissions: PermissionKey[];
}

export interface AccessibleArea {
  id: string;
  title: string;
  route: string;
  detail: string;
}

const PERMISSION_BY_ID = new Map<PermissionKey, PermissionDefinition>(
  PERMISSION_DEFINITIONS.map((definition) => [definition.id, definition])
);

function pickDefinitionsByIds(ids: readonly PermissionKey[]): PermissionDefinition[] {
  const definitions: PermissionDefinition[] = [];
  for (const id of ids) {
    const found = PERMISSION_BY_ID.get(id);
    if (found) {
      definitions.push(found);
    }
  }
  return definitions;
}

export const PERMISSION_UI_GROUPS: PermissionUiGroup[] = [
  {
    id: "operacao",
    label: "Operação, Esteira & Logística",
    description: "Kanban ao vivo, estoque de cozinha, histórico, métricas e frota.",
    permissions: pickDefinitionsByIds([
      "ORDERS_KANBAN",
      "STOCK_CONTROL",
      "ORDERS_HISTORY",
      "metrics_view",
      "logistics_manage",
    ]),
  },
  {
    id: "catalogo",
    label: "Catálogo & Promoções",
    description: "Produtos, categorias, adicionais, combos e ofertas diretas.",
    permissions: pickDefinitionsByIds(["menu_manage", "promotions_manage"]),
  },
  {
    id: "marketing",
    label: "Marketing & Fidelidade",
    description: "Cupons, campanhas CRM, selos de fidelidade e avatares.",
    permissions: pickDefinitionsByIds([
      "coupons_manage",
      "notifications_manage",
      "loyalty_manage",
    ]),
  },
  {
    id: "sistema",
    label: "Vitrine, Sistema & Moderação",
    description: "Identidade visual, atendimento, configurações e moderação de clientes.",
    permissions: pickDefinitionsByIds(["theme_manage", "settings_manage", "users_manage"]),
  },
];

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "cozinha_esteira",
    label: "Atendente / Cozinha",
    description: "Operação do Kanban ao vivo e controle rápido de estoque na cozinha.",
    permissions: ["ORDERS_KANBAN", "STOCK_CONTROL"],
  },
  {
    id: "catalogo_ofertas",
    label: "Cardápio & Ofertas",
    description: "Gestão de produtos, categorias, promoções e disponibilidade de estoque.",
    permissions: ["menu_manage", "promotions_manage", "STOCK_CONTROL"],
  },
  {
    id: "marketing_crm",
    label: "Marketing & CRM",
    description: "Campanhas de cupons, notificações CRM, fidelidade e promoções.",
    permissions: ["coupons_manage", "notifications_manage", "loyalty_manage", "promotions_manage"],
  },
  {
    id: "gerente_operacional",
    label: "Gerente Operacional",
    description: "Acompanhamento completo da operação, logística, catálogo e moderação de clientes.",
    permissions: [
      "ORDERS_KANBAN",
      "STOCK_CONTROL",
      "ORDERS_HISTORY",
      "metrics_view",
      "logistics_manage",
      "menu_manage",
      "promotions_manage",
      "users_manage",
    ],
  },
  {
    id: "padrao_seguro",
    label: "Padrão Seguro",
    description: "Conjunto equilibrado para operação diária da esteira, histórico e catálogo.",
    permissions: [...(DEFAULT_EDITOR_PERMISSIONS as PermissionKey[])],
  },
];

const OPERATIONAL_AREAS: Array<{
  id: string;
  title: string;
  route: string;
  detail: string;
  requiredAny: PermissionKey[];
}> = [
  {
    id: "kanban",
    title: "Esteira de Pedidos (Kanban)",
    route: "/admin/pedidos",
    detail: "Aceitar, preparar e despachar pedidos ao vivo.",
    requiredAny: ["ORDERS_KANBAN"],
  },
  {
    id: "stock",
    title: "Controle Rápido de Estoque",
    route: "/admin/pedidos",
    detail: "Pausar itens e ajustar quantidades na cozinha.",
    requiredAny: ["STOCK_CONTROL", "menu_manage"],
  },
  {
    id: "history",
    title: "Histórico Gerencial & Turnos",
    route: "/admin/historico",
    detail: "Consultar pedidos anteriores e fechamentos de turno.",
    requiredAny: ["ORDERS_HISTORY"],
  },
  {
    id: "metrics",
    title: "Métricas & Desempenho",
    route: "/admin?tab=metricas",
    detail: "Indicadores de receita, ticket médio e giro de catálogo.",
    requiredAny: ["metrics_view"],
  },
  {
    id: "logistics",
    title: "Logística & Entregadores",
    route: "/admin?tab=logistica_entregadores",
    detail: "Gerenciar frota, PIX/placa, raio e taxas de entrega.",
    requiredAny: ["logistics_manage"],
  },
  {
    id: "menu",
    title: "Catálogo (Categorias, Complementos, Combos)",
    route: "/admin?tab=categorias",
    detail: "Criar e editar produtos, categorias e opcionais.",
    requiredAny: ["menu_manage"],
  },
  {
    id: "promos",
    title: "Promoções",
    route: "/admin?tab=promocoes",
    detail: "Gerenciar descontos diretos e ofertas.",
    requiredAny: ["promotions_manage"],
  },
  {
    id: "coupons",
    title: "Cupons de Desconto",
    route: "/admin?tab=cupons",
    detail: "Criar e controlar regras de cupons.",
    requiredAny: ["coupons_manage"],
  },
  {
    id: "notifications",
    title: "Disparos & Audiência CRM",
    route: "/admin?tab=disparos_notificacoes",
    detail: "Segmentar clientes e enviar notificações.",
    requiredAny: ["notifications_manage"],
  },
  {
    id: "loyalty",
    title: "Selos de Fidelidade & Avatares",
    route: "/admin?tab=selos_fidelidade",
    detail: "Configurar progressão VIP e avatares oficiais.",
    requiredAny: ["loyalty_manage"],
  },
  {
    id: "theme",
    title: "Identidade Visual, Banners & Selos",
    route: "/admin?tab=identidade_visual",
    detail: "Personalizar aparência da loja, banner e badges.",
    requiredAny: ["theme_manage"],
  },
  {
    id: "settings",
    title: "Canais & Configurações da Loja",
    route: "/admin?tab=canais_atendimento",
    detail: "WhatsApp, CNPJ, horários e canais de atendimento.",
    requiredAny: ["settings_manage"],
  },
];

function toCanonicalPermissionSet(
  permissions: readonly string[] | null | undefined
): Set<PermissionKey> {
  const result = new Set<PermissionKey>();
  if (!Array.isArray(permissions)) return result;

  for (const raw of permissions) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (isValidPermissionKey(trimmed)) {
      result.add(trimmed);
      continue;
    }
    const matched = ALL_PERMISSIONS.find(
      (candidate) => candidate.toLowerCase() === trimmed.toLowerCase()
    );
    if (matched && isValidPermissionKey(matched)) {
      result.add(matched);
    }
  }

  return result;
}

/**
 * Resolve as permissões efetivas de um usuário (diretas + cargo personalizado para Editor,
 * ou conjunto completo para Administrador).
 */
export function resolveEffectivePermissions(
  user:
    | {
        role?: string | null;
        permissions?: string[] | null;
        customRole?: { permissions?: string[] } | null;
      }
    | null
    | undefined
): PermissionKey[] {
  if (isUserAdmin(user)) {
    return [...(ALL_PERMISSIONS as PermissionKey[])];
  }
  if (!isUserEditor(user)) {
    return [];
  }

  const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
  const rolePerms = Array.isArray(user?.customRole?.permissions)
    ? user.customRole.permissions
    : [];

  return validatePermissionsInput([...userPerms, ...rolePerms]).valid;
}

/**
 * Calcula o diff semântico entre duas listas de permissões válidas.
 */
export function computePermissionDiff(
  previous: readonly string[],
  next: readonly string[]
): {
  added: PermissionKey[];
  removed: PermissionKey[];
  unchanged: PermissionKey[];
} {
  const prevSet = toCanonicalPermissionSet(previous);
  const nextSet = toCanonicalPermissionSet(next);

  const added: PermissionKey[] = [];
  const removed: PermissionKey[] = [];
  const unchanged: PermissionKey[] = [];

  for (const perm of nextSet) {
    if (prevSet.has(perm)) {
      unchanged.push(perm);
    } else {
      added.push(perm);
    }
  }

  for (const perm of prevSet) {
    if (!nextSet.has(perm)) {
      removed.push(perm);
    }
  }

  return { added, removed, unchanged };
}

/**
 * Descreve em linguagem humana as telas e módulos do painel administrativo acessíveis
 * para o cargo e permissões informados.
 */
export function describeAccessibleAreas(
  role: string | null | undefined,
  permissions: readonly string[]
): AccessibleArea[] {
  const isAdmin = isUserAdmin({ role });
  const isEditor = isUserEditor({ role });
  if (!isAdmin && !isEditor) {
    return [];
  }

  const permSet = toCanonicalPermissionSet(permissions);
  const areas: AccessibleArea[] = [];

  if (isAdmin) {
    areas.push({
      id: "team_rbac",
      title: "Equipe, Cargos & Auditoria",
      route: "/admin/usuarios · /admin?tab=auditoria",
      detail: "Gerenciar administradores, editores, cargos personalizados e logs.",
    });
  }

  for (const area of OPERATIONAL_AREAS) {
    if (isAdmin || area.requiredAny.some((perm) => permSet.has(perm))) {
      areas.push({
        id: area.id,
        title: area.title,
        route: area.route,
        detail: area.detail,
      });
    }
  }

  if (!isAdmin && permSet.has("users_manage")) {
    areas.push({
      id: "clients_mod",
      title: "Moderação de Clientes",
      route: "/admin/usuarios",
      detail: "Consultar histórico de compras e moderar contas de clientes (sem acesso à equipe).",
    });
  }

  return areas;
}

/**
 * Compara dois conjuntos de permissões independentemente da ordem ou duplicatas.
 */
export function arePermissionSetsEqual(
  a: readonly string[] | null | undefined,
  b: readonly string[] | null | undefined
): boolean {
  const setA = toCanonicalPermissionSet(a);
  const setB = toCanonicalPermissionSet(b);
  if (setA.size !== setB.size) return false;
  for (const perm of setA) {
    if (!setB.has(perm)) return false;
  }
  return true;
}
