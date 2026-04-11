import { z } from "zod";

const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

const imageSchema = z.object({
  url: z.string().url(),
  position: z.number().int().min(0)
});

const categoryInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).optional()
  })
  .refine((value) => Boolean(value.id || value.name), {
    message: "Informe uma categoria existente ou o nome de uma nova categoria."
  });

const productTypeInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).optional()
  })
  .refine((value) => Boolean(value.id || value.name), {
    message: "Informe um tipo existente ou o nome de um novo tipo."
  });

const colorInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).optional(),
    imageUrl: z.union([z.string().url(), hexColorSchema]).nullable().optional()
  })
  .refine((value) => Boolean(value.id || value.name), {
    message: "Informe uma cor existente ou o nome de uma nova cor."
  });

const sizeInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    sortOrder: z.number().int().min(0).optional()
  })
  .refine((value) => Boolean(value.id || value.name), {
    message: "Informe um tamanho existente ou o nome de um novo tamanho."
  });

const variantInputSchema = z.object({
  color: colorInputSchema,
  size: sizeInputSchema,
  price: z.number().positive(),
  active: z.boolean().default(true)
});

export const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  price: z.number().positive(),
  active: z.boolean().default(true),
  category: categoryInputSchema,
  productType: productTypeInputSchema,
  images: z.array(imageSchema).min(1),
  variants: z.array(variantInputSchema).min(1)
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const createLookupSchema = z.object({
  kind: z.enum(["category", "productType", "size"]),
  name: z.string().min(1),
  sortOrder: z.number().int().min(0).optional()
});
