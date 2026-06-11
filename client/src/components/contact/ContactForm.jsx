import { useState } from "react";
import { submitContactMessage } from "../../api/contact.js";
import { ApiError } from "../../api/client.js";
import { useUI } from "../../context/UIContext.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

const initial = { name: "", email: "", subject: "", message: "" };

export default function ContactForm() {
  const { showToast } = useUI();
  const [values, setValues] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});

    try {
      const res = await submitContactMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim() || undefined,
        message: values.message.trim(),
      });
      showToast(res?.message ?? "Thanks! We'll get back to you shortly.", "success");
      setValues(initial);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
        showToast(err.message, "error");
      } else if (err instanceof ApiError && err.code === "EMAIL_NOT_CONFIGURED") {
        showToast(
          "Message could not be sent right now. Please email us at info@greenbarter.com.",
          "error"
        );
      } else {
        showToast(
          err instanceof ApiError
            ? err.message
            : "Could not send your message. Please try again.",
          "error"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name) {
    return fieldErrors[name] ? (
      <p className="text-xs text-red-600 mt-1">{fieldErrors[name]}</p>
    ) : null;
  }

  return (
    <RevealOnScroll className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 md:p-12" delay={100}>
      <form className="space-y-8" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              className="block text-sm font-semibold font-headline uppercase tracking-wider text-on-surface-variant"
              htmlFor="name"
            >
              Your name
            </label>
            <input
              className="w-full bg-surface-container-low border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary text-on-surface placeholder:text-outline-variant transition-all"
              id="name"
              name="name"
              placeholder="Your name"
              type="text"
              value={values.name}
              onChange={handleChange}
              required
              disabled={submitting}
            />
            {fieldError("name")}
          </div>
          <div className="space-y-2">
            <label
              className="block text-sm font-semibold font-headline uppercase tracking-wider text-on-surface-variant"
              htmlFor="email"
            >
              Your email
            </label>
            <input
              className="w-full bg-surface-container-low border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary text-on-surface placeholder:text-outline-variant transition-all"
              id="email"
              name="email"
              placeholder="you@example.com"
              type="email"
              value={values.email}
              onChange={handleChange}
              required
              disabled={submitting}
            />
            {fieldError("email")}
          </div>
        </div>
        <div className="space-y-2">
          <label
            className="block text-sm font-semibold font-headline uppercase tracking-wider text-on-surface-variant"
            htmlFor="subject"
          >
            Subject <span className="font-normal normal-case text-on-surface-variant/80">(optional)</span>
          </label>
          <input
            className="w-full bg-surface-container-low border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary text-on-surface placeholder:text-outline-variant transition-all"
            id="subject"
            name="subject"
            placeholder="How can we help?"
            type="text"
            value={values.subject}
            onChange={handleChange}
            disabled={submitting}
          />
          {fieldError("subject")}
        </div>
        <div className="space-y-2">
          <label
            className="block text-sm font-semibold font-headline uppercase tracking-wider text-on-surface-variant"
            htmlFor="message"
          >
            Your message <span className="font-normal normal-case text-on-surface-variant/80">(optional)</span>
          </label>
          <textarea
            className="w-full bg-surface-container-low border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary text-on-surface placeholder:text-outline-variant transition-all resize-none"
            id="message"
            name="message"
            placeholder="Tell us what you need..."
            rows={6}
            value={values.message}
            onChange={handleChange}
            disabled={submitting}
          />
          {fieldError("message")}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
          <button
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-full shadow-lg hover:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send Message"}
            <MaterialIcon name="send" className="text-xl" />
          </button>
          <div className="flex items-center gap-3 text-primary text-sm font-semibold">
            <MaterialIcon name="verified_user" />
            Secured &amp; Eco-friendly
          </div>
        </div>
      </form>
    </RevealOnScroll>
  );
}
