"use client";

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled")
  );
}

export function Modal({
  open,
  onClose,
  children,
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = getFocusables(panelRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      previousActiveRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (previousActiveRef.current?.focus) {
        previousActiveRef.current.focus();
        previousActiveRef.current = null;
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = getFocusables(panel);
    const first = focusables[0];
    if (first) {
      const t = requestAnimationFrame(() => first.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        className="animate-modal-in max-h-[90vh] w-full max-w-md overflow-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
