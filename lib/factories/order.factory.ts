import { generateWhatsAppLink } from "@/lib/adapters/whatsapp.adapter";
import { logger } from "@/lib/logger";
import type { OrderRepository } from "@/lib/repositories/order.repository";
import type { ProductRepository } from "@/lib/repositories/product.repository";

export type CreateOrderServiceDeps = {
  orderRepository: OrderRepository;
  productRepository: ProductRepository;
  whatsappLinkGenerator?: (orderId: string) => string;
  serviceLogger?: typeof logger;
};

export function createOrderDeps(input: CreateOrderServiceDeps) {
  return {
    orderRepository: input.orderRepository,
    productRepository: input.productRepository,
    whatsappLinkGenerator: input.whatsappLinkGenerator ?? generateWhatsAppLink,
    serviceLogger: input.serviceLogger ?? logger
  };
}
