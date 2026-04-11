import { ValidationError } from "@/lib/errors";
import type { ProductImageInput } from "@/types/domain";
import type { ProductRepository } from "@/lib/repositories/product.repository";

type CreateProductInput = {
  name: string;
  description: string;
  price: number;
  active: boolean;
  images: ProductImageInput[];
};

type UpdateProductInput = Partial<CreateProductInput>;

function validateImages(images: ProductImageInput[]) {
  if (images.length < 1) {
    throw new ValidationError("Produto deve possuir ao menos 1 imagem.");
  }

  const hasMainImage = images.some((image) => image.position === 0);
  if (!hasMainImage) {
    throw new ValidationError("Uma das imagens precisa ter position = 0 (imagem principal).");
  }
}

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async listProducts() {
    return this.productRepository.listActive();
  }

  async getProduct(id: string) {
    return this.productRepository.getByIdWithImages(id);
  }

  async createProduct(input: CreateProductInput) {
    validateImages(input.images);
    return this.productRepository.create(
      {
        name: input.name,
        description: input.description,
        price: input.price,
        active: input.active
      },
      input.images
    );
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    if (input.images) validateImages(input.images);
    const { images: _ignoredImages, ...productPayload } = input;
    return this.productRepository.updateById(id, productPayload);
  }
}
