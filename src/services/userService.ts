import { supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'client' | 'admin';
  full_name: string | null;
  avatar_url: string | null;
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
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw new Error(error.message);
    }
    return data;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getLocations(userId: string): Promise<UserLocation[]> {
    const { data, error } = await supabase
      .from("user_locations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async addLocation(location: Omit<UserLocation, "id" | "created_at">): Promise<UserLocation> {
    if (location.is_default) {
      // Unset previous defaults
      await supabase
        .from("user_locations")
        .update({ is_default: false })
        .eq("user_id", location.user_id);
    }

    const { data, error } = await supabase
      .from("user_locations")
      .insert([location])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async setDefaultLocation(locationId: string, userId: string): Promise<void> {
    await supabase
      .from("user_locations")
      .update({ is_default: false })
      .eq("user_id", userId);

    const { error } = await supabase
      .from("user_locations")
      .update({ is_default: true })
      .eq("id", locationId);

    if (error) throw new Error(error.message);
  },

  async deleteLocation(locationId: string): Promise<void> {
    const { error } = await supabase
      .from("user_locations")
      .delete()
      .eq("id", locationId);

    if (error) throw new Error(error.message);
  },

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from("user_preferences")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  }
};
