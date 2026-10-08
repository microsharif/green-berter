import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUI } from "../../context/UIContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { delay } from "../../utils/delay.js";
import { useProgressNavigate } from "../../hooks/useNavigationProgress.js";
import AuthFlowLoader from "./AuthFlowLoader.jsx";

export default function LoginFormPanel({ onSwitchToRegister }) {
  const { showToast } = useUI();
  const { login } = useAuth();
  const navigate = useProgressNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState(location.state?.email ?? "");

  function handleForgotPassword() {
    // Carry whatever the user has typed so the reset page can pre-fill it.
    navigate("/forgot-password", {
      state: { email: email.trim() },
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    setPending(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      await delay();
      showToast("Signed in. Welcome back!", "success");
      const to = location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ""}`
        : "/";
      navigate(to, { replace: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md relative">
      <div className="mb-12">
        <h2 className="font-display text-4xl font-bold tracking-tight text-on-surface mb-2">
          Welcome Back
        </h2>
        <p className="text-on-surface-variant font-body">
          Continue your sustainable journey today.
        </p>
      </div>
      <form
        className="space-y-6"
        onSubmit={handleSubmit}
        aria-busy={pending}
      >
        <div className="space-y-2">
          <label
            className="block text-sm font-bold text-on-surface-variant ml-1"
            htmlFor="auth-email"
          >
            Email Address
          </label>
          <input
            className="w-full px-6 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-200 disabled:opacity-60"
            id="auth-email"
            name="email"
            placeholder="hello@greenbarter.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label
              className="block text-sm font-bold text-on-surface-variant"
              htmlFor="auth-password"
            >
              Password
            </label>
            <button
              type="button"
              className="text-xs font-semibold text-secondary hover:underline disabled:pointer-events-none"
              onClick={handleForgotPassword}
              disabled={pending}
            >
              Forgot?
            </button>
          </div>
          <input
            className="w-full px-6 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-200 disabled:opacity-60"
            id="auth-password"
            name="password"
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </div>
        <button
          className="w-full py-5 bg-gradient-to-r from-primary to-primary-container text-white font-display font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:pointer-events-none"
          type="submit"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <div className="mt-12 pt-8 border-t border-outline-variant/30 text-center">
        <p className="text-on-surface-variant font-body">
          New to the movement?{" "}
          {onSwitchToRegister ? (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary font-bold ml-1 hover:underline underline-offset-4"
            >
              Create an account
            </button>
          ) : (
            <Link
              to="/register"
              className="text-primary font-bold ml-1 hover:underline underline-offset-4"
            >
              Create an account
            </Link>
          )}
        </p>
      </div>
      <AuthFlowLoader active={pending} label="Signing you in…" />
    </div>
  );
}
