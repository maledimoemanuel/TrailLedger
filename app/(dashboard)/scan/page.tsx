"use client";

import { useEffect, useState } from "react";
import {
  getBikeByBikeId,
  findActiveRentalByBikeId,
  checkOut,
  checkIn,
} from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { InlineLoader } from "@/components/ui/inline-loader";
import { AddBikeModal } from "@/components/bikes/add-bike-modal";
import type { Bike } from "@/lib/types";

function playSuccessBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore
  }
}

export default function ScanPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [success, setSuccess] = useState<"check_out" | "check_in" | null>(null);
  const [result, setResult] = useState<{
    bikeId: string;
    action: "check_out" | "check_in";
    bike?: Bike;
    rentalId?: string;
  } | null>(null);
  const [addBikeScannedCode, setAddBikeScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNfcSupported("NDEFReader" in (window as unknown as { NDEFReader?: unknown }));
  }, []);

  async function handleScannedCode(code: string) {
    setError(null);
    setBusy(true);
    try {
      const bikeId = code.toUpperCase().replace(/\s/g, "");
      const bike = await getBikeByBikeId(bikeId);
      if (!bike) {
        setAddBikeScannedCode(bikeId);
        setBusy(false);
        return;
      }
      const active = await findActiveRentalByBikeId(bikeId);
      if (active) {
        setResult({
          bikeId: bike.bikeId,
          action: "check_in",
          bike,
          rentalId: active.id,
        });
      } else {
        if (bike.status !== "available" && bike.status !== "out") {
          setError(`Bike ${bikeId} is ${bike.status}.`);
          setBusy(false);
          return;
        }
        setResult({
          bikeId: bike.bikeId,
          action: "check_out",
          bike,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCheckOut() {
    if (!result?.bike || result.action !== "check_out" || !user) return;
    setBusy(true);
    setError(null);
    try {
      await checkOut(result.bike.id, result.bike.bikeId, user.uid, user.email ?? "");
      playSuccessBeep();
      setResult(null);
      setSuccess("check_out");
      setTimeout(() => setSuccess(null), 1800);
      toast.success("Checked out");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check out failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCheckIn() {
    if (!result?.rentalId || result.action !== "check_in") return;
    setBusy(true);
    setError(null);
    try {
      await checkIn(result.rentalId);
      playSuccessBeep();
      setResult(null);
      setSuccess("check_in");
      setTimeout(() => setSuccess(null), 1800);
      toast.success("Checked in");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check in failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function cancelResult() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
        Scan bike
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        Scan an NFC tag to start or end a rental. This works in supported browsers (e.g. Chrome on Android).
      </p>

      {success && (
        <div className="animate-in-up flex flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-[var(--success)] bg-[var(--success-bg)] py-8 shadow-[var(--shadow-card)]">
          <span className="text-4xl text-[var(--success)]" aria-hidden>✓</span>
          <p className="mt-2 font-semibold text-[var(--text)]">
            {success === "check_out" ? "Checked out" : "Checked in"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {success === "check_out" ? "Rental started. 5-min buffer, then timer." : "Bike returned."}
          </p>
        </div>
      )}

      {!result && !success && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-3">
          {nfcSupported === false && (
            <p className="text-sm text-[var(--danger)]">
              This browser doesn&apos;t support Web NFC. Use an NFC-capable browser (e.g. Chrome on Android) to scan tags.
            </p>
          )}
          <button
            type="button"
            disabled={busy || nfcSupported === false}
            onClick={async () => {
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
                    void handleScannedCode(code);
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
              } catch (e) {
                const msg =
                  e instanceof Error
                    ? e.message
                    : "NFC scanning failed. Make sure NFC is enabled and you granted permission.";
                setError(msg);
                setBusy(false);
              }
            }}
            className="h-12 w-full rounded-[var(--radius-lg)] bg-[var(--accent)] px-4 text-center text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <InlineLoader className="h-4 w-4 border-white" />
                <span>Waiting for tag…</span>
              </span>
            ) : (
              "Scan NFC tag"
            )}
          </button>
        </div>
      )}

      <AddBikeModal
        open={!!addBikeScannedCode}
        onClose={() => setAddBikeScannedCode(null)}
        preFilledBikeId={addBikeScannedCode ?? ""}
        onSaved={() => toast.success("Bike added")}
      />

      {result && !success && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex gap-4">
            {result.bike && (
              <div className="flex-shrink-0">
                {result.bike.photoUrls?.[0] ? (
                  <img
                    src={result.bike.photoUrls[0]}
                    alt=""
                    className="h-20 w-20 rounded-lg border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-faint)]">
                    <span className="text-2xl" aria-hidden>🚲</span>
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xl font-bold text-[var(--text)]">
                {result.bikeId}
              </p>
              {result.bike?.label && result.bike.label !== result.bikeId && (
                <p className="text-sm text-[var(--text-muted)]">{result.bike.label}</p>
              )}
              {(result.bike?.model || result.bike?.size) && (
                <p className="text-sm text-[var(--text-faint)]">
                  {[result.bike.model, result.bike.size].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {result.action === "check_out"
                  ? "Check out (start rental)"
                  : "Check in (return bike)"}
              </p>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            {result.action === "check_out" && (
              <button
                type="button"
                disabled={busy}
                onClick={confirmCheckOut}
                className="inline-flex min-h-[var(--tap)] flex-1 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--accent)] py-3 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <InlineLoader className="h-4 w-4 border-white" />
                    <span>Checking out…</span>
                  </>
                ) : (
                  "Check out"
                )}
              </button>
            )}
            {result.action === "check_in" && (
              <button
                type="button"
                disabled={busy}
                onClick={confirmCheckIn}
                className="inline-flex min-h-[var(--tap)] flex-1 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--accent)] py-3 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <InlineLoader className="h-4 w-4 border-white" />
                    <span>Checking in…</span>
                  </>
                ) : (
                  "Check in"
                )}
              </button>
            )}
            <button
              type="button"
              onClick={cancelResult}
              disabled={busy}
              className="min-h-[var(--tap)] rounded-[var(--radius-lg)] border border-[var(--border)] px-6 py-3 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && !result && !success && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
