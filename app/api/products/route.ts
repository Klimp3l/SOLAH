import { jsonError, jsonOk } from "@/lib/http";
import { makeProductService } from "@/lib/factories/api-deps";

export async function GET() {
  try {
    const productService = makeProductService();
    const products = await productService.listProducts();
    return jsonOk({ data: products });
  } catch (error) {
    return jsonError(error);
  }
}
