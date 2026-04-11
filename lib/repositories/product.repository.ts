import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/lib/errors";
import type { ProductImageInput } from "@/types/domain";

type ProductInsert = {
  name: string;
  description: string;
  price: number;
  active: boolean;
};

type ProductUpdate = Partial<ProductInsert>;

export class ProductRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listAll() {
    const { data, error } = await this.supabase
      .from("products")
      .select("id,name,description,price,active,created_at,product_images(id,product_id,url,position,created_at)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async listActive() {
    const { data, error } = await this.supabase
      .from("products")
      .select("id,name,description,price,active,created_at,product_images(id,product_id,url,position,created_at)")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getByIdWithImages(id: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select("id,name,description,price,active,created_at,product_images(id,product_id,url,position,created_at)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Produto não encontrado");
    return data;
  }

  async getByIds(productIds: string[]) {
    const { data, error } = await this.supabase
      .from("products")
      .select("id,name,price,active")
      .in("id", productIds);

    if (error) throw error;
    return data ?? [];
  }

  async create(payload: ProductInsert, images: ProductImageInput[]) {
    const { data: product, error: productError } = await this.supabase
      .from("products")
      .insert(payload)
      .select("id,name,description,price,active,created_at")
      .single();

    if (productError) throw productError;

    const imageRows = images.map((image) => ({
      product_id: product.id,
      url: image.url,
      position: image.position
    }));

    const { error: imageError } = await this.supabase.from("product_images").insert(imageRows);
    if (imageError) throw imageError;

    return this.getByIdWithImages(product.id);
  }

  async updateById(id: string, payload: ProductUpdate) {
    const { data, error } = await this.supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select("id,name,description,price,active,created_at")
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Produto não encontrado para atualização");
    return data;
  }
}
