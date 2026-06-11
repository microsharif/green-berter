import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUI } from "../../context/UIContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { delay } from "../../utils/delay.js";
import { useProgressNavigate } from "../../hooks/useNavigationProgress.js";
import AuthFlowLoader from "./AuthFlowLoader.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const inputClass =
  "w-full px-6 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-200 disabled:opacity-60";
const labelClass = "block text-sm font-bold text-on-surface-variant ml-1";
const primaryButton =
  "w-full py-5 bg-gradient-to-r from-primary to-primary-container text-white font-display font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:pointer-events-none";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordFormPanel() {
  const { showToast } = useUI();
  const { requestPasswordReset, verifyPasswordResetOtp, resetPassword } =
    useAuth();
  const navigate = useProgressNavigate();
  const location = useLocation();

  const [step, setStep] = useState("email"); // "email" | "code" | "password"
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [resetToken, setResetToken] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((value) => {
        if (value <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }

  async function sendCode(targetEmail) {
    const result = await requestPasswordReset(targetEmail);
    if (!result.ok) {
      if (result.code === "OTP_RESEND_TOO_SOON" && result.data?.retryInSeconds) {
        startCooldown(result.data.retryInSeconds);
      }
      showToast(result.error, "error");
      return false;
    }
    showToast(result.message || "Verification code sent to your email.", "success");
    startCooldown();
    return true;
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const value = String(new FormData(e.currentTarget).get("email") || "").trim();
    setPending(true);
    try {
      const sent = await sendCode(value);
      if (sent) {
        setEmail(value);
        setStep("code");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (pending || cooldown > 0) return;
    setPending(true);
    try {
      await sendCode(email);
    } finally {
      setPending(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const code = String(new FormData(e.currentTarget).get("code") || "").trim();
    setPending(true);
    try {
      const result = await verifyPasswordResetOtp(email, code);
      if (!result.ok) {
        showToast(result.error, "error");
        if (result.code === "OTP_EXPIRED" || result.code === "OTP_MAX_ATTEMPTS") {
          setStep("email");
        }
        return;
      }
      setResetToken(result.resetToken);
      setStep("password");
      showToast("Code verified. Set your new password.", "success");
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    if (password.length < 8) {
      showToast("Password must be at least 8 characters.", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match.", "error");
      return;
    }
    setPending(true);
    try {
      const result = await resetPassword({ email, resetToken, password });
      if (!result.ok) {
        showToast(result.error, "error");
        if (result.code === "RESET_TOKEN_INVALID") {
          setStep("email");
          setResetToken("");
        }
        return;
      }
      await delay();
      showToast(result.message || "Password reset. Please sign in.", "success");
      navigate("/login", { replace: true, state: { email } });
    } finally {
      setPending(false);
    }
  }

  const heading = {
    email: "Forgot password?",
    code: "Check your email",
    password: "Set a new password",
  }[step];

  const subheading = {
    email: "Enter your account email and we'll send you a verification code.",
    code: (
      <>
        We sent a 6-digit code to{" "}
        <span className="font-semibold text-on-surface">{email}</span>. Enter it
        below to continue.
      </>
    ),
    password: "Choose a strong password you haven't used before.",
  }[step];

  const loaderLabel = {
    email: "Sending your code…",
    code: "Verifying your code…",
    password: "Updating your password…",
  }[step];

  return (
    <div className="w-full max-w-md relative">
      <div className="mb-10">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <MaterialIcon
            name={step === "password" ? "lock_reset" : "mark_email_read"}
            className="text-3xl text-primary"
          />
        </div>
        <h2 className="font-display text-4xl font-bold tracking-tight text-on-surface mb-2">
          {heading}
        </h2>
        <p className="text-on-surface-variant font-body">{subheading}</p>
      </div>

      {step === "email" && (
        <form className="space-y-6" onSubmit={handleEmailSubmit} aria-busy={pending}>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="forgot-email">
              Email Address
            </label>
            <input
              className={inputClass}
              id="forgot-email"
              name="email"
              type="email"
              placeholder="hello@greenbarter.com"
              autoComplete="email"
              defaultValue={email}
              required
              disabled={pending}
            />
          </div>
          <button className={primaryButton} type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send verification code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form className="space-y-6" onSubmit={handleCodeSubmit} aria-busy={pending}>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="forgot-code">
              Verification Code
            </label>
            <input
              className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
              id="forgot-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="••••••"
              required
              disabled={pending}
              autoFocus
            />
          </div>
          <button className={primaryButton} type="submit" disabled={pending}>
            {pending ? "Verifying…" : "Verify code"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-semibold text-on-surface-variant hover:text-on-surface disabled:pointer-events-none disabled:opacity-60"
              onClick={() => {
                setStep("email");
              }}
              disabled={pending}
            >
              Use a different email
            </button>
            <button
              type="button"
              className="font-semibold text-secondary hover:underline disabled:pointer-events-none disabled:opacity-60"
              onClick={handleResend}
              disabled={pending || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form
          className="space-y-6"
          onSubmit={handlePasswordSubmit}
          aria-busy={pending}
        >
          <div className="space-y-2">
            <label className={labelClass} htmlFor="forgot-password">
              New Password
            </label>
            <input
              className={inputClass}
              id="forgot-password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={pending}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="forgot-confirm">
              Confirm Password
            </label>
            <input
              className={inputClass}
              id="forgot-confirm"
              name="confirm"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={pending}
            />
          </div>
          <button className={primaryButton} type="submit" disabled={pending}>
            {pending ? "Updating…" : "Reset password"}
          </button>
        </form>
      )}

      <div className="mt-12 pt-8 border-t border-outline-variant/30 text-center">
        <p className="text-on-surface-variant font-body">
          Remember your password?{" "}
          <Link
            to="/login"
            className="text-primary font-bold ml-1 hover:underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </div>

      <AuthFlowLoader active={pending} label={loaderLabel} />
    </div>
  );
}
