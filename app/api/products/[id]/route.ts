import { jsonError, jsonOk } from "@/lib/http";
import { makeProductService } from "@/lib/factories/api-deps";
import { productIdParamsSchema } from "@/lib/schemas/product.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = productIdParamsSchema.parse(await context.params);
    const productService = makeProductService();
    const product = await productService.getProduct(params.id);
    return jsonOk({ data: product });
  } catch (error) {
    return jsonError(error);
  }
}
