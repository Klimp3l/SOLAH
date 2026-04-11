export function generateWhatsAppLink(orderId: string): string {
  const whatsappNumber = process.env.WHATSAPP_NUMBER ?? "SEU_NUMERO";
  const shortOrderId = orderId.slice(0, 8);
  const message = `Olá, realizei o pedido #${shortOrderId} e segue o comprovante.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
