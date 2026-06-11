import { useEffect } from "react";
import { useUI } from "../../context/UIContext.jsx";
import MaterialIcon from "./MaterialIcon.jsx";

const variantStyles = {
  success: "border-primary bg-primary-container/20 text-on-surface",
  error: "border-error bg-error-container/30 text-on-error-container",
  info: "border-outline-variant bg-surface-container-low text-on-surface",
};

export default function ToastHost() {
  const { toast, dismissToast } = useUI();

  useEffect(() => {
    if (!toast.open) return undefined;
    const t = setTimeout(dismissToast, 4200);
    return () => clearTimeout(t);
  }, [toast.open, dismissToast]);

  if (!toast.open) return null;

  return (
    <div
      className="pointer-events-none fixed top-20 right-4 z-[200] w-[min(24rem,calc(100vw-2rem))]"
      role="status"
    >
      <div
        className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md ${variantStyles[toast.variant] || variantStyles.info}`}
      >
        <MaterialIcon name="eco" className="text-primary shrink-0" />
        <p className="text-sm font-medium flex-1">{toast.message}</p>
        <button
          type="button"
          onClick={dismissToast}
          className="shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <MaterialIcon name="close" className="text-base" />
        </button>
      </div>
    </div>
  );
}
