import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useProgressNavigate } from "../../hooks/useNavigationProgress.js";
import { useNotifications } from "../../context/NotificationContext.jsx";
import {
  notificationIcon,
  notificationTarget,
} from "../../utils/notificationNavigation.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "Just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function NotificationPanel({
  menuId,
  loading,
  notifications,
  unreadCount,
  markAllRead,
  onOpenItem,
  onViewAll,
  onClose,
  panelClassName = "",
}) {
  return (
    <div
      id={menuId}
      role="menu"
      className={`overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900 shadow-xl flex flex-col ${panelClassName}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <p className="font-bold text-sm text-on-surface">Notifications</p>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
              onClick={() => markAllRead()}
            >
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close notifications"
            onClick={onClose}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
        {loading && notifications.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500 text-center">Loading…</p>
        ) : null}
        {!loading && notifications.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500 text-center leading-relaxed">
            No notifications yet. You will be notified when someone claims your listing
            or responds to yours.
          </p>
        ) : null}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                role="menuitem"
                className={`w-full text-left px-4 py-3.5 sm:py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors flex gap-3 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
                onClick={() => onOpenItem(n)}
              >
                <MaterialIcon
                  name={notificationIcon(n.type)}
                  className={`shrink-0 mt-0.5 text-xl sm:text-2xl ${!n.read ? "text-primary" : "text-zinc-400"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <span
                      className={`text-sm font-bold line-clamp-2 sm:truncate ${!n.read ? "text-on-surface" : "text-zinc-600"}`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0 sm:pt-0.5">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500 line-clamp-3 sm:line-clamp-2 block mt-1 leading-relaxed">
                    {n.body}
                  </span>
                </span>
                {!n.read ? (
                  <span
                    className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-2"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2.5 sm:py-2 shrink-0">
        <button
          type="button"
          className="w-full text-center text-xs sm:text-xs font-bold text-zinc-500 hover:text-primary py-2.5 sm:py-2"
          onClick={onViewAll}
        >
          View all claims & proposals
        </button>
      </div>
    </div>
  );
}

/**
 * DFD §4.4 — in-app notification bell + dropdown; click navigates to claim flow.
 */
export default function NotificationBell({ className = "", iconClassName = "" }) {
  const menuId = useId();
  const navigate = useProgressNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      const panel = document.getElementById(menuId);
      if (
        rootRef.current?.contains(e.target) ||
        panel?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, menuId]);

  async function handleOpenItem(n) {
    if (!n.read) {
      try {
        await markRead(n.id);
      } catch {
        /* navigate anyway */
      }
    }
    setOpen(false);
    navigate(notificationTarget(n));
  }

  function handleViewAll() {
    setOpen(false);
    navigate({ pathname: "/profile", hash: "#claims" });
  }

  const panelProps = {
    menuId,
    loading,
    notifications,
    unreadCount,
    markAllRead,
    onOpenItem: handleOpenItem,
    onViewAll: handleViewAll,
    onClose: () => setOpen(false),
  };

  const mobilePanel =
    open &&
    createPortal(
      <div className="md:hidden fixed inset-0 z-[250]" role="presentation">
        <button
          type="button"
          aria-label="Close notifications"
          className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
        <div className="absolute inset-x-3 top-[4.75rem] bottom-[max(1rem,env(safe-area-inset-bottom))] flex flex-col pointer-events-none">
          <NotificationPanel
            {...panelProps}
            panelClassName="pointer-events-auto max-h-full shadow-2xl"
          />
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="relative p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all duration-300 active:scale-95"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MaterialIcon
          name="notifications"
          className={
            iconClassName || "text-emerald-700 dark:text-emerald-500 text-2xl"
          }
        />
        {unreadCount > 0 ? (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 rounded-full bg-secondary text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="hidden md:block absolute right-0 mt-2 z-[100]">
          <NotificationPanel
            {...panelProps}
            panelClassName="w-[min(calc(100vw-2rem),22rem)] max-h-[min(70vh,24rem)]"
          />
        </div>
      ) : null}

      {mobilePanel}
    </div>
  );
}
