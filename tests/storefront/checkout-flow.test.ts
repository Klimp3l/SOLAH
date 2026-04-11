import { describe, expect, it, vi } from "vitest";
import {
  createOrderPayload,
  resolveFinalizeIntent,
  submitOrderRequest
} from "@/lib/storefront/checkout-flow";

describe("checkout-flow", () => {
  it("redireciona para login quando usuário não autenticado ao finalizar", () => {
    const intent = resolveFinalizeIntent(null, "/checkout");

    expect(intent.action).toBe("redirect_to_login");
    if (intent.action === "redirect_to_login") {
      expect(intent.loginUrl).toBe("/auth/login?next=%2Fcheckout");
    }
  });

  it("permite seguir para criação do pedido quando usuário autenticado", () => {
    const intent = resolveFinalizeIntent({ id: "user-1" }, "/checkout");
    expect(intent.action).toBe("submit_order");
  });

  it("envia pedido com sucesso para api/orders", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          data: { id: "order-1" },
          meta: { idempotent: false },
          whatsappLink: "https://wa.me/5511999999999"
        },
        { status: 201 }
      )
    );
    const payload = createOrderPayload(
      [{ productId: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 }],
      "idem-12345"
    );

    const result = await submitOrderRequest(fetchMock, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.data.id).toBe("order-1");
  });
});
