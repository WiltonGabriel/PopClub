export interface AddonItem {
  id: string;
  groupId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddonGroup {
  id: string;
  name: string;
  description?: string | null;
  minQuantity: number;
  maxQuantity: number;
  freeQuantity: number;
  isRequired: boolean;
  allowItemQuantity?: boolean;
  sortOrder: number;
  isActive: boolean;
  productsCount?: number;
  items: AddonItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddonGroupInput {
  name: string;
  description?: string;
  minQuantity?: number;
  maxQuantity?: number;
  freeQuantity?: number;
  isRequired?: boolean;
  allowItemQuantity?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateAddonItemInput {
  groupId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  sortOrder?: number;
}

export const addonService = {
  async getGroups(): Promise<AddonGroup[]> {
    const res = await fetch("/api/addons/groups", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar grupos de complementos.");
    }
    return res.json();
  },

  async createGroup(input: CreateAddonGroupInput): Promise<AddonGroup> {
    const res = await fetch("/api/addons/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao criar grupo de complementos.");
    }
    return data;
  },

  async updateGroup(id: string, input: Partial<CreateAddonGroupInput>): Promise<AddonGroup> {
    const res = await fetch(`/api/addons/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar grupo de complementos.");
    }
    return data;
  },

  async deleteGroup(id: string): Promise<void> {
    const res = await fetch(`/api/addons/groups/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao excluir grupo de complementos.");
    }
  },

  async createItem(input: CreateAddonItemInput): Promise<AddonItem> {
    const res = await fetch("/api/addons/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao adicionar item de complemento.");
    }
    return data;
  },

  async updateItem(id: string, input: Partial<CreateAddonItemInput>): Promise<AddonItem> {
    const res = await fetch(`/api/addons/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar item de complemento.");
    }
    return data;
  },

  async deleteItem(id: string): Promise<void> {
    const res = await fetch(`/api/addons/items/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao excluir item de complemento.");
    }
  },

  async toggleItemAvailability(id: string, isAvailable?: boolean): Promise<{ id: string; isAvailable: boolean; message: string }> {
    const res = await fetch(`/api/addons/items/${id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isAvailable !== undefined ? { isAvailable } : {}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao alternar disponibilidade do item.");
    }
    return data;
  },

  async uploadThumb(file: File, oldImageUrl?: string | null): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    if (oldImageUrl) {
      formData.append("oldImageUrl", oldImageUrl);
    }

    const res = await fetch("/api/upload/addon-thumb", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro no upload da miniatura.");
    }
    return data.url;
  },
};
