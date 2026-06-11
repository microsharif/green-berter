import nodemailer from "nodemailer";
import {
  CONTACT_TO,
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  isSmtpConfigured,
} from "../config/email.js";

let transporter;

function getTransporter() {
  if (!isSmtpConfigured()) {
    const err = new Error(
      "Email is not configured on the server. Set SMTP_HOST, SMTP_USER, and SMTP_PASS."
    );
    err.status = 503;
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      // Force IPv4: some hosts resolve to an IPv6 address that the machine
      // can't reach (ENETUNREACH), which surfaces as an ESOCKET connect error.
      family: 4,
      // Fail fast instead of hanging the request when the relay is unreachable.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  return transporter;
}

/**
 * Sends a contact form message to the site inbox with Reply-To set to the visitor.
 */
export async function sendContactMessage({ name, email, subject, message }) {
  const transport = getTransporter();
  const subjectLine =
    subject?.trim() ||
    `Green Barter contact from ${name}`;

  const text = [
    "New message from the Green Barter contact form",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    subject?.trim() ? `Subject: ${subject.trim()}` : null,
    "",
    "Message:",
    message || "(No message provided)",
  ]
    .filter(Boolean)
    .join("\n");

  await transport.sendMail({
    from: SMTP_FROM,
    to: CONTACT_TO,
    replyTo: email,
    subject: subjectLine,
    text,
  });
}

/**
 * Delivers a password-reset one-time code to the account email (DFD §1.4 —
 * "send OTP code"). The code is short-lived; the copy makes the expiry and
 * "ignore if you didn't request this" guidance explicit.
 */
export async function sendPasswordResetOtp({ to, code, fullName, expiresInMinutes = 10 }) {
  const transport = getTransporter();
  const greeting = fullName?.trim() ? `Hi ${fullName.trim()},` : "Hi,";

  const text = [
    greeting,
    "",
    "Use the verification code below to reset your Green Barter password:",
    "",
    `    ${code}`,
    "",
    `This code expires in ${expiresInMinutes} minutes. For your security, do not share it with anyone.`,
    "",
    "If you did not request a password reset, you can safely ignore this email — your password will stay unchanged.",
    "",
    "— The Green Barter team",
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1b1c18;">
    <p style="font-size:15px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.5;">Use the verification code below to reset your <strong>Green Barter</strong> password:</p>
    <div style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;font-size:32px;letter-spacing:10px;font-weight:bold;color:#386a20;background:#eef5e6;padding:16px 24px;border-radius:12px;">${code}</span>
    </div>
    <p style="font-size:13px;color:#44483d;line-height:1.5;">This code expires in <strong>${expiresInMinutes} minutes</strong>. For your security, do not share it with anyone.</p>
    <p style="font-size:13px;color:#44483d;line-height:1.5;">If you did not request a password reset, you can safely ignore this email — your password will stay unchanged.</p>
    <p style="font-size:13px;color:#44483d;margin-top:24px;">— The Green Barter team</p>
  </div>`;

  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject: "Your Green Barter password reset code",
    text,
    html,
  });
}
