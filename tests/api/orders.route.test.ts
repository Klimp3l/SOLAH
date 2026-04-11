import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/orders/route";

const createOrderMock = vi.fn();

vi.mock("@/lib/factories/api-deps", () => ({
  makeOrderService: () => ({
    createOrder: createOrderMock
  })
}));

describe("POST /api/orders", () => {
  beforeEach(() => {
    createOrderMock.mockReset();
  });

  it("retorna 400 para payload inválido (Zod)", async () => {
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user-1" },
      body: JSON.stringify({
        idempotencyKey: "123",
        items: []
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("retorna 201 para novo pedido", async () => {
    createOrderMock.mockResolvedValue({
      idempotent: false,
      whatsappLink: "https://wa.me/5511999999999",
      order: { id: "order-1", total: 100 }
    });

    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user-1" },
      body: JSON.stringify({
        idempotencyKey: "abc12345",
        items: [{ productId: "550e8400-e29b-41d4-a716-446655440000", quantity: 1 }]
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
