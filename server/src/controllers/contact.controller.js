import { sendContactMessage } from "../services/mail.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function validateContactBody(payload) {
  const errors = {};
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const subject = String(payload.subject ?? "").trim();
  const message = String(payload.message ?? "").trim();

  if (!name) errors.name = "Name is required";
  else if (name.length > MAX_NAME) errors.name = `Name must be at most ${MAX_NAME} characters`;

  if (!email) errors.email = "Email is required";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Invalid email address";

  if (subject.length > MAX_SUBJECT) {
    errors.subject = `Subject must be at most ${MAX_SUBJECT} characters`;
  }

  if (message.length > MAX_MESSAGE) {
    errors.message = `Message must be at most ${MAX_MESSAGE} characters`;
  }

  return {
    errors,
    cleaned: { name, email, subject, message },
  };
}

export async function submitContactMessage(req, res, next) {
  try {
    const { errors, cleaned } = validateContactBody(req.body ?? {});

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    await sendContactMessage(cleaned);

    return res.status(200).json({
      ok: true,
      message: "Your message has been sent. We will get back to you soon.",
    });
  } catch (err) {
    next(err);
  }
}
