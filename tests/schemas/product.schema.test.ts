import { describe, expect, it } from "vitest";
import { createProductSchema } from "@/lib/schemas/product.schema";

describe("product.schema", () => {
  it("aceita criação de produto com variantes e lookups inline", () => {
    const parsed = createProductSchema.parse({
      name: "Vestido Serena",
      description: "Vestido com caimento leve",
      price: 219.9,
      active: true,
      category: { name: "Casual" },
      productType: { name: "Vestido" },
      images: [{ url: "https://example.com/vestido-serena.jpg", position: 0 }],
      variants: [
        {
          color: { name: "Azul", imageUrl: "https://example.com/cores/azul.jpg" },
          size: { name: "M", sortOrder: 2 },
          price: 219.9,
          active: true
        }
      ]
    });

    expect(parsed.variants).toHaveLength(1);
    expect(parsed.category.name).toBe("Casual");
  });
});
