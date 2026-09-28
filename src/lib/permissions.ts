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
  TAB_METRICS: "TAB_METRICS",
  TAB_COMBOS: "TAB_COMBOS",
  TAB_PROMOTIONS: "TAB_PROMOTIONS",
  TAB_ADDONS: "TAB_ADDONS",
  TAB_BANNERS: "TAB_BANNERS",
  TAB_VISUAL_IDENTITY: "TAB_VISUAL_IDENTITY",
  TAB_COUPONS: "TAB_COUPONS",
  TAB_LOGISTICS: "TAB_LOGISTICS",
  TAB_CHANNELS: "TAB_CHANNELS",
  TAB_BROADCAST: "TAB_BROADCAST",
  TAB_AVATARS: "TAB_AVATARS",
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

  // Abas do Painel Operacional - Operação e Cardápio
  {
    id: "TAB_METRICS",
    label: "📊 Métricas & Desempenho",
    description: "Aba com gráficos de faturamento, ticket médio e pedidos por hora.",
    category: "operacao",
    iconName: "BarChart3",
  },
  {
    id: "TAB_COMBOS",
    label: "⚡ Combos Promocionais",
    description: "Criar, editar e pausar combos e barcas especiais.",
    category: "cardapio",
    iconName: "Zap",
  },
  {
    id: "TAB_PROMOTIONS",
    label: "🏷️ Promoções De/Por",
    description: "Criar e gerenciar descontos diretos em produtos.",
    category: "cardapio",
    iconName: "Tag",
  },
  {
    id: "TAB_ADDONS",
    label: "🍨 Complementos & Adicionais",
    description: "Gerenciar grupos de caldas, recheios e preços de adicionais.",
    category: "cardapio",
    iconName: "IceCream",
  },
  {
    id: "TAB_LOGISTICS",
    label: "🛵 Logística & Entregadores",
    description: "Cadastrar entregadores, gerenciar raios de entrega e taxas de frete.",
    category: "operacao",
    iconName: "Truck",
  },

  // Abas Estratégicas / Decisões do Dono (Bloqueadas por padrão no Editor)
  {
    id: "TAB_COUPONS",
    label: "🎟️ Cupons de Desconto",
    description: "Criar cupons de porcentagem ou valor fixo (impacto na margem da loja).",
    category: "estrategico",
    iconName: "Ticket",
  },
  {
    id: "TAB_VISUAL_IDENTITY",
    label: "🎨 Identidade Visual & Tema",
    description: "Alterar paleta de cores, tipografia, logotipo e layout da loja.",
    category: "estrategico",
    iconName: "Palette",
  },
  {
    id: "TAB_BANNERS",
    label: "🖼️ Banners & Selos",
    description: "Subir banners de destaque e gerenciar selos dos cards.",
    category: "estrategico",
    iconName: "Image",
  },
  {
    id: "TAB_CHANNELS",
    label: "💬 Canais & Atendimento",
    description: "Configurar números de WhatsApp, chave Pix e links de contato.",
    category: "estrategico",
    iconName: "MessageCircle",
  },
  {
    id: "TAB_BROADCAST",
    label: "📢 Disparos & Notificações",
    description: "Enviar notificações em massa para a base de clientes cadastrados.",
    category: "estrategico",
    iconName: "Send",
  },
  {
    id: "TAB_AVATARS",
    label: "✨ Avatares Oficiais",
    description: "Cadastrar e gerenciar opções de avatares pré-definidos.",
    category: "estrategico",
    iconName: "Sparkles",
  },
];

/**
 * Permissões padrão atribuídas automaticamente a um novo Editor (Default Seguro de Rotina Operacional).
 */
export const DEFAULT_EDITOR_PERMISSIONS: string[] = [
  "ORDERS_KANBAN",
  "STOCK_CONTROL",
  "ORDERS_HISTORY",
  "TAB_METRICS",
  "TAB_COMBOS",
  "TAB_PROMOTIONS",
  "TAB_ADDONS",
  "TAB_LOGISTICS",
];

export const ALL_PERMISSIONS: string[] = PERMISSION_DEFINITIONS.map((p) => p.id);

/**
 * Mapeamento entre o identificador da aba em /admin e a respectiva permissão necessária.
 */
export const TAB_PERMISSION_MAP: Record<string, PermissionKey> = {
  metrics: "TAB_METRICS",
  combos: "TAB_COMBOS",
  promotions: "TAB_PROMOTIONS",
  addons: "TAB_ADDONS",
  banners: "TAB_BANNERS",
  appearance: "TAB_VISUAL_IDENTITY",
  coupons: "TAB_COUPONS",
  logistics: "TAB_LOGISTICS",
  delivery: "TAB_LOGISTICS",
  channels: "TAB_CHANNELS",
  messages: "TAB_BROADCAST",
  avatars: "TAB_AVATARS",
};

/**
 * Verifica se um usuário possui determinada permissão.
 * Administrador ('ADMIN'): Possui acesso irrestrito a qualquer recurso.
 * Editor ('EDITOR'): Possui acesso apenas aos identificadores presentes em `permissions`.
 * Cliente ('CLIENT'): Não possui permissões administrativas.
 */
export function hasPermission(
  user: { role?: string | null; permissions?: string[] | null } | null | undefined,
  permission: string
): boolean {
  if (!user || !user.role) return false;
  const normalizedRole = user.role.toUpperCase();

  if (normalizedRole === "ADMIN") {
    return true; // Administrador é irrestrito e imutável
  }

  if (normalizedRole === "EDITOR") {
    if (!Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permission);
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
