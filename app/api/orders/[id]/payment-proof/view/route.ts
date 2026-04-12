import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeOrderService } from "@/lib/factories/api-deps";
import { jsonError, jsonOk } from "@/lib/http";
import { orderIdParamsSchema } from "@/lib/schemas/order.schema";
import { createPaymentProofSignedUrl } from "@/lib/services/payment-proof-upload.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SIGNED_URL_EXPIRES_IN = 600;

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await getRequestAuthContext(request);
    const { id } = orderIdParamsSchema.parse(await context.params);
    const orderService = makeOrderService();
    const paymentProofPath = await orderService.getPaymentProofPathByUser(id, auth.userId);
    const signedUrl = await createPaymentProofSignedUrl(paymentProofPath, SIGNED_URL_EXPIRES_IN);

    return jsonOk({ data: { signedUrl, expiresIn: SIGNED_URL_EXPIRES_IN } });
  } catch (error) {
    return jsonError(error);
  }
}
