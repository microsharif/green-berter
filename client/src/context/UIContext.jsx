import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const UIContext = createContext(null);

const initialToast = { open: false, message: "", variant: "info" };

export function UIProvider({ children }) {
  const [toast, setToast] = useState(initialToast);

  const showToast = useCallback((message, variant = "info") => {
    setToast({ open: true, message, variant });
  }, []);

  const dismissToast = useCallback(() => {
    setToast((t) => ({ ...t, open: false }));
  }, []);

  const value = useMemo(
    () => ({
      toast,
      showToast,
      dismissToast,
    }),
    [toast, showToast, dismissToast]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error("useUI must be used within UIProvider");
  }
  return ctx;
}
