// Shared contact constants for the redesigned pages.
// WhatsApp now uses the same number as the call line (082 222 7457).
export const WHATSAPP = "https://wa.me/27822227457";
/** WhatsApp link for the phone-first buttons: opens with a message ready to send. */
export const WHATSAPP_HELLO = `${WHATSAPP}?text=${encodeURIComponent("Hi, I'd like to chat about a website for my business.")}`;
export const WHATSAPP_DISPLAY = "+27 82 222 7457";
export const PHONE_TEL = "tel:+27822227457";
export const PHONE_DISPLAY = "+27 82 222 7457";
export const EMAIL = "hello@alldonesites.com";

/** Which way of reaching us a link opens, or null for any other link. */
export function contactMethod(href: string): "whatsapp" | "phone" | "email" | null {
  if (href.startsWith(WHATSAPP)) return "whatsapp";
  if (href.startsWith("tel:")) return "phone";
  if (href.startsWith("mailto:")) return "email";
  return null;
}
