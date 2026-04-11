import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeOrderService } from "@/lib/factories/api-deps";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    const orderService = makeOrderService();
    const orders = await orderService.listOrdersByUser(auth.userId);
    return jsonOk({ data: orders });
  } catch (error) {
    return jsonError(error);
  }
}
