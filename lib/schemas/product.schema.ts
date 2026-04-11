import { z } from "zod";

const imageSchema = z.object({
  url: z.string().url(),
  position: z.number().int().min(0)
});

export const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  price: z.number().positive(),
  active: z.boolean().default(true),
  images: z.array(imageSchema).min(1)
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamsSchema = z.object({
  id: z.string().uuid()
});
