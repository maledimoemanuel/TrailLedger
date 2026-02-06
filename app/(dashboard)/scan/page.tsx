"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
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
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera not available. Use the app on https or localhost and allow camera access. Or enter a bike ID below."
      );
      return;
    }
    setResult(null);
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
        (result, err) => {
          if (result) {
            const text = result.getText().trim();
            if (text) {
              (reader as { reset?: () => void }).reset?.();
              setScanning(false);
              handleScannedCode(text);
            }
          }
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera error");
      setScanning(false);
    }
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
      setScanning(false);
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
      setScanning(false);
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
    startScanning();
  }

  useEffect(() => {
    return () => {
      (readerRef.current as { reset?: () => void } | null)?.reset?.();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
        Scan bike
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        Scan QR or enter bike ID. One tap to check out or check in.
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

      {!scanning && !result && !success && (
        <>
          <button
            type="button"
            onClick={startScanning}
            className="h-14 w-full rounded-[var(--radius-lg)] bg-[var(--accent)] font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start camera & scan
          </button>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              No camera? Enter bike ID manually (e.g. TL-001)
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector<HTMLInputElement>("input[name=bikeId]");
                const value = input?.value?.trim();
                if (value) handleScannedCode(value.toUpperCase().replace(/\s/g, ""));
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                name="bikeId"
                placeholder="TL-001"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-12 rounded-lg bg-[var(--bg-muted)] px-4 font-medium text-[var(--text)] hover:bg-[var(--border)] disabled:opacity-50"
              >
                Look up
              </button>
            </form>
          </div>
        </>
      )}

      {scanning && !result && !success && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          </div>
          <p className="text-center text-sm text-[var(--text-muted)]">
            Point camera at bike QR code
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
