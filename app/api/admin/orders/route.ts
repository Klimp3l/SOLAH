import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeOrderService, makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { createAdminOrderSchema } from "@/lib/schemas/order.schema";

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

export async function POST(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    await assertAdminAccess({ userId: auth.userId, userRepository: makeUserRepository() });

    const payload = createAdminOrderSchema.parse(await request.json());
    const orderService = makeOrderService();
    const order = await orderService.createOrder({
      userId: payload.userId,
      phone: payload.phone ?? "0000000000",
      idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(),
      items: payload.items
    });

    return jsonOk({ data: order.order }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
