const getWhatsAppNumber = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "3004878385";
  }
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "3004878385";
};

export function getWhatsAppLink(message?: string): string {
  const number = getWhatsAppNumber();
  const defaultMessage = message || "Hola, quiero más información sobre Café Creencia.";
  return `https://wa.me/${number}?text=${encodeURIComponent(defaultMessage)}`;
}

export function formatWhatsAppNumber(): string {
  const number = getWhatsAppNumber();
  return number.replace(/(\d{3})(\d{3})(\d{4})/, "+$1 $2 $3");
}