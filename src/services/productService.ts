import { supabase } from "../lib/supabase";
import { Product } from "../data/mockProducts";

export const productService = {
  /**
   * Fetch all products from the Supabase database.
   * If the connection fails or table doesn't exist, it can fallback to mock data (optional).
   */
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error.message);
      throw new Error(error.message);
    }

    // Mapping snake_case DB columns to camelCase Product type if necessary
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      category: item.category,
      imageUrl: item.image_url,
    }));
  },

  async createProduct(product: Omit<Product, "id">): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image_url: product.imageUrl,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      category: data.category,
      imageUrl: data.image_url,
    };
  },

  async updateProduct(id: string, updates: Partial<Omit<Product, "id">>): Promise<Product> {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

    const { data, error } = await supabase
      .from("products")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      category: data.category,
      imageUrl: data.image_url,
    };
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
};
