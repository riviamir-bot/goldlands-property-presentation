/** One-time sign-in token handed over from the marketing system in the URL fragment. */
export function readHandoffToken(hash: string): string | null {
  const match = /^#handoff=([A-Za-z0-9_-]+)$/.exec(hash);
  return match ? match[1] : null;
}

/** Client summary links have the form /s/<token>: 12 characters, or 43 for links sent earlier. */
export function shareTokenFromPath(pathname: string): string | null {
  const match = /^\/s\/([A-Za-z0-9_-]{12}|[A-Za-z0-9_-]{43})\/?$/.exec(pathname);
  return match ? match[1] : null;
}

/** WhatsApp wants digits in international format. Israeli local numbers (05x...) become 9725x... */
export function toWhatsAppNumber(phone: string): string | null {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!trimmed.startsWith("+") && digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function whatsappUrl(phone: string, text: string) {
  const number = toWhatsAppNumber(phone);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
}
