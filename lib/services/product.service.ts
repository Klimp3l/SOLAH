import { ValidationError } from "@/lib/errors";
import type { ProductImageInput } from "@/types/domain";
import type { ProductRepository } from "@/lib/repositories/product.repository";

type CreateProductInput = {
  name: string;
  description: string;
  price: number;
  active: boolean;
  category: {
    id?: string;
    name?: string;
  };
  productType: {
    id?: string;
    name?: string;
  };
  images: ProductImageInput[];
  variants: Array<{
    color: {
      id?: string;
      name?: string;
      imageUrl?: string | null;
    };
    size: {
      id?: string;
      name?: string;
      sortOrder?: number;
    };
    price: number;
    active: boolean;
  }>;
};

type UpdateProductInput = Partial<CreateProductInput>;
type SyncVariantInput = {
  product_color_id: string;
  size_id: string;
  price: number;
  active: boolean;
  colorName: string;
  sizeName: string;
};

function validateImages(images: ProductImageInput[]) {
  if (images.length < 1) {
    throw new ValidationError("Produto deve possuir ao menos 1 imagem.");
  }

  const hasMainImage = images.some((image) => image.position === 0);
  if (!hasMainImage) {
    throw new ValidationError("Uma das imagens precisa ter position = 0 (imagem principal).");
  }
}

function validateVariants(variants: CreateProductInput["variants"]) {
  if (variants.length < 1) {
    throw new ValidationError("Produto deve possuir ao menos 1 variante.");
  }

  const uniqueKeys = new Set<string>();
  for (const variant of variants) {
    const colorKey = variant.color.id ?? variant.color.name?.trim();
    const sizeKey = variant.size.id ?? variant.size.name?.trim();
    if (!colorKey || !sizeKey) {
      throw new ValidationError("Variante precisa conter cor e tamanho válidos.");
    }

    const composedKey = `${String(colorKey).toLowerCase()}::${String(sizeKey).toLowerCase()}`;
    if (uniqueKeys.has(composedKey)) {
      throw new ValidationError("Existem variantes duplicadas (mesma cor e tamanho).");
    }
    uniqueKeys.add(composedKey);
  }
}

function normalizeLookupName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function applyDefaultVariantRules(variants: SyncVariantInput[]) {
  const hasDefaultColor = variants.some((variant) => normalizeLookupName(variant.colorName) === "padrao");
  const hasUniqueSize = variants.some((variant) => normalizeLookupName(variant.sizeName) === "unico");

  return variants.map((variant) => {
    const isDefaultColor = normalizeLookupName(variant.colorName) === "padrao";
    const isUniqueSize = normalizeLookupName(variant.sizeName) === "unico";
    const shouldRemainActive = (!hasDefaultColor || isDefaultColor) && (!hasUniqueSize || isUniqueSize);

    return {
      product_color_id: variant.product_color_id,
      size_id: variant.size_id,
      price: variant.price,
      active: variant.active && shouldRemainActive
    };
  });
}

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  private async resolveVariantsForSync(productId: string, variants: CreateProductInput["variants"]) {
    const resolvedVariants = await Promise.all(
      variants.map(async (variant) => {
        const color = await this.productRepository.resolveProductColor(productId, variant.color);
        const size = await this.productRepository.resolveSize(variant.size);

        return {
          product_color_id: color.id,
          size_id: size.id,
          price: variant.price,
          active: variant.active,
          colorName: color.name,
          sizeName: size.name
        };
      })
    );

    return applyDefaultVariantRules(resolvedVariants);
  }

  async listProducts(options?: { includeInactive?: boolean }) {
    if (options?.includeInactive) {
      return this.productRepository.listAll();
    }

    const products = await this.productRepository.listActive();
    return products
      .map((product) => ({
        ...product,
        product_variants: (product.product_variants ?? []).filter((variant: { active: boolean }) => variant.active)
      }))
      .filter((product) => (product.product_variants ?? []).length > 0);
  }

  async getProduct(id: string) {
    return this.productRepository.getByIdWithImages(id);
  }

  async createProduct(input: CreateProductInput) {
    validateImages(input.images);
    validateVariants(input.variants);

    const categoryId = await this.productRepository.resolveCategory(input.category);
    const productTypeId = await this.productRepository.resolveProductType(input.productType);
    const created = await this.productRepository.create(
      {
        category_id: categoryId,
        product_type_id: productTypeId,
        name: input.name,
        description: input.description,
        price: input.price,
        active: input.active
      },
      input.images,
      []
    );

    const variants = await this.resolveVariantsForSync(created.id, input.variants);

    await this.productRepository.syncVariantsByProductId(created.id, variants);
    return this.productRepository.getByIdWithImages(created.id);
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    if (input.images) validateImages(input.images);
    if (input.variants) validateVariants(input.variants);
    const { images: _ignoredImages, variants: _ignoredVariants, category, productType, ...productPayload } = input;

    const payloadWithRelations = {
      ...productPayload,
      ...(category ? { category_id: await this.productRepository.resolveCategory(category) } : {}),
      ...(productType ? { product_type_id: await this.productRepository.resolveProductType(productType) } : {})
    };

    const hasProductChanges = Object.keys(payloadWithRelations).length > 0;
    if (hasProductChanges) {
      await this.productRepository.updateById(id, payloadWithRelations);
    }

    if (input.images) {
      await this.productRepository.replaceImagesByProductId(id, input.images);
    }

    if (input.variants) {
      const variants = await this.resolveVariantsForSync(id, input.variants);

      await this.productRepository.syncVariantsByProductId(id, variants);
    }

    return this.productRepository.getByIdWithImages(id);
  }

  async listLookups() {
    return this.productRepository.listLookups();
  }

  async createLookup(
    kind: "category" | "productType" | "size",
    input: { name: string; sortOrder?: number }
  ) {
    if (kind === "category") return this.productRepository.createCategory(input.name);
    if (kind === "productType") return this.productRepository.createProductType(input.name);
    return this.productRepository.createSize(input.name, input.sortOrder ?? 0);
  }
}
