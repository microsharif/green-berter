import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.js";

const POLL_MS = 45_000;

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [countRes, listRes] = await Promise.all([
        fetchUnreadNotificationCount(),
        fetchNotifications({ limit: 30 }),
      ]);
      setUnreadCount(countRes);
      setNotifications(listRes.notifications);
    } catch {
      /* keep last known state on transient errors */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isReady) return;
    refresh();
  }, [isReady, refresh]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (pollRef.current) clearInterval(pollRef.current);
      return undefined;
    }
    pollRef.current = setInterval(refresh, POLL_MS);
    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: n.readAt ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
