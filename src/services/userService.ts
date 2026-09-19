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
  role: 'client' | 'admin';
  full_name: string | null;
  avatar_url: string | null;
  avatar?: string | null;
  accessibilitySettings?: AccessibilitySettings;
  accessibility_settings?: AccessibilitySettings;
  phone: string | null;
  created_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  name: string | null;
  address_line: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  is_default: boolean;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  push_notifications: boolean;
  newsletter: boolean;
  theme: string;
}

export const userService = {
  async getProfile(_userId?: string): Promise<UserProfile | null> {
    const res = await fetch("/api/users/profile");
    if (!res.ok) return null;
    return await res.json();
  },

  async updateProfile(_userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao atualizar perfil.");
    }
    return await res.json();
  },

  async getLocations(_userId?: string): Promise<UserLocation[]> {
    const res = await fetch("/api/users/locations");
    if (!res.ok) return [];
    return await res.json();
  },

  async addLocation(location: Omit<UserLocation, "id" | "created_at">): Promise<UserLocation> {
    const res = await fetch("/api/users/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(location),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao salvar endereço.");
    }
    return await res.json();
  },

  async setDefaultLocation(locationId: string, _userId: string): Promise<void> {
    // Pode ser implementado se necessário
  },

  async deleteLocation(locationId: string): Promise<void> {
    // Pode ser implementado se necessário
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
