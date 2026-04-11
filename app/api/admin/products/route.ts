import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeProductService, makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { createProductSchema } from "@/lib/schemas/product.schema";

export async function POST(request: Request) {
  try {
    const auth = getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const payload = createProductSchema.parse(await request.json());
    const productService = makeProductService();
    const product = await productService.createProduct(payload);
    return jsonOk({ data: product }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
