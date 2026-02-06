"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNfcSupported("NDEFReader" in (window as unknown as { NDEFReader?: unknown }));
  }, [open]);

  const startNfcScan = useCallback(async () => {
    if (typeof window === "undefined") return;
    const NDEFReaderCtor = (window as any).NDEFReader;
    if (!NDEFReaderCtor) {
      setError("Web NFC is not supported in this browser.");
      setNfcSupported(false);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const reader = new NDEFReaderCtor();
      await reader.scan();

      reader.onreading = (event: any) => {
        let code: string | undefined = event?.serialNumber;
        if (!code && event?.message?.records?.length) {
          const decoder = new TextDecoder();
          for (const record of event.message.records) {
            if (record.recordType === "text") {
              code = decoder.decode(record.data);
              break;
            }
          }
        }
        if (code) {
          void onCodeScanned(normalizeCode(code));
        } else {
          setError("NFC tag does not contain a bike ID.");
        }
        reader.onreading = null;
        reader.onreadingerror = null;
        setBusy(false);
      };

      reader.onreadingerror = () => {
        setError("Could not read NFC tag. Try again.");
        setBusy(false);
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "NFC scanning failed. Make sure NFC is enabled and you granted permission.";
      setError(msg);
      setBusy(false);
    }
  }, [onCodeScanned]);

  return (
    <Modal open={open} onClose={onClose} ariaLabelledBy="tag-scanner-title">
      <div className="space-y-4">
        <h2 id="tag-scanner-title" className="text-lg font-semibold text-[var(--text)]">
          Enter tag to add bike
        </h2>

        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {nfcSupported === false && (
            <p className="text-sm text-[var(--danger)]">
              This browser doesn&apos;t support Web NFC. Use an NFC-capable browser (e.g. Chrome on Android).
            </p>
          )}
          <button
            type="button"
            disabled={busy || nfcSupported === false}
            onClick={startNfcScan}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {busy ? (
              <>
                <InlineLoader className="h-4 w-4 border-white" />
                <span>Waiting for NFC tag…</span>
              </>
            ) : (
              "Scan NFC tag"
            )}
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            Hold the bike&apos;s NFC tag near the phone&apos;s NFC reader. When it beeps or vibrates, the bike ID will be used automatically.
          </p>
        </div>

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
