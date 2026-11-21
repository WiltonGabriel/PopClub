/**
 * Matriz de Permissões Granulares (RBAC) para Editores e Administradores.
 * - Administrador (ADMIN): Acesso irrestrito e imutável a todo o sistema.
 * - Editor (EDITOR): Acessos definidos individualmente pelo Administrador.
 * - Cliente (CLIENT): Acesso apenas à vitrine e suas compras.
 */

export const PERMISSION_KEYS = {
  // Domínio: Operação & Logística
  ORDERS_KANBAN: "ORDERS_KANBAN",
  STOCK_CONTROL: "STOCK_CONTROL",
  ORDERS_HISTORY: "ORDERS_HISTORY",
  metrics_view: "metrics_view",
  logistics_manage: "logistics_manage",

  // Domínio: Catálogo & Promoções
  menu_manage: "menu_manage",
  promotions_manage: "promotions_manage",

  // Domínio: Marketing, Experiência & Sistema
  coupons_manage: "coupons_manage",
  notifications_manage: "notifications_manage",
  loyalty_manage: "loyalty_manage",
  theme_manage: "theme_manage",
  settings_manage: "settings_manage",
  users_manage: "users_manage",
  storefront_edit: "storefront_edit",
} as const;

export type PermissionKey = keyof typeof PERMISSION_KEYS;

export interface PermissionDefinition {
  id: PermissionKey;
  label: string;
  description: string;
  category: "operacao" | "cardapio" | "estrategico";
  iconName: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Módulos Operacionais Principais
  {
    id: "ORDERS_KANBAN",
    label: "Central da Esteira (Kanban)",
    description: "Visualizar, aceitar, despachar e gerenciar pedidos em andamento na cozinha.",
    category: "operacao",
    iconName: "ClipboardList",
  },
  {
    id: "STOCK_CONTROL",
    label: "Controle de Estoque & Cozinha",
    description: "Pausar produtos na cozinha e alterar quantidades em estoque em tempo real.",
    category: "operacao",
    iconName: "Boxes",
  },
  {
    id: "ORDERS_HISTORY",
    label: "Histórico Gerencial & Turnos",
    description: "Consultar pedidos passados, relatórios de turnos/esteiras e métricas financeiras.",
    category: "operacao",
    iconName: "History",
  },

  // Abas do Painel Operacional
  {
    id: "metrics_view",
    label: "Métricas & Desempenho",
    description: "Aba com gráficos de faturamento, ticket médio e pedidos por hora.",
    category: "operacao",
    iconName: "BarChart3",
  },
  {
    id: "logistics_manage",
    label: "Logística & Entregadores",
    description: "Cadastrar, editar, pausar e consultar dados sensíveis (PIX/placa) de entregadores.",
    category: "operacao",
    iconName: "Truck",
  },
  {
    id: "menu_manage",
    label: "Cardápio (Combos e Complementos)",
    description: "Criar, editar e pausar itens, categorias, selos de cards e complementos.",
    category: "cardapio",
    iconName: "IceCream",
  },
  {
    id: "promotions_manage",
    label: "Promoções",
    description: "Criar e gerenciar descontos diretos em produtos.",
    category: "cardapio",
    iconName: "Tag",
  },
  {
    id: "coupons_manage",
    label: "Cupons de Desconto",
    description: "Criar cupons de porcentagem ou valor fixo.",
    category: "estrategico",
    iconName: "Ticket",
  },
  {
    id: "notifications_manage",
    label: "Disparos & Audiência CRM",
    description: "Gerenciar templates, listas personalizadas e disparos de notificações.",
    category: "estrategico",
    iconName: "Bell",
  },
  {
    id: "loyalty_manage",
    label: "Fidelidade & Avatares Oficiais",
    description: "Configurar selos de fidelidade e avatares exclusivos de clientes.",
    category: "estrategico",
    iconName: "Award",
  },
  {
    id: "theme_manage",
    label: "Identidade Visual, Banners & Selos",
    description: "Alterar banner principal, selos de destaque nos cards, paleta e layout da loja.",
    category: "estrategico",
    iconName: "Palette",
  },
  {
    id: "settings_manage",
    label: "Configurações Gerais & Canais",
    description: "Configurar loja, atendimento, WhatsApp, horários e zonas de entrega.",
    category: "estrategico",
    iconName: "Store",
  },
  {
    id: "users_manage",
    label: "Moderação de Clientes & Usuários",
    description: "Visualizar lista de clientes, moderar bloqueios e consultar perfis.",
    category: "estrategico",
    iconName: "Users",
  },
  {
    id: "storefront_edit",
    label: "Modo Edição na Vitrine",
    description: "Permite ativar o Modo Edição na página inicial (/) para editar itens diretamente na vitrine (conforme permissões de catálogo, promoções ou tema).",
    category: "estrategico",
    iconName: "Pencil",
  },
];

