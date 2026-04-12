import { generateWhatsAppLink } from "@/lib/adapters/whatsapp.adapter";
import { logger } from "@/lib/logger";
import type { OrderRepository } from "@/lib/repositories/order.repository";
import type { ProductRepository } from "@/lib/repositories/product.repository";
import type { UserRepository } from "@/lib/repositories/user.repository";

export type CreateOrderServiceDeps = {
  orderRepository: OrderRepository;
  productRepository: ProductRepository;
  userRepository: UserRepository;
  whatsappLinkGenerator?: (orderId: string) => string;
  serviceLogger?: typeof logger;
};

export function createOrderDeps(input: CreateOrderServiceDeps) {
  return {
    orderRepository: input.orderRepository,
    productRepository: input.productRepository,
    userRepository: input.userRepository,
    whatsappLinkGenerator: input.whatsappLinkGenerator ?? generateWhatsAppLink,
    serviceLogger: input.serviceLogger ?? logger
  };
}
