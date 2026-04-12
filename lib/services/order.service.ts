import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  sendOrderCreatedEmail,
  sendOrderStatusUpdatedEmail,
  sendOrderTrackingCodeEmail
} from "@/lib/adapters/email.adapter";
import type { CartItemInput, OrderStatus } from "@/types/domain";
import { createOrderDeps, type CreateOrderServiceDeps } from "@/lib/factories/order.factory";

type CreateOrderInput = {
  userId: string;
  idempotencyKey: string;
  phone: string;
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

    await this.deps.userRepository.updatePhone(input.userId, input.phone);

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

    const user = await this.deps.userRepository.getById(input.userId);
    if (user?.email) {
      await sendOrderCreatedEmail({
        orderId: order.id,
        email: user.email,
        customerName: user.name,
        total: Number(order.total),
        items: snapshots.map((item) => {
          const variant = variantMap.get(item.product_variant_id);
          const productName = Array.isArray(variant?.products)
            ? variant.products[0]?.name
            : variant?.products?.name;
          return {
            name: productName ?? "Produto",
            quantity: item.quantity,
            unitPrice: item.price
          };
        }),
        paymentInstructions:
          "Envie o comprovante de pagamento na tela de detalhes do pedido para acelerarmos a produção."
      });
    }

    return {
      order,
      idempotent: false
    };
  }

  async updateStatus(input: UpdateOrderStatusInput) {
    this.deps.serviceLogger.info("order.status.update", {
      orderId: input.orderId,
      status: input.status
    });
    const order = await this.deps.orderRepository.updateStatus(input.orderId, input.status);
    const user = await this.deps.userRepository.getById(order.user_id);
    if (user?.email) {
      await sendOrderStatusUpdatedEmail({
        orderId: order.id,
        email: user.email,
        customerName: user.name,
        status: input.status
      });
    }
    return order;
  }

  async updateTracking(input: UpdateOrderTrackingInput) {
    this.deps.serviceLogger.info("order.tracking.update", {
      orderId: input.orderId,
      trackingCode: input.trackingCode
    });
    const order = await this.deps.orderRepository.updateTracking(input.orderId, input.trackingCode);
    const user = await this.deps.userRepository.getById(order.user_id);
    if (user?.email) {
      await sendOrderTrackingCodeEmail({
        orderId: order.id,
        email: user.email,
        customerName: user.name,
        trackingCode: input.trackingCode
      });
    }
    return order;
  }

  async listOrders() {
    return this.deps.orderRepository.listAll();
  }

  async listOrdersByUser(userId: string) {
    return this.deps.orderRepository.listByUserId(userId);
  }

  async updatePaymentProof(input: { orderId: string; paymentProofPath: string; userId?: string }) {
    if (input.userId) {
      const order = await this.deps.orderRepository.getByIdForUser(input.orderId, input.userId);
      if (!order) throw new NotFoundError("Pedido não encontrado.");
    }
    return this.deps.orderRepository.updatePaymentProof(input.orderId, input.paymentProofPath);
  }

  async getPaymentProofPathByUser(orderId: string, userId: string) {
    const order = await this.deps.orderRepository.getByIdForUser(orderId, userId);
    if (!order) throw new NotFoundError("Pedido não encontrado.");
    if (!order.payment_proof_url) {
      throw new NotFoundError("Comprovante não encontrado para este pedido.");
    }
    return order.payment_proof_url;
  }

  async getPaymentProofPathByAdmin(orderId: string) {
    const order = await this.deps.orderRepository.getById(orderId);
    if (!order) throw new NotFoundError("Pedido não encontrado.");
    if (!order.payment_proof_url) {
      throw new NotFoundError("Comprovante não encontrado para este pedido.");
    }
    return order.payment_proof_url;
  }
}
