import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeOrderService, makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const orderService = makeOrderService();
    const orders = await orderService.listOrders();

    return jsonOk({ data: orders });
  } catch (error) {
    return jsonError(error);
  }
}
