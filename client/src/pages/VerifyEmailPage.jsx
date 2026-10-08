import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, refreshUser, isAuthenticated } = useAuth();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token")?.trim();
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing a token.");
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const result = await verifyEmail(token);
      if (cancelled) return;

      if (result.ok) {
        setStatus("success");
        setMessage(result.message || "Email is verified.");
        if (isAuthenticated) await refreshUser();
        window.setTimeout(() => {
          navigate("/profile#profile-account", { replace: true });
        }, 2500);
        return;
      }

      setStatus("error");
      setMessage(result.error || "This verification link is invalid or has expired.");
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, verifyEmail, refreshUser, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f8] px-6 py-16 text-on-background">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        {status === "loading" ? (
          <>
            <MaterialIcon
              name="progress_activity"
              className="mx-auto mb-4 text-4xl animate-spin text-primary"
            />
            <h1 className="text-xl font-black text-green-900">Verifying your email</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Please wait while we confirm your verification link.
            </p>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MaterialIcon name="verified" className="text-3xl" />
            </div>
            <h1 className="text-xl font-black text-green-900">Email is verified</h1>
            <p className="mt-2 text-sm text-zinc-500">{message}</p>
            <p className="mt-4 text-xs text-zinc-400">Redirecting to your profile…</p>
            <Link
              to="/profile#profile-account"
              className="mt-6 inline-flex text-sm font-bold text-primary hover:underline"
            >
              Go to profile now
            </Link>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <MaterialIcon name="error_outline" className="text-3xl" />
            </div>
            <h1 className="text-xl font-black text-green-900">Verification failed</h1>
            <p className="mt-2 text-sm text-zinc-500">{message}</p>
            <Link
              to="/profile#profile-account"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90"
            >
              Back to profile
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
