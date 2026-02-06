"use client";

import { useRef } from "react";
import { Modal } from "./modal";
import { InlineLoader } from "./inline-loader";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const titleId = useRef(`confirm-title-${Math.random().toString(36).slice(2)}`).current;
  const descId = useRef(`confirm-desc-${Math.random().toString(36).slice(2)}`).current;

  function handleConfirm() {
    void Promise.resolve(onConfirm()).finally(() => onClose());
  }

  const confirmClass =
    variant === "danger"
      ? "bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-50"
      : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50";

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
    >
      <h2 id={titleId} className="text-lg font-semibold text-[var(--text)]">
        {title}
      </h2>
      <p id={descId} className="mt-2 text-sm text-[var(--text-muted)]">
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg-muted)] disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${confirmClass}`}
        >
          {loading ? (
            <>
              <InlineLoader className="h-4 w-4 border-[currentColor]" />
              <span>{confirmLabel}…</span>
            </>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  );
}
