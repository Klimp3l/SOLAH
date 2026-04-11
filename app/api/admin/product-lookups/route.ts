import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeProductService, makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { createLookupSchema } from "@/lib/schemas/product.schema";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const productService = makeProductService();
    const lookups = await productService.listLookups();
    return jsonOk({ data: lookups });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const payload = createLookupSchema.parse(await request.json());
    const productService = makeProductService();
    const lookup = await productService.createLookup(payload.kind, payload);
    return jsonOk({ data: lookup }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
