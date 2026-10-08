import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCurrentAdmin,
  loginAdmin,
  logoutAdmin,
} from "../api/auth.js";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  // `isReady` flips true only after the initial /me probe resolves, so guards
  // don't redirect before we know whether a session exists.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getCurrentAdmin();
        if (active) setAdmin(res.admin ?? null);
      } catch {
        if (active) setAdmin(null);
      } finally {
        if (active) setIsReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await loginAdmin({ email, password });
    setAdmin(res.admin ?? null);
    return res;
  }, []);

  const logout = useCallback(async () => {
    setAdmin(null);
    try {
      await logoutAdmin();
    } catch {
      /* best-effort */
    }
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (!admin) return false;
      if (admin.role === "super_admin") return true;
      return (admin.permissions ?? []).includes(permission);
    },
    [admin]
  );

  const value = useMemo(
    () => ({
      admin,
      isReady,
      isAuthenticated: Boolean(admin),
      login,
      logout,
      hasPermission,
    }),
    [admin, isReady, login, logout, hasPermission]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
