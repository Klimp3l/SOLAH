import { Resend } from "resend";
import type { OrderStatus } from "@/types/domain";

type OrderEmailPayload = {
  orderId: string;
  email: string;
  customerName?: string | null;
};

type OrderCreatedEmailPayload = OrderEmailPayload & {
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentInstructions: string;
};

type OrderStatusUpdatedPayload = OrderEmailPayload & {
  status: OrderStatus;
};

type TrackingCodePayload = OrderEmailPayload & {
  trackingCode: string;
};

const apiKey = process.env.RESEND_API_KEY?.trim();
const senderEmail = process.env.RESEND_SENDER_EMAIL?.trim() || "SOLAH <no-reply@solah.store>";
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

function getResendClient() {
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

async function sendEmail(input: { to: string; subject: string; html: string }) {
  const resend = getResendClient();
  if (!resend) return;

  await resend.emails.send({
    from: senderEmail,
    to: input.to,
    subject: input.subject,
    html: input.html
  });
}

export async function sendOrderCreatedEmail(payload: OrderCreatedEmailPayload): Promise<void> {
  const orderUrl = `${appBaseUrl}/meus-pedidos?pedido=${encodeURIComponent(payload.orderId)}`;
  const customerName = payload.customerName?.trim() || "cliente";
  const rows = payload.items
    .map(
      (item) =>
        `<li>${item.quantity}x ${item.name} — ${formatCurrency(item.unitPrice)} (un.)</li>`
    )
    .join("");

  await sendEmail({
    to: payload.email,
    subject: `Pedido #${payload.orderId.slice(0, 8)} recebido`,
    html: `
      <h1>Recebemos seu pedido, ${customerName}!</h1>
      <p>Pedido <strong>#${payload.orderId.slice(0, 8)}</strong>.</p>
      <p><strong>Total:</strong> ${formatCurrency(payload.total)}</p>
      <p><strong>Resumo dos itens:</strong></p>
      <ul>${rows}</ul>
      <p><strong>Instruções de pagamento:</strong> ${payload.paymentInstructions}</p>
      <p><a href="${orderUrl}" target="_blank" rel="noreferrer">Abrir pedido no site</a></p>
    `
  });
}

export async function sendOrderStatusUpdatedEmail(payload: OrderStatusUpdatedPayload): Promise<void> {
  const orderUrl = `${appBaseUrl}/meus-pedidos?pedido=${encodeURIComponent(payload.orderId)}`;
  await sendEmail({
    to: payload.email,
    subject: `Atualização do pedido #${payload.orderId.slice(0, 8)}`,
    html: `
      <h1>Status atualizado</h1>
      <p>Seu pedido <strong>#${payload.orderId.slice(0, 8)}</strong> agora está em: <strong>${payload.status.replaceAll("_", " ")}</strong>.</p>
      <p><a href="${orderUrl}" target="_blank" rel="noreferrer">Acompanhar pedido</a></p>
    `
  });
}

export async function sendOrderTrackingCodeEmail(payload: TrackingCodePayload): Promise<void> {
  const orderUrl = `${appBaseUrl}/meus-pedidos?pedido=${encodeURIComponent(payload.orderId)}`;
  await sendEmail({
    to: payload.email,
    subject: `Código de rastreio do pedido #${payload.orderId.slice(0, 8)}`,
    html: `
      <h1>Seu pedido foi enviado</h1>
      <p>Pedido <strong>#${payload.orderId.slice(0, 8)}</strong>.</p>
      <p><strong>Código de rastreio:</strong> ${payload.trackingCode}</p>
      <p><a href="${orderUrl}" target="_blank" rel="noreferrer">Abrir pedido</a></p>
    `
  });
}
