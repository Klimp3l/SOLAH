type OrderEmailPayload = {
  orderId: string;
  email: string;
};

export async function sendOrderCreatedEmail(_payload: OrderEmailPayload): Promise<void> {
  return;
}

export async function sendPaymentConfirmedEmail(_payload: OrderEmailPayload): Promise<void> {
  return;
}

export async function sendOrderShippedEmail(_payload: OrderEmailPayload): Promise<void> {
  return;
}
