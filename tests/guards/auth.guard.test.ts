import { describe, expect, it } from "vitest";
import { assertAdminAccess } from "@/lib/guards/auth.guard";

describe("auth.guard", () => {
  it("permite admin", async () => {
    await expect(
      assertAdminAccess({
        userId: "u1",
        userRepository: {
          getRoleByUserId: async () => "admin"
        } as never
      })
    ).resolves.toBeUndefined();
  });

  it("bloqueia não-admin mesmo com client adulterado", async () => {
    await expect(
      assertAdminAccess({
        userId: "u2",
        userRepository: {
          getRoleByUserId: async () => "user"
        } as never
      })
    ).rejects.toThrow("Apenas administradores");
  });
});
