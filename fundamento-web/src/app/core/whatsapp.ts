const WHATSAPP_NUMBER = '5561981859293';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function productWhatsappLink(name: string, price: number): string {
  return whatsappLink(`Olá! Tenho interesse no brinquedo *${name}* (${BRL.format(price)}). Pode me ajudar com a compra?`);
}

export interface WhatsappOrderLine {
  name: string;
  quantity: number;
  subtotal: number;
}

export function cartWhatsappLink(lines: WhatsappOrderLine[], total: number): string {
  const itens = lines.map(l => `${l.quantity}x ${l.name} — ${BRL.format(l.subtotal)}`).join('\n');
  return whatsappLink(`Olá! Gostaria de fazer o seguinte pedido:\n\n${itens}\n\nTotal: ${BRL.format(total)}`);
}
