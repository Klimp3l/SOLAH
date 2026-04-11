import { z } from "zod";
import { ORDER_STATUS } from "@/types/domain";

export const createOrderSchema = z.object({
  idempotencyKey: z.string().min(8),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1)
      })
    )
    .min(1)
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS)
});

export const updateOrderTrackingSchema = z.object({
  trackingCode: z.string().min(2)
});

export const orderIdParamsSchema = z.object({
  id: z.string().uuid()
});
