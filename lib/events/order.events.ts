import {
  sendOrderCreatedEmail,
  sendOrderStatusUpdatedEmail,
  sendOrderTrackingCodeEmail
} from "@/lib/adapters/email.adapter";

type OrderEventPayload = {
  orderId: string;
  userEmail: string;
};

export async function onOrderCreated(payload: OrderEventPayload): Promise<void> {
  await sendOrderCreatedEmail({
    orderId: payload.orderId,
    email: payload.userEmail,
    total: 0,
    items: [],
    paymentInstructions: "Em breve enviaremos as instruções de pagamento."
  });
}

export async function onPaymentConfirmed(payload: OrderEventPayload): Promise<void> {
  await sendOrderStatusUpdatedEmail({
    orderId: payload.orderId,
    email: payload.userEmail,
    status: "pago"
  });
}

export async function onOrderShipped(payload: OrderEventPayload): Promise<void> {
  await sendOrderTrackingCodeEmail({
    orderId: payload.orderId,
    email: payload.userEmail,
    trackingCode: "Acompanhe no painel"
  });
}
