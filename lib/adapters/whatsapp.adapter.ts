export function generateWhatsAppLink(orderId: string): string {
  const whatsappNumber = process.env.WHATSAPP_NUMBER ?? "SEU_NUMERO";
  const shortOrderId = orderId.slice(0, 8);
  const message = `Olá, realizei o pedido #${shortOrderId} e segue o comprovante.`;
  return buildWhatsAppContactLink(whatsappNumber, message);
}

export function generateWhatsAppStatusLink(phone: string, message: string): string {
  return buildWhatsAppContactLink(phone, message);
}

export function buildWhatsAppContactLink(phone: string, message?: string): string {
  const normalizedPhone = phone.replace(/\D/g, "");
  const baseLink = `https://wa.me/${normalizedPhone}`;
  if (message === undefined) return baseLink;
  return `${baseLink}?text=${encodeURIComponent(message)}`;
}
