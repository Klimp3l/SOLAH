import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { CartItemInput, OrderStatus } from "@/types/domain";
import { createOrderDeps, type CreateOrderServiceDeps } from "@/lib/factories/order.factory";

type CreateOrderInput = {
  userId: string;
  idempotencyKey: string;
  items: CartItemInput[];
};

type UpdateOrderStatusInput = {
  orderId: string;
  status: OrderStatus;
};

type UpdateOrderTrackingInput = {
  orderId: string;
  trackingCode: string;
};

export class OrderService {
  private readonly deps: ReturnType<typeof createOrderDeps>;

  constructor(deps: CreateOrderServiceDeps) {
    this.deps = createOrderDeps(deps);
  }

  async createOrder(input: CreateOrderInput) {
    this.deps.serviceLogger.info("order.create.start", {
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      itemCount: input.items.length
    });

    const existingOrder = await this.deps.orderRepository.findByUserAndIdempotencyKey(
      input.userId,
      input.idempotencyKey
    );

    if (existingOrder) {
      this.deps.serviceLogger.info("order.create.idempotent_hit", {
        userId: input.userId,
        orderId: existingOrder.id
      });
      return {
        order: existingOrder,
        whatsappLink: this.deps.whatsappLinkGenerator(existingOrder.id),
        idempotent: true
      };
    }

    const variantIds = [...new Set(input.items.map((item) => item.variantId))];
    const variants = await this.deps.productRepository.getVariantsByIds(variantIds);
    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

    const snapshots = input.items.map((item) => {
      const variant = variantMap.get(item.variantId);
      const variantProduct = Array.isArray(variant?.products) ? variant.products[0] : variant?.products;
      if (!variant || !variant.active || !variantProduct?.active) {
        throw new NotFoundError(`Variante ${item.variantId} não disponível.`);
      }
      if (variant.product_id !== item.productId) {
        throw new ValidationError("Produto informado não corresponde à variante selecionada.");
      }
      if (item.quantity <= 0) {
        throw new ValidationError("Quantidade inválida no carrinho.");
      }

      return {
        product_id: variant.product_id,
        product_variant_id: item.variantId,
        quantity: item.quantity,
        // Snapshot do preço no momento da compra.
        price: Number(variant.price)
      };
    });

    const total = snapshots.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total <= 0) {
      throw new ConflictError("Total do pedido inválido.");
    }

    const order = await this.deps.orderRepository.createWithItems({
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      total,
      status: "aguardando_pagamento",
      items: snapshots
    });

    this.deps.serviceLogger.info("order.create.success", {
      userId: input.userId,
      orderId: order.id,
      total
    });

    return {
      order,
      whatsappLink: this.deps.whatsappLinkGenerator(order.id),
      idempotent: false
    };
  }

  async updateStatus(input: UpdateOrderStatusInput) {
    this.deps.serviceLogger.info("order.status.update", {
      orderId: input.orderId,
      status: input.status
    });
    return this.deps.orderRepository.updateStatus(input.orderId, input.status);
  }

  async updateTracking(input: UpdateOrderTrackingInput) {
    this.deps.serviceLogger.info("order.tracking.update", {
      orderId: input.orderId,
      trackingCode: input.trackingCode
    });
    return this.deps.orderRepository.updateTracking(input.orderId, input.trackingCode);
  }

  async listOrders() {
    return this.deps.orderRepository.listAll();
  }

  async listOrdersByUser(userId: string) {
    return this.deps.orderRepository.listByUserId(userId);
  }
}
