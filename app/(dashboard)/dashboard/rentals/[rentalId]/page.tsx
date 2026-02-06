"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getRentalById, getBikeById } from "@/lib/firestore";
import { getParkConfig } from "@/lib/config";
import {
  getDashboardState,
  getRemainingMinutes,
  getMinutesOverdue,
  getReturnStatus,
  formatRenterDisplay,
  toDate,
} from "@/lib/rental-utils";
import type { Timestamp } from "firebase/firestore";
import { updateRentalIncidentNote } from "@/lib/firestore";
import { useToast } from "@/components/ui/toast";
import { InlineLoader } from "@/components/ui/inline-loader";
import type { Rental } from "@/lib/types";
import type { Bike } from "@/lib/types";
import type { ParkConfig } from "@/lib/types";

export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const rentalId = typeof params.rentalId === "string" ? params.rentalId : "";
  const [rental, setRental] = useState<Rental | null>(null);
  const [bike, setBike] = useState<Bike | null>(null);
  const [config, setConfig] = useState<ParkConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incidentUpdating, setIncidentUpdating] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState("");

  useEffect(() => {
    if (!rentalId) return;
    let cancelled = false;
    Promise.all([
      getRentalById(rentalId),
      getParkConfig(),
    ]).then(([r, c]) => {
      if (cancelled) return;
      if (!r) {
        setError("Rental not found");
        return;
      }
      setRental(r);
      setConfig(c);
      setIncidentDraft(r.incidentNote ?? "");
      if (r.bikeDocId) {
        getBikeById(r.bikeDocId).then((b) => {
          if (!cancelled) setBike(b ?? null);
        });
      }
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
    });
    return () => { cancelled = true; };
  }, [rentalId]);

  if (!rentalId) {
    return (
      <div className="text-[var(--text-muted)]">Missing rental ID</div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--danger)]" role="alert">{error}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-[var(--accent)] hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!rental || !config) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <InlineLoader className="h-5 w-5" />
        <span>Loading rental…</span>
      </div>
    );
  }

  const isReturned = rental.status === "returned" && rental.returnedAt;
  const returnStatus = isReturned && rental.returnedAt
    ? getReturnStatus(rental.rentalEndsAt, rental.returnedAt, config)
    : null;

  const state = getDashboardState(
    rental.bufferEndsAt,
    rental.rentalEndsAt,
    rental.returnedAt,
    rental.status,
    config
  );
  const remaining = getRemainingMinutes(rental.rentalEndsAt);
  const minsOverdue = getMinutesOverdue(rental.rentalEndsAt, config);
  const isOverdue = state === "overdue";
  const isApproaching = state === "approaching";
  const isBuffer = state === "buffer";

  const formatTs = (ts: Timestamp) => {
    const d = toDate(ts);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  };

  async function saveIncidentNote() {
    if (!rentalId || incidentUpdating) return;
    setIncidentUpdating(true);
    try {
      await updateRentalIncidentNote(rentalId, incidentDraft);
      setRental((prev) => prev ? { ...prev, incidentNote: incidentDraft } : null);
      toast.success("Incident note saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIncidentUpdating(false);
    }
  }

  const statusBadge = isReturned && returnStatus !== null ? (
    returnStatus.onTime ? (
      <span className="rounded-full bg-[var(--success)]/20 px-3 py-1 text-sm font-medium text-[var(--success)]">
        On time
      </span>
    ) : (
      <span className="rounded-full bg-[var(--danger)] px-3 py-1 text-sm font-semibold text-white">
        {returnStatus.minutesOverdue} min overdue
      </span>
    )
  ) : isBuffer ? (
    <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-sm font-medium text-[var(--text-muted)]">
      Buffer
    </span>
  ) : state === "on_time" ? (
    <span className="rounded-full bg-[var(--success)]/20 px-3 py-1 text-sm font-medium text-[var(--success)]">
      On time
    </span>
  ) : isApproaching ? (
    <span className="rounded-full bg-[var(--warning)]/20 px-3 py-1 text-sm font-medium text-[var(--warning)]">
      {remaining} min left
    </span>
  ) : isOverdue ? (
    <span className="rounded-full bg-[var(--danger)] px-3 py-1 text-sm font-semibold text-white">
      {minsOverdue} min overdue
    </span>
  ) : null;

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
          aria-label="Back to dashboard"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">
            Rental
          </h1>
          <p className="mt-0.5 font-mono text-sm text-[var(--text-muted)]">
            <Link
              href={`/bikes/${rental.bikeDocId}`}
              className="text-[var(--accent)] hover:underline"
            >
              {rental.bikeId}
            </Link>
            {bike?.label && bike.label !== rental.bikeId && (
              <span className="ml-1.5 font-sans text-[var(--text-muted)]">
                {bike.label}
              </span>
            )}
          </p>
        </div>
        {statusBadge}
      </header>

      {/* Summary card */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]">
            {(bike?.photoUrls?.length ?? 0) > 0 ? (
              <img
                src={(bike?.photoUrls ?? [])[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl text-[var(--text-faint)]" aria-hidden>🚲</span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {formatRenterDisplay(rental) !== "—" && (
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">Rented to</span> · {formatRenterDisplay(rental)}
              </p>
            )}
            <p className="text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Checked out by</span> · {rental.staffEmail}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Started {formatTs(rental.startedAt)}
            </p>
            {isReturned && rental.returnedAt ? (
              <p className="text-sm text-[var(--text-muted)]">
                Returned {formatTs(rental.returnedAt)}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Rental ends {formatTs(rental.rentalEndsAt)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bike details */}
      {bike && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-[var(--text)]">
            Bike information
          </h2>
          <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
            {(bike.photoUrls?.length ?? 0) > 0 ? (
              <div className="grid max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
                {(bike.photoUrls ?? []).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Bike photo ${i + 1}`}
                    className="aspect-square rounded-lg border border-[var(--border)] object-cover"
                  />
                ))}
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {bike.model && (
                  <div>
                    <dt className="text-[var(--text-muted)]">Model</dt>
                    <dd className="mt-0.5 font-medium text-[var(--text)]">{bike.model}</dd>
                  </div>
                )}
                {bike.size && (
                  <div>
                    <dt className="text-[var(--text-muted)]">Size</dt>
                    <dd className="mt-0.5 font-medium text-[var(--text)]">{bike.size}</dd>
                  </div>
                )}
                {bike.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--text-muted)]">Notes</dt>
                    <dd className="mt-0.5 text-[var(--text)]">{bike.notes}</dd>
                  </div>
                )}
              </dl>
              <Link
                href={`/bikes/${rental.bikeDocId}`}
                className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
              >
                View bike details →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Timeline & incident */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        {(rental.renterName || rental.renterEmail || rental.renterPhone) && (
          <>
            <h2 className="mb-4 text-base font-semibold text-[var(--text)]">
              Rented to
            </h2>
            <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
              {rental.renterName && (
                <div>
                  <dt className="text-[var(--text-muted)]">Name</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{rental.renterName}</dd>
                </div>
              )}
              {rental.renterEmail && (
                <div>
                  <dt className="text-[var(--text-muted)]">Email</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{rental.renterEmail}</dd>
                </div>
              )}
              {rental.renterPhone && (
                <div>
                  <dt className="text-[var(--text-muted)]">Phone</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{rental.renterPhone}</dd>
                </div>
              )}
            </dl>
          </>
        )}
        <h2 className="mb-4 text-base font-semibold text-[var(--text)]">
          Timeline
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--text-muted)]">Started at</dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">{formatTs(rental.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Buffer ends at</dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">{formatTs(rental.bufferEndsAt)}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Rental ends at</dt>
            <dd className="mt-0.5 font-medium text-[var(--text)]">{formatTs(rental.rentalEndsAt)}</dd>
          </div>
          {rental.returnedAt && (
            <div>
              <dt className="text-[var(--text-muted)]">Returned at</dt>
              <dd className="mt-0.5 font-medium text-[var(--text)]">{formatTs(rental.returnedAt)}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <h3 className="text-sm font-semibold text-[var(--text)]">Incident note</h3>
          {rental.status !== "returned" ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <textarea
                value={incidentDraft}
                onChange={(e) => setIncidentDraft(e.target.value)}
                placeholder="Optional note…"
                rows={2}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
              <button
                type="button"
                onClick={saveIncidentNote}
                disabled={incidentUpdating}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg-muted)] disabled:opacity-50 sm:shrink-0"
              >
                {incidentUpdating ? (
                  <>
                    <InlineLoader className="h-3.5 w-3.5" />
                    Saving…
                  </>
                ) : (
                  "Save note"
                )}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {rental.incidentNote || "—"}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
