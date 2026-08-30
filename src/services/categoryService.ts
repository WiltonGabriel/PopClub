import { supabase } from "../lib/supabase";

export interface Category {
  id: string;
  name: string;
  order_index: number;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createCategory(name: string, orderIndex: number = 0): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name, order_index: orderIndex }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async updateCategory(id: string, updates: Partial<Omit<Category, "id">>): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
};
