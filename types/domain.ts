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

export type Category = {
  id: string;
  name: string;
  created_at?: string;
};

export type ProductType = {
  id: string;
  name: string;
  created_at?: string;
};

export type Color = {
  id: string;
  name: string;
  image_url: string | null;
  created_at?: string;
};

export type ProductColor = {
  id: string;
  product_id: string;
  name: string;
  image_url: string | null;
  created_at?: string;
};

export type Size = {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
};

export type Product = {
  id: string;
  category_id: string;
  product_type_id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  created_at: string;
  categories?: Category | null;
  product_types?: ProductType | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  position: number;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  product_color_id: string;
  size_id: string;
  price: number;
  active: boolean;
  created_at: string;
  product_colors?: ProductColor | null;
  sizes?: Size | null;
};

export type ProductWithImages = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
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
  product_variant_id: string;
  quantity: number;
  price: number;
};

export type CartItemInput = {
  productId: string;
  variantId: string;
  quantity: number;
};
