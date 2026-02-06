"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Modal } from "@/components/ui/modal";
import { InlineLoader } from "@/components/ui/inline-loader";

interface TagScannerModalProps {
  open: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void | Promise<void>;
}

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/\s/g, "").trim();
}

export function TagScannerModal({
  open,
  onClose,
  onCodeScanned,
}: TagScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCode = useCallback(
    async (code: string) => {
      const normalized = normalizeCode(code);
      if (!normalized) return;
      (readerRef.current as { reset?: () => void } | null)?.reset?.();
      setScanning(false);
      setError(null);
      setBusy(true);
      try {
        await onCodeScanned(normalized);
      } finally {
        setBusy(false);
      }
    },
    [onCodeScanned]
  );

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera not available. Use https or localhost and allow camera access, or enter the tag below."
      );
      return;
    }
    setError(null);
    setScanning(true);
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const videoInput =
        devices.find((d) => d.label.toLowerCase().includes("back")) ??
        devices[0];
      await reader.decodeFromVideoDevice(
        videoInput?.deviceId ?? undefined,
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText().trim();
            if (text) handleCode(text);
          }
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera error");
      setScanning(false);
    }
  }, [handleCode]);

  useEffect(() => {
    if (!open) {
      (readerRef.current as { reset?: () => void } | null)?.reset?.();
      setScanning(false);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      (readerRef.current as { reset?: () => void } | null)?.reset?.();
    };
  }, []);

  return (
    <Modal open={open} onClose={onClose} ariaLabelledBy="tag-scanner-title">
      <div className="space-y-4">
        <h2 id="tag-scanner-title" className="text-lg font-semibold text-[var(--text)]">
          Scan tag to add bike
        </h2>

        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}

        {!scanning ? (
          <>
            <button
              type="button"
              onClick={startScanning}
              disabled={busy}
              className="h-12 w-full rounded-[var(--radius-lg)] bg-[var(--accent)] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <InlineLoader className="h-4 w-4 border-white" />
                  Checking…
                </span>
              ) : (
                "Start camera & scan"
              )}
            </button>

            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-muted)] p-3">
              <p className="mb-2 text-sm text-[var(--text-muted)]">
                Or enter tag manually (e.g. TL-001)
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector<HTMLInputElement>("input[name=tag]");
                  const value = input?.value?.trim();
                  if (value) handleCode(value);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  name="tag"
                  placeholder="TL-001"
                  disabled={busy}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[var(--bg-elevated)] px-4 font-medium text-[var(--text)] hover:bg-[var(--border)] disabled:opacity-50"
                >
                  Use this tag
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            </div>
            <p className="text-center text-sm text-[var(--text-muted)]">
              Point camera at the bike tag
            </p>
            <button
              type="button"
              onClick={() => {
                (readerRef.current as { reset?: () => void } | null)?.reset?.();
                setScanning(false);
              }}
              className="h-12 w-full rounded-[var(--radius-lg)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
            >
              Stop camera
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
