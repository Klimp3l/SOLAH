import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeOrderService, makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { orderIdParamsSchema, updateOrderStatusSchema } from "@/lib/schemas/order.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const params = orderIdParamsSchema.parse(await context.params);
    const payload = updateOrderStatusSchema.parse(await request.json());
    const orderService = makeOrderService();
    const order = await orderService.updateStatus({ orderId: params.id, status: payload.status });

    return jsonOk({ data: order });
  } catch (error) {
    return jsonError(error);
  }
}
