export function generateWhatsAppLink(orderId: string): string {
  const whatsappNumber = process.env.WHATSAPP_NUMBER ?? "SEU_NUMERO";
  const message = `Olá, realizei o pedido #${orderId} e segue o comprovante.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
