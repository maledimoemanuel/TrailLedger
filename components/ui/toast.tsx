"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

type ToastType = "success" | "error";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => setMounted(true), []);

  const remove = useCallback((id: string) => {
    const t = timeoutsRef.current.get(id);
    if (t) clearTimeout(t);
    timeoutsRef.current.delete(id);
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.slice(-MAX_TOASTS);
    });
    const t = setTimeout(() => remove(id), AUTO_DISMISS_MS);
    timeoutsRef.current.set(id, t);
  }, [remove]);

  const success = useCallback((message: string) => add(message, "success"), [add]);
  const error = useCallback((message: string) => add(message, "error"), [add]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
            aria-live="polite"
          >
            {toasts.map((item) => (
              <ToastItem key={item.id} item={item} onDismiss={() => remove(item.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const isError = item.type === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className="animate-toast-in flex min-w-[280px] max-w-[360px] items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg"
      style={{
        backgroundColor: isError ? "var(--danger-bg)" : "var(--success-bg)",
        borderColor: isError ? "var(--danger)" : "var(--success)",
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: isError ? "var(--danger)" : "var(--success)" }}
      >
        {item.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 opacity-70 hover:opacity-100 no-tap min-h-0 min-w-0"
        style={{ color: "var(--text-muted)" }}
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
