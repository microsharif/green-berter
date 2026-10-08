import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset as requestPasswordResetApi,
  verifyPasswordResetOtp as verifyPasswordResetOtpApi,
  resetPassword as resetPasswordApi,
  requestEmailVerification as requestEmailVerificationApi,
  verifyEmail as verifyEmailApi,
} from "../api/auth.js";
import { updateUser, updateMySettings } from "../api/users.js";
import { ApiError } from "../api/client.js";
import { resolveMediaUrl } from "../utils/mediaUrl.js";
import { normalizePrivacy } from "../utils/privacy.js";

/**
 * Normalize the API user shape into the field names the UI components
 * already use. We deliberately do NOT carry a list of listing ids here
 * any more — the catalog context queries the listings API by `ownerUserId`,
 * so there is no localStorage shim to keep in sync.
 */
function normalizeUser(apiUser) {
  if (!apiUser) return null;
  const id = String(apiUser._id ?? apiUser.id ?? "");
  if (!id) return null;

  // Mongo stores profile image as a relative path (e.g. `/upload/...`).
  // `resolveMediaUrl` turns that into an absolute URL the <img> can fetch
  // cross-origin from the API server.
  const resolvedAvatar = resolveMediaUrl(apiUser.profileImageUrl);

  return {
    id,
    email: String(apiUser.email ?? ""),
    fullName: String(apiUser.fullName ?? ""),
    address: apiUser.address != null ? String(apiUser.address) : "",
    phone: apiUser.phone != null ? String(apiUser.phone) : "",
    profileImageDataUrl: resolvedAvatar || null,
    createdAt: apiUser.createdAt ?? null,
    updatedAt: apiUser.updatedAt ?? null,
    emailVerified: Boolean(apiUser.emailVerified),
    status: apiUser.status ?? "active",
    lastLoginAt: apiUser.lastLoginAt ?? null,
    privacy: normalizePrivacy(apiUser.privacy),
    membership: {
      plan: apiUser.membership?.plan ?? "free",
      status: apiUser.membership?.status ?? "active",
      startedAt: apiUser.membership?.startedAt ?? null,
      expiresAt: apiUser.membership?.expiresAt ?? null,
    },
  };
}

function apiErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiError) {
    const firstField = err.fieldErrors
      ? Object.values(err.fieldErrors)[0]
      : null;
    return firstField ?? err.message ?? fallback;
  }
  return fallback;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Restore session from the httpOnly cookie on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCurrentUser();
        if (!cancelled) setUser(normalizeUser(data?.user ?? null));
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = Boolean(user);

  const login = useCallback(async (email, password) => {
    try {
      const data = await loginUser({
        email: String(email ?? "").trim(),
        password: String(password ?? ""),
      });
      const normalized = normalizeUser(data?.user ?? null);
      setUser(normalized);
      return { ok: true, user: normalized };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          ok: false,
          code: err.code,
          error: apiErrorMessage(err, "Could not sign you in."),
          fieldErrors: err.fieldErrors ?? null,
        };
      }
      return {
        ok: false,
        code: "UNKNOWN_ERROR",
        error: "Could not sign you in. Please try again.",
      };
    }
  }, []);

  /**
   * Registration creates the user record on the server. The session is NOT
   * issued here — the user signs in afterwards via /auth/login.
   */
  const register = useCallback(
    async ({ fullName, email, password, address, phone, profileImageUrl }) => {
      try {
        const data = await registerUser({
          fullName: String(fullName ?? "").trim(),
          email: String(email ?? "").trim(),
          phone: String(phone ?? "").trim(),
          address: String(address ?? "").trim(),
          password: String(password ?? ""),
          profileImageUrl:
            typeof profileImageUrl === "string" && profileImageUrl
              ? profileImageUrl
              : undefined,
        });
        return { ok: true, user: data?.user ?? null };
      } catch (err) {
        if (err instanceof ApiError) {
          return {
            ok: false,
            code: err.code,
            error: apiErrorMessage(err, "Could not create your account."),
            fieldErrors: err.fieldErrors ?? null,
          };
        }
        return {
          ok: false,
          code: "UNKNOWN_ERROR",
          error: "Something went wrong. Please try again.",
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch {
      // Cookie may already be invalid or the server unreachable — still
      // clear local session so the user is signed out client-side.
    } finally {
      setUser(null);
    }
  }, []);

  /** Call after post-logout navigation so protected routes do not flash /login. */
  const finishLogout = useCallback(() => {
    setLoggingOut(false);
  }, []);

  /**
   * PATCH /users/:id — updates the signed-in user's profile and refreshes
   * React state from the server response.
   */
  const updateProfile = useCallback(
    async (patch) => {
      const id = user?.id;
      if (!id) {
        return {
          ok: false,
          code: "UNAUTHENTICATED",
          error: "You must be signed in to update your profile.",
        };
      }
      try {
        const data = await updateUser(id, patch);
        const normalized = normalizeUser(data?.user ?? null);
        if (normalized) setUser(normalized);
        return { ok: true, user: normalized };
      } catch (err) {
        if (err instanceof ApiError) {
          return {
            ok: false,
            code: err.code,
            error: apiErrorMessage(err, "Could not update your profile."),
            fieldErrors: err.fieldErrors ?? null,
          };
        }
        return {
          ok: false,
          code: "UNKNOWN_ERROR",
          error: "Could not update your profile. Please try again.",
        };
      }
    },
    [user?.id]
  );

  const updatePrivacySettings = useCallback(
    async (patch) => {
      if (!user?.id) {
        return {
          ok: false,
          code: "UNAUTHENTICATED",
          error: "You must be signed in to update settings.",
        };
      }
      try {
        const data = await updateMySettings(patch);
        const normalized = normalizeUser(data?.user ?? null);
        if (normalized) setUser(normalized);
        return { ok: true, user: normalized, privacy: data?.privacy ?? null };
      } catch (err) {
        if (err instanceof ApiError) {
          return {
            ok: false,
            code: err.code,
            error: apiErrorMessage(err, "Could not save privacy settings."),
            fieldErrors: err.fieldErrors ?? null,
          };
        }
        return {
          ok: false,
          code: "UNKNOWN_ERROR",
          error: "Could not save privacy settings. Please try again.",
        };
      }
    },
    [user?.id]
  );

  /**
   * Forgot-password (OTP) flow — DFD §1.4–§1.5. All three steps map the
   * server `ApiError` into the same `{ ok, code, error, fieldErrors }` shape
   * the rest of the context uses, so panels only deal with one contract.
   */
  const requestPasswordReset = useCallback(async (email) => {
    try {
      const data = await requestPasswordResetApi({
        email: String(email ?? "").trim(),
      });
      return { ok: true, message: data?.message ?? "", data };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          ok: false,
          code: err.code,
          error: apiErrorMessage(err, "Could not send a reset code."),
          fieldErrors: err.fieldErrors ?? null,
        };
      }
      return {
        ok: false,
        code: "UNKNOWN_ERROR",
        error: "Could not send a reset code. Please try again.",
      };
    }
  }, []);

  const verifyPasswordResetOtp = useCallback(async (email, code) => {
    try {
      const data = await verifyPasswordResetOtpApi({
        email: String(email ?? "").trim(),
        code: String(code ?? "").trim(),
      });
      return { ok: true, resetToken: data?.resetToken ?? "", data };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          ok: false,
          code: err.code,
          error: apiErrorMessage(err, "Could not verify that code."),
          fieldErrors: err.fieldErrors ?? null,
        };
      }
      return {
        ok: false,
        code: "UNKNOWN_ERROR",
        error: "Could not verify that code. Please try again.",
      };
    }
  }, []);

  const resetPassword = useCallback(async ({ email, resetToken, password }) => {
    try {
      const data = await resetPasswordApi({
        email: String(email ?? "").trim(),
        resetToken: String(resetToken ?? ""),
        password: String(password ?? ""),
      });
      return { ok: true, message: data?.message ?? "", data };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          ok: false,
          code: err.code,
          error: apiErrorMessage(err, "Could not reset your password."),
          fieldErrors: err.fieldErrors ?? null,
        };
      }
      return {
        ok: false,
        code: "UNKNOWN_ERROR",
        error: "Could not reset your password. Please try again.",
      };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      const normalized = normalizeUser(data?.user ?? null);
      setUser(normalized);
      return { ok: true, user: normalized };
    } catch {
      setUser(null);
      return { ok: false, user: null };
    }
  }, []);

  const requestEmailVerification = useCallback(async () => {
    try {
      const data = await requestEmailVerificationApi();
      return { ok: true, message: data?.message ?? "", data };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          ok: false,
          code: err.code,
          error: apiErrorMessage(
            err,
            "Could not send the verification email."
          ),
        };
      }
      return {
        ok: false,
        code: "UNKNOWN_ERROR",
        error: "Could not send the verification email. Please try again.",
      };
    }
  }, []);

  const verifyEmail = useCallback(async (token) => {
    try {
      const data = await verifyEmailApi({ token });
      try {
        const me = await getCurrentUser();
        setUser(normalizeUser(me?.user ?? null));
      } catch {
        /* visitor may confirm from an inbox without an active session */
      }
      return {
        ok: true,
        message: data?.message ?? "Email is verified.",
      };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          ok: false,
          code: err.code,
          error: apiErrorMessage(err, "Could not verify your email."),
        };
      }
      return {
        ok: false,
        code: "UNKNOWN_ERROR",
        error: "Could not verify your email. Please try again.",
      };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isReady: ready,
      loggingOut,
      login,
      register,
      logout,
      finishLogout,
      updateProfile,
      updatePrivacySettings,
      requestPasswordReset,
      verifyPasswordResetOtp,
      resetPassword,
      refreshUser,
      requestEmailVerification,
      verifyEmail,
    }),
    [
      user,
      isAuthenticated,
      ready,
      loggingOut,
      login,
      register,
      logout,
      finishLogout,
      updateProfile,
      updatePrivacySettings,
      requestPasswordReset,
      verifyPasswordResetOtp,
      resetPassword,
      refreshUser,
      requestEmailVerification,
      verifyEmail,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
