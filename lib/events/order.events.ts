import {
  sendOrderCreatedEmail,
  sendOrderShippedEmail,
  sendPaymentConfirmedEmail
} from "@/lib/adapters/email.adapter";

type OrderEventPayload = {
  orderId: string;
  userEmail: string;
};

export async function onOrderCreated(payload: OrderEventPayload): Promise<void> {
  await sendOrderCreatedEmail({ orderId: payload.orderId, email: payload.userEmail });
}

export async function onPaymentConfirmed(payload: OrderEventPayload): Promise<void> {
  await sendPaymentConfirmedEmail({ orderId: payload.orderId, email: payload.userEmail });
}

export async function onOrderShipped(payload: OrderEventPayload): Promise<void> {
  await sendOrderShippedEmail({ orderId: payload.orderId, email: payload.userEmail });
}
