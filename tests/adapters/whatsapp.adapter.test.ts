import { describe, expect, it } from "vitest";
import { generateWhatsAppLink } from "@/lib/adapters/whatsapp.adapter";

describe("whatsapp.adapter", () => {
  it("gera link com texto do pedido", () => {
    const link = generateWhatsAppLink("12345678-90ab-cdef-1234-567890abcdef");
    expect(link).toContain("wa.me");
    expect(link).toContain("12345678");
    expect(link).not.toContain("12345678-90ab-cdef-1234-567890abcdef");
  });
});
