/**
 * Matriz de Permissões Granulares (RBAC) para Editores e Administradores.
 * - Administrador (ADMIN): Acesso irrestrito e imutável a todo o sistema.
 * - Editor (EDITOR): Acessos definidos individualmente pelo Administrador.
 * - Cliente (CLIENT): Acesso apenas à vitrine e suas compras.
 */

export const PERMISSION_KEYS = {
  // Módulos Operacionais Principais
  ORDERS_KANBAN: "ORDERS_KANBAN",
  STOCK_CONTROL: "STOCK_CONTROL",
  ORDERS_HISTORY: "ORDERS_HISTORY",

  // 11 Abas do Painel Operacional (/admin)
  metrics_view: "metrics_view",
  menu_manage: "menu_manage",
  promotions_manage: "promotions_manage",
  coupons_manage: "coupons_manage",
  theme_manage: "theme_manage",
  settings_manage: "settings_manage",
  users_manage: "users_manage",
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
    id: "menu_manage",
    label: "Cardápio (Combos e Complementos)",
    description: "Criar, editar e pausar itens do cardápio.",
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
    id: "theme_manage",
    label: "Identidade Visual & Tema",
    description: "Alterar paleta de cores, tipografia, logotipo e layout da loja.",
    category: "estrategico",
    iconName: "Palette",
  },
  {
    id: "settings_manage",
    label: "Configurações Gerais",
    description: "Configurar loja, atendimento, horários e zonas de entrega.",
    category: "estrategico",
    iconName: "Store",
  },
  {
    id: "users_manage",
    label: "Gestão de Usuários & Equipe",
    description: "Editar perfis de outros colaboradores ou clientes.",
    category: "estrategico",
    iconName: "Users",
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
  avatares: "theme_manage",
  banners_selos: "theme_manage",
  logistica_entregadores: "settings_manage",
  canais_atendimento: "settings_manage",
  disparos_notificacoes: "settings_manage",
  configuracoes: "settings_manage",
  horarios: "settings_manage",
  zonas_entrega: "settings_manage",
  usuarios: "users_manage",
};

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
