export interface CustomRoleItem {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
  _count?: {
    users: number;
  };
}

export interface AdminUserListItem {
  id: string;
  cpf?: string | null;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: "admin" | "editor" | "client" | "ADMIN" | "EDITOR" | "CLIENT";
  permissions: string[];
  isRegistered: boolean;
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  customRoleId?: string | null;
  customRole?: {
    id: string;
    name: string;
    color: string;
    permissions: string[];
  } | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    role: string;
  } | null;
  _count?: {
    orders: number;
  };
}

export interface UserHistoryItem {
  id: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethodType: string;
  deliveryStreet: string;
  deliveryNumber: string;
  deliveryNeighborhood: string;
  couponCode?: string | null;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    priceAtTime: number;
    selectedAddons?: unknown;
  }[];
}

export interface UserDossier {
  user: {
    id: string;
    cpf?: string | null;
    email?: string | null;
    username?: string | null;
    phone?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    role: string;
    permissions: string[];
    isRegistered: boolean;
    isActive: boolean;
    isBlocked: boolean;
    blockReason?: string | null;
    createdAt: string;
    updatedAt: string;
    customRoleId?: string | null;
    customRole?: {
      id: string;
      name: string;
      color: string;
    } | null;
    createdById?: string | null;
    createdBy?: {
      id: string;
      fullName?: string | null;
      role: string;
    } | null;
  };
  metrics: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;
    averageTicket: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  orders: UserHistoryItem[];
}

export interface UsersSummary {
  activeAdminsCount: number;
  maxAdmins: number;
  teamCount: number;
  clientsCount: number;
  blockedCount: number;
  customRolesCount: number;
  maxCustomRoles: number;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: string; // Role filter (e.g. "admin", "registered")
  sort?: string; // "recent", "oldest", "orders", "alphabetical"
  status?: string; // "all", "active", "blocked"
  minOrders?: number;
  maxOrders?: number;
  minMonths?: number;
  maxMonths?: number;
  loyaltyBadgeLevel?: number;
  includeSummary?: boolean;
}

export interface GetUsersResponse {
  users: AdminUserListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary?: UsersSummary;
}

export const adminUserService = {
  async getUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.search) searchParams.set("search", params.search);
    if (params.filter) searchParams.set("filter", params.filter);
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.status) searchParams.set("status", params.status);
    if (params.minOrders !== undefined) searchParams.set("minOrders", String(params.minOrders));
    if (params.maxOrders !== undefined) searchParams.set("maxOrders", String(params.maxOrders));
    if (params.minMonths !== undefined) searchParams.set("minMonths", String(params.minMonths));
    if (params.maxMonths !== undefined) searchParams.set("maxMonths", String(params.maxMonths));
    if (params.loyaltyBadgeLevel !== undefined) searchParams.set("loyaltyBadgeLevel", String(params.loyaltyBadgeLevel));
    if (params.includeSummary !== false) searchParams.set("includeSummary", "true");

    const res = await fetch(`/api/admin/users?${searchParams.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao carregar lista de usuários.");
    }
    return data;
  },

  async createTeamMember(payload: {
    fullName: string;
    cpf?: string;
    email?: string;
    phone?: string;
    password: string;
    role: "ADMIN" | "EDITOR";
    customRoleId?: string | null;
    permissions?: string[];
  }): Promise<AdminUserListItem> {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao criar membro da equipe.");
    }
    return data;
  },

  async updateUser(
    id: string,
    payload: {
      role?: string;
      customRoleId?: string | null;
      permissions?: string[];
      password?: string;
      isBlocked?: boolean;
      blockReason?: string | null;
      fullName?: string;
      email?: string | null;
      phone?: string | null;
      cpf?: string | null;
    }
  ): Promise<AdminUserListItem> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar usuário.");
    }
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao desativar usuário.");
    }
  },

  async getUserHistory(id: string): Promise<UserDossier> {
    const res = await fetch(`/api/admin/users/${id}/history`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao carregar histórico do usuário.");
    }
    return data;
  },

  // =========================================================================
  // CARGOS PERSONALIZADOS (CUSTOM ROLES API)
  // =========================================================================
  async getCustomRoles(): Promise<CustomRoleItem[]> {
    const res = await fetch("/api/admin/roles");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao carregar cargos personalizados.");
    }
    return data.roles || [];
  },

  async createCustomRole(payload: {
    name: string;
    color: string;
    permissions: string[];
  }): Promise<CustomRoleItem> {
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao criar cargo personalizado.");
    }
    return data;
  },

  async updateCustomRole(
    id: string,
    payload: {
      name?: string;
      color?: string;
      permissions?: string[];
    }
  ): Promise<CustomRoleItem> {
    const res = await fetch(`/api/admin/roles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar cargo personalizado.");
    }
    return data;
  },

  async deleteCustomRole(id: string): Promise<void> {
    const res = await fetch(`/api/admin/roles/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao excluir cargo personalizado.");
    }
  },
};
