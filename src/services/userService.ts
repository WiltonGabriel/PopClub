export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome';
  highContrast: boolean;
  reduceMotion: boolean;
  visualAlerts: boolean;
  dyslexicFont: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'client' | 'admin' | 'editor';
  emailVerified?: boolean;
  hasGoogleLinked?: boolean;
  hasPassword?: boolean;
  full_name: string | null;
  avatar_url: string | null;
  avatar?: string | null;
  accessibilitySettings?: AccessibilitySettings;
  accessibility_settings?: AccessibilitySettings;
  default_payment_method?: "pix_entrega" | "cartao_maquininha" | "dinheiro" | null;
  default_change_for?: number | null;
  defaultPaymentMethod?: "pix_entrega" | "cartao_maquininha" | "dinheiro" | null;
  defaultChangeFor?: number | null;
  phone: string | null;
  notificationsEnabled?: boolean;
  notifications_enabled?: boolean;
  lastNameChangedAt?: string | null;
  lastEmailChangedAt?: string | null;
  lastPasswordChangedAt?: string | null;
  passwordUpdatedAt?: string | null;
  created_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  userId?: string;
  name: string | null;
  label?: string | null;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state?: string;
  complement?: string | null;
  reference?: string | null;
  zip?: string | null;
  address_line: string;
  addressLine?: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  is_default: boolean;
  isDefault?: boolean;
  created_at: string;
  createdAt?: string;
}

export interface UserPreferences {
  user_id: string;
  push_notifications: boolean;
  newsletter: boolean;
  theme: string;
  default_payment_method?: "pix_entrega" | "cartao_maquininha" | "dinheiro" | null;
  default_change_for?: number | null;
}

export const userService = {
  async getProfile(_userId?: string): Promise<UserProfile | null> {
    const res = await fetch("/api/users/profile");
    if (!res.ok) return null;
    return await res.json();
  },

  async updateProfile(
    _userId: string, 
    updates: Partial<UserProfile> & { current_password?: string; new_password?: string }
  ): Promise<UserProfile> {
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao atualizar perfil.");
    }
    return await res.json();
  },

  async getLocations(_userId?: string): Promise<UserLocation[]> {
    const res = await fetch("/api/users/locations");
    if (!res.ok) return [];
    return await res.json();
  },

  async addLocation(location: Partial<UserLocation>): Promise<UserLocation> {
    const res = await fetch("/api/users/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(location),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao salvar endereço.");
    }
    return await res.json();
  },

  async updateLocation(locationId: string, data: Partial<UserLocation>): Promise<UserLocation> {
    const res = await fetch(`/api/users/locations/${locationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Erro ao atualizar endereço.");
    }
    return await res.json();
  },

  async setDefaultLocation(locationId: string, _userId?: string): Promise<void> {
    const res = await fetch(`/api/users/locations/${locationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao definir endereço padrão.");
    }
  },

  async deleteLocation(locationId: string): Promise<void> {
    const res = await fetch(`/api/users/locations/${locationId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao remover endereço.");
    }
  },

  async getPreferences(_userId: string): Promise<UserPreferences | null> {
    return {
      user_id: _userId,
      push_notifications: true,
      newsletter: true,
      theme: 'system',
    };
  },

  async updatePreferences(_userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    return {
      user_id: _userId,
      push_notifications: updates.push_notifications ?? true,
      newsletter: updates.newsletter ?? true,
      theme: updates.theme ?? 'system',
    };
  }
};