/**
 * Permissões padrão atribuídas automaticamente a um novo Editor (Default Seguro de Rotina Operacional).
 */
export const DEFAULT_EDITOR_PERMISSIONS: string[] = [
  "ORDERS_KANBAN",
  "STOCK_CONTROL",
  "ORDERS_HISTORY",
  "metrics_view",
  "menu_manage",
  "promotions_manage",
];

export const ALL_PERMISSIONS: string[] = PERMISSION_DEFINITIONS.map((p) => p.id);

/**
 * Mapeamento entre o identificador da aba em /admin e a respectiva permissão necessária.
 */
export const TAB_PERMISSION_MAP: Record<string, PermissionKey> = {
  metricas: "metrics_view",
  categorias: "menu_manage",
  complementos: "menu_manage",
  combos: "menu_manage",
  promocoes: "promotions_manage",
  cupons: "coupons_manage",
  identidade_visual: "theme_manage",
  selos_fidelidade: "loyalty_manage",
  avatares: "loyalty_manage",
  banners_selos: "theme_manage",
  logistica_entregadores: "logistics_manage",
  canais_atendimento: "settings_manage",
  disparos_notificacoes: "notifications_manage",
};

/**
 * Abas restritas exclusivamente a administradores (ADMIN), não delegáveis a Editores.
 */
export const ADMIN_ONLY_TABS = new Set<string>(["auditoria"]);

const VALID_PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);

export function isValidPermissionKey(value: string): value is PermissionKey {
  return VALID_PERMISSION_SET.has(value);
}

/**
 * Filtra e valida uma lista de permissões contra a whitelist oficial `ALL_PERMISSIONS`.
 */
export function validatePermissionsInput(input: unknown): {
  valid: PermissionKey[];
  invalid: string[];
} {
  if (!Array.isArray(input)) {
    return { valid: [], invalid: ["<not-an-array>"] };
  }

  const validSet = new Set<PermissionKey>();
  const invalid: string[] = [];

  for (const item of input) {
    if (typeof item !== "string") {
      invalid.push(String(item));
      continue;
    }
    const trimmed = item.trim();
    if (isValidPermissionKey(trimmed)) {
      validSet.add(trimmed);
    } else {
      invalid.push(trimmed);
    }
  }

  return { valid: Array.from(validSet), invalid };
}

/**
 * Verifica se um usuário possui determinada permissão.
 * Administrador ('ADMIN'): Possui acesso irrestrito a qualquer recurso.
 * Editor ('EDITOR'): Possui acesso apenas aos identificadores presentes em `permissions`.
 * Cliente ('CLIENT'): Não possui permissões administrativas.
 */
export function hasPermission(
  user: {
    role?: string | null;
    permissions?: string[] | null;
    customRole?: { permissions?: string[] } | null;
  } | null | undefined,
  permission: string
): boolean {
  if (!user || !user.role) return false;
  const normalizedRole = user.role.toUpperCase();

  if (normalizedRole === "ADMIN") {
    return true; // Administrador é irrestrito e imutável
  }

  if (normalizedRole === "EDITOR") {
    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
    const rolePerms = Array.isArray(user.customRole?.permissions) ? user.customRole.permissions : [];
    const combined = [...userPerms, ...rolePerms];
    const target = permission.toLowerCase();
    return combined.some((p) => typeof p === "string" && p.toLowerCase() === target);
  }

  return false;
}

export function isUserAdmin(
  user: { role?: string | null } | null | undefined
): boolean {
  return Boolean(user?.role && user.role.toUpperCase() === "ADMIN");
}

export function isUserEditor(
  user: { role?: string | null } | null | undefined
): boolean {
  return Boolean(user?.role && user.role.toUpperCase() === "EDITOR");
}

export function isStaffUser(
  user: { role?: string | null } | null | undefined
): boolean {
  return isUserAdmin(user) || isUserEditor(user);
}
