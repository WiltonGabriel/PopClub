import { supabase } from "../lib/supabase";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id?: string;
  category?: string; // fallback for legacy
  imageUrl: string;
}

export const productService = {
  /**
   * Upload an image to Supabase Storage
   * Returns the public URL of the uploaded image
   */
  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error("Erro no upload da imagem: " + uploadError.message);
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error.message);
      throw new Error(error.message);
    }

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      category_id: item.category_id,
      category: item.categories?.name || item.category, // fallback to raw string if joined category fails
      imageUrl: item.image_url,
    }));
  },

  async createProduct(product: Omit<Product, "id">, imageFile?: File): Promise<Product> {
    let finalImageUrl = product.imageUrl;

    if (imageFile) {
      finalImageUrl = await this.uploadImage(imageFile);
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: product.name,
          description: product.description,
          price: product.price,
          category_id: product.category_id || null,
          category: product.category || null,
          image_url: finalImageUrl,
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
      category_id: data.category_id,
      category: data.category,
      imageUrl: data.image_url,
    };
  },

  async updateProduct(id: string, updates: Partial<Omit<Product, "id">>, imageFile?: File): Promise<Product> {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    
    if (imageFile) {
      dbUpdates.image_url = await this.uploadImage(imageFile);
    } else if (updates.imageUrl !== undefined) {
      dbUpdates.image_url = updates.imageUrl;
    }

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
      category_id: data.category_id,
      category: data.category,
      imageUrl: data.image_url,
    };
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
};
