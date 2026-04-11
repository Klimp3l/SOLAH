import { describe, expect, it } from "vitest";
import { generateWhatsAppLink } from "@/lib/adapters/whatsapp.adapter";

describe("whatsapp.adapter", () => {
  it("gera link com texto do pedido", () => {
    const link = generateWhatsAppLink("order-123");
    expect(link).toContain("wa.me");
    expect(link).toContain("order-123");
  });
});
