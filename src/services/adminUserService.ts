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
    selectedAddons?: any;
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

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: "all" | "team" | "registered" | "fast_access" | "blocked";
}

export interface GetUsersResponse {
  users: AdminUserListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const adminUserService = {
  async getUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.search) searchParams.set("search", params.search);
    if (params.filter) searchParams.set("filter", params.filter);

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
};
