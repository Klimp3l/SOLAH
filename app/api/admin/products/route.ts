import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeProductService, makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { createProductSchema } from "@/lib/schemas/product.schema";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const productService = makeProductService();
    const products = await productService.listProducts({ includeInactive: true });
    return jsonOk({ data: products });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const payload = createProductSchema.parse(await request.json());
    const productService = makeProductService();
    const product = await productService.createProduct(payload);
    return jsonOk({ data: product }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
