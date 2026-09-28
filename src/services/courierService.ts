export type CourierStatus = "available" | "in_transit" | "off_duty";

export interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle?: string | null;
  plate?: string | null;
  pixKey?: string | null;
  status: CourierStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCourierInput {
  name: string;
  phone: string;
  vehicle?: string;
  plate?: string;
  pixKey?: string;
  status?: CourierStatus;
}

export const courierService = {
  async getCouriers(): Promise<Courier[]> {
    const res = await fetch("/api/couriers", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar entregadores.");
    }
    const json = await res.json();
    return json.data || json;
  },

  async createCourier(input: CreateCourierInput): Promise<Courier> {
    const res = await fetch("/api/couriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Erro ao cadastrar entregador.");
    }
    return json.data || json;
  },

  async updateCourier(id: string, input: Partial<CreateCourierInput>): Promise<Courier> {
    const res = await fetch(`/api/couriers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Erro ao atualizar entregador.");
    }
    return json.data || json;
  },

  async deleteCourier(id: string): Promise<void> {
    const res = await fetch(`/api/couriers/${id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || "Erro ao excluir entregador.");
    }
  },

  async toggleStatus(id: string, status: CourierStatus): Promise<Courier> {
    const res = await fetch(`/api/couriers/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Erro ao atualizar status do entregador.");
    }
    return json.data || json;
  },
};
