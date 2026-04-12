import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeOrderService } from "@/lib/factories/api-deps";
import { jsonError, jsonOk } from "@/lib/http";
import { orderIdParamsSchema } from "@/lib/schemas/order.schema";
import { uploadPaymentProofFile } from "@/lib/services/payment-proof-upload.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getRequestAuthContext(request);
    const { id } = orderIdParamsSchema.parse(await context.params);
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new Error("Arquivo de comprovante inválido.");
    }

    const paymentProofPath = await uploadPaymentProofFile(file);
    const orderService = makeOrderService();
    const order = await orderService.updatePaymentProof({
      orderId: id,
      paymentProofPath,
      userId: auth.userId
    });

    return jsonOk({ data: order });
  } catch (error) {
    return jsonError(error);
  }
}
