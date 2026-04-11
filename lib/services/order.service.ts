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

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await this.deps.productRepository.getByIds(productIds);
    const productMap = new Map(products.map((product) => [product.id, product]));

    const snapshots = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || !product.active) {
        throw new NotFoundError(`Produto ${item.productId} não disponível.`);
      }
      if (item.quantity <= 0) {
        throw new ValidationError("Quantidade inválida no carrinho.");
      }

      return {
        product_id: item.productId,
        quantity: item.quantity,
        // Snapshot do preço no momento da compra.
        price: Number(product.price)
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
}
