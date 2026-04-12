import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeOrderService } from "@/lib/factories/api-deps";
import { jsonError, jsonOk } from "@/lib/http";
import { createOrderSchema } from "@/lib/schemas/order.schema";

export async function POST(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    const payload = createOrderSchema.parse(await request.json());
    const orderService = makeOrderService();

    const result = await orderService.createOrder({
      userId: auth.userId,
      idempotencyKey: payload.idempotencyKey,
      phone: payload.phone,
      items: payload.items
    });

    return jsonOk(
      {
        data: result.order,
        meta: { idempotent: result.idempotent }
      },
      result.idempotent ? 200 : 201
    );
  } catch (error) {
    return jsonError(error);
  }
}
