import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ApiError } from "../api/client.js";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import Spinner from "../components/ui/Spinner.jsx";

export default function LoginPage() {
  const { isReady, isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname ?? "/";

  if (isReady && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back.");
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.fieldErrors
            ? Object.values(err.fieldErrors)[0]
            : err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-surface-muted to-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-card">
            <MaterialIcon name="eco" className="text-[32px]" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">
            GreanBarter Admin
          </h1>
          <p className="text-sm text-ink-soft">
            Sign in to the administration dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="admin-card space-y-4 p-6 shadow-panel"
        >
          {error ? (
            <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
              <MaterialIcon name="error" className="text-[20px]" />
              <span>{error}</span>
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="admin-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@greanbarter.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="admin-label">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="admin-input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <MaterialIcon
                  name={showPassword ? "visibility_off" : "visibility"}
                  className="text-[20px]"
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? <Spinner className="h-4 w-4" /> : null}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Restricted area. Authorized administrators only.
        </p>
      </div>
    </div>
  );
}
