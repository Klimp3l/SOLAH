import { describe, expect, it, vi } from "vitest";
import { OrderService } from "@/lib/services/order.service";

describe("order.service", () => {
  it("retorna pedido existente quando idempotencyKey já foi usada", async () => {
    const orderRepository = {
      findByUserAndIdempotencyKey: vi.fn().mockResolvedValue({
        id: "order-1",
        user_id: "user-1",
        total: 10,
        status: "aguardando_pagamento",
        idempotency_key: "abc12345",
        tracking_code: null,
        created_at: new Date().toISOString()
      }),
      createWithItems: vi.fn()
    };

    const productRepository = {
      getVariantsByIds: vi.fn()
    };

    const service = new OrderService({
      orderRepository: orderRepository as never,
      productRepository: productRepository as never,
      whatsappLinkGenerator: (orderId) => `link:${orderId}`
    });

    const result = await service.createOrder({
      userId: "user-1",
      idempotencyKey: "abc12345",
      items: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          variantId: "22222222-1111-1111-1111-111111111111",
          quantity: 1
        }
      ]
    });

    expect(result.idempotent).toBe(true);
    expect(result.order.id).toBe("order-1");
    expect(orderRepository.createWithItems).not.toHaveBeenCalled();
  });

  it("grava snapshot de preço no momento da compra", async () => {
    const createdOrder = {
      id: "order-2",
      user_id: "user-2",
      total: 299.8,
      status: "aguardando_pagamento",
      idempotency_key: "token-9999",
      tracking_code: null,
      created_at: new Date().toISOString()
    };

    const orderRepository = {
      findByUserAndIdempotencyKey: vi.fn().mockResolvedValue(null),
      createWithItems: vi.fn().mockResolvedValue(createdOrder)
    };

    const productRepository = {
      getVariantsByIds: vi.fn().mockResolvedValue([
        {
          id: "22222222-1111-1111-1111-111111111111",
          product_id: "11111111-1111-1111-1111-111111111111",
          price: 149.9,
          active: true,
          products: {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Produto A",
            active: true
          }
        }
      ])
    };

    const service = new OrderService({
      orderRepository: orderRepository as never,
      productRepository: productRepository as never,
      whatsappLinkGenerator: (orderId) => `link:${orderId}`
    });

    await service.createOrder({
      userId: "user-2",
      idempotencyKey: "token-9999",
      items: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          variantId: "22222222-1111-1111-1111-111111111111",
          quantity: 2
        }
      ]
    });

    expect(orderRepository.createWithItems).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          {
            product_id: "11111111-1111-1111-1111-111111111111",
            product_variant_id: "22222222-1111-1111-1111-111111111111",
            quantity: 2,
            price: 149.9
          }
        ]
      })
    );
  });
});
