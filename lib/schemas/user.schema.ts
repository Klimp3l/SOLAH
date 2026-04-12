import { z } from "zod";

export const createManualUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(10).max(20).optional()
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(10).max(20).nullable().optional(),
  role: z.enum(["admin", "user"]).optional()
});
