import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/orders/route";
import { UnauthorizedError } from "@/lib/errors";

const { createOrderMock, getRequestAuthContextMock } = vi.hoisted(() => ({
  createOrderMock: vi.fn(),
  getRequestAuthContextMock: vi.fn()
}));

vi.mock("@/lib/factories/api-deps", () => ({
  makeOrderService: () => ({
    createOrder: createOrderMock
  })
}));

vi.mock("@/lib/auth/request-auth", () => ({
  getRequestAuthContext: getRequestAuthContextMock
}));

describe("POST /api/orders", () => {
  beforeEach(() => {
    createOrderMock.mockReset();
    getRequestAuthContextMock.mockReset();
    getRequestAuthContextMock.mockResolvedValue({ userId: "user-1" });
  });

  it("retorna 400 para payload inválido (Zod)", async () => {
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: "abc12345",
        items: [{ variantId: "650e8400-e29b-41d4-a716-446655440000", quantity: 1 }]
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("retorna 401 quando não há autenticação", async () => {
    getRequestAuthContextMock.mockRejectedValueOnce(new UnauthorizedError("Faça login para acessar este recurso."));

    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: "abc12345",
        items: [{ variantId: "650e8400-e29b-41d4-a716-446655440000", quantity: 1 }]
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
