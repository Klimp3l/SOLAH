import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/lib/errors";
import type { ProductImageInput } from "@/types/domain";

type ProductInsert = {
  category_id: string;
  product_type_id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
};

type ProductUpdate = Partial<ProductInsert>;

type LookupInput = {
  id?: string;
  name?: string;
};

type ColorLookupInput = LookupInput & {
  imageUrl?: string | null;
};

type SizeLookupInput = LookupInput & {
  sortOrder?: number;
};

type VariantInsert = {
  product_color_id: string;
  size_id: string;
  price: number;
  active: boolean;
};

const PRODUCT_SELECT = `
  id,
  category_id,
  product_type_id,
  name,
  description,
  price,
  active,
  created_at,
  categories(id,name,created_at),
  product_types(id,name,created_at),
  product_images(id,product_id,url,position,created_at),
  product_variants(
    id,
    product_id,
    product_color_id,
    size_id,
    price,
    active,
    created_at,
    product_colors(id,product_id,name,image_url,created_at),
    sizes(id,name,sort_order,created_at)
  )
`;

export class ProductRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private async updateColorImageIfNeeded(colorId: string, imageUrl?: string | null) {
    const normalizedImageUrl = imageUrl?.trim();
    if (!normalizedImageUrl) return;

    const { error } = await this.supabase.from("product_colors").update({ image_url: normalizedImageUrl }).eq("id", colorId);
    if (error) throw error;
  }

  async listAll() {
    const { data, error } = await this.supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async listActive() {
    const { data, error } = await this.supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getByIdWithImages(id: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Produto não encontrado");
    return data;
  }

  async getVariantsByIds(variantIds: string[]) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .select("id,product_id,price,active,products(id,name,active)")
      .in("id", variantIds);

    if (error) throw error;
    return data ?? [];
  }

  async getByIds(productIds: string[]) {
    const { data, error } = await this.supabase
      .from("products")
      .select("id,name,price,active")
      .in("id", productIds);

    if (error) throw error;
    return data ?? [];
  }

  async create(payload: ProductInsert, images: ProductImageInput[], variants: VariantInsert[]) {
    const { data: product, error: productError } = await this.supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();

    if (productError) throw productError;

    const imageRows = images.map((image) => ({
      product_id: product.id,
      url: image.url,
      position: image.position
    }));

    const { error: imageError } = await this.supabase.from("product_images").insert(imageRows);
    if (imageError) throw imageError;

    if (variants.length) {
      const variantRows = variants.map((variant) => ({
        product_id: product.id,
        product_color_id: variant.product_color_id,
        size_id: variant.size_id,
        price: variant.price,
        active: variant.active
      }));

      const { error: variantError } = await this.supabase.from("product_variants").insert(variantRows);
      if (variantError) throw variantError;
    }

    return this.getByIdWithImages(product.id);
  }

  async updateById(id: string, payload: ProductUpdate) {
    if (!Object.keys(payload).length) {
      return this.getByIdWithImages(id);
    }

    const { data, error } = await this.supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select(PRODUCT_SELECT)
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Produto não encontrado para atualização");
    return data;
  }

  async replaceImagesByProductId(productId: string, images: ProductImageInput[]) {
    const { error: deleteError } = await this.supabase.from("product_images").delete().eq("product_id", productId);
    if (deleteError) throw deleteError;

    const imageRows = images.map((image) => ({
      product_id: productId,
      url: image.url,
      position: image.position
    }));

    const { error: imageError } = await this.supabase.from("product_images").insert(imageRows);
    if (imageError) throw imageError;
  }

  async syncVariantsByProductId(productId: string, variants: VariantInsert[]) {
    const { data: currentVariants, error: currentVariantsError } = await this.supabase
      .from("product_variants")
      .select("id,product_color_id,size_id")
      .eq("product_id", productId);
    if (currentVariantsError) throw currentVariantsError;

    const upsertRows = variants.map((variant) => ({
      product_id: productId,
      product_color_id: variant.product_color_id,
      size_id: variant.size_id,
      price: variant.price,
      active: variant.active
    }));

    const { error: upsertError } = await this.supabase
      .from("product_variants")
      .upsert(upsertRows, { onConflict: "product_id,product_color_id,size_id" });
    if (upsertError) throw upsertError;

    const desiredKeys = new Set(variants.map((variant) => `${variant.product_color_id}::${variant.size_id}`));
    const variantIdsToDisable =
      currentVariants
        ?.filter((variant) => !desiredKeys.has(`${variant.product_color_id}::${variant.size_id}`))
        .map((variant) => variant.id) ?? [];

    if (variantIdsToDisable.length) {
      const { error: deactivateError } = await this.supabase
        .from("product_variants")
        .update({ active: false })
        .eq("product_id", productId)
        .in("id", variantIdsToDisable);
      if (deactivateError) throw deactivateError;
    }
  }

  async listLookups() {
    const [{ data: categories, error: categoriesError }, { data: productTypes, error: productTypesError }, { data: sizes, error: sizesError }] =
      await Promise.all([
        this.supabase.from("categories").select("id,name,created_at").order("name", { ascending: true }),
        this.supabase.from("product_types").select("id,name,created_at").order("name", { ascending: true }),
        this.supabase.from("sizes").select("id,name,sort_order,created_at").order("sort_order", { ascending: true })
      ]);

    if (categoriesError) throw categoriesError;
    if (productTypesError) throw productTypesError;
    if (sizesError) throw sizesError;

    return {
      categories: categories ?? [],
      productTypes: productTypes ?? [],
      sizes: sizes ?? []
    };
  }

  async createCategory(name: string) {
    const { data, error } = await this.supabase
      .from("categories")
      .insert({ name: name.trim() })
      .select("id,name,created_at")
      .single();
    if (error) throw error;
    return data;
  }

  async createProductType(name: string) {
    const { data, error } = await this.supabase
      .from("product_types")
      .insert({ name: name.trim() })
      .select("id,name,created_at")
      .single();
    if (error) throw error;
    return data;
  }

  async createSize(name: string, sortOrder = 0) {
    const { data, error } = await this.supabase
      .from("sizes")
      .insert({ name: name.trim(), sort_order: sortOrder })
      .select("id,name,sort_order,created_at")
      .single();
    if (error) throw error;
    return data;
  }

  async resolveCategory(input: LookupInput) {
    if (input.id) return input.id;

    const name = input.name?.trim();
    if (!name) throw new NotFoundError("Categoria inválida.");

    const { data } = await this.supabase.from("categories").select("id").eq("name", name).maybeSingle();
    if (data?.id) return data.id;

    const created = await this.createCategory(name);
    return created.id;
  }

  async resolveProductType(input: LookupInput) {
    if (input.id) return input.id;

    const name = input.name?.trim();
    if (!name) throw new NotFoundError("Tipo inválido.");

    const { data } = await this.supabase.from("product_types").select("id").eq("name", name).maybeSingle();
    if (data?.id) return data.id;

    const created = await this.createProductType(name);
    return created.id;
  }

  async createProductColor(productId: string, name: string, imageUrl: string | null = null) {
    const { data, error } = await this.supabase
      .from("product_colors")
      .insert({ product_id: productId, name: name.trim(), image_url: imageUrl })
      .select("id,product_id,name,image_url,created_at")
      .single();
    if (error) throw error;
    return data;
  }

  async resolveProductColor(productId: string, input: ColorLookupInput) {
    if (input.id) {
      const { data, error } = await this.supabase
        .from("product_colors")
        .select("id,name")
        .eq("id", input.id)
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new NotFoundError("Cor inválida para este produto.");
      await this.updateColorImageIfNeeded(data.id, input.imageUrl);
      return {
        id: data.id,
        name: data.name
      };
    }

    const name = input.name?.trim();
    if (!name) throw new NotFoundError("Cor inválida.");

    const { data, error } = await this.supabase
      .from("product_colors")
      .select("id,name,image_url")
      .eq("product_id", productId)
      .eq("name", name)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) {
      await this.updateColorImageIfNeeded(data.id, input.imageUrl);
      return {
        id: data.id,
        name: data.name
      };
    }

    const created = await this.createProductColor(productId, name, input.imageUrl ?? null);
    return {
      id: created.id,
      name: created.name
    };
  }

  async resolveSize(input: SizeLookupInput) {
    if (input.id) {
      const { data, error } = await this.supabase.from("sizes").select("id,name").eq("id", input.id).maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new NotFoundError("Tamanho inválido.");
      return {
        id: data.id,
        name: data.name
      };
    }

    const name = input.name?.trim();
    if (!name) throw new NotFoundError("Tamanho inválido.");

    const { data } = await this.supabase.from("sizes").select("id,name").eq("name", name).maybeSingle();
    if (data?.id) {
      return {
        id: data.id,
        name: data.name
      };
    }

    const created = await this.createSize(name, input.sortOrder ?? 0);
    return {
      id: created.id,
      name: created.name
    };
  }
}
