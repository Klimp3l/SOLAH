export const ORDER_STATUS = [
  "aguardando_pagamento",
  "aguardando_comprovante",
  "pago",
  "em_producao",
  "enviado",
  "entregue",
  "cancelado"
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export type UserRole = "admin" | "user";

export type ProductImageInput = {
  url: string;
  position: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  position: number;
  created_at: string;
};

export type ProductWithImages = Product & {
  product_images: ProductImage[];
};

export type Order = {
  id: string;
  user_id: string;
  total: number;
  status: OrderStatus;
  tracking_code: string | null;
  idempotency_key: string;
  created_at: string;
};

export type OrderItemSnapshot = {
  product_id: string;
  quantity: number;
  price: number;
};

export type CartItemInput = {
  productId: string;
  quantity: number;
};
