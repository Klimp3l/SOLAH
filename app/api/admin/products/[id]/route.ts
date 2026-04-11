import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeProductService, makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { parseRequestWithOptionalImageUpload } from "@/lib/http/parse-product-request";
import { productIdParamsSchema, updateProductSchema } from "@/lib/schemas/product.schema";
import { uploadProductImageFile } from "@/lib/services/product-image-upload.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const params = productIdParamsSchema.parse(await context.params);
    const payload = await parseRequestWithOptionalImageUpload(request, updateProductSchema, uploadProductImageFile);
    const productService = makeProductService();
    const product = await productService.updateProduct(params.id, payload);
    return jsonOk({ data: product });
  } catch (error) {
    return jsonError(error);
  }
}
