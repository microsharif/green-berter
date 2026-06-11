/** Inbound contact form messages are delivered here. */
export const CONTACT_TO =
  process.env.CONTACT_TO?.trim() || "info@greenbarter.com";

/** SMTP — set in production (e.g. Mailtrap, Gmail app password, SendGrid SMTP). */
export const SMTP_HOST = process.env.SMTP_HOST?.trim() || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;

/**
 * Whether to open the SMTP connection over implicit TLS (SMTPS). Accepts the
 * common spellings (`true` / `ssl` / `1`) and falls back to the port-465
 * convention so a value like `SMTP_SECURE=ssl` on port 465 is honoured
 * (nodemailer requires `secure: true` on 465, otherwise the handshake fails).
 */
function resolveSmtpSecure() {
  const raw = (process.env.SMTP_SECURE ?? "").trim().toLowerCase();
  if (["true", "ssl", "ssl/tls", "1", "yes"].includes(raw)) return true;
  if (["false", "tls", "starttls", "0", "no", "none"].includes(raw)) return false;
  return SMTP_PORT === 465;
}

export const SMTP_SECURE = resolveSmtpSecure();
export const SMTP_USER = process.env.SMTP_USER?.trim() || "";
export const SMTP_PASS = process.env.SMTP_PASS?.trim() || "";
export const SMTP_FROM =
  process.env.SMTP_FROM?.trim() || `"Green Barter" <${CONTACT_TO}>`;

export function isSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}
